import * as React from "react"

/**
 * Returns `value` after it has stopped changing for `delay` ms.
 * Typical use: search inputs that hit an API.
 *
 * @example
 * const [query, setQuery] = React.useState("")
 * const debounced = useDebounce(query, 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value)

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])

  return debounced
}

/**
 * Debounced callback. The returned function keeps a stable identity; the
 * latest `callback` is always the one that runs.
 */
export function useDebouncedCallback<A extends Array<unknown>>(
  callback: (...args: A) => void,
  delay = 300
) {
  const latest = React.useRef(callback)
  const timer = React.useRef<number | undefined>(undefined)

  React.useEffect(() => {
    latest.current = callback
  }, [callback])

  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  return React.useCallback(
    (...args: A) => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => latest.current(...args), delay)
    },
    [delay]
  )
}
