import type { ReactNode } from "react"

import { Colophon } from "@/components/site/colophon"
import { Masthead } from "@/components/site/masthead"
import { cn } from "@/lib/utils"

/**
 * Page frame: full-height background, the bordered centre column, masthead,
 * `<main>` landmark and colophon. Same structure as tanfust.agency's
 * `ShellFrame` + `Shell`, collapsed into one component since nothing here is
 * server-only.
 */
export function Shell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col border-x border-foreground">
        <Masthead />
        <main className="flex flex-1 flex-col">{children}</main>
        <Colophon />
      </div>
    </div>
  )
}
