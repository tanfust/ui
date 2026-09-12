import * as React from "react"

import { slugify, uniqueSlug } from "@/registry/tanfust/lib/slugify"

export default function SlugifyDemo() {
  const [value, setValue] = React.useState("Crème brûlée & the Essentialist Quarterly, 2026!")
  const slug = slugify(value)
  const taken = ["creme-brulee-the-essentialist-quarterly-2026"]

  return (
    <div className="flex w-full max-w-lg flex-col gap-3 font-mono text-xs">
      <input
        className="h-9 border border-foreground bg-background px-3 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        onChange={(e) => setValue(e.target.value)}
        value={value}
      />
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">slugify</dt>
        <dd className="break-all">{slug || "—"}</dd>
        <dt className="text-muted-foreground">maxLength: 20</dt>
        <dd className="break-all">{slugify(value, { maxLength: 20 }) || "—"}</dd>
        <dt className="text-muted-foreground">uniqueSlug</dt>
        <dd className="break-all">{uniqueSlug(slug, taken)}</dd>
      </dl>
    </div>
  )
}
