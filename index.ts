import { SchematronRunner } from './runner'
import { readFileSync, readdirSync } from 'node:fs'

const t0 = performance.now()
const runner = new SchematronRunner(
  readFileSync('cef/cii/schematron/preprocessed/EN16931-CII-validation-preprocessed.sch', 'utf8')
)
console.log(`schema loaded in ${(performance.now() - t0).toFixed(0)} ms\n`)

let total = 0
for (const f of readdirSync('cef/cii/examples').sort()) {
  const xml = readFileSync(`cef/cii/examples/${f}`, 'utf8')
  const t = performance.now()
  try {
    const failures = runner.validateString(xml)
    const ms = performance.now() - t
    total += ms
    console.log(`${f} → ${failures.length} assertions échouées (${ms.toFixed(0)} ms)`)
    for (const fail of failures) console.log(`    ${fail.assertId}: ${fail.message.slice(0, 100)}`)
  } catch (e) {
    console.log(`${f} → CRASH: ${(e as Error).message}`)
  }
}
console.log(`\ntotal validation: ${total.toFixed(0)} ms`)
