import { useTheme } from "next-themes"
import * as React from "react"

import { stampClasses } from "@/components/site/stamp"

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
      className={stampClasses({
        className:
          "inline-flex h-7 items-center gap-1 px-1 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground focus-visible:outline-solid",
      })}
      onClick={toggle}
      type="button"
    >
      <span aria-hidden>◐</span>
      <span>
        {mounted ? (resolvedTheme === "dark" ? "Light" : "Dark") : "Theme"}
      </span>
    </button>
  )
}
