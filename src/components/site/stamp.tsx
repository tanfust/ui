import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * The stamp: mono, uppercase, wide-tracked. The dominant voice of the site.
 *
 * Ported from tanfust's `components/stamp.tsx`, where it exists because the
 * class string had been typed inline at 103 call sites in four spellings that
 * differed only in class order. The same drift had already started here — this
 * repo carried it inline in fourteen places before this component landed.
 *
 * `stampClasses` is the primary form because most call sites are not spans.
 * They are `<p>`, `<h2>`, `<dt>`, `<footer>`, `<label>` and `<Link>`, and
 * wrapping each in a slot would add nesting for nothing. tanfust's version
 * dropped its `asChild`/`Slot` branch when Radix left; this one never had one.
 *
 * `dim` is a boolean rather than a number on purpose. Secondary text needs one
 * opacity, not five, and routing every call site through a single value means
 * the contrast of every dimmed label is one edit away.
 */
export type StampSize = "sm" | "md"

const sizes: Record<StampSize, string> = {
  sm: "text-2xs",
  md: "text-xs",
}

/**
 * The opacity of secondary text. One value, deliberately.
 *
 * On paper, ink at 60% measures 4.49:1 — under AA by rounding. At 70% it is
 * 6.24:1. Because every dimmed label routes through here, the whole site moves
 * with this line.
 */
const DIM = "opacity-70"

export function stampClasses({
  className,
  dim,
  size = "sm",
}: {
  className?: string
  dim?: boolean
  size?: StampSize
} = {}) {
  return cn(
    "font-mono tracking-wider uppercase",
    sizes[size],
    dim && DIM,
    className
  )
}

type StampProps = ComponentProps<"span"> & {
  dim?: boolean
  size?: StampSize
}

export function Stamp({ className, dim, size, ...props }: StampProps) {
  return <span className={stampClasses({ className, dim, size })} {...props} />
}
