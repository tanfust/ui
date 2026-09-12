import { useMediaQuery } from "@/registry/tanfust/hooks/use-media-query"

const queries = [
  "(min-width: 768px)",
  "(prefers-color-scheme: dark)",
  "(prefers-reduced-motion: reduce)",
  "(hover: hover)",
] as const

export default function UseMediaQueryDemo() {
  return (
    <ul className="flex flex-col gap-2 font-mono text-xs">
      {queries.map((q) => (
        <Row key={q} query={q} />
      ))}
    </ul>
  )
}

function Row({ query }: { query: string }) {
  const matches = useMediaQuery(query)
  return (
    <li className="flex items-center justify-between gap-6 border-b border-border pb-2">
      <code>{query}</code>
      <span className={matches ? "" : "text-muted-foreground"}>{matches ? "[ true ]" : "[ false ]"}</span>
    </li>
  )
}
