import * as React from "react"

import { useDebounce } from "@/registry/tanfust/hooks/use-debounce"

export default function UseDebounceDemo() {
  const [value, setValue] = React.useState("")
  const debounced = useDebounce(value, 400)

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 font-mono text-xs">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Type quickly</span>
        <input
          className="h-9 border border-foreground bg-background px-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          onChange={(e) => setValue(e.target.value)}
          placeholder="search…"
          value={value}
        />
      </label>
      <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">live</dt>
        <dd className="truncate">{value || "—"}</dd>
        <dt className="text-muted-foreground">debounced</dt>
        <dd className="truncate">{debounced || "—"}</dd>
      </dl>
    </div>
  )
}
