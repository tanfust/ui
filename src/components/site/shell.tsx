import type { ReactNode } from "react"

import { Colophon } from "@/components/site/colophon"
import { Masthead } from "@/components/site/masthead"
import { ShellFrame } from "@/components/site/shell-frame"

/**
 * Page frame with chrome. Owns the masthead, the `<main>` landmark and the
 * colophon so no page can nest chrome inside `<main>` — `<header>`/`<footer>`
 * only expose their `banner`/`contentinfo` roles while they sit outside it.
 *
 * Components that need the frame without chrome use `ShellFrame` directly.
 */
export function Shell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <ShellFrame className={className}>
      <Masthead />
      <main className="flex flex-1 flex-col">{children}</main>
      <Colophon />
    </ShellFrame>
  )
}
