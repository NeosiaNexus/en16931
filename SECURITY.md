# Security Policy

## Supported versions

Only the latest release of `en16931` on npm receives security fixes. Pre-1.0,
there are no maintenance branches: upgrade to the newest version.

## Reporting a vulnerability

Report privately via GitHub security advisories:
<https://github.com/NeosiaNexus/en16931/security/advisories/new>.
Do **not** open a public issue for a suspected vulnerability.

You will get an acknowledgement within a few days and an honest assessment of
impact and timeline. There is no bug bounty.

## Threat model

This is a validation library: it parses **untrusted XML** (the invoice) and
evaluates **trusted XPath** (the vendored CEF Schematron artefacts) over it,
entirely in-process and offline. What that means concretely:

### In scope

- **External entities (XXE): structurally rejected.** The XML parser
  (`slimdom-sax-parser`, built on saxes) never fetches external resources, and
  any reference to an entity declared in a DTD — external *or* internal — is a
  hard parse error (`undefined entity`); the document is rejected before any
  rule runs. This was verified by direct probe against the shipped parser
  version. A regression that makes DTD-declared entities resolve or external
  resources load **is a vulnerability — report it**.
- **Entity-expansion attacks (billion laughs): same story.** Internal entity
  definitions are never registered, so the expansion never happens; the
  document fails to parse.
- **Superlinear resource blowup.** Validation cost is expected to grow roughly
  with document size × rule count. A *small* crafted input that causes
  disproportionate CPU or memory consumption (in the parser, the runner, or a
  pathological interaction between an artefact regex/XPath and crafted invoice
  content — ReDoS included, since the patterns are trusted but the strings are
  not) is in scope as a vulnerability.
- **Network I/O of any kind at validation time.** There should be none, ever.
  If you find any, report it.

### Out of scope / your responsibility

- **Input size limits.** The library imposes no size or time caps. If you
  expose validation to untrusted uploads, enforce size and timeout limits at
  your boundary — a 500 MB invoice will cost proportionate CPU and memory, and
  that is expected behaviour, not a vulnerability.
- **Untrusted Schematron.** `SchematronRunner` executes the XPath contained in
  whatever Schematron you construct it with. The vendored CEF artefacts are
  pinned and trusted; loading Schematron from untrusted sources is equivalent
  to running untrusted code and is out of scope.
- **`valid: true` is not authenticity.** A passing result means the document
  conforms to the published rule set — nothing more. This library performs no
  signature verification, no integrity checking, no assessment of whether the
  invoice is genuine.

### Supply chain

Three runtime dependencies (`fontoxpath` — aliased to the temporary
[`fontoxpath-exact-decimal`](https://www.npmjs.com/package/fontoxpath-exact-decimal)
fork documented in the README — `slimdom`, `slimdom-sax-parser`). Releases are
published from CI via npm trusted publishing (OIDC) with provenance; there are
no long-lived publish tokens.
