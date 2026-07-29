// Public surface of the package. Everything importable from 'en16931' is
// re-exported here, and only here — the other modules are internal layout.
export { loadCiiSchematron, loadUblSchematron } from './artefacts.js'
export { DECIMAL_EXACT } from './decimal.js'
export { SchematronParseError } from './parse.js'
export { SchematronRunner } from './runner.js'
export type { Assertion, Failure, Pattern, Rule, ValidationResult } from './types.js'
