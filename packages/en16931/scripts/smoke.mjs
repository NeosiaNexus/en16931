// Publish smoke test, on plain Node (no Bun, no TypeScript): pack the package
// exactly as `npm publish` would, install the tarball into a scratch project,
// and validate a real invoice from the installed copy. This is the only check
// that exercises the artifact consumers actually receive: the files whitelist
// (are the cef schematrons in the tarball?), the exports map, the
// import.meta.url-relative artefact paths, and the runtime-read version.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgDir = fileURLToPath(new URL('..', import.meta.url))
const pkgVersion = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version
const exampleXml = join(pkgDir, 'cef', 'cii', 'examples', 'CII_example1.xml')

const work = mkdtempSync(join(tmpdir(), 'en16931-smoke-'))
try {
  const packOut = execFileSync('npm', ['pack', '--json', '--pack-destination', work], {
    cwd: pkgDir,
    encoding: 'utf8',
  })
  const filename = JSON.parse(packOut)[0].filename
  writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'smoke', private: true, type: 'module' }))
  execFileSync('npm', ['install', '--no-audit', '--no-fund', join(work, filename)], { cwd: work, stdio: 'inherit' })

  // The consumer script lives INSIDE the scratch project so `import 'en16931'`
  // goes through the published exports map, not through this repo.
  writeFileSync(
    join(work, 'consume.mjs'),
    `import { SchematronRunner, DECIMAL_EXACT, loadCiiSchematron, loadUblSchematron } from 'en16931'
import { readFileSync } from 'node:fs'

const fail = (msg) => { console.error('smoke FAIL: ' + msg); process.exit(1) }

if (DECIMAL_EXACT !== true) fail('DECIMAL_EXACT is not true — the published dependency graph does not deliver exact xs:decimal arithmetic')
if (typeof loadUblSchematron() !== 'string') fail('UBL schematron did not load from the tarball')

const runner = new SchematronRunner(loadCiiSchematron())
const result = runner.validate(readFileSync(process.env.SMOKE_XML, 'utf8'))
if (!result.valid) fail('CEF example invoice reported invalid: ' + JSON.stringify(result.fired))
if (result.artefactsVersion !== '1.3.16') fail('unexpected artefactsVersion: ' + result.artefactsVersion)
if (result.runnerVersion !== process.env.SMOKE_VERSION) fail('runnerVersion ' + result.runnerVersion + ' != package.json version ' + process.env.SMOKE_VERSION)
console.log('smoke OK: en16931@' + result.runnerVersion + ' artefacts ' + result.artefactsVersion + ' decimalExact ' + result.decimalExact)
`,
  )
  execFileSync('node', ['consume.mjs'], {
    cwd: work,
    stdio: 'inherit',
    env: { ...process.env, SMOKE_XML: exampleXml, SMOKE_VERSION: pkgVersion },
  })
} finally {
  rmSync(work, { recursive: true, force: true })
}
