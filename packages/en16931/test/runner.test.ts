import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCiiSchematron, SchematronParseError, SchematronRunner } from '../src/index.js'
import { MUTATIONS } from './mutations.js'

const CII_EXAMPLES = fileURLToPath(new URL('../cef/cii/examples/', import.meta.url))

// Built through the public entry on purpose: this is exactly what a consumer runs.
const runner = new SchematronRunner(loadCiiSchematron())

describe('CEF example invoices are valid (no false positives)', () => {
  for (const f of readdirSync(CII_EXAMPLES).sort()) {
    test(f, () => {
      const failures = runner.validateString(readFileSync(join(CII_EXAMPLES, f), 'utf8'))
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
    const result = runner.validate(readFileSync(join(CII_EXAMPLES, 'CII_example1.xml'), 'utf8'))
    expect(result.valid).toBe(true)
    expect(result.fired).toEqual([])
    expect(result.artefactsVersion).toBe('1.3.16')
    expect(result.runnerVersion).toMatch(/^\d+\.\d+\.\d+$/)
    // This workspace resolves fontoxpath to the exact-decimal fork
    // (fontoxpath-exact-decimal, upstream FontoXML/fontoxpath#686), so the
    // probe must report exact decimal arithmetic. On vanilla fontoxpath this
    // is false — verified separately, the probe cannot be simulated here.
    expect(result.decimalExact).toBe(true)
  })

  test('the version constant matches package.json (release-please rewrites both)', () => {
    // RUNNER_VERSION is a plain constant so bundled consumers get a correct,
    // inlined value (no runtime package.json read — see src/version.ts). This
    // guard is what makes the constant safe: any drift from package.json fails
    // the suite, and CI runs the suite before every publish.
    const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')) as {
      version: string
    }
    const example = readFileSync(join(CII_EXAMPLES, 'CII_example1.xml'), 'utf8')
    expect(runner.validate(example).runnerVersion).toBe(pkg.version)
  })
})

describe('out-of-scope Schematron constructs are a hard error, never silently skipped', () => {
  const wrap = (body: string) =>
    `<schema xmlns="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2">${body}</schema>`

  test('<let> throws', () => {
    expect(() => new SchematronRunner(wrap('<let name="x" value="1"/>'))).toThrow(
      /Unsupported Schematron construct <let>/,
    )
  })
  test('<value-of> in a message throws', () => {
    expect(
      () =>
        new SchematronRunner(
          wrap(
            '<pattern id="p"><rule context="/*"><assert test="true()">x <value-of select="."/></assert></rule></pattern>',
          ),
        ),
    ).toThrow(/Unsupported Schematron construct <value-of>/)
  })
  test('<report> throws', () => {
    expect(
      () =>
        new SchematronRunner(
          wrap('<pattern id="p"><rule context="/*"><report test="true()">x</report></rule></pattern>'),
        ),
    ).toThrow(/Unsupported Schematron construct <report>/)
  })
  test('abstract pattern throws', () => {
    expect(() => new SchematronRunner(wrap('<pattern abstract="true" id="p"/>'))).toThrow(/Abstract patterns/)
  })
  test('defaultPhase throws', () => {
    expect(
      () =>
        new SchematronRunner(
          `<schema xmlns="http://purl.oclc.org/dsdl/schematron" defaultPhase="ph"><phase id="ph"/></schema>`,
        ),
    ).toThrow(/defaultPhase/)
  })
})

describe('malformed artefacts fail loudly at construction, never at validation time', () => {
  const wrap = (body: string) =>
    `<schema xmlns="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2">${body}</schema>`

  test('parse failures are SchematronParseError (typed, catchable)', () => {
    let caught: unknown
    try {
      new SchematronRunner('<not-schematron/>')
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(SchematronParseError)
  })
  test('source that is not well-formed XML throws with context', () => {
    expect(() => new SchematronRunner('this is not xml')).toThrow(/Schematron source is not well-formed XML/)
  })
  test('a root element that is not sch:schema throws (would otherwise validate everything)', () => {
    expect(() => new SchematronRunner('<not-schematron/>')).toThrow(/Not a Schematron document/)
  })
  test('a schema with zero patterns throws (a validator that can never fire)', () => {
    expect(() => new SchematronRunner(wrap('<title>empty</title>'))).toThrow(/contains no patterns/)
  })
  test('<rule> without a context attribute throws', () => {
    expect(
      () => new SchematronRunner(wrap('<pattern id="p"><rule><assert test="true()">x</assert></rule></pattern>')),
    ).toThrow(/<rule> without a 'context' attribute \(pattern 'p'\)/)
  })
  test('<assert> without a test attribute throws', () => {
    expect(
      () => new SchematronRunner(wrap('<pattern id="p"><rule context="/*"><assert id="a">x</assert></rule></pattern>')),
    ).toThrow(/<assert> without a 'test' attribute \(rule context '\/\*'\)/)
  })
  test('<ns> without a prefix attribute throws', () => {
    expect(
      () =>
        new SchematronRunner(
          wrap('<ns uri="urn:x"/><pattern id="p"><rule context="/*"><assert test="true()">x</assert></rule></pattern>'),
        ),
    ).toThrow(/<ns> without a 'prefix' attribute/)
  })
})

describe('malformed input XML is a hard error with context, not a verdict', () => {
  test('validateString on non-XML throws, naming the real problem', () => {
    expect(() => runner.validateString('definitely not an invoice')).toThrow(/Input is not well-formed XML/)
  })
})
