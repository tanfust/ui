import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * The bare page frame — full-height background plus the bordered centre column.
 * No chrome and no `<main>`. `Shell` is the wrapper that adds the masthead,
 * `<main>` and colophon; reach for this directly only where the chrome must be
 * absent, which is what an error or standalone route wants.
 */
export function ShellFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("min-h-screen bg-background text-foreground", className)}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col border-x border-foreground">
        {children}
      </div>
    </div>
  )
}
