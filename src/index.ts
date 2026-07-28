export { SchematronRunner, DECIMAL_EXACT } from './runner'
export type { ValidationResult, Failure, Assertion, Rule, Pattern } from './runner'

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Resolved relative to this file, which lives one level below the package root
// both in source (src/) and in the published build (dist/).
const artefact = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')

/**
 * Preprocessed CEF Schematron for CII (UN/CEFACT Cross Industry Invoice — the
 * syntax under Factur-X/ZUGFeRD). Stable surface.
 */
export const loadCiiSchematron = (): string =>
  artefact('../cef/cii/schematron/preprocessed/EN16931-CII-validation-preprocessed.sch')

/**
 * Preprocessed CEF Schematron for UBL. EXPERIMENTAL: passes the official
 * examples but does not yet have the mutation corpus and CI parity the CII
 * surface has — see the README.
 */
export const loadUblSchematron = (): string =>
  artefact('../cef/ubl/schematron/preprocessed/EN16931-UBL-validation-preprocessed.sch')
