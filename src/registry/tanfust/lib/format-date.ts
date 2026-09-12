type DateInput = Date | string | number

function toDate(input: DateInput) {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) throw new RangeError(`Invalid date: ${String(input)}`)
  return d
}

/**
 * Locale-aware date formatting with sensible presets. No dependency.
 *
 * @example
 * formatDate("2026-09-12")                 // "Sep 12, 2026"
 * formatDate(date, { preset: "long" })     // "September 12, 2026"
 * formatDate(date, { preset: "datetime" }) // "Sep 12, 2026, 14:05"
 * formatDate(date, { locale: "fr-FR" })    // "12 sept. 2026"
 */
export function formatDate(
  input: DateInput,
  {
    preset = "medium",
    locale,
    timeZone,
  }: { preset?: "short" | "medium" | "long" | "datetime" | "time"; locale?: string; timeZone?: string } = {}
) {
  const presets: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: "numeric", month: "2-digit", day: "2-digit" },
    medium: { year: "numeric", month: "short", day: "numeric" },
    long: { year: "numeric", month: "long", day: "numeric" },
    datetime: { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
    time: { hour: "2-digit", minute: "2-digit" },
  }
  return new Intl.DateTimeFormat(locale, { ...presets[preset], timeZone }).format(toDate(input))
}

/**
 * "3 minutes ago", "in 2 days", "yesterday" — via Intl.RelativeTimeFormat.
 */
export function formatRelative(
  input: DateInput,
  { locale, now = new Date() }: { locale?: string; now?: Date } = {}
) {
  const diffMs = toDate(input).getTime() - now.getTime()
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ]
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit)
  }
  return rtf.format(Math.round(diffMs / 1000), "second")
}
