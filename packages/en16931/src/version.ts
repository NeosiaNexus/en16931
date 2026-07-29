// The runner's own version, embedded in every ValidationResult (audit trail).
// A plain constant on purpose: reading package.json at runtime breaks
// consumers who bundle this library (the file is not there — or worse, THEIR
// package.json is found and silently reported). release-please rewrites the
// annotated line below at release time so it cannot drift from package.json,
// and a test asserts the two match.
export const RUNNER_VERSION = '0.1.1' // x-release-please-version
