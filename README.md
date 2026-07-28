# en16931

EN 16931 e-invoice validation in pure TypeScript. Runs the official European
Commission (CEF) Schematron artefacts — pinned, unmodified — without Java,
Saxon or Docker.

```ts
import { SchematronRunner } from 'en16931'

const runner = new SchematronRunner(ciiArtefacts)
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

- Executes the [CEF eInvoicing validation artefacts](https://github.com/ConnectingEurope/eInvoicing-EN16931)
  (release `validation-1.3.16`, preprocessed form, shipped unmodified under EUPL-1.2).
- **CII (UN/CEFACT Cross Industry Invoice — the syntax under Factur-X/ZUGFeRD):
  stable surface.** ~50–200 ms per invoice.
- **UBL: experimental.** Passes the 19 official examples (~257 ms per invoice) and a
  smoke parity check against the Java reference, but does not yet have the mutation
  corpus and CI parity the CII surface has. It will be promoted when it does.

## The proof

Correctness is the product; the numbers are in CI, not in prose:

- **No false positives**: all official CEF example invoices validate clean.
- **No false negatives**: a mutation corpus breaks one thing at a time in valid
  invoices (missing mandatory terms, one-cent total errors, invalid codes,
  off-scheme VAT breakdowns…) and asserts that the expected rule fires — and no
  other. Unexpected rule firings fail the build.
- **Assert-by-assert parity with the Java/Saxon reference validator**
  ([easybill/en16931-validator](https://github.com/easybill/en16931-validator)) on
  34 files, including 19 error cases, on every commit. The four known divergences
  are documented in the ledger in [`parity.ts`](./parity.ts) — each with textual
  proof that the reference deviates from the published rule text of its own
  artefact release. The ledger only grows with proof attached; otherwise the
  runner gets fixed instead.

Out-of-scope Schematron constructs are a hard load-time error, never a silent
skip: this runner executes the EN 16931 artefacts as published, not Schematron
at large. A future artefact release using an unsupported construct fails loudly
instead of silently skipping rules.

## Decimal arithmetic

XPath requires exact `xs:decimal` arithmetic; stock fontoxpath computes it in
float64, which makes arithmetic rules misfire on valid invoices
(`1.1 + 2.2 = 3.3` → `false` — [FontoXML/fontoxpath#686](https://github.com/FontoXML/fontoxpath/issues/686)).
This package needs the exact-decimal fix to hold its parity claims. The runner
probes the engine at load time and reports the truth in every result as
`decimalExact` — if your install resolves an unfixed engine, you get an explicit
warning and `decimalExact: false`, never a silent degradation.

## What it does not do

- It does not make you compliant. It executes the published rule set; conformity
  of your invoicing process is your responsibility.
- No French CTC extensions (EXT-FR-FE-*) yet.
- No Factur-X PDF/A-3 extraction — this validates the XML, not the PDF container.
- No transmission to any platform (PDP/PPF). Validation only, no generation, no
  transport.

This project executes artefacts published by the European Commission. It is not
endorsed by, affiliated with, or approved by the Commission or any national
authority.

## Maintenance

Actively maintained: CEF artefact releases are tracked and pinned explicitly,
issues are answered. If maintenance were ever to stop, it would be announced in
this README and the repository archived — not left to rot while people validate
real invoices against a stale rule set.

## License

- Runner code: MIT.
- Bundled CEF validation artefacts (`cef/`): [EUPL-1.2](./cef/LICENSE.txt),
  © European Union, shipped unmodified from
  [ConnectingEurope/eInvoicing-EN16931](https://github.com/ConnectingEurope/eInvoicing-EN16931)
  at `validation-1.3.16`.

SPDX: `MIT AND EUPL-1.2`.
