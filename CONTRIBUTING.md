# Contributing

Thanks for considering a contribution. This project's value is a set of
verifiable correctness guarantees; most of this document exists to keep those
guarantees intact. Read the disciplines section before touching the corpus or
the parity ledger.

## Repository layout

Bun-workspaces monorepo. The single published package is
[`packages/en16931`](packages/en16931):

- `src/` — the Schematron runner and artefact loaders. The loaders resolve
  `../cef/...` relative to the compiled file, which sits one level below the
  package root both in `src/` and in the published `dist/` — do not move files
  in a way that breaks this in either place.
- `test/` — runner tests and the mutation corpus (`mutations.ts`).
- `scripts/` — `parity.ts` (assert-by-assert diff against the Java/Saxon
  reference) and `bench.ts`.
- `cef/` — vendored CEF validation artefacts, EUPL-1.2, **byte-identical to
  upstream. Never edit these files.** Provenance and pin: `cef/VENDORED.md`.

## Dev setup

- Install [Bun](https://bun.sh). The lockfile is v2, which currently requires
  **Bun 1.4 (canary)** — CI is pinned to canary until 1.4.0 ships stable. This
  affects contributors only; consumers of the npm package need nothing special.
- From the repo root:

```sh
bun install
bun test        # 70 tests: CEF examples clean (CII + UBL) + mutation corpus + audit trail + construct guards + loaders
```

All tests must pass before and after your change. If you change behaviour,
tests come with the change.

## Running parity locally

CI runs an assert-by-assert comparison of every corpus file (valid CEF examples
and mutated invoices) against the Java/Saxon reference validator. To reproduce
locally:

```sh
docker run --rm -p 8080:8080 easybill/en16931-validator:0.6.0
# in another terminal:
cd packages/en16931
bun run parity
```

Any diff not covered by the `KNOWN_DIVERGENCES` ledger exits non-zero.
`VALIDATOR_URL` overrides the default `http://localhost:8080/validation`.

## The disciplines

These are the project's non-negotiables. PRs that weaken them will not be
merged, whatever else they improve.

### Mutation corpus (`packages/en16931/test/mutations.ts`)

- Each mutation takes a known-valid CEF example and breaks **exactly one
  thing**.
- `expected` lists the rules that MUST fire, justified by the published rule
  text — not by what the runner happens to do.
- `allowed` lists only rules that legitimately cascade from the same mutation
  (e.g. breaking a line total also breaks the dependent document-level totals),
  each with a comment explaining why the cascade is real.
- Any rule firing outside `expected ∪ allowed` fails the build. Never widen
  `allowed` to make CI pass — investigate instead.

### Parity ledger (`packages/en16931/scripts/parity.ts`, `KNOWN_DIVERGENCES`)

This ledger is the entire value of the parity guarantee. It never grows to make
CI pass. A new entry requires, **in the commit that adds it**, the textual
proof that the reference deviates from the published rule text:

1. the rule's test quoted from the pinned CEF release — the `.sch`, the source
   binding AND the compiled XSLT;
2. a probe showing which variant the reference actually executes.

No proof → no entry → fix the runner instead. An entry that cannot cite its
evidence is a swept-under-the-rug false negative waiting to happen.

### No silent skips

Schematron constructs outside the supported subset (`let`, `value-of`,
`report`, abstract patterns, `defaultPhase`) are a hard load-time error. Do not
"support" a construct by skipping it: either implement it with tests proving
the semantics, or leave the hard error in place.

### Vendored artefacts (`packages/en16931/cef/`)

Never edit files under `cef/` — they are byte-identical to a pinned upstream
commit; the committed bytes are the pin. To bump to a new CEF release (from
`cef/VENDORED.md`): fetch the new release from upstream, replace the vendored
directories, update the commit hash in `VENDORED.md`, then run the full suite —
the mutation corpus and Saxon parity are the gate, not the note.

## Commits and pull requests

- **Conventional Commits** (`type(scope): description`) — release-please
  derives versions and the changelog from them. `feat:`/`fix:` drive releases;
  use them honestly.
- PRs must be green on CI: tests **and** parity.
- Changes to the exported API (`SchematronRunner`, `SchematronParseError`,
  `DECIMAL_EXACT`, `loadCiiSchematron`, `loadUblSchematron` and the exported
  types) are semver-relevant — call them out explicitly in the PR description.
- Documentation claims follow code, never run ahead of it. Never describe the
  project with the words "certified", "official" or "approved". UBL stays
  documented as experimental until it has its own mutation corpus and CI
  parity.

## Reporting issues

Bug reports with a minimal invoice XML that reproduces a false positive or
false negative are gold — include the `fired` list and the `artefactsVersion`
from the result object. Security issues: see [SECURITY.md](SECURITY.md), not
the public tracker.
