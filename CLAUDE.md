# en16931 — project brief

EN 16931 e-invoice validator: a pure-TypeScript Schematron runner on fontoxpath
executing the vendored CEF artefacts. Published on npm as `en16931` — unscoped,
a firm decision, never rename. CII is the stable surface; UBL is experimental
until it has its own mutation corpus and CI parity. Correctness is the product;
performance is the bonus.

## Layout (Bun-workspaces monorepo)

- `packages/en16931/` — the single published package
  - `src/` — runner + artefact loaders
  - `test/` — runner tests + mutation corpus (`mutations.ts`)
  - `scripts/` — `parity.ts` (Saxon parity + KNOWN_DIVERGENCES ledger), `bench.ts`
  - `cef/` — vendored CEF artefacts (EUPL-1.2). **Never edit any file in here**;
    bytes must stay identical to the upstream commit pinned in `cef/VENDORED.md`.
    Moving the whole directory is allowed; `LICENSE.txt` and `VENDORED.md` move
    with it.
- The `@en16931` npm org is reserved for future packages (Factur-X PDF
  extraction, FR EXT-FR-FE rules, CLI).

## Hard invariants — never break, never "improve"

1. **Public API frozen**: exports `SchematronRunner`, `SchematronParseError`,
   `DECIMAL_EXACT`, `loadCiiSchematron`, `loadUblSchematron`; types
   `ValidationResult`, `Failure`, `Assertion`, `Rule`, `Pattern`. ESM only.
   Additions are semver events; removals/renames are breaking.
2. **Loader path invariant**: `src/index.ts` resolves `../cef/...` relative to
   the compiled file, which sits one level below the package root in both
   `src/` and published `dist/`. Any layout change must keep this true in
   source AND in the published tarball.
3. **No silent skips**: Schematron constructs outside the subset (`let`,
   `value-of`, `report`, abstract patterns, `defaultPhase`) are hard load-time
   errors. Never add support by skipping.
4. **Mutation corpus**: one mutation breaks exactly one thing; `expected`
   justified by published rule text; `allowed` only for real cascades, each
   commented. Never widen `allowed`/`expected` to green CI.
5. **Parity ledger** (`scripts/parity.ts` `KNOWN_DIVERGENCES`): a new entry
   requires textual proof IN THE COMMIT (rule test quoted from `.sch`, source
   binding AND compiled XSLT, plus a probe of the reference). No proof → fix
   the runner.
6. **`release.yml` filename must not change** — npm OIDC trusted publishing is
   bound to repo + that workflow filename.
7. **README editorial rules (mentor-imposed)**: three blocks (what it does /
   the proof / what it does not do); never the words "certified", "official",
   "approved"; claims follow code, never ahead of it; UBL stays labelled
   experimental until promoted by evidence. Root `README.md` is canonical;
   `packages/en16931/README.md` is a byte-identical copy refreshed by the
   package's `prepack` script — edit the root one only.

## Commands

- `bun install` — lockfile is v2: requires Bun 1.4 (canary today; CI pinned).
  Contributor-only constraint; consumers are unaffected.
- `bun test` — 70 tests (CEF examples clean for CII and UBL, mutation corpus,
  audit trail, construct guards, loaders). All must pass; never weaken.
- Parity: `docker run --rm -p 8080:8080 easybill/en16931-validator:0.6.0`,
  then `bun run parity` from `packages/en16931`.
- `bun run build` in `packages/en16931` — tsc compile + declarations into a
  flat `dist/` (no nesting: the loader path invariant depends on it).
- Bun-first: `bun <file>`, `bun test`, `bunx` — not node/jest/npx.

## Hard-won facts (do not relearn)

- BR-CO-17/BR-S-09 tolerance in the CEF artefacts is **±1 whole unit**, not
  ±0.01 — a one-cent VAT error passes by design. Mutations must exceed 1.00.
- fontoxpath computes `xs:decimal` in float64
  ([#686](https://github.com/FontoXML/fontoxpath/issues/686)); we depend on the
  published fork `fontoxpath-exact-decimal` aliased as `fontoxpath`. Drop the
  alias when upstream fixes #686. The runner probes the engine at load time
  (`decimalExact` in every result).
- `fn:sum()` still accumulates in float64 (fork doesn't cover it). Invisible on
  CEF artefacts (sums wrapped in `round(...*100) div 100`); MUST be retested
  when adding FR EXT-FR-FE rules.
- easybill/en16931-validator 0.6.0 executes an older artefact vintage than it
  reports — that is what the 4 ledger entries document. When they ship 1.3.16,
  those entries must be removed (CI will flag inverted diffs).

## Workflow

- Conventional Commits (`type(scope): description`); release-please reads them.
- Never amend commits; ask before any action on main.
- Docs in English; BACKLOG.md is the working ledger — record decisions and
  hard-won facts there.
