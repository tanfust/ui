import * as React from "react"

import { useDebounce } from "@/registry/tanfust/hooks/use-debounce"

export default function UseDebounceDemo() {
  const [value, setValue] = React.useState("")
  const debounced = useDebounce(value, 400)

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 font-mono text-xs">
      <label className="flex flex-col gap-1">
        <span className="text-xs tracking-wider text-muted-foreground uppercase">
          Type quickly
        </span>
        <input
          className="h-9 border border-foreground bg-background px-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground focus-visible:outline-solid"
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
