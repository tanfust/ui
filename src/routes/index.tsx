import { createFileRoute } from "@tanstack/react-router"

import { buttonClasses } from "@/components/site/button"
import { Rule } from "@/components/site/rule"
import { SectionHeader } from "@/components/site/section-header"
import { siteConfig } from "@/config/site"
import { CATEGORIES, getItemsByCategory } from "@/lib/registry"

export const Route = createFileRoute("/")({ component: Home })

// Brutalist Mono, per tanfust.agency/docs/design.md: indexed sections `[NN]`,
// mono everywhere except the headline, semantic tokens only, bracketed CTAs,
// typographic glyphs instead of icons.

const pad = (n: number) => String(n).padStart(3, "0")

function Home() {
  const groups = getItemsByCategory()
  const total = [...groups.values()].reduce((n, items) => n + items.length, 0)

  return (
    <>
      <section aria-labelledby="hero-heading" className="border-b border-foreground">
        <div className="flex items-center justify-between px-6 py-4 font-mono text-[10px] uppercase tracking-wider">
          <span>Vol. I</span>
          <span>The Registry</span>
          <span>MMXXVI</span>
        </div>

        <Rule variant="double" />

        <div className="px-6 py-16 md:py-24">
          <h1
            className="text-5xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-7xl md:text-8xl"
            id="hero-heading"
          >
            Tanfust
            <br />
            UI.
          </h1>

          <ul className="mt-12 flex flex-col gap-2 font-mono text-xs uppercase tracking-wider">
            <li>&gt; Essentials for everyday sites and apps.</li>
            <li>&gt; Installed as source. The code is yours.</li>
            <li>&gt; Works with any shadcn project, Radix or Base UI.</li>
          </ul>

          <div className="mt-12 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wider">
            <a className={buttonClasses({ size: "sm", variant: "primary" })} href="#install">
              [ Install → ]
            </a>
            <a
              className={buttonClasses({ size: "sm", variant: "ghost" })}
              href={siteConfig.links.store}
              rel="noreferrer"
            >
              [ Store ↗ ]
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="install" className="border-b border-foreground px-6 py-12">
        <SectionHeader caption="one command" id="install" number="01" title="Install" />
        <div className="mt-8 flex flex-col gap-6 font-mono text-xs">
          <Step
            label="Add the namespace once"
            command={`npx shadcn@latest registry add ${siteConfig.namespace}=${siteConfig.registryUrl}`}
          />
          <Step
            label="Then install anything"
            command={`npx shadcn@latest add ${siteConfig.namespace}/onboarding-wizard`}
          />
          <Step
            label="New project? Start from the Tanfust design system"
            command={`npx shadcn@latest init ${siteConfig.url}/r/tanfust.json`}
          />
        </div>
      </section>

      <section aria-labelledby="catalog" className="border-b border-foreground px-6 py-12">
        <SectionHeader caption={`${pad(total)} entries`} id="catalog" number="02" title="Catalog" />
        <dl className="mt-8 font-mono text-xs">
          {CATEGORIES.map((category, index) => {
            const items = groups.get(category.slug) ?? []
            return (
              <div
                className="grid gap-2 border-t border-foreground py-5 sm:grid-cols-[3rem_10rem_1fr]"
                key={category.slug}
              >
                <span aria-hidden className="opacity-60">
                  {pad(index + 1)}
                </span>
                <dt className="uppercase tracking-wider">{category.title}</dt>
                <dd className="flex flex-col gap-2">
                  <span className="text-muted-foreground">{category.description}</span>
                  {items.length === 0 ? (
                    <span className="uppercase tracking-wider opacity-60">[ coming soon ]</span>
                  ) : (
                    <ul className="flex flex-wrap gap-x-4 gap-y-1">
                      {items.map((item) => (
                        <li key={item.name}>
                          <a
                            className="underline underline-offset-4 hover:no-underline"
                            href={`/docs/${category.slug}/${item.name}`}
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
      </section>

      <section aria-labelledby="agents" className="px-6 py-12">
        <SectionHeader caption="mcp · llms.txt" id="agents" number="03" title="For agents" />
        <div className="mt-8 flex flex-col gap-6 font-mono text-xs">
          <p className="max-w-prose leading-relaxed text-muted-foreground">
            The registry works with the shadcn MCP server out of the box. The catalog is
            readable at <Mono>/r/registry.json</Mono>, each item at{" "}
            <Mono>/r/&lt;item&gt;.json</Mono>, and a plain-text index at <Mono>/llms.txt</Mono>.
          </p>
          <Step label="Expose it to your agent" command="npx shadcn@latest mcp init --client claude" />
        </div>
      </section>
    </>
  )
}

function Step({ label, command }: { label: string; command: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-wider">&gt; {label}</span>
      <pre className="overflow-x-auto border border-foreground px-4 py-3">
        <code>{command}</code>
      </pre>
    </div>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="text-foreground">{children}</code>
}
