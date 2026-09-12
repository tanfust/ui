/** Specimen for `font-geist-sans` and `font-geist-mono`. */
export default function FontGeistDemo() {
  return (
    <div className="grid w-full gap-8 sm:grid-cols-2">
      <figure className="flex flex-col gap-2">
        <figcaption className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Geist Sans · --font-sans
        </figcaption>
        <p className="font-sans text-3xl font-semibold tracking-tight">Sphinx of black quartz, judge my vow.</p>
        <p className="font-sans text-sm text-muted-foreground">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
        </p>
      </figure>
      <figure className="flex flex-col gap-2">
        <figcaption className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Geist Mono · --font-mono
        </figcaption>
        <p className="font-mono text-3xl font-semibold tracking-tight">Sphinx of black quartz, judge my vow.</p>
        <p className="font-mono text-sm text-muted-foreground">
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
        </p>
      </figure>
    </div>
  )
}
