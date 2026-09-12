import { cn } from "@/lib/utils"

type RuleProps = {
  variant?: "thin" | "thick" | "double"
  className?: string
}

/** Horizontal rule in the three weights the zine layout uses. Same as tanfust.agency. */
export function Rule({ className, variant = "thin" }: RuleProps) {
  const styles =
    variant === "double"
      ? "border-t-[3px] border-double border-foreground"
      : variant === "thick"
        ? "border-t-2 border-foreground"
        : "border-t border-foreground"
  return <hr aria-hidden className={cn("w-full", styles, className)} />
}
