# en16931

[![CI](https://github.com/NeosiaNexus/en16931/actions/workflows/ci.yml/badge.svg)](https://github.com/NeosiaNexus/en16931/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/en16931.svg)](https://www.npmjs.com/package/en16931)

EN 16931 e-invoice validation in pure TypeScript. Runs the European
Commission's (CEF) published Schematron artefacts — pinned by commit, files
unmodified — without Java, Saxon or Docker.

Use it where a Java validator can't follow: in your test suite and CI without
spinning up a container, in-process and offline in Node or Bun — and in the
browser, where your accounting data never leaves the machine.

## Install

```sh
npm install en16931
# or
bun add en16931
```

ESM only. Node and Bun are supported; 0.1.0 was smoke-tested from the public
registry on Node 22 and Bun. A plain install resolves an XPath engine with
exact decimal arithmetic — see [Decimal arithmetic](#decimal-arithmetic).

```ts
import { SchematronRunner, loadCiiSchematron } from 'en16931'

const runner = new SchematronRunner(loadCiiSchematron())
const result = runner.validate(invoiceXml)
// {
//   valid: false,
//   artefactsVersion: '1.3.16',   // parsed from the artefact file itself
//   runnerVersion: '0.1.0',
//   decimalExact: true,           // see "Decimal arithmetic" below
//   fired: [{ assertId: 'BR-CO-10', message: '[BR-CO-10]-Sum of Invoice line net amount...', ... }]
// }
```

Every result carries the artefact version it was checked against, parsed from
the artefact file header — not declared by hand. A compliance verdict without
"against which rule set, when" is worthless; log the result object and you can
still prove two years later what was checked.

## What it does

- Executes the [CEF eInvoicing validation artefacts](https://github.com/ConnectingEurope/eInvoicing-EN16931):
  a subset (Schematron, example invoices, licence — not the XSD/XSLT/EDIFACT
  parts) vendored at a commit that carries release 1.3.16, individual files
  unmodified, under EUPL-1.2. The release number is a label; the pin is the
  commit SHA — upstream release branches have been observed to move. Exact
  provenance: [`packages/en16931/cef/VENDORED.md`](packages/en16931/cef/VENDORED.md).
- **CII (UN/CEFACT Cross Industry Invoice — the syntax under Factur-X/ZUGFeRD):
  stable surface.** ~50–200 ms per invoice.
- **UBL: experimental.** Passes the 19 CEF example invoices (~257 ms per invoice)
  and a smoke parity check against the Java reference, but does not yet have the
  mutation corpus and CI parity the CII surface has. It will be promoted when it
  does.

## The proof

Correctness is the product; the numbers are in CI, not in prose:

- **No false positives**: every example invoice shipped with the CEF artefact
  release validates clean.
- **No false negatives**: a mutation corpus breaks one thing at a time in valid
  invoices (missing mandatory terms, one-cent total errors, invalid codes,
  off-scheme VAT breakdowns…) and asserts that the expected rule fires — and no
  other. Unexpected rule firings fail the build.
- **Assert-by-assert parity with the Java/Saxon reference validator**
  ([easybill/en16931-validator](https://github.com/easybill/en16931-validator)) on
  34 files, including 19 error cases, on every commit. The four known divergences
  are documented in the ledger in
  [`packages/en16931/scripts/parity.ts`](packages/en16931/scripts/parity.ts) —
  each with textual proof that the reference deviates from the published rule
  text of its own artefact release. The ledger only grows with proof attached;
  otherwise the runner gets fixed instead.

Out-of-scope Schematron constructs are a hard load-time error, never a silent
skip: this runner executes the EN 16931 artefacts as published, not Schematron
at large. A future artefact release using an unsupported construct fails loudly
instead of silently skipping rules.

## Decimal arithmetic

XPath requires exact `xs:decimal` arithmetic; stock fontoxpath computes it in
float64, which makes arithmetic rules misfire on valid invoices
(`1.1 + 2.2 = 3.3` → `false` — [FontoXML/fontoxpath#686](https://github.com/FontoXML/fontoxpath/issues/686)).

This package depends on
[`fontoxpath-exact-decimal`](https://www.npmjs.com/package/fontoxpath-exact-decimal)
— a temporary, minimal fork carrying the fix, aliased as `fontoxpath`, to be
dropped in favour of upstream the moment #686 is fixed. A plain install
therefore resolves an engine with exact decimal arithmetic, and the parity
claims above were verified against that published fork, not a local patch. The
runner still probes the engine at load time and reports the truth in every
result as `decimalExact`; should your dependency tree force stock fontoxpath
instead, you get an explicit warning and `decimalExact: false`, never a silent
degradation.

## What it does not do

- It does not make you compliant. It executes the published rule set; conformity
  of your invoicing process is your responsibility.
- No French CTC extensions (EXT-FR-FE-*) yet.
- No Factur-X PDF/A-3 extraction — this validates the XML, not the PDF container.
- No transmission to any platform (PDP/PPF). Validation only, no generation, no
  transport.

This project executes artefacts published by the European Commission. It is not
endorsed by or affiliated with the Commission or any national authority.

## Contributing

This repository is a Bun-workspaces monorepo; the published package lives in
[`packages/en16931`](packages/en16931). The package name stays `en16931`,
unscoped; the `@en16931` npm organisation is reserved for future companion
packages (Factur-X PDF extraction, French EXT-FR-FE rules, a CLI).

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the local parity workflow and
the contribution disciplines (mutation corpus, parity ledger, artefact bumps).
One note for contributors that does **not** affect consumers of the package:
the repo lockfile currently requires Bun 1.4 (canary); CI is pinned
accordingly.

## Maintenance

This project is a commitment, not an experiment: CEF artefact releases will be
tracked and pinned explicitly, and issues will be answered. If maintenance were
ever to stop, it would be announced in this README and the repository archived —
not left to rot while people validate real invoices against a stale rule set.

## License

- Runner code: [MIT](LICENSE).
- Bundled CEF validation artefacts (`packages/en16931/cef/`):
  [EUPL-1.2](packages/en16931/cef/LICENSE.txt), © European Union, individual
  files unmodified, vendored from
  [ConnectingEurope/eInvoicing-EN16931](https://github.com/ConnectingEurope/eInvoicing-EN16931)
  at the commit recorded in
  [`packages/en16931/cef/VENDORED.md`](packages/en16931/cef/VENDORED.md).

SPDX: `MIT AND EUPL-1.2`.
