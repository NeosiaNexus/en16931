import { test, expect, describe } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { SchematronRunner } from './runner'
import { MUTATIONS } from '../mutations'

const runner = new SchematronRunner(
  readFileSync('cef/cii/schematron/preprocessed/EN16931-CII-validation-preprocessed.sch', 'utf8')
)

describe('official CEF examples are valid (no false positives)', () => {
  for (const f of readdirSync('cef/cii/examples').sort()) {
    test(f, () => {
      const failures = runner.validateString(readFileSync(`cef/cii/examples/${f}`, 'utf8'))
      expect(failures.map((x) => x.assertId)).toEqual([])
    })
  }
})

describe('mutated invoices trigger the expected rule — and no other (no false negatives)', () => {
  for (const m of MUTATIONS) {
    test(m.name, () => {
      const fired = runner.validateString(m.apply(readFileSync(m.base, 'utf8'))).map((f) => f.assertId)
      for (const id of m.expected) expect(fired).toContain(id)
      const tolerated = new Set([...m.expected, ...m.allowed])
      expect(fired.filter((id) => !tolerated.has(id))).toEqual([])
    })
  }
})

describe('validation result carries its audit trail', () => {
  test('validate() reports rule-set and runner versions alongside the verdict', () => {
    const result = runner.validate(readFileSync('cef/cii/examples/CII_example1.xml', 'utf8'))
    expect(result.valid).toBe(true)
    expect(result.fired).toEqual([])
    expect(result.artefactsVersion).toBe('1.3.16')
    expect(result.runnerVersion).toMatch(/^\d+\.\d+\.\d+$/)
    // In this workspace fontoxpath is patched (patches/fontoxpath@3.34.0.patch),
    // so the probe must report exact decimal arithmetic. On vanilla fontoxpath
    // this is false — verified separately, the probe cannot be simulated here.
    expect(result.decimalExact).toBe(true)
  })
})

describe('out-of-scope Schematron constructs are a hard error, never silently skipped', () => {
  const wrap = (body: string) =>
    `<schema xmlns="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2">${body}</schema>`

  test('<let> throws', () => {
    expect(() => new SchematronRunner(wrap('<let name="x" value="1"/>'))).toThrow(/Unsupported Schematron construct <let>/)
  })
  test('<value-of> in a message throws', () => {
    expect(
      () => new SchematronRunner(wrap('<pattern id="p"><rule context="/*"><assert test="true()">x <value-of select="."/></assert></rule></pattern>'))
    ).toThrow(/Unsupported Schematron construct <value-of>/)
  })
  test('<report> throws', () => {
    expect(
      () => new SchematronRunner(wrap('<pattern id="p"><rule context="/*"><report test="true()">x</report></rule></pattern>'))
    ).toThrow(/Unsupported Schematron construct <report>/)
  })
  test('abstract pattern throws', () => {
    expect(() => new SchematronRunner(wrap('<pattern abstract="true" id="p"/>'))).toThrow(/Abstract patterns/)
  })
  test('defaultPhase throws', () => {
    expect(
      () =>
        new SchematronRunner(
          `<schema xmlns="http://purl.oclc.org/dsdl/schematron" defaultPhase="ph"><phase id="ph"/></schema>`
        )
    ).toThrow(/defaultPhase/)
  })
})
