const swatches = [
  ["background", "bg-background"],
  ["foreground", "bg-foreground"],
  ["primary", "bg-primary"],
  ["secondary", "bg-secondary"],
  ["muted", "bg-muted"],
  ["accent", "bg-accent"],
  ["destructive", "bg-destructive"],
  ["border", "bg-border"],
] as const

/** Type specimen + swatches for the `tanfust` base and `theme-tanfust`. */
export default function TanfustDemo() {
  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h3 className="font-heading text-[10px] uppercase tracking-wider text-muted-foreground">Type</h3>
        <p className="text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em]">Less, but better.</p>
        <p className="max-w-prose text-sm">
          Body text is Geist Sans. Labels, headings and anything tabular are Geist Mono, set small
          and wide.
        </p>
        <p className="font-mono text-xs uppercase tracking-wider">&gt; Mono label · 0.625rem radius · zinc</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Tokens</h3>
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {swatches.map(([name, cls]) => (
            <li className="flex flex-col gap-1 font-mono text-[10px]" key={name}>
              <span className={`h-10 rounded-md border border-border ${cls}`} />
              <span className="truncate text-muted-foreground">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
