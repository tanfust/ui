import { cn } from "@/lib/utils"

type SectionHeaderProps = {
  number: string
  title: string
  caption?: string
  className?: string
  id?: string
}

/** `[NN] TITLE ---------- caption` — the chapter heading from tanfust.agency. */
export function SectionHeader({ caption, className, id, number, title }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline gap-3 font-mono text-xs tracking-wider">
        <span aria-hidden>[{number}]</span>
        <h2 className="font-mono text-sm uppercase" id={id}>
          {title}
        </h2>
        <span aria-hidden className="flex-1 self-center border-t border-dashed border-foreground" />
        {caption ? (
          <span aria-hidden className="text-[10px] uppercase">
            {caption}
          </span>
        ) : null}
      </div>
    </div>
  )
}
