import * as React from "react"

import { useCopyToClipboard } from "@/registry/tanfust/hooks/use-copy-to-clipboard"
import { PACKAGE_MANAGERS } from "@/lib/install"
import type { PackageManager } from "@/lib/install"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "tanfust-ui:pm"

/**
 * Install command with package-manager tabs and a copy button. The chosen
 * package manager is remembered per browser.
 */
export function CommandBlock({
  command,
  label,
  className,
}: {
  command: (pm: PackageManager) => string
  label?: string
  className?: string
}) {
  const [pm, setPm] = React.useState<PackageManager>("pnpm")
  const { copy, state } = useCopyToClipboard()

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as PackageManager | null
      if (saved && PACKAGE_MANAGERS.includes(saved)) setPm(saved)
    } catch {
      /* private mode etc. */
    }
  }, [])

  const choose = (next: PackageManager) => {
    setPm(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const text = command(pm)

  return (
    <div className={cn("flex flex-col gap-2 font-mono text-xs", className)}>
      {label ? <span className="text-[10px] uppercase tracking-wider">&gt; {label}</span> : null}
      <div className="border border-foreground">
        <div className="flex items-center justify-between border-b border-foreground px-3 text-[10px] uppercase tracking-wider">
          <div className="flex gap-3" role="tablist" aria-label="Package manager">
            {PACKAGE_MANAGERS.map((p) => (
              <button
                aria-selected={p === pm}
                className={cn("h-8 underline-offset-4 hover:underline", p === pm && "font-bold underline")}
                key={p}
                onClick={() => choose(p)}
                role="tab"
                type="button"
              >
                {p}
              </button>
            ))}
          </div>
          <button
            className="h-8 underline-offset-4 hover:underline"
            onClick={() => copy(text)}
            type="button"
          >
            {state === "copied" ? "[ copied ]" : state === "error" ? "[ failed ]" : "[ copy ]"}
          </button>
        </div>
        <pre className="overflow-x-auto px-4 py-3">
          <code>{text}</code>
        </pre>
      </div>
    </div>
  )
}
