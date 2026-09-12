import { createFileRoute } from "@tanstack/react-router"

import { CommandBlock } from "@/components/docs/command-block"
import { SectionHeader } from "@/components/site/section-header"
import { siteConfig } from "@/config/site"
import { addCommand, initCommand, registryAddCommand, shadcnCommand } from "@/lib/install"

export const Route = createFileRoute("/docs/")({
  head: () => ({ meta: [{ title: `Installation — ${siteConfig.name}` }] }),
  component: Installation,
})

function Installation() {
  return (
    <article className="flex max-w-3xl flex-col gap-12">
      <header className="flex flex-col gap-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">[00] Installation</p>
        <h1 className="text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-5xl">
          Add {siteConfig.namespace} to your project.
        </h1>
        <p className="max-w-prose font-mono text-xs leading-relaxed text-muted-foreground">
          Tanfust UI is a shadcn registry. Items are copied into your codebase as source files; the
          CLI resolves dependencies, adapts routes to your framework, and rewrites imports to your
          aliases. Nothing is installed from npm except the packages an item actually needs.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        <SectionHeader caption="existing shadcn project" number="01" title="Add the namespace" />
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          One-time setup. This writes the <Mono>@tanfust</Mono> registry into your{" "}
          <Mono>components.json</Mono>.
        </p>
        <CommandBlock command={registryAddCommand} />
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          Or add it by hand:
        </p>
        <pre className="overflow-x-auto border border-foreground px-4 py-3 font-mono text-xs">
          <code>{`{
  "registries": {
    "@tanfust": "${siteConfig.registryUrl}"
  }
}`}</code>
        </pre>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeader caption="any item" number="02" title="Install" />
        <CommandBlock command={(pm) => addCommand(pm, "use-debounce")} />
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          Every item page shows its own command. Preview before writing with <Mono>--dry-run</Mono>,
          inspect a file with <Mono>--diff</Mono> or <Mono>--view</Mono>. Items can also be installed
          by URL without the namespace: <Mono>{siteConfig.url}/r/&lt;item&gt;.json</Mono>.
        </p>
        <CommandBlock command={(pm) => shadcnCommand(pm, `list ${siteConfig.namespace}`)} label="browse from the terminal" />
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeader caption="new project" number="03" title="Start from the design system" />
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          The <Mono>tanfust</Mono> base installs the tokens (zinc, 0.625rem radius), Geist Sans and
          Geist Mono, inverted bold menus, and pre-registers this namespace. It does not pin Radix
          or Base UI — pick either during init.
        </p>
        <CommandBlock command={initCommand} />
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeader caption="claude · cursor · codex" number="04" title="For agents" />
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          Once the namespace is in <Mono>components.json</Mono>, the shadcn MCP server can list,
          search, view and install items from this registry. A plain-text index lives at{" "}
          <a className="underline underline-offset-4 hover:no-underline" href="/llms.txt">
            /llms.txt
          </a>
          .
        </p>
        <CommandBlock command={(pm) => shadcnCommand(pm, "mcp init --client claude")} />
      </section>
    </article>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="text-foreground">{children}</code>
}
