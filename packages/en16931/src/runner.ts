import { evaluateXPathToBoolean, evaluateXPathToNodes } from 'fontoxpath'
import type { Document, Node } from 'slimdom'
import { sync } from 'slimdom-sax-parser'
import { DECIMAL_EXACT, warnOnceIfInexactDecimal } from './decimal.js'
import { parseSchematron } from './parse.js'
import type { Failure, Pattern, ValidationResult } from './types.js'
import { RUNNER_VERSION } from './version.js'

/**
 * Executes a preprocessed EN 16931 Schematron artefact against invoice
 * documents. Construction parses and checks the entire artefact up front —
 * anything malformed or outside the supported subset throws
 * SchematronParseError there, so a constructed runner is safe to reuse across
 * validations.
 */
export class SchematronRunner {
  private patterns: Pattern[]
  private options: { namespaceResolver: (prefix: string) => string | null }
  readonly artefactsVersion: string

  constructor(schematronXml: string) {
    warnOnceIfInexactDecimal()
    const parsed = parseSchematron(schematronXml)
    this.artefactsVersion = parsed.artefactsVersion
    this.options = { namespaceResolver: parsed.namespaceResolver }
    this.patterns = parsed.patterns
  }

  validateDocument(doc: Document): Failure[] {
    const failures: Failure[] = []
    for (const pattern of this.patterns) {
      // Schematron semantics: within a pattern, the lexically FIRST rule whose
      // context matches a node processes it — later rules never see that node.
      // Correctness rests on rule order (array order = document order of the
      // <rule> elements), not on the order evaluateXPathToNodes enumerates a
      // single rule's matches: the claimed set is keyed by node identity, so a
      // node taken by an earlier rule stays taken whatever that order is.
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
    let doc: Document
    try {
      doc = sync(xml)
    } catch (cause) {
      // Not a verdict: a document that does not parse never reached the rules.
      // Rethrow with context so the caller can tell "this XML is broken" apart
      // from "this invoice violates rule X". Plain Error on purpose — malformed
      // input is the caller's bug; the message and cause carry everything needed.
      throw new Error(`Input is not well-formed XML (nothing was validated): ${(cause as Error).message}`, { cause })
    }
    return this.validateDocument(doc)
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
