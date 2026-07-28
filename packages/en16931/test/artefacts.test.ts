import { describe, expect, test } from 'bun:test'
import { loadCiiSchematron, loadUblSchematron, SchematronRunner } from '../src/index.js'

// The loaders are the path-resolution contract of the package (../cef/...
// relative to the compiled file). Exercised through the public entry so a
// broken layout fails here before it fails for a consumer.
describe('artefact loaders resolve the vendored CEF files', () => {
  test('loadCiiSchematron returns the preprocessed CII artefact', () => {
    const xml = loadCiiSchematron()
    expect(xml).toContain('http://purl.oclc.org/dsdl/schematron')
    expect(xml).toContain('Schematron version 1.3.16')
  })

  test('loadUblSchematron returns the preprocessed UBL artefact', () => {
    const xml = loadUblSchematron()
    expect(xml).toContain('http://purl.oclc.org/dsdl/schematron')
    expect(xml).toContain('EN16931  model bound to UBL')
  })

  test('both artefacts construct a runner reporting the pinned version', () => {
    expect(new SchematronRunner(loadCiiSchematron()).artefactsVersion).toBe('1.3.16')
    expect(new SchematronRunner(loadUblSchematron()).artefactsVersion).toBe('1.3.16')
  })
})
