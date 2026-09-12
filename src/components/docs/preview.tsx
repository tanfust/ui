import * as React from "react"

import { Index } from "@/__registry__/index"
import type { IndexEntry } from "@/__registry__/index"

/** Renders `<name>-demo` from the generated index inside a bordered frame. */
export function Preview({ name }: { name: string }) {
  const entry = Index[`${name}-demo`] as IndexEntry | undefined
  if (!entry) return null
  const Component = entry.component

  return (
    <div className="flex min-h-[16rem] items-center justify-center border border-foreground p-6 sm:p-10">
      <React.Suspense
        fallback={<span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">loading…</span>}
      >
        <Component />
      </React.Suspense>
    </div>
  )
}
