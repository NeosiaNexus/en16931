// Public result types. Everything in this file appears in the package's
// declaration output — changes here are API changes.

/** One sch:assert as parsed from the artefact: rule id, XPath test, message. */
export type Assertion = { id: string; test: string; message: string }

/** One sch:rule: its context match pattern, the compiled match query, and its assertions. */
export type Rule = { context: string; query: string; asserts: Assertion[] }

/** One sch:pattern: rules within a pattern run under first-match-wins semantics. */
export type Pattern = { id: string; rules: Rule[] }

/** A fired assertion: which rule failed, in which context, with the published message. */
export type Failure = { patternId: string; assertId: string; context: string; message: string }

// A compliance verdict is meaningless without the rule set it was checked
// against: the result carries the artefact version (parsed from the CEF file
// header) and the runner version, so a logged result remains auditable later.
// `decimalExact` reports whether the XPath engine actually performs exact
// xs:decimal arithmetic in THIS process — see the probe in decimal.ts.
export type ValidationResult = {
  valid: boolean
  artefactsVersion: string
  runnerVersion: string
  decimalExact: boolean
  fired: Failure[]
}
