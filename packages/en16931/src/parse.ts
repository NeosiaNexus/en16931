import type { Document, Element } from 'slimdom'
import { sync } from 'slimdom-sax-parser'
import type { Pattern } from './types.js'

const SCH_NS = 'http://purl.oclc.org/dsdl/schematron'

/**
 * Thrown when the Schematron source handed to SchematronRunner is not
 * well-formed XML, is not a Schematron document, is missing required
 * attributes, or uses a construct outside the subset this runner executes.
 * Construction-time only: a successfully constructed runner never throws this.
 */
export class SchematronParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'SchematronParseError'
  }
}

/** Internal parse product consumed by SchematronRunner — not part of the public API. */
export type ParsedSchematron = {
  artefactsVersion: string
  namespaceResolver: (prefix: string) => string | null
  patterns: Pattern[]
}

function childElements(el: Element, localName: string): Element[] {
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
    throw new SchematronParseError(
      `Unsupported Schematron construct <${el.localName}>: this runner executes the EN 16931 preprocessed artefacts only. Refusing to skip rules silently.`,
    )
  }
  if (el.localName === 'pattern' && (el.getAttribute('abstract') === 'true' || el.hasAttribute('is-a'))) {
    throw new SchematronParseError('Abstract patterns are not supported: use the preprocessed (expanded) artefact.')
  }
  for (let n = el.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1) assertSupported(n as Element)
  }
}

// A missing required attribute must fail here, with a message naming the
// element and where it sits — not later, as an undefined leaking into an XPath
// evaluation with a stack trace pointing nowhere.
function requiredAttr(el: Element, name: string, where: string): string {
  const value = el.getAttribute(name)
  if (value === null) {
    throw new SchematronParseError(`Malformed Schematron: <${el.localName}> without a '${name}' attribute (${where}).`)
  }
  return value
}

export function parseSchematron(schematronXml: string): ParsedSchematron {
  let dom: Document
  try {
    dom = sync(schematronXml)
  } catch (cause) {
    throw new SchematronParseError(`Schematron source is not well-formed XML: ${(cause as Error).message}`, { cause })
  }

  // A non-Schematron root would otherwise parse to zero patterns — a runner
  // that finds every document valid. Hard error, same no-silent-skip rule.
  const schema = dom.documentElement
  if (!schema || schema.namespaceURI !== SCH_NS || schema.localName !== 'schema') {
    throw new SchematronParseError(
      `Not a Schematron document: root element is <${schema ? schema.localName : 'none'}>, expected <schema> in ${SCH_NS}.`,
    )
  }

  assertSupported(schema)
  if (schema.hasAttribute('defaultPhase')) {
    throw new SchematronParseError('defaultPhase is not supported: this runner always evaluates every pattern (#ALL).')
  }

  // The version feeds the audit trail and is informational: custom artefacts
  // without the CEF header comment legitimately report 'unknown', never an error.
  const artefactsVersion = /Schematron version ([\d.]+)/.exec(schematronXml)?.[1] ?? 'unknown'

  const namespaces: Record<string, string> = {}
  for (const ns of childElements(schema, 'ns')) {
    namespaces[requiredAttr(ns, 'prefix', 'namespace declaration')] = requiredAttr(ns, 'uri', 'namespace declaration')
  }

  const patterns: Pattern[] = childElements(schema, 'pattern').map((pattern) => {
    const patternId = pattern.getAttribute('id') ?? ''
    return {
      id: patternId,
      rules: childElements(pattern, 'rule').map((rule) => {
        const context = requiredAttr(rule, 'context', `pattern '${patternId}'`)
        return {
          context,
          // A rule context is a match pattern: relative expressions match anywhere
          // in the document. Absolute ones can run as-is — both evaluate once, from the root.
          query: context.startsWith('/') ? context : `//(${context})`,
          asserts: childElements(rule, 'assert').map((a) => ({
            id: a.getAttribute('id') ?? '',
            test: requiredAttr(a, 'test', `rule context '${context}'`),
            message: (a.textContent ?? '').trim(),
          })),
        }
      }),
    }
  })

  // Zero patterns means a validator that can never fire — every document would
  // come back valid. Out of scope for a compliance runner: refuse loudly.
  if (patterns.length === 0) {
    throw new SchematronParseError(
      'Schematron contains no patterns: a validator that can never fire would report every document as valid. Refusing.',
    )
  }

  return { artefactsVersion, namespaceResolver: (prefix) => namespaces[prefix] ?? null, patterns }
}
