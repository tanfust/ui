import { createFileRoute, notFound } from "@tanstack/react-router"

import { Index } from "@/__registry__/index"
import { CodeTabs } from "@/components/docs/code-tabs"
import { CommandBlock } from "@/components/docs/command-block"
import { Preview } from "@/components/docs/preview"
import { OpenInV0Button } from "@/components/open-in-v0-button"
import { SectionHeader } from "@/components/site/section-header"
import { siteConfig } from "@/config/site"
import { addCommand, initCommand, itemUrl } from "@/lib/install"
import { getItem } from "@/lib/item.functions"
import { CATEGORIES, categoryOf, getRegistryItem } from "@/lib/registry"

export const Route = createFileRoute("/docs/$category/$item")({
  loader: async ({ params }) => {
    const summary = getRegistryItem(params.item)
    const category = CATEGORIES.find((c) => c.slug === params.category)
    if (!summary || !category || categoryOf(summary) !== category.slug) throw notFound()
    const item = await getItem({ data: params.item })
    if (!item) throw notFound()
    return { item, category }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.item.title ?? loaderData.item.name} — ${siteConfig.name}` },
          { name: "description", content: loaderData.item.description ?? siteConfig.description },
        ]
      : [],
  }),
  component: ItemPage,
})

function ItemPage() {
  const { item, category } = Route.useLoaderData()
  const files = (item.files ?? [])
    .filter((f) => typeof f.content === "string")
    .map((f) => ({ path: f.path, target: f.target, content: f.content ?? "" }))
  const hasPreview = `${item.name}-demo` in Index
  const registryDeps = item.registryDependencies ?? []
  const deps = item.dependencies ?? []
  const meta = (item.meta ?? {}) as { version?: string; tier?: string }

  return (
    <article className="flex max-w-4xl flex-col gap-12">
      <header className="flex flex-col gap-4">
        <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <a className="underline-offset-4 hover:underline" href="/docs">
            Docs
          </a>
          <span aria-hidden>/</span>
          <span>{category.title}</span>
          <span aria-hidden>/</span>
          <span className="text-foreground">{item.name}</span>
          <span aria-hidden className="flex-1" />
          <span>{item.type.replace("registry:", "")}</span>
          {meta.version ? <span>· v{meta.version}</span> : null}
        </p>
        <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">{item.title ?? item.name}</h1>
        {item.description ? (
          <p className="max-w-prose font-mono text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <OpenInV0Button url={itemUrl(item.name)} />
          <a
            className="font-mono text-[10px] uppercase tracking-wider underline underline-offset-4 hover:no-underline"
            href={`/r/${item.name}.json`}
          >
            registry-item.json ↗
          </a>
        </div>
      </header>

      {hasPreview ? (
        <section className="flex flex-col gap-6">
          <SectionHeader caption={`${item.name}-demo`} number="01" title="Preview" />
          <Preview name={item.name} />
        </section>
      ) : null}

      <section className="flex flex-col gap-6">
        <SectionHeader caption={siteConfig.namespace} number="02" title="Install" />
        {item.type === "registry:base" ? (
          <>
            <p className="font-mono text-xs leading-relaxed text-muted-foreground">
              A base is applied with <code className="text-foreground">init</code>, in a new or existing
              project. It writes components.json, the tokens and fonts, and registers the namespace.
            </p>
            <CommandBlock command={initCommand} />
          </>
        ) : (
          <CommandBlock command={(pm) => addCommand(pm, item.name)} />
        )}
        {item.docs ? (
          <p className="border-l-2 border-foreground pl-4 font-mono text-xs leading-relaxed text-muted-foreground">
            {item.docs}
          </p>
        ) : null}
      </section>

      {files.length > 0 ? (
        <section className="flex flex-col gap-6">
          <SectionHeader
            caption={`${files.length} file${files.length === 1 ? "" : "s"}`}
            number="03"
            title="Source"
          />
          <CodeTabs files={files} />
        </section>
      ) : null}

      {item.type === "registry:font" && "font" in item ? (
        <Json number="03" title="Font" value={item.font} />
      ) : null}
      {item.type === "registry:base" && "config" in item && item.config ? (
        <Json number="03" title="components.json" value={item.config} />
      ) : null}
      {item.cssVars ? <Json number="04" title="CSS variables" value={item.cssVars} /> : null}
      {item.css ? <Json number="05" title="CSS" value={item.css} /> : null}

      {registryDeps.length + deps.length > 0 ? (
        <section className="flex flex-col gap-6">
          <SectionHeader number="06" title="Dependencies" />
          <dl className="grid gap-4 font-mono text-xs sm:grid-cols-[10rem_1fr]">
            {registryDeps.length > 0 ? (
              <>
                <dt className="uppercase tracking-wider text-muted-foreground">Registry</dt>
                <dd className="flex flex-wrap gap-x-4 gap-y-1">
                  {registryDeps.map((dep) => (
                    <DepLink dep={dep} key={dep} />
                  ))}
                </dd>
              </>
            ) : null}
            {deps.length > 0 ? (
              <>
                <dt className="uppercase tracking-wider text-muted-foreground">npm</dt>
                <dd className="flex flex-wrap gap-x-4 gap-y-1">
                  {deps.map((dep) => (
                    <a
                      className="underline underline-offset-4 hover:no-underline"
                      href={`https://www.npmjs.com/package/${dep.replace(/@[\d^~].*$/, "")}`}
                      key={dep}
                      rel="noreferrer"
                    >
                      {dep}
                    </a>
                  ))}
                </dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}
    </article>
  )
}

function DepLink({ dep }: { dep: string }) {
  if (dep.startsWith("@tanfust/")) {
    const name = dep.slice("@tanfust/".length)
    const item = getRegistryItem(name)
    const slug = item ? categoryOf(item) : undefined
    return slug ? (
      <a className="underline underline-offset-4 hover:no-underline" href={`/docs/${slug}/${name}`}>
        {dep}
      </a>
    ) : (
      <span>{dep}</span>
    )
  }
  if (dep.startsWith("http")) {
    return (
      <a className="underline underline-offset-4 hover:no-underline" href={dep} rel="noreferrer">
        {dep}
      </a>
    )
  }
  return (
    <a
      className="underline underline-offset-4 hover:no-underline"
      href={`https://ui.shadcn.com/docs/components/${dep}`}
      rel="noreferrer"
    >
      @shadcn/{dep}
    </a>
  )
}

function Json({ number, title, value }: { number: string; title: string; value: unknown }) {
  return (
    <section className="flex flex-col gap-6">
      <SectionHeader number={number} title={title} />
      <pre className="max-h-[32rem] overflow-auto border border-foreground px-4 py-3 font-mono text-xs leading-relaxed">
        <code>{JSON.stringify(value, null, 2)}</code>
      </pre>
    </section>
  )
}
