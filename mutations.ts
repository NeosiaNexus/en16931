// Mutation corpus: each case takes a known-valid CEF example, breaks exactly one
// thing, and declares which rule MUST fire. `allowed` lists rules that legitimately
// cascade from the same mutation (e.g. breaking a line total also breaks the
// dependent document-level totals) — anything fired outside expected ∪ allowed
// is a test failure, so unrelated rules cannot hide behind a mutation.

export type Mutation = {
  name: string
  base: string
  expected: string[]
  allowed: string[]
  apply: (xml: string) => string
}

function replaceOnce(xml: string, needle: string, replacement: string): string {
  const first = xml.indexOf(needle)
  if (first === -1) throw new Error(`mutation target not found: ${needle}`)
  if (xml.indexOf(needle, first + 1) !== -1) throw new Error(`mutation target is ambiguous: ${needle}`)
  return xml.slice(0, first) + replacement + xml.slice(first + needle.length)
}

const EX1 = 'cef/cii/examples/CII_example1.xml'
const EX_O = 'cef/cii/examples/XRechnung-O.xml'

export const MUTATIONS: Mutation[] = [
  // ── Cardinality (BR-01…BR-65): a mandatory term is missing ──────────────
  {
    name: 'BR-01: remove specification identifier',
    base: EX1,
    expected: ['BR-01'],
    allowed: ['CII-SR-010'],
    apply: (xml) => replaceOnce(xml, '<ram:ID>urn:cen.eu:en16931:2017</ram:ID>', ''),
  },
  {
    name: 'BR-02: remove invoice number',
    base: EX1,
    expected: ['BR-02'],
    allowed: [],
    apply: (xml) => replaceOnce(xml, '<ram:ID>12115118</ram:ID>', ''),
  },
  {
    name: 'BR-03: remove issue date',
    base: EX1,
    expected: ['BR-03'],
    allowed: [],
    apply: (xml) =>
      replaceOnce(
        xml,
        '<ram:IssueDateTime>\n            <udt:DateTimeString format="102">20150109</udt:DateTimeString>\n        </ram:IssueDateTime>',
        ''
      ),
  },
  {
    name: 'BR-04: remove invoice type code',
    base: EX1,
    expected: ['BR-04'],
    allowed: ['CII-SR-014'],
    apply: (xml) => replaceOnce(xml, '<ram:TypeCode>380</ram:TypeCode>', ''),
  },
  {
    name: 'BR-05: remove invoice currency code',
    base: EX1,
    expected: ['BR-05'],
    allowed: [],
    apply: (xml) => replaceOnce(xml, '<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>', ''),
  },
  {
    name: 'BR-06: remove seller name',
    base: EX1,
    expected: ['BR-06'],
    allowed: [],
    apply: (xml) => replaceOnce(xml, '<ram:Name>De Koksmaat</ram:Name>', ''),
  },
  {
    name: 'BR-07: remove buyer name',
    base: EX1,
    expected: ['BR-07'],
    allowed: [],
    apply: (xml) => replaceOnce(xml, '<ram:Name>ODIN 59</ram:Name>', ''),
  },
  {
    name: 'BR-09: remove seller country code',
    base: EX1,
    expected: ['BR-09'],
    allowed: [],
    apply: (xml) =>
      replaceOnce(
        xml,
        '<ram:CityName>Velsen-Noord</ram:CityName>\n                    <ram:CountryID>NL</ram:CountryID>',
        '<ram:CityName>Velsen-Noord</ram:CityName>'
      ),
  },
  {
    name: 'BR-22: remove invoiced quantity on line 1',
    base: EX1,
    expected: ['BR-22', 'BR-23'],
    allowed: [],
    apply: (xml) =>
      replaceOnce(
        xml,
        '<ram:SpecifiedLineTradeDelivery>\n                <ram:BilledQuantity unitCode="H87">2</ram:BilledQuantity>\n            </ram:SpecifiedLineTradeDelivery>\n            <ram:SpecifiedLineTradeSettlement>\n                <ram:ApplicableTradeTax>\n                    <ram:TypeCode>VAT</ram:TypeCode>\n                    <ram:CategoryCode>S</ram:CategoryCode>\n                    <ram:RateApplicablePercent>6</ram:RateApplicablePercent>\n                </ram:ApplicableTradeTax>\n                <ram:SpecifiedTradeSettlementLineMonetarySummation>\n                    <ram:LineTotalAmount>19.9</ram:LineTotalAmount>',
        '<ram:SpecifiedLineTradeDelivery>\n            </ram:SpecifiedLineTradeDelivery>\n            <ram:SpecifiedLineTradeSettlement>\n                <ram:ApplicableTradeTax>\n                    <ram:TypeCode>VAT</ram:TypeCode>\n                    <ram:CategoryCode>S</ram:CategoryCode>\n                    <ram:RateApplicablePercent>6</ram:RateApplicablePercent>\n                </ram:ApplicableTradeTax>\n                <ram:SpecifiedTradeSettlementLineMonetarySummation>\n                    <ram:LineTotalAmount>19.9</ram:LineTotalAmount>'
      ),
  },
  {
    name: 'BR-50: remove payment account identifier',
    base: EX1,
    expected: ['BR-50', 'BR-61', 'CII-SR-470'],
    allowed: [],
    apply: (xml) =>
      replaceOnce(
        xml,
        '<ram:PayeePartyCreditorFinancialAccount>\n                    <ram:IBANID>NL57 RABO 0107307510</ram:IBANID>\n                </ram:PayeePartyCreditorFinancialAccount>\n            </ram:SpecifiedTradeSettlementPaymentMeans>\n            <ram:SpecifiedTradeSettlementPaymentMeans>',
        '<ram:PayeePartyCreditorFinancialAccount>\n                </ram:PayeePartyCreditorFinancialAccount>\n            </ram:SpecifiedTradeSettlementPaymentMeans>\n            <ram:SpecifiedTradeSettlementPaymentMeans>'
      ),
  },

  // ── Codelists (BR-CL): a code outside the published list ────────────────
  {
    name: 'BR-CL-01: invalid invoice type code',
    base: EX1,
    expected: ['BR-CL-01'],
    allowed: [],
    apply: (xml) => replaceOnce(xml, '<ram:TypeCode>380</ram:TypeCode>', '<ram:TypeCode>999</ram:TypeCode>'),
  },
  {
    name: 'BR-CL-04: invalid currency code',
    base: EX1,
    expected: ['BR-CL-04'],
    // The BR-CO-15 test keys the tax total on @currencyID = invoice currency: an
    // unknown currency empties that selection, so the total check fails too.
    allowed: ['BR-CO-15'],
    apply: (xml) =>
      replaceOnce(
        xml,
        '<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>',
        '<ram:InvoiceCurrencyCode>EUX</ram:InvoiceCurrencyCode>'
      ),
  },
  {
    name: 'BR-CL-14: invalid seller country code',
    base: EX1,
    expected: ['BR-CL-14'],
    allowed: [],
    apply: (xml) =>
      replaceOnce(
        xml,
        '<ram:CityName>Velsen-Noord</ram:CityName>\n                    <ram:CountryID>NL</ram:CountryID>',
        '<ram:CityName>Velsen-Noord</ram:CityName>\n                    <ram:CountryID>XX</ram:CountryID>'
      ),
  },

  // ── Calculation (BR-CO): a total is off by one cent ─────────────────────
  {
    name: 'BR-CO-10: sum of line amounts off by 0.01',
    base: EX1,
    expected: ['BR-CO-10', 'BR-CO-13'],
    allowed: [],
    apply: (xml) =>
      replaceOnce(xml, '<ram:LineTotalAmount>229.6</ram:LineTotalAmount>', '<ram:LineTotalAmount>229.61</ram:LineTotalAmount>'),
  },
  {
    name: 'BR-CO-15: grand total off by 0.01',
    base: EX1,
    expected: ['BR-CO-15', 'BR-CO-16'],
    allowed: [],
    apply: (xml) =>
      replaceOnce(xml, '<ram:GrandTotalAmount>250.33</ram:GrandTotalAmount>', '<ram:GrandTotalAmount>250.34</ram:GrandTotalAmount>'),
  },
  {
    // The CEF test for BR-CO-17 tolerates a full ±1 unit (not ±0.01), so the
    // deviation must exceed 1.00 to trigger it.
    name: 'BR-CO-17: VAT category tax amount off by 2.00',
    base: EX1,
    expected: ['BR-CO-17', 'BR-CO-14', 'BR-S-09'],
    allowed: [],
    apply: (xml) =>
      replaceOnce(xml, '<ram:CalculatedAmount>10.99</ram:CalculatedAmount>', '<ram:CalculatedAmount>12.99</ram:CalculatedAmount>'),
  },

  // ── Per-category VAT (BR-S, BR-O): breakdown arithmetic ─────────────────
  {
    name: 'BR-S-08: standard-rate taxable amount off by 0.01',
    base: EX1,
    expected: ['BR-S-08'],
    allowed: [],
    apply: (xml) =>
      replaceOnce(xml, '<ram:BasisAmount>183.23</ram:BasisAmount>', '<ram:BasisAmount>183.24</ram:BasisAmount>'),
  },
  {
    name: 'BR-O-08: not-subject-to-VAT taxable amount off by 0.01',
    base: EX_O,
    expected: ['BR-O-08'],
    allowed: [],
    apply: (xml) =>
      replaceOnce(xml, '<ram:BasisAmount>385544.60</ram:BasisAmount>', '<ram:BasisAmount>385544.61</ram:BasisAmount>'),
  },

  // ── Decimals (BR-DEC): more than two decimals on an amount ──────────────
  {
    name: 'BR-DEC-18: due payable amount with three decimals',
    base: EX1,
    expected: ['BR-DEC-18', 'BR-CO-16'],
    allowed: [],
    apply: (xml) =>
      replaceOnce(xml, '<ram:DuePayableAmount>250.33</ram:DuePayableAmount>', '<ram:DuePayableAmount>250.333</ram:DuePayableAmount>'),
  },
]
