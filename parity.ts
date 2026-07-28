// Assert-by-assert parity check against the Java/Saxon reference validator
// (easybill/en16931-validator, expected on localhost:8080 — see ci.yml).
// Runs the whole corpus — official valid examples AND mutated invoices — through
// both engines and diffs the sets of fired rule ids. Exits non-zero on any diff.
//
// ── RULE FOR KNOWN_DIVERGENCES — read before adding a line ──────────────────
// This ledger is the entire value of the parity guarantee. It never grows to
// make CI pass. A new entry requires, IN THE COMMIT THAT ADDS IT, the textual
// proof that the reference deviates from the published rule text: the rule's
// test quoted from the pinned CEF release (.sch, source binding AND compiled
// XSLT), plus the probe showing which variant the reference actually executes.
// No proof → no entry → fix the runner instead. An entry that cannot cite its
// evidence is a swept-under-the-rug false negative waiting to happen.

import { readFileSync, readdirSync } from 'node:fs'
import { SchematronRunner } from './runner'
import { MUTATIONS } from './mutations'

const VALIDATOR_URL = process.env.VALIDATOR_URL ?? 'http://localhost:8080/validation'

const runner = new SchematronRunner(
  readFileSync('cef/cii/schematron/preprocessed/EN16931-CII-validation-preprocessed.sch', 'utf8')
)

async function saxonRules(xml: string): Promise<{ rules: string[]; version: string }> {
  const res = await fetch(VALIDATOR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: xml,
  })
  if (!res.ok) throw new Error(`validator HTTP ${res.status}`)
  const j = (await res.json()) as {
    errors?: { rule_id: string }[]
    warnings?: { rule_id: string }[]
    meta?: { validation_profile_version?: string }
  }
  return {
    rules: [...(j.errors ?? []), ...(j.warnings ?? [])].map((e) => e.rule_id),
    version: j.meta?.validation_profile_version ?? '?',
  }
}

// Known divergences: cases where the reference bundle demonstrably executes a
// different vintage of the CII binding than the artefacts it reports. For each
// rule below, the published 1.3.15 and 1.3.16 tests are IDENTICAL (verified in
// the .sch, the source binding and the compiled XSLT on the release branches),
// our behaviour matches that published text, and the reference deviates from it:
//  - BR-63: published test only requires @schemeID on the buyer electronic
//    address; the reference also requires non-empty URIID content (probed:
//    filling the URIID silences it, removing the element silences it).
//  - BR-50/BR-61/CII-SR-470: published context matches an empty
//    PayeePartyCreditorFinancialAccount under payment means 30/58; the
//    reference fires nothing on it.
//  - CII-SR-009: published test is count(GuidelineSpecifiedDocumentContextParameter)=1,
//    unaffected by removing its child ID; the reference fires it anyway.
// Any diff NOT listed here fails the run.
const KNOWN_DIVERGENCES = new Map<string, Set<string>>([
  ['valid: XRechnung-O.xml', new Set(['BR-63'])],
  ['mutated: BR-O-08: not-subject-to-VAT taxable amount off by 0.01', new Set(['BR-63'])],
  ['mutated: BR-01: remove specification identifier', new Set(['CII-SR-009'])],
  ['mutated: BR-50: remove payment account identifier', new Set(['BR-50', 'BR-61', 'CII-SR-470'])],
])

const corpus: { name: string; xml: string }[] = [
  ...readdirSync('cef/cii/examples')
    .sort()
    .map((f) => ({ name: `valid: ${f}`, xml: readFileSync(`cef/cii/examples/${f}`, 'utf8') })),
  ...MUTATIONS.map((m) => ({ name: `mutated: ${m.name}`, xml: m.apply(readFileSync(m.base, 'utf8')) })),
]

let diffs = 0
let saxonVersion = '?'
for (const { name, xml } of corpus) {
  const ours = new Set(runner.validateString(xml).map((f) => f.assertId))
  const saxon = await saxonRules(xml)
  saxonVersion = saxon.version
  const theirs = new Set(saxon.rules)
  const known = KNOWN_DIVERGENCES.get(name) ?? new Set()
  const missing = [...theirs].filter((id) => !ours.has(id) && !known.has(id))
  const extra = [...ours].filter((id) => !theirs.has(id) && !known.has(id))
  if (missing.length || extra.length) {
    diffs++
    console.log(`DIFF ${name}`)
    if (missing.length) console.log(`  saxon fired, we did not (false negatives): ${missing.join(', ')}`)
    if (extra.length) console.log(`  we fired, saxon did not (false positives): ${extra.join(', ')}`)
  } else if (known.size) {
    console.log(`OK*  ${name} (known reference divergence tolerated: ${[...known].join(', ')})`)
  } else {
    console.log(`OK   ${name} (${ours.size} rule${ours.size === 1 ? '' : 's'} fired by both)`)
  }
}

console.log(
  `\n${corpus.length} files compared (ours: CEF 1.3.16 preprocessed, saxon: ${saxonVersion}) — ${diffs} diff${diffs === 1 ? '' : 's'}`
)
process.exit(diffs ? 1 : 0)
