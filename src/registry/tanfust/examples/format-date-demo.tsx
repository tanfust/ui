import { formatDate, formatRelative } from "@/registry/tanfust/lib/format-date"

const date = new Date("2026-09-12T14:05:00Z")
const now = new Date("2026-09-14T09:00:00Z")

export default function FormatDateDemo() {
  const rows: Array<[string, string]> = [
    ['formatDate(date)', formatDate(date, { timeZone: "UTC" })],
    ['formatDate(date, { preset: "long" })', formatDate(date, { preset: "long", timeZone: "UTC" })],
    ['formatDate(date, { preset: "datetime" })', formatDate(date, { preset: "datetime", timeZone: "UTC" })],
    ['formatDate(date, { locale: "fr-FR" })', formatDate(date, { locale: "fr-FR", timeZone: "UTC" })],
    ['formatDate(date, { locale: "ar-TN" })', formatDate(date, { locale: "ar-TN", timeZone: "UTC" })],
    ["formatRelative(date, { now })", formatRelative(date, { now })],
  ]
  return <Table rows={rows} />
}

function Table({ rows }: { rows: Array<[string, string]> }) {
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
