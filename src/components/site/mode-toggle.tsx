import { useTheme } from "next-themes"
import * as React from "react"

/**
 * Light/dark switch. Typographic glyph instead of an icon library, per the
 * design doc ("no icons from libraries — only typographic glyphs"). Also bound
 * to the `d` key by ThemeProvider, like tanfust.com.
 */
export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const toggle = React.useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }, [resolvedTheme, setTheme])

  return (
    <button
      aria-label="Toggle theme"
      className="inline-flex h-7 items-center gap-1 px-1 font-mono text-[10px] uppercase tracking-wider underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      onClick={toggle}
      type="button"
    >
      <span aria-hidden>◐</span>
      <span>{mounted ? (resolvedTheme === "dark" ? "Light" : "Dark") : "Theme"}</span>
    </button>
  )
}
