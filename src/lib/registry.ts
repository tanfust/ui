import { registrySchema } from "shadcn/schema"
import type { Registry, RegistryItem } from "shadcn/schema"

import catalogJson from "../../public/r/registry.json"

/**
 * The built catalog (`public/r/registry.json`) is the single source of truth
 * for the docs site: sidebar, search, item pages and llms.txt all read it.
 * It is imported statically so it ships with both the server and client
 * bundles. Run `pnpm registry:build` to regenerate it from the source registry.
 */
export const registry: Registry = registrySchema.parse(catalogJson)

export function getRegistryItem(name: string): RegistryItem | undefined {
  return registry.items.find((item) => item.name === name)
}

/** Categories in display order. Items are grouped by the folder they live in. */
export const CATEGORIES = [
  { slug: "foundations", title: "Foundations", description: "Design system base, theme and fonts." },
  { slug: "flows", title: "Flows", description: "Multi-step pages with components, hooks and actions." },
  { slug: "hooks", title: "Hooks", description: "Small, typed React hooks." },
  { slug: "lib", title: "Lib", description: "Utilities with no framework dependency." },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]["slug"]

export function categoryOf(item: RegistryItem): CategorySlug | undefined {
  // Prefer the declared category; fall back to the folder the first file lives in
  // (items like registry:base or registry:font have no files).
  const declared = item.categories?.[0]
  const first = item.files?.[0]?.path ?? ""
  const fromPath = first.match(/^src\/registry\/tanfust\/([^/]+)\//)?.[1]
  const slug = declared ?? fromPath
  return CATEGORIES.some((c) => c.slug === slug) ? (slug as CategorySlug) : undefined
}

export function getItemsByCategory() {
  const groups = new Map<CategorySlug, Array<RegistryItem>>()
  for (const category of CATEGORIES) groups.set(category.slug, [])
  for (const item of registry.items) {
    if (item.type === "registry:example" || item.type === "registry:internal") continue
    const slug = categoryOf(item)
    if (slug) groups.get(slug)!.push(item)
  }
  return groups
}
