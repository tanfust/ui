import * as React from "react"

import { useCopyToClipboard } from "@/registry/tanfust/hooks/use-copy-to-clipboard"
import { cn } from "@/lib/utils"

export type CodeFile = { path: string; target?: string; content: string }

/** One tab per file of a registry item, with the file's install target and a copy button. */
export function CodeTabs({ files }: { files: Array<CodeFile> }) {
  const [active, setActive] = React.useState(0)
  const { copy, state } = useCopyToClipboard()
  const file = files[Math.min(active, files.length - 1)] as CodeFile | undefined
  if (!file) return null

  return (
    <div className="border border-foreground font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground px-3 text-[10px] uppercase tracking-wider">
        <div className="flex flex-wrap gap-3" role="tablist" aria-label="Files">
          {files.map((f, i) => (
            <button
              aria-selected={i === active}
              className={cn("h-8 underline-offset-4 hover:underline", i === active && "font-bold underline")}
              key={f.path}
              onClick={() => setActive(i)}
              role="tab"
              type="button"
            >
              {basename(f.path)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {file.target ? <span className="hidden text-muted-foreground sm:inline">→ {file.target}</span> : null}
          <button className="h-8 underline-offset-4 hover:underline" onClick={() => copy(file.content)} type="button">
            {state === "copied" ? "[ copied ]" : "[ copy ]"}
          </button>
        </div>
      </div>
      <pre className="max-h-[32rem] overflow-auto px-4 py-3 leading-relaxed">
        <code>{file.content}</code>
      </pre>
    </div>
  )
}

function basename(p: string) {
  return p.split("/").pop() ?? p
}
