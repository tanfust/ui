import { formatCompact, formatCurrency } from "@/registry/tanfust/lib/format-currency"

export default function FormatCurrencyDemo() {
  const rows: Array<[string, string]> = [
    ["formatCurrency(1999)", formatCurrency(1999)],
    ['formatCurrency(1999, { currency: "EUR", locale: "fr-FR" })', formatCurrency(1999, { currency: "EUR", locale: "fr-FR" })],
    ['formatCurrency(4900, { currency: "TND", locale: "fr-TN" })', formatCurrency(4900, { currency: "TND", locale: "fr-TN" })],
    ["formatCurrency(2000, { trimZeros: true })", formatCurrency(2000, { trimZeros: true })],
    ["formatCurrency(19.99, { minorUnits: false })", formatCurrency(19.99, { minorUnits: false })],
    ["formatCompact(1200)", formatCompact(1200)],
    ["formatCompact(3_400_000)", formatCompact(3_400_000)],
  ]
  return (
    <dl className="grid w-full max-w-lg grid-cols-1 gap-y-2 font-mono text-xs sm:grid-cols-[1fr_auto] sm:gap-x-6">
      {rows.map(([code, out]) => (
        <div className="contents" key={code}>
          <dt className="truncate text-muted-foreground">{code}</dt>
          <dd className="sm:text-right">{out}</dd>
        </div>
      ))}
    </dl>
  )
}
