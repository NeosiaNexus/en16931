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
