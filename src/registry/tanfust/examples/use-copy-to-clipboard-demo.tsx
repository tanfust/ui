import { useCopyToClipboard } from "@/registry/tanfust/hooks/use-copy-to-clipboard"

const command = "npx shadcn@latest add @tanfust/use-copy-to-clipboard"

export default function UseCopyToClipboardDemo() {
  const { copy, state } = useCopyToClipboard()
  return (
    <div className="flex w-full max-w-md items-stretch font-mono text-xs">
      <pre className="flex-1 overflow-x-auto border border-r-0 border-foreground px-3 py-2">
        <code>{command}</code>
      </pre>
      <button
        className="border border-foreground bg-foreground px-3 uppercase tracking-wider text-background hover:bg-background hover:text-foreground"
        onClick={() => copy(command)}
        type="button"
      >
        {state === "copied" ? "Copied" : state === "error" ? "Failed" : "Copy"}
      </button>
    </div>
  )
}
