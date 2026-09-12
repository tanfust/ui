import { absoluteUrl } from "@/registry/tanfust/lib/absolute-url"

export default function AbsoluteUrlDemo() {
  const rows: Array<[string, string]> = [
    ['absoluteUrl("/og.png", "https://app.example.com")', absoluteUrl("/og.png", "https://app.example.com")],
    ['absoluteUrl("api/webhooks/paddle", "https://app.example.com/")', absoluteUrl("api/webhooks/paddle", "https://app.example.com/")],
    ['absoluteUrl("/")', absoluteUrl("/")],
  ]
  return (
    <dl className="grid w-full max-w-lg grid-cols-1 gap-y-2 font-mono text-xs">
      {rows.map(([code, out]) => (
        <div className="flex flex-col gap-0.5" key={code}>
          <dt className="truncate text-muted-foreground">{code}</dt>
          <dd className="break-all">{out}</dd>
        </div>
      ))}
    </dl>
  )
}
