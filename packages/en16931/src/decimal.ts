import { evaluateXPathToBoolean } from 'fontoxpath'

// This package depends on fontoxpath-exact-decimal (published fork, upstream:
// FontoXML/fontoxpath#686) for exact xs:decimal arithmetic — but a consumer's
// install may still resolve vanilla fontoxpath (overrides, dedupe, forks of
// this repo without the aliased dependency), where decimal arithmetic is
// float64 and the arithmetic rules (BR-CO-*, BR-*-08…) can misfire on valid
// invoices. Probe the engine once and surface the truth in every result
// instead of assuming our own environment — same rule as everywhere else in
// this runner: never silent.
export const DECIMAL_EXACT: boolean = evaluateXPathToBoolean('1.1 + 2.2 = 3.3', null)

// The console warning is a once-per-process courtesy for a human watching a
// terminal; the machine-readable channel is `decimalExact` on every
// ValidationResult plus the DECIMAL_EXACT export. Deliberately NOT injectable
// or silenceable via the API: an option would permanently widen the public
// surface to configure a message that consumers who care can already detect
// programmatically. Weighed and rejected — API stability wins.
let warnedInexactDecimal = false

export function warnOnceIfInexactDecimal(): void {
  if (DECIMAL_EXACT || warnedInexactDecimal) return
  warnedInexactDecimal = true
  console.warn(
    '[en16931] The installed XPath engine computes xs:decimal arithmetic in float64 ' +
      '(fontoxpath without the exact-decimal fix, see FontoXML/fontoxpath#686). ' +
      'Arithmetic rules may misfire on valid invoices; results carry decimalExact: false.',
  )
}
