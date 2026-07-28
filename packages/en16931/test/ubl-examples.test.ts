import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadUblSchematron, SchematronRunner } from '../src/index.js'

// UBL is the EXPERIMENTAL surface: no mutation corpus, no CI parity — see the
// README. This smoke test enforces the one claim the loader's doc comment
// makes: the 19 CEF example invoices validate with zero failures (~4-5 s total).
// Note: BIS3_Invoice_negativ.XML is negative against PEPPOL BIS rules, not the
// EN 16931 core model — it is clean under these artefacts.
const UBL_EXAMPLES = fileURLToPath(new URL('../cef/ubl/examples/', import.meta.url))

const runner = new SchematronRunner(loadUblSchematron())

describe('CEF UBL example invoices are valid (no false positives, experimental surface)', () => {
  for (const f of readdirSync(UBL_EXAMPLES).sort()) {
    test(f, () => {
      const failures = runner.validateString(readFileSync(join(UBL_EXAMPLES, f), 'utf8'))
      expect(failures.map((x) => x.assertId)).toEqual([])
    })
  }
})
