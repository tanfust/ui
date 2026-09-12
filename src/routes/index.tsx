import { createFileRoute } from "@tanstack/react-router"

import { siteConfig } from "@/config/site"
import { CATEGORIES, getItemsByCategory } from "@/lib/registry"

export const Route = createFileRoute("/")({ component: Home })

// Brutalist Mono, per tanfust.agency/docs/design.md: indexed sections,
// mono everywhere but the headline, semantic tokens only, no icon libraries.

function Home() {
  const groups = getItemsByCategory()
  const total = [...groups.values()].reduce((n, items) => n + items.length, 0)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-16 px-6 py-16">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <span>{siteConfig.name}</span>
          <a href={siteConfig.links.tanfust} className="hover:text-foreground">
            tanfust.com →
          </a>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Essentials for everyday sites and apps.
        </h1>
        <p className="max-w-prose font-mono text-sm leading-relaxed text-muted-foreground">
          A shadcn-compatible registry. Foundations, hooks, utilities and complete flows,
          installed as source into your project. No wrapper package, no lock-in — the code
          is yours.
        </p>
      </header>

      <Section index="01" title="Install">
        <p className="font-mono text-sm text-muted-foreground">
          Add the namespace once, then install anything.
        </p>
        <Code>{`npx shadcn@latest registry add ${siteConfig.namespace}=${siteConfig.registryUrl}`}</Code>
        <Code>{`npx shadcn@latest add ${siteConfig.namespace}/onboarding-wizard`}</Code>
        <p className="font-mono text-sm text-muted-foreground">
          Starting a new project? Initialize with the Tanfust design system.
        </p>
        <Code>{`npx shadcn@latest init ${siteConfig.url}/r/tanfust.json`}</Code>
      </Section>

      <Section index="02" title={`Catalog · ${total} item${total === 1 ? "" : "s"}`}>
        <dl className="divide-y border-y font-mono text-sm">
          {CATEGORIES.map((category) => {
            const items = groups.get(category.slug) ?? []
            return (
              <div key={category.slug} className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr]">
                <dt className="uppercase tracking-wider">{category.title}</dt>
                <dd className="flex flex-col gap-1">
                  <span className="text-muted-foreground">{category.description}</span>
                  {items.length === 0 ? (
                    <span className="opacity-60">[ coming soon ]</span>
                  ) : (
                    <ul className="flex flex-wrap gap-x-4 gap-y-1">
                      {items.map((item) => (
                        <li key={item.name}>
                          <a
                            href={`/docs/${category.slug}/${item.name}`}
                            className="underline-offset-4 hover:underline"
                          >
                            {item.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      </Section>

      <Section index="03" title="For agents">
        <p className="font-mono text-sm text-muted-foreground">
          The registry works with the shadcn MCP server out of the box, and the catalog is
          readable at <Mono>/r/registry.json</Mono> and <Mono>/llms.txt</Mono>.
        </p>
        <Code>{`npx shadcn@latest mcp init --client claude`}</Code>
      </Section>

      <footer className="mt-auto flex items-center justify-between border-t pt-6 font-mono text-xs text-muted-foreground">
        <span>Tanfust · Essentialist tools for doers.</span>
        <a href={siteConfig.links.github} className="hover:text-foreground">
          github →
        </a>
      </footer>
    </div>
  )
}

function Section({
  index,
  title,
  children,
}: {
  index: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-baseline gap-3 font-mono text-sm uppercase tracking-wider">
        <span className="text-muted-foreground">[{index}]</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/40 px-4 py-3 font-mono text-sm">
      <code>{children}</code>
    </pre>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 text-foreground">{children}</code>
}
