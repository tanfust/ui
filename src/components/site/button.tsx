import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * Ported from tanfust.agency `components/button.tsx` so both sites share one
 * button vocabulary (see its docs/design.md §6):
 *
 *   primary   filled — solid ink, reversed label. The one action a page exists for.
 *   default   bordered — everything else that is still a button.
 *   ghost     borderless, underlines on hover.
 *
 * `buttonClasses` is exported because most controls here are anchors, not
 * `<button>`s. No Slot: use `buttonClasses` on the anchor directly.
 */
export type ButtonVariant = "primary" | "default" | "ghost"
export type ButtonSize = "sm" | "md"

const base =
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-none px-4 font-mono uppercase tracking-wider transition-colors outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:opacity-50"

const sizes: Record<ButtonSize, string> = {
  sm: "text-[10px]",
  md: "text-xs",
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-foreground bg-foreground text-background hover:bg-background hover:text-foreground",
  default:
    "border border-foreground bg-background text-foreground hover:bg-foreground hover:text-background",
  ghost: "border border-transparent text-foreground underline-offset-4 hover:underline",
}

export function buttonClasses({
  className,
  size = "md",
  variant = "default",
}: {
  className?: string
  size?: ButtonSize
  variant?: ButtonVariant
} = {}) {
  return cn(base, sizes[size], variants[variant], className)
}

type ButtonProps = ComponentProps<"button"> & {
  size?: ButtonSize
  variant?: ButtonVariant
}

export function Button({ className, size, variant, type = "button", ...props }: ButtonProps) {
  return <button className={buttonClasses({ className, size, variant })} type={type} {...props} />
}
