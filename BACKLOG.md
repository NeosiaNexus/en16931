# Backlog

Working notes, kept honest. The actionable roadmap items below are meant to be
mirrored as GitHub issues for visibility; this file is the ledger of decisions
and hard-won facts, which must survive issue closure.

## Done

- **0.1.0 PUBLISHED (2026-07-28)**: `en16931@0.1.0` on npm, published by CI
  with provenance after the release PR merged. Smoke-verified from the public
  registry on Node 22 and Bun (XRechnung-O valid, `decimalExact: true`). Fork
  `fontoxpath-exact-decimal@3.34.0-exact.2` (exports map for Node ESM).
  Publishing hygiene: this repo now uses npm trusted publishing (OIDC, bound to
  `release.yml`); remaining — configure the same on the
  `fontoxpath-exact-decimal` package, then revoke the exposed granular token.

- **UBL decided (2026-07-28)**: the preprocessed UBL artefact (104 rules, 979
  asserts, ~648 of them UBL-CR) passes the construct guard — same syntactic
  subset as CII. 19/19 CEF examples clean, ~257 ms/file average (74–480 ms
  warm). Saxon smoke parity: 0 diffs on the 19 files. Remaining for UBL: a
  dedicated mutation corpus + integration into the parity script and CI.

- **Upstream fontoxpath issue filed**:
  <https://github.com/FontoXML/fontoxpath/issues/686> (short PR proposed; the
  local patch has since been replaced by the published fork).

- **Decimal fork shipped (2026-07-28)** — `fontoxpath-exact-decimal` published
  by CI with provenance, dependency switched via the `fontoxpath` alias, local
  patch deleted, full suite green against the published package (40 tests +
  34-file parity, 0 diffs). Noted on #686. Lesson kept from the blocker: **the
  decimal patch does not travel with the package** — `patchedDependencies`
  applies only to our workspace, so a plain `npm install en16931` would have
  resolved vanilla float64 fontoxpath and turned BR-O-08 into a false positive
  on the user's machine. Hence the load-time probe (`1.1 + 2.2 = 3.3`,
  `decimalExact` in every result, explicit warning; probe verified `false` on
  vanilla fontoxpath) and the rule: **never publish relying on a local patch.**

- **The repo, professionalized (2026-07-28)**: name settled (`en16931`,
  unscoped, final; `@en16931` org reserved for future packages), Bun-workspaces
  monorepo (`packages/en16931`), community health files, hardened CI.
  Positioning decision recorded: Factur-X/CII first — the initial FR market is
  dominated by Factur-X/CII; UBL stays in-package but experimental, since it
  doubles the maintenance surface at every CEF release.

## Next

1. **UBL mutation corpus + UBL parity in CI** — same discipline as CII;
   promotion of UBL to "stable surface" happens then, not before.
2. **Factur-X PDF extraction**, then the **FR layer (EXT-FR-FE)** — after the
   proven base.

## To publish when the time comes (README/blog material)

- The BR-CO-17/BR-S-09 tolerance in the CEF artefacts is **±1 whole unit**,
  not ±0.01: a one-cent error on the VAT amount passes by design. Documented
  nowhere upstream, recurring source of confusion.

## Identified risks to retest later

- **`fn:sum()` accumulates in float64 in fontoxpath** (not covered by the
  operator patch in the fork). Invisible on the CEF artefacts because their
  authors wrap every sum in `round(... * 100) div 100`. The French
  **EXT-FR-FE-\*** extensions are not written by the CEF authors — no guarantee
  of the same defensive hygiene. When adding the FR layer: specifically test
  the French arithmetic rules with amounts that drift a float sum (e.g. many
  0.1 lines), and if it bites, extend the fork to `fn:sum`/`fn:avg`.

- **The easybill reference validator (0.6.0) executes an artefact vintage
  older than it reports** — divergences documented and explicitly tolerated in
  `packages/en16931/scripts/parity.ts` (BR-63, BR-50/BR-61/CII-SR-470,
  CII-SR-009: published texts identical in 1.3.15 and 1.3.16, our behaviour
  matches the text, theirs does not). Watch their releases: when they move to
  1.3.16, those ledger entries must disappear (CI will flag it when the diffs
  invert).

- **Schematron scope**: the runner executes the preprocessed EN 16931
  artefacts, not Schematron at large. Load-time guard: any construct outside
  the subset (`let`, `value-of`, `report`, abstract patterns, `defaultPhase`)
  is a hard error, never a silent skip.

## Product scope reminder

No generator, no platform transport. The EN 16931 validator that doesn't exist
in JS. Argument #1 is correctness (Saxon parity verified in CI, mutation
corpus); performance (~50–200 ms/invoice) is the bonus.
