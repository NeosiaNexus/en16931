import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// INVARIANT: artefacts are resolved relative to THIS file, and this file lives
// exactly one level below the package root in every form the code takes —
// src/artefacts.ts in development, dist/artefacts.js in the published build —
// so `../cef/...` always lands on <package root>/cef/. If dist/ ever gains
// nesting depth (e.g. dist/src/), this resolution must be adapted in the same
// change, in both source and build.
const artefact = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')

/**
 * Preprocessed CEF Schematron for CII (UN/CEFACT Cross Industry Invoice — the
 * syntax under Factur-X/ZUGFeRD). Stable surface.
 */
export const loadCiiSchematron = (): string =>
  artefact('../cef/cii/schematron/preprocessed/EN16931-CII-validation-preprocessed.sch')

/**
 * Preprocessed CEF Schematron for UBL. EXPERIMENTAL: the 19 CEF example invoices
 * validate clean (enforced by the UBL smoke test), but this surface has neither
 * the mutation corpus nor the CI parity check the CII surface has — see the README.
 */
export const loadUblSchematron = (): string =>
  artefact('../cef/ubl/schematron/preprocessed/EN16931-UBL-validation-preprocessed.sch')
