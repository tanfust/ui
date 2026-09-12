import * as React from "react"

/**
 * Subscribe to a CSS media query. Returns `false` on the server and on the
 * first client render (no hydration mismatch), then tracks the query live.
 *
 * @example
 * const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
 */
export function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    [query]
  )

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}
