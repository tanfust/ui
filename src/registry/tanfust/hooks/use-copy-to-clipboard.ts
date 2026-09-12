import * as React from "react"

type CopyState = "idle" | "copied" | "error"

/**
 * Copy text to the clipboard and expose a short-lived status for the UI
 * ("Copied" for `resetAfter` ms, then back to idle).
 *
 * @example
 * const { copy, state } = useCopyToClipboard()
 * <button onClick={() => copy(command)}>{state === "copied" ? "Copied" : "Copy"}</button>
 */
export function useCopyToClipboard({ resetAfter = 1500 }: { resetAfter?: number } = {}) {
  const [state, setState] = React.useState<CopyState>("idle")
  const timer = React.useRef<number | undefined>(undefined)

  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = React.useCallback(
    async (text: string) => {
      try {
        if (!navigator.clipboard) throw new Error("Clipboard API unavailable")
        await navigator.clipboard.writeText(text)
        setState("copied")
      } catch {
        setState("error")
      }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setState("idle"), resetAfter)
    },
    [resetAfter]
  )

  return { copy, state, copied: state === "copied" }
}
