// Deliberately a plain loop, not a benchmarking framework: the questions this
// script answers — how long does the artefact load, how long does one invoice
// take — live at millisecond scale, where performance.now() around the call is
// the whole methodology. A stats harness would add a dependency without adding
// truth. Run: bun scripts/bench.ts
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCiiSchematron, SchematronRunner } from '../src/index.js'

const CII_EXAMPLES = fileURLToPath(new URL('../cef/cii/examples/', import.meta.url))

const t0 = performance.now()
const runner = new SchematronRunner(loadCiiSchematron())
console.log(`schema loaded in ${(performance.now() - t0).toFixed(0)} ms\n`)

let total = 0
for (const f of readdirSync(CII_EXAMPLES).sort()) {
  const xml = readFileSync(join(CII_EXAMPLES, f), 'utf8')
  const t = performance.now()
  const failures = runner.validateString(xml)
  const ms = performance.now() - t
  total += ms
  console.log(`${f} → ${failures.length} failed assertions (${ms.toFixed(0)} ms)`)
  for (const fail of failures) console.log(`    ${fail.assertId}: ${fail.message.slice(0, 100)}`)
}
console.log(`\ntotal validation: ${total.toFixed(0)} ms`)
