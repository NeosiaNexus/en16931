## Summary

<!-- What does this PR do and why? -->

## Changes

- [ ] ...

## Test plan

<!-- How did you verify this works? Which tests / parity runs cover it? -->

## Checklist

- [ ] `bun run verify` passes (lint + typecheck + tests + build/packaging checks; CI additionally enforces cef/ byte-integrity, Saxon parity, CodeQL and workflow lint)
- [ ] New rule coverage comes with a mutation-corpus entry, and parity vs the Java/Saxon reference stays green (`bun run parity`)
- [ ] No file under `cef/` was modified — the vendored CEF artefacts must remain byte-identical
- [ ] README claims follow the code, never ahead of it
- [ ] Commit messages follow Conventional Commits (`type(scope): description`)
