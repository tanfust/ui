/**
 * Currency formatting for prices. Accepts minor units (cents) by default,
 * which is what Stripe, Paddle and most payment APIs return.
 *
 * @example
 * formatCurrency(1999)                                  // "$19.99"
 * formatCurrency(1999, { currency: "EUR", locale: "fr-FR" }) // "19,99 €"
 * formatCurrency(19.99, { minorUnits: false })          // "$19.99"
 * formatCurrency(2000, { trimZeros: true })             // "$20"
 */
export function formatCurrency(
  amount: number,
  {
    currency = "USD",
    locale,
    minorUnits = true,
    trimZeros = false,
  }: { currency?: string; locale?: string; minorUnits?: boolean; trimZeros?: boolean } = {}
) {
  const value = minorUnits ? amount / 100 : amount
  const wholeNumber = Number.isInteger(value)
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: trimZeros && wholeNumber ? 0 : undefined,
    maximumFractionDigits: trimZeros && wholeNumber ? 0 : undefined,
  }).format(value)
}

/** Compact large numbers: 1200 → "1.2K", 3_400_000 → "3.4M". */
export function formatCompact(value: number, { locale }: { locale?: string } = {}) {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value)
}
