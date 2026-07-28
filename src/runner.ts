import { evaluateXPathToBoolean, evaluateXPathToNodes } from 'fontoxpath'
import { sync } from 'slimdom-sax-parser'
import type { Document, Element, Node } from 'slimdom'

const SCH_NS = 'http://purl.oclc.org/dsdl/schematron'

export type Assertion = { id: string; test: string; message: string }
export type Rule = { context: string; query: string; asserts: Assertion[] }
export type Pattern = { id: string; rules: Rule[] }
export type Failure = { patternId: string; assertId: string; context: string; message: string }

// A compliance verdict is meaningless without the rule set it was checked
// against: the result carries the artefact version (parsed from the CEF file
// header) and the runner version, so a logged result remains auditable later.
// `decimalExact` reports whether the XPath engine actually performs exact
// xs:decimal arithmetic in THIS process — see probe below.
export type ValidationResult = {
  valid: boolean
  artefactsVersion: string
  runnerVersion: string
  decimalExact: boolean
  fired: Failure[]
}

import { version as RUNNER_VERSION } from '../package.json'

// Our workspace patches fontoxpath for exact xs:decimal arithmetic
// (patches/fontoxpath@3.34.0.patch, upstream: FontoXML/fontoxpath#686), but a
// patch does not travel with an npm package: a consumer's install may resolve
// vanilla fontoxpath, where decimal arithmetic is float64 and the arithmetic
// rules (BR-CO-*, BR-*-08…) can misfire on valid invoices. Probe the engine
// once and surface the truth in every result instead of assuming our own
// environment — same rule as everywhere else in this runner: never silent.
export const DECIMAL_EXACT: boolean = evaluateXPathToBoolean('1.1 + 2.2 = 3.3', null)

let warnedInexactDecimal = false

function childElements(el: Element | Document, localName: string): Element[] {
  const out: Element[] = []
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (n as Element).localName === localName && (n as Element).namespaceURI === SCH_NS) {
      out.push(n as Element)
    }
  }
  return out
}

// The runner executes the EN 16931 artefacts as published (preprocessed, fully
// expanded), not Schematron at large. Any construct outside that subset must be
// a hard error: silently skipping it would mean silently skipping rules — a
// false negative, the one failure mode a compliance validator cannot have.
const SUPPORTED = new Set(['schema', 'title', 'ns', 'phase', 'active', 'pattern', 'rule', 'assert'])

function assertSupported(el: Element): void {
  if (el.namespaceURI === SCH_NS && !SUPPORTED.has(el.localName)) {
    throw new Error(
      `Unsupported Schematron construct <${el.localName}>: this runner executes the EN 16931 preprocessed artefacts only. Refusing to skip rules silently.`
    )
  }
  if (el.localName === 'pattern' && (el.getAttribute('abstract') === 'true' || el.hasAttribute('is-a'))) {
    throw new Error('Abstract patterns are not supported: use the preprocessed (expanded) artefact.')
  }
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1) assertSupported(n as Element)
  }
}

export class SchematronRunner {
  private patterns: Pattern[]
  private options: { namespaceResolver: (prefix: string) => string | null }
  readonly artefactsVersion: string

  constructor(schematronXml: string) {
    if (!DECIMAL_EXACT && !warnedInexactDecimal) {
      warnedInexactDecimal = true
      console.warn(
        '[en16931] The installed XPath engine computes xs:decimal arithmetic in float64 ' +
          '(fontoxpath without the exact-decimal fix, see FontoXML/fontoxpath#686). ' +
          'Arithmetic rules may misfire on valid invoices; results carry decimalExact: false.'
      )
    }
    this.artefactsVersion = /Schematron version ([\d.]+)/.exec(schematronXml)?.[1] ?? 'unknown'
    const dom = sync(schematronXml)
    const schema = dom.documentElement!
    assertSupported(schema)
    if (schema.hasAttribute('defaultPhase')) {
      throw new Error('defaultPhase is not supported: this runner always evaluates every pattern (#ALL).')
    }

    const namespaces: Record<string, string> = {}
    for (const ns of childElements(schema, 'ns')) {
      namespaces[ns.getAttribute('prefix')!] = ns.getAttribute('uri')!
    }
    this.options = { namespaceResolver: (prefix) => namespaces[prefix] ?? null }

    this.patterns = childElements(schema, 'pattern').map((pattern) => ({
      id: pattern.getAttribute('id') ?? '',
      rules: childElements(pattern, 'rule').map((rule) => {
        const context = rule.getAttribute('context')!
        return {
          context,
          // A rule context is a match pattern: relative expressions match anywhere
          // in the document. Absolute ones can run as-is — both evaluate once, from the root.
          query: context.startsWith('/') ? context : `//(${context})`,
          asserts: childElements(rule, 'assert').map((a) => ({
            id: a.getAttribute('id') ?? '',
            test: a.getAttribute('test')!,
            message: (a.textContent ?? '').trim(),
          })),
        }
      }),
    }))
  }

  validateDocument(doc: Document): Failure[] {
    const failures: Failure[] = []
    for (const pattern of this.patterns) {
      // Schematron semantics: within a pattern, the first rule matching a node wins.
      const claimed = new Set<Node>()
      for (const rule of pattern.rules) {
        for (const node of evaluateXPathToNodes<Node>(rule.query, doc, null, null, this.options)) {
          if (claimed.has(node)) continue
          claimed.add(node)
          for (const assertion of rule.asserts) {
            if (!evaluateXPathToBoolean(assertion.test, node, null, null, this.options)) {
              failures.push({
                patternId: pattern.id,
                assertId: assertion.id,
                context: rule.context,
                message: assertion.message,
              })
            }
          }
        }
      }
    }
    return failures
  }

  validateString(xml: string): Failure[] {
    return this.validateDocument(sync(xml))
  }

  validate(xml: string): ValidationResult {
    const fired = this.validateString(xml)
    return {
      valid: fired.length === 0,
      artefactsVersion: this.artefactsVersion,
      runnerVersion: RUNNER_VERSION,
      decimalExact: DECIMAL_EXACT,
      fired,
    }
  }
}
