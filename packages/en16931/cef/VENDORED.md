# Vendored CEF validation artefacts

Source: https://github.com/ConnectingEurope/eInvoicing-EN16931
Commit: `b6c9e06a59812fb1a83585da40923b3678a649ad` (merge of release branch `validation-1.3.16`, artefacts stamped 1.3.16, 2026-04-10)
License: EUPL-1.2 (see `LICENSE.txt` in this directory) — files are unmodified.

Vendored rather than cloned at build time on purpose: release branches upstream
have been observed to move after the fact (the `validation-1.3.15` branch carries
a preprocessed file stamped 1.3.14.2). Committed bytes are the only real pin.

Kept: `cii/schematron`, `cii/examples`, `ubl/schematron`, `ubl/examples`,
`LICENSE.txt`, `README.md`.
Removed (unused by the runner): XSD schemas, `edifact/`, `codelist/` (the
preprocessed Schematron inlines the code lists), Maven build files, templates.

To bump: fetch the new release from upstream, replace the directories above,
update the commit hash here, then run the full suite — mutation corpus and
Saxon parity are the gate, not this note.

## Integrity pin

`cef.SHA256SUMS` (one level up, at the package root — never inside this
directory, whose files stay untouched) records the SHA-256 of every vendored
file: everything in `cef/` except this note. CI verifies it on every run and
also refuses files present in `cef/` but absent from the manifest — any byte
drift fails the build. This is the "committed bytes are the only real pin"
promise made mechanical.

To regenerate after a deliberate bump (run from the package root,
`packages/en16931/`):

```sh
find cef -type f ! -name VENDORED.md -print0 | LC_ALL=C sort -z \
  | xargs -0 sha256sum > cef.SHA256SUMS
```

Regenerating the sums is only legitimate in the same commit that updates the
upstream commit hash above.
