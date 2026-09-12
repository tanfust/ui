# shadcn Registry System — Working Reference

Compiled 2026-09-12 from the shadcn/ui docs sources (`apps/v4/content/docs/**`, repo `shadcn-ui/ui` at commit `2b3e6d4f`, CLI `shadcn@4.21.0`), the CLI source (`packages/shadcn/src/**`), and `shadcn-ui/registry-template`. Live pages: `https://ui.shadcn.com/docs/...` (same paths as noted per section).

> Sourcing note: `ui.shadcn.com` was not reachable from this sandbox through the egress proxy, so the pages were read from their MDX sources on GitHub (identical content, current as of today). Where the docs were silent I read the CLI source directly and flagged it as **[source]**.

Registry section sidebar today (from `docs/registry/meta.json`):
Introduction · Getting Started · GitHub Registries · Registry Directory (`/docs/registry/registry-index`) · Registry Health · Examples · Namespaces · Authentication · Dynamic Search · MCP Server · Open in v0 · API Reference · registry.json · registry-item.json. (There is also `/docs/registry/faq` not in the sidebar, and `/docs/directory` at root. `/docs/registry/changelog` and `/docs/registry/directory` do not exist; the changelog lives at `/docs/changelog`.)

---

## 0. Overview & mental model

Source: https://ui.shadcn.com/docs/registry , https://ui.shadcn.com/docs/registry/getting-started

- "You can use the `shadcn` CLI to run your own code registry. Running your own registry allows you to distribute your custom components, hooks, pages, config, rules and other files to any project."
- "**Note:** The registry works with any project type and any framework, and is not limited to React."
- Requirements: "The only requirement is that your registry catalog and registry items must conform to the registry schema specification and registry-item schema specification. Your registry can be a Next.js, Vite, Vue, Svelte, PHP or any other framework as long as it supports serving JSON over HTTP. It can also be a public GitHub repository with a `registry.json` file at the root."
- Two artifacts you serve:
  1. **Catalog / index**: `registry.json` at the registry root (e.g. `https://acme.com/r/registry.json`) — list of items *without* file `content`. Read by `list`, `search`, MCP.
  2. **Items**: one JSON per item at `{name}.json` (e.g. `https://acme.com/r/button.json`) — full `registry-item.json` *with* file `content`. Read by `view`, `add`, Open in v0.
- Three ways to reach a registry from the CLI: raw item URL (`add https://acme.com/r/button.json`), namespace (`add @acme/button` via `components.json.registries`), GitHub address (`add owner/repo/item`).

---

## 1. `registry.json` schema

Source: https://ui.shadcn.com/docs/registry/registry-json — JSON Schema: https://ui.shadcn.com/schema/registry.json

```json title="registry.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "shadcn",
  "homepage": "https://ui.shadcn.com",
  "items": [
    {
      "name": "hello-world",
      "type": "registry:block",
      "title": "Hello World",
      "description": "A simple hello world component.",
      "registryDependencies": [
        "button",
        "@acme/input-form",
        "https://example.com/r/foo"
      ],
      "dependencies": ["is-even@3.0.0", "motion"],
      "files": [
        {
          "path": "registry/default/hello-world/hello-world.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

### Fields

| Field | Required | Notes (verbatim where quoted) |
|---|---|---|
| `$schema` | optional | `"https://ui.shadcn.com/schema/registry.json"` |
| `name` | **required on root** (optional in included files) | "used to specify the name of your registry. This is used for data attributes and other metadata." |
| `homepage` | **required on root** (optional in included files) | "The homepage of your registry. This is used for data attributes and other metadata." |
| `include` | optional | array of relative paths to other `registry.json` files |
| `items` | optional, defaults `[]` | "Each item must implement the registry-item schema specification." |
| `pagination` | optional | `{ total, offset, limit, hasMore }` — only for dynamic-search responses (see §14). |

Rules:
- "The root `registry.json` must define at least one of `items` or `include`. If `items` is omitted, it defaults to an empty array."
- "Each include path must be a relative path to an explicit `registry.json` file. Folder shorthand is not supported."
- "Included `registry.json` files may omit `name` and `homepage`. These fields are required only on the root `registry.json`."
- "When `shadcn build` resolves includes, item file paths are read relative to the `registry.json` file that declares the item. The generated registry output is flattened and does not contain `include`."
- "Registry item names must be unique across the resolved registry, including all included files."
- **[source]** `getRegistry()` (remote fetch) "rejects catalogs that still use `include`" — the *served* catalog must be flattened. `loadRegistry()` (local) resolves `include` itself.
- **[source]** Item names may contain `/` (e.g. `"extension/foo"`); `shadcn build` creates nested output dirs (`public/r/extension/foo.json`).

Zod (source of truth, `packages/shadcn/src/registry/schema.ts`):

```ts
const registryBaseSchema = z.object({
  $schema: z.string().optional(),
  name: z.string().optional(),
  homepage: z.string().optional(),
  include: z.array(z.string()).optional(),
  items: z.array(registryItemSchema).optional(),
  pagination: registryPaginationSchema.optional(),
}).refine((r) => r.items !== undefined || r.include !== undefined, {
  message: "Registry must define at least one of `items` or `include`.",
})
// registrySchema (root) additionally requires name: string, homepage: string, items: array
```

### `include` example

```txt
registry.json
components
└── ui
    ├── button.tsx
    ├── input.tsx
    └── registry.json
hooks
├── registry.json
├── use-media-query.ts
└── use-toggle.ts
```

```json title="registry.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "include": [
    "components/ui/registry.json",
    "hooks/registry.json"
  ]
}
```

```json title="components/ui/registry.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "items": [
    { "name": "button", "type": "registry:ui", "files": [{ "path": "button.tsx", "type": "registry:ui" }] },
    { "name": "input",  "type": "registry:ui", "files": [{ "path": "input.tsx",  "type": "registry:ui" }] }
  ]
}
```

Changelog (May 2026): "Item file paths are preserved from the root registry, so a file declared in `components/ui/registry.json` is written as `components/ui/button.tsx` in the built registry item."

### Naming rules
- Item `name`: "should be unique for your registry". MCP best practice: "Use kebab-case for component names". Names may include `/` segments.
- Registry `name` (e.g. `acme`) is metadata; the *namespace* consumers use (`@acme`) is chosen by the consumer / directory entry, not by `registry.json.name`. Registry Health does check for "a matching registry name" (setup score).
- Registry Directory requires a **flat** registry: "`/registry.json` and `/component-name.json` files are expected to be in the root of the registry."

---

## 2. `registry-item.json` schema

Source: https://ui.shadcn.com/docs/registry/registry-item-json — JSON Schema: https://ui.shadcn.com/schema/registry-item.json

```json title="registry-item.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "hello-world",
  "type": "registry:block",
  "title": "Hello World",
  "description": "A simple hello world component.",
  "registryDependencies": [
    "button",
    "@acme/input-form",
    "https://example.com/r/foo"
  ],
  "dependencies": ["is-even@3.0.0", "motion"],
  "devDependencies": ["tw-animate-css"],
  "files": [
    {
      "path": "registry/new-york/hello-world/hello-world.tsx",
      "type": "registry:component"
    },
    {
      "path": "registry/new-york/hello-world/use-hello-world.ts",
      "type": "registry:hook"
    }
  ],
  "cssVars": {
    "theme": {
      "font-heading": "Poppins, sans-serif"
    },
    "light": {
      "brand": "oklch(0.205 0.015 18)"
    },
    "dark": {
      "brand": "oklch(0.205 0.015 18)"
    }
  }
}
```

### Every field (Zod is authoritative, `registry/schema.ts`)

```ts
export const registryItemCommonSchema = z.object({
  $schema: z.string().optional(),
  extends: z.string().optional(),          // "none" = do not extend shadcn/ui defaults (styles/bases)
  name: z.string(),                        // REQUIRED
  title: z.string().optional(),
  author: z.string().min(2).optional(),
  description: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  devDependencies: z.array(z.string()).optional(),
  registryDependencies: z.array(z.string()).optional(),
  files: z.array(registryItemFileSchema).optional(),
  tailwind: registryItemTailwindSchema.optional(),   // DEPRECATED
  cssVars: registryItemCssVarsSchema.optional(),
  css: registryItemCssSchema.optional(),
  envVars: registryItemEnvVarsSchema.optional(),
  meta: z.record(z.string(), z.any()).optional(),
  docs: z.string().optional(),
  categories: z.array(z.string()).optional(),
})

// type is REQUIRED and discriminates:
export const registryItemSchema = z.discriminatedUnion("type", [
  registryItemCommonSchema.extend({ type: z.literal("registry:base"), config: rawConfigSchema.deepPartial().optional() }),
  registryItemCommonSchema.extend({ type: z.literal("registry:font"), font: registryItemFontSchema }),  // font REQUIRED
  registryItemCommonSchema.extend({ type: registryItemTypeSchema.exclude(["registry:base", "registry:font"]) }),
])
```

Only `name` and `type` are schema-required. Docs guidance: "For blocks, the following properties are required: `name`, `description`, `type` and `files`." and "It is recommended to add a proper name and description to your registry item. This helps LLMs understand the component and its purpose."

| Field | Docs text |
|---|---|
| `name` | "The name of the item. This is used to identify the item in the registry. It should be unique for your registry." |
| `title` | "A human-readable title for your registry item. Keep it short and descriptive." |
| `description` | "A description of your registry item. This can be longer and more detailed than the `title`." |
| `type` | "used to specify the type of your registry item. This is used to determine the type and target path of the item when resolved for a project." |
| `author` | `"John Doe <john@doe.com>"` — "It can be unique to the registry item or the same as the author of the registry." |
| `dependencies` | npm packages. "Use `@version` to specify the version" e.g. `["@radix-ui/react-accordion", "zod", "lucide-react", "name@1.0.2"]` |
| `devDependencies` | "npm packages that are only needed during development" e.g. `["tw-animate-css", "name@1.2.0"]` |
| `registryDependencies` | item addresses — see §3 |
| `files` | array of `{path, type, target?, content?}` — see below |
| `tailwind` | "**DEPRECATED:** Use `cssVars.theme` instead for Tailwind v4 projects." `{ config: { content?, theme?, plugins? } }` |
| `cssVars` | `{ theme?, light?, dark? }` each `Record<string,string>` |
| `css` | "add new rules to the project's CSS file eg. `@layer base`, `@layer components`, `@utility`, `@keyframes`, `@plugin`, etc." |
| `envVars` | `Record<string,string>`; "added to the `.env.local` or `.env` file. Existing variables are not overwritten." "**IMPORTANT:** Use `envVars` to add development or example variables. Do NOT use it to add production variables." |
| `font` | required for `registry:font` — see table below |
| `config` | only on `registry:base` — deep-partial `components.json` |
| `docs` | "show custom documentation or message when installing your registry item via the CLI." e.g. `"To get an OPENAI_API_KEY, sign up for an account at https://platform.openai.com."` |
| `categories` | `["sidebar", "dashboard"]` — "Use `categories` to organize your registry item." |
| `meta` | "any key/value pair that you want to be available to the registry item." `{ "foo": "bar" }` |
| `extends` | `"none"` — "custom style that doesn't extend shadcn/ui" (used on `registry:style` / `registry:base`) |

### `type` values and default install targets

Docs table:

| Type | Description |
|---|---|
| `registry:base` | Use for entire design systems. |
| `registry:block` | Use for complex components with multiple files. |
| `registry:component` | Use for simple components. |
| `registry:font` | Use for fonts. |
| `registry:lib` | Use for lib and utils. |
| `registry:hook` | Use for hooks. |
| `registry:ui` | Use for UI components and single-file primitives. |
| `registry:page` | Use for page or file-based routes. |
| `registry:file` | Use for miscellaneous files. |
| `registry:style` | Use for registry styles. eg. `new-york`. |
| `registry:theme` | Use for themes. |
| `registry:item` | Use for universal registry items. |

**[source]** Two more values exist in the enum, marked "Internal use only": `registry:example`, `registry:internal`. They are excluded from `search --type` filters and from `registry validate` type suggestions. (shadcn's own registry uses `registry:example` for demo items that MCP's `get_item_examples_from_registries` finds by name patterns like `accordion-demo`.) There is no `registry:ai` type despite the namespaces page mentioning it as an example — it would fail schema validation.

**Default file target directories** (when a file has no `target`) — `resolveFileTargetDirectory()` **[source]**:

| file `type` | default directory (from `components.json` aliases) |
|---|---|
| `registry:ui` | `aliases.ui` (e.g. `components/ui/`) |
| `registry:lib` | `aliases.lib` (e.g. `lib/`) |
| `registry:hook` | `aliases.hooks` (e.g. `hooks/`) |
| `registry:block`, `registry:component` | `aliases.components` (e.g. `components/`) |
| anything else without `target` (`theme`, `style`, `item`, `base`, `font`…) | `aliases.components` |
| `registry:page`, `registry:file` | **`target` is required** (schema-enforced) |

Nested paths: `resolveNestedFilePath()` keeps whatever follows the last segment of the target dir in the source path (e.g. source `registry/new-york/blocks/x/components/foo.tsx` with target dir `.../components` → `components/foo.tsx`); if no common segment, just the filename. Blocks docs: "If your block has a page (optional), it should be the first entry in the `files` array and it should have a `target` property."

`registry:page` targets are framework-adapted **[source]** `resolvePageTarget()`: `next-app` keeps `app/foo/page.tsx`; `next-pages` → `pages/foo.tsx`; `react-router` → `app/routes/foo.tsx`; `laravel` → `resources/js/pages/foo.tsx`; other frameworks similar (`app/` prefix and `/page.tsx` suffix rewritten). Changelog Apr 2025: "The shadcn CLI can now auto-detect your framework and adapt routes for you. Works with all frameworks including Laravel, Vite and React Router."

### `files[]`

```json
{
  "files": [
    { "path": "registry/new-york/hello-world/page.tsx", "type": "registry:page", "target": "app/hello/page.tsx" },
    { "path": "registry/new-york/hello-world/hello-world.tsx", "type": "registry:component" },
    { "path": "registry/new-york/hello-world/use-hello-world.ts", "type": "registry:hook" },
    { "path": "registry/new-york/hello-world/.env", "type": "registry:file", "target": "~/.env" }
  ]
}
```

- `path` — "the path to the file in your registry. This path is used by the build script to parse, transform and build the registry JSON payload."
- `type` — a `registry:*` type (per file).
- `target` — "where the file should be placed in a project. This is optional and only required for `registry:page` and `registry:file` types. By default, the `shadcn` cli will read a project's `components.json` file to determine the target path." "Use `~` to refer to the root of the project e.g `~/foo.config.js`."
- `content` — inlined file contents (added by `shadcn build` / `loadRegistryItem`); must be **absent** in the catalog served for the Registry Directory.

Zod:
```ts
export const registryItemFileSchema = z.discriminatedUnion("type", [
  z.object({ path: z.string(), content: z.string().optional(), type: z.enum(["registry:file", "registry:page"]), target: z.string() }),
  z.object({ path: z.string(), content: z.string().optional(), type: registryItemTypeSchema.exclude(["registry:file", "registry:page"]), target: z.string().optional() }),
])
```

**Target placeholders** (added `shadcn@4.7.0`, May 2026): "only supported at the start of `target` and are independent of the project's import prefix. For example, `@ui/button.tsx` works whether the project imports components with `@/`, `#`, package imports or workspace exports."

| Placeholder | Resolves to |
|---|---|
| `@components/` | `aliases.components` |
| `@ui/` | `aliases.ui` |
| `@lib/` | `aliases.lib` |
| `@hooks/` | `aliases.hooks` |

"Anything after the placeholder is preserved, so `@ui/ai/prompt-input.tsx` installs under the user's configured `ui` directory at `ai/prompt-input.tsx`." "The `target` property decides where the file is written. It can point to a different shadcn directory than the file `type`." "Unknown placeholders are treated as regular target paths. For example, `@foo/bar.ts` is written as `foo/bar.ts`. Embedded placeholders such as `components/@ui/button.tsx` are also treated as regular paths." "`@utils/` is not supported because `utils` points to a file, not a directory."

```json
{
  "files": [
    { "path": "registry/new-york/example/button.tsx", "type": "registry:ui", "target": "@ui/button.tsx" },
    { "path": "registry/new-york/example/prompt-input.tsx", "type": "registry:ui", "target": "@ui/ai/prompt-input.tsx" },
    { "path": "registry/new-york/example/card.tsx", "type": "registry:component", "target": "@components/card.tsx" },
    { "path": "registry/new-york/example/helper.ts", "type": "registry:lib", "target": "@lib/helper.ts" },
    { "path": "registry/new-york/example/use-demo.ts", "type": "registry:hook", "target": "@hooks/use-demo.ts" }
  ]
}
```

### `cssVars`

```json
{
  "cssVars": {
    "theme": { "font-heading": "Poppins, sans-serif" },
    "light": { "brand": "20 14.3% 4.1%", "radius": "0.5rem" },
    "dark":  { "brand": "20 14.3% 4.1%" }
  }
}
```
FAQ: adding `brand-background`/`brand-accent` under `light`/`dark` → "The CLI will update the project CSS file. Once updated, the new colors will be available to be used as utility classes: `bg-brand` and `text-brand-accent`." `cssVars.theme` maps to Tailwind v4 `@theme` (e.g. `text-base`, `ease-in-out`, `font-heading`, `spacing`, `breakpoint-*`, `--animate-*`).

### `css`

```json
{
  "css": {
    "@plugin @tailwindcss/typography": {},
    "@plugin foo": {},
    "@layer base": { "body": { "font-size": "var(--text-base)", "line-height": "1.5" } },
    "@layer components": { "button": { "background-color": "var(--color-primary)", "color": "var(--color-white)" } },
    "@utility text-magic": { "font-size": "var(--text-base)", "line-height": "1.5" },
    "@keyframes wiggle": { "0%, 100%": { "transform": "rotate(-3deg)" }, "50%": { "transform": "rotate(3deg)" } }
  }
}
```
Zod: `z.record(string, cssValueSchema)` where value is string | array | nested record (empty `{}` allowed, used for `@import ...` and `@plugin ...` keys).

### `envVars`

```json
{
  "envVars": {
    "NEXT_PUBLIC_APP_URL": "http://localhost:4000",
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/postgres",
    "OPENAI_API_KEY": ""
  }
}
```

### `font` (required for `registry:font`)

```json
{
  "font": {
    "family": "'Inter Variable', sans-serif",
    "provider": "google",
    "import": "Inter",
    "variable": "--font-sans",
    "subsets": ["latin"],
    "dependency": "@fontsource-variable/inter"
  }
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `family` | `string` | Yes | The CSS font-family value. |
| `provider` | `string` | Yes | The font provider. Currently only `google` is supported. |
| `import` | `string` | Yes | The import name for the font from `next/font/google`. |
| `variable` | `string` | Yes | The CSS variable name for the font (e.g., `--font-sans`, `--font-mono`). |
| `weight` | `string[]` | No | Array of font weights to include. |
| `subsets` | `string[]` | No | Array of font subsets to include. |
| `selector` | `string` | No | CSS selector to apply the font to. Defaults to `html`. |
| `dependency` | `string` | No | The npm package to install for non-Next.js projects (e.g., `@fontsource-variable/inter`). |

"When `selector` is set, the font utility class (e.g. `font-heading`) is applied via CSS `@apply` on the specified selector within `@layer base`, instead of being added to the `<html>` element. The CSS variable is still injected on `<html>` so it's available globally."

### `config` (only `registry:base`) — all optional

| Property | Type | Description |
|---|---|---|
| `style` | `string` | The style name for the base. |
| `iconLibrary` | `string` | The icon library to use (e.g. `lucide`). |
| `rsc` | `boolean` | Whether to enable React Server Components. Defaults to `false`. |
| `tsx` | `boolean` | Whether to use TypeScript. Defaults to `true`. |
| `rtl` | `boolean` | Whether to enable right-to-left support. Defaults to `false`. |
| `menuColor` | `"default" \| "inverted" \| "default-translucent" \| "inverted-translucent"` | The menu color scheme. Defaults to `"default"`. |
| `menuAccent` | `"subtle" \| "bold"` | The menu accent style. Defaults to `"subtle"`. |
| `tailwind.baseColor` | `string` | The base color name (e.g. `neutral`, `slate`, `zinc`). |
| `tailwind.css` | `string` | Path to the Tailwind CSS file. |
| `tailwind.prefix` | `string` | A prefix to add to all Tailwind classes. |
| `aliases.components` / `.utils` / `.ui` / `.lib` / `.hooks` | `string` | Import aliases. |
| `registries` | `Record<string, string \| object>` | Custom registry URLs. Keys must start with `@`. |

(A `registry:base` can therefore pre-configure your own namespace into the consumer's `components.json` via `config.registries`.)

---

## 3. `registryDependencies` — how items reference other items

Source: https://ui.shadcn.com/docs/registry/registry-item-json#registrydependencies , https://ui.shadcn.com/docs/registry/github#registry-dependencies , https://ui.shadcn.com/docs/registry/faq

"Used for registry dependencies. Each entry is an item address."

- "For `shadcn/ui` registry items such as `button`, `input`, `select`, etc use the name eg. `['button', 'input', 'select']`."
- "For namespaced registry items, use `@namespace/item-name` eg. `['@acme/input-form']`."
- "For GitHub registry items, use `owner/repo/item-name` eg. `['acme/ui/button']`. For published registries, prefer a tag or full commit SHA eg. `['acme/ui/button#v1.2.0']`."
- "For custom registry items use the URL of the registry item eg. `['https://example.com/r/hello-world.json']`."
- "For local registry item files use a file path eg. `['./hello-world.json']`."

```json
{
  "registryDependencies": [
    "button",
    "@acme/input-form",
    "acme/ui/button#v1.2.0",
    "https://example.com/r/editor.json",
    "./editor.json"
  ]
}
```

Gotchas:
- "Bare names keep their existing behavior. `button` means the built-in shadcn `button` item, not an item from the same GitHub repository. For same-repository GitHub dependencies, use the full GitHub item address." **For a hosted registry, reference your own items by full URL or your namespace (`@acme/foo`) — a bare `foo` resolves to `@shadcn/foo`.**
- "Refs are not inherited across dependencies. If a GitHub dependency should be reproducible, pin that dependency to its own tag or full commit SHA."
- `@shadcn/card` is the explicit form of the built-in registry. **[source]** `BUILTIN_REGISTRIES = { "@shadcn": "https://ui.shadcn.com/r/styles/{style}/{name}.json" }` — cannot be overridden or re-added.
- Dependencies resolve with their own registry's auth context ("Maintains separate authentication contexts for each registry"). A paid item may depend on a free item on another endpoint and vice-versa.

### Resolution algorithm (namespaces page)
"When you run `npx shadcn@latest add @namespace/resource`, the CLI does the following:
1. **Clears registry context** to start fresh
2. **Fetches the main resource** from the specified registry
3. **Recursively resolves dependencies** from their respective registries
4. **Applies topological sorting** to ensure proper installation order
5. **Deduplicates files** based on target paths (last one wins)
6. **Deep merges configurations** (tailwind, cssVars, css, envVars)"

"This means that if you run `npx shadcn@latest add @acme/auth @custom/login-form` the `login-form.ts` from `@custom/login-form` will override the `login-form.ts` from `@acme/auth` because it's resolved last."

Override pattern (verbatim):

```json title="custom-button.json"
{
  "name": "custom-button",
  "type": "registry:ui",
  "registryDependencies": [
    "@vendor/button" // Import original first
  ],
  "cssVars": {
    "light": {
      "--button-bg": "purple" // Override the color
    }
  }
}
```

"Key Resolution Features: 1. **Source Tracking**: Each resource knows which registry it came from, avoiding naming conflicts 2. **Circular Dependency Prevention** 3. **Smart Installation Order**: Dependencies are installed first".

---

## 4. Namespaced registries (`components.json.registries`)

Source: https://ui.shadcn.com/docs/registry/namespace , https://ui.shadcn.com/docs/components-json#registries

### Naming
"Registry names must follow these rules: Start with `@` symbol; Contain only alphanumeric characters, hyphens, and underscores. Examples of valid names: `@v0`, `@acme-ui`, `@my_company`. The pattern for referencing resources is: `@namespace/resource-name`."

Parser regex: `/^(@[a-zA-Z0-9](?:[a-zA-Z0-9-_]*[a-zA-Z0-9])?)\/(.+)$/`

### Config shapes

```json title="components.json"
{
  "registries": {
    "@v0": "https://v0.dev/chat/b/{name}",
    "@acme": "https://registry.acme.com/resources/{name}.json",
    "@lib": "https://lib.company.com/utilities/{name}",
    "@ai": "https://ai-resources.com/r/{name}.json"
  }
}
```

```json title="components.json"
{
  "registries": {
    "@private": {
      "url": "https://api.company.com/registry/{name}.json",
      "headers": {
        "Authorization": "Bearer ${REGISTRY_TOKEN}",
        "X-API-Key": "${API_KEY}"
      },
      "params": {
        "version": "latest",
        "format": "json"
      }
    }
  }
}
```

Zod **[source]**:
```ts
export const registryConfigItemSchema = z.union([
  z.string().refine((s) => s.includes("{name}"), { message: "Registry URL must include {name} placeholder" }),
  z.object({
    url: z.string().refine((s) => s.includes("{name}"), { message: "Registry URL must include {name} placeholder" }),
    params: z.record(z.string(), z.string()).optional(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
])
export const registryConfigSchema = z.record(
  z.string().refine((key) => key.startsWith("@"), { message: "Registry names must start with @ (e.g., @v0, @acme)" }),
  registryConfigItemSchema
)
```

### Placeholders
- `{name}` (required): "`@acme/button` becomes `https://registry.acme.com/resources/button.json`".
- `{style}` (optional): "replaced with the current style configuration ... With style set to `new-york`, installing `@themes/card` resolves to: `https://registry.example.com/new-york/card.json`. ... Use this when you want to serve different versions of the same resource." **[source]** `{style}` is the consumer's `components.json.style`, which for CLI v4 projects is `<base>-<style>` e.g. `base-nova`, `radix-vega`, `aria-...` (see §13). This is the mechanism to serve Base UI vs Radix variants of the same item.
- `${VAR_NAME}`: "automatically expanded from your environment (process.env). This works in URLs, headers, and params." **[source]** regex `/\${(\w+)}/g`; unset **or empty** vars throw `RegistryMissingEnvironmentVariablesError` *before* the request (`registry/validator.ts`). The docs' "Provide sensible defaults using the `${VAR:-default}` syntax" is **not** supported by the current implementation (the regex only matches `\w+`), so don't rely on it.
- **[source]** Env is loaded from `.env.local`, `.env.development.local`, `.env.development`, `.env` in cwd (plus process.env). "Never logged", "Expanded at runtime", "Isolated per registry".

### Catalog URL derivation
The catalog is fetched by replacing `{name}` with `registry` — MCP page: "Make sure you have a registry item file at the root of your registry named `registry`. For example, if your registry is hosted at `https://acme.com/r/[name].json`, you should have a file at `https://acme.com/r/registry.json` or `https://acme.com/r/registry` if you're using a JSON file extension." Same headers/params are sent.

### Consumer installs `@tanfust/foo`

```bash
# 1. add the namespace (writes components.json, or package.json if no components.json)
npx shadcn@latest registry add @tanfust=https://registry.tanfust.com/r/{name}.json
# or manually:
```
```json title="components.json"
{ "registries": { "@tanfust": "https://registry.tanfust.com/r/{name}.json" } }
```
```bash
# 2. discover / inspect / install
npx shadcn@latest list @tanfust
npx shadcn@latest search @tanfust --query button
npx shadcn@latest view @tanfust/foo
npx shadcn@latest add @tanfust/foo
```

**[source]** `registry add` accepts `@ns=url` (URL must include `{name}`) or bare `@ns` (looked up in `https://ui.shadcn.com/r/registries.json`); with no args it prompts a multiselect from the directory. Skips namespaces already configured; refuses built-ins (`@shadcn`). Writes to `components.json` if present, else to top-level `registries` in `package.json`. `getRegistriesConfig()` reads the same two places.

If the namespace is in the official directory, `add`/`search` auto-add it: "When you run `shadcn add` or `shadcn search`, the CLI will automatically check the registry index for the registry you are looking for and add it to your `components.json` file."

### "Making a registry the default"
There is no consumer-side "default registry" switch: bare names always mean `@shadcn`. Ways to make yours primary:
1. Ship a `registry:base` (or `registry:style`) item and have users `npx shadcn init https://registry.tanfust.com/r/base.json` (or `init --preset`/`--base`); `config.registries` in that base pre-registers `@tanfust`.
2. Publish to the Registry Directory so `@tanfust/foo` works with zero config.
3. Serve at your domain root with content negotiation so `shadcn add https://ui.tanfust.com` works.

### Error messages (verbatim)
```txt
Unknown registry "@non-existent". Make sure it is defined in components.json as follows:
{
  "registries": {
    "@non-existent": "[URL_TO_REGISTRY]"
  }
}
```
```txt
Registry "@private" requires the following environment variables:

  • REGISTRY_TOKEN

Set the required environment variables to your .env or .env.local file.
```
```txt
The item at https://registry.company.com/button.json was not found. It may not exist at the registry.
```
```txt
You are not authorized to access the item at https://api.company.com/button.json
Check your authentication credentials and environment variables.
```
```txt
Access forbidden for https://api.company.com/button.json
Verify your API key has the necessary permissions.
```

### Versioning via params (docs pattern)
```json
{ "@versioned": { "url": "https://registry.example.com/{name}", "params": { "version": "v2" } } }
```
"This resolves `@versioned/button` to: `https://registry.example.com/button?version=v2`". Dynamic: `"params": { "version": "${REGISTRY_VERSION}" }`. Best practices: "Support version pinning for reproducible builds", "Implement version discovery endpoints (e.g., `/versions/{name}`)", "Cache versioned resources appropriately with proper cache headers".

---

## 5. Authentication for private / paid registries

Source: https://ui.shadcn.com/docs/registry/authentication , namespaces page "Authentication & Security", open-in-v0 page

Use cases listed: "Private Components", "Team-Specific Resources", "Access Control", "Usage Analytics: See who's using which components in your organization", "**Licensing: Control who gets premium or licensed components**".

### Client side — three transports
```json title="components.json"
{ "registries": { "@private": { "url": "https://registry.company.com/{name}.json", "headers": { "Authorization": "Bearer ${REGISTRY_TOKEN}" } } } }
```
```json
{ "registries": { "@company": { "url": "https://api.company.com/registry/{name}.json", "headers": { "X-API-Key": "${API_KEY}", "X-Workspace-Id": "${WORKSPACE_ID}" } } } }
```
```json
{ "registries": { "@internal": { "url": "https://registry.company.com/{name}.json", "params": { "token": "${ACCESS_TOKEN}" } } } }
```
"This creates: `https://registry.company.com/button.json?token=your_token`". Also Basic: `"Authorization": "Basic ${BASE64_CREDENTIALS}"`.

```bash title=".env.local"
REGISTRY_TOKEN=your_secret_token_here
```

Mixed free/paid example (verbatim):
```json title="components.json"
{
  "registries": {
    "@public": "https://public.company.com/{name}.json",
    "@internal": {
      "url": "https://internal.company.com/{name}.json",
      "headers": { "Authorization": "Bearer ${INTERNAL_TOKEN}" }
    },
    "@premium": {
      "url": "https://premium.company.com/{name}.json",
      "headers": { "X-License-Key": "${LICENSE_KEY}" }
    }
  }
}
```

### What the CLI sends **[source]** (`registry/fetcher.ts`)
- Always: `Accept: application/vnd.shadcn.v1+json, application/json;q=0.9` and `User-Agent: shadcn`, then the configured headers (configured headers override).
- Params appended as query string; `{name}`/`{style}` substituted; env vars expanded.
- Responses cached in memory per (URL, headers) for the process lifetime.

### Status handling **[source]**
| Status | Error class | User message pattern |
|---|---|---|
| 401 | `RegistryUnauthorizedError` | "You are not authorized to access the item at …" + server message |
| 403 | `RegistryForbiddenError` | "Access forbidden for …" + server message |
| 404 | `RegistryNotFoundError` | "The item at … was not found." |
| 410 | `RegistryGoneError` | |
| other | `RegistryFetchError(url, status, message)` | |
| 429 | docs: "Rate limit exceeded" (falls into `RegistryFetchError`) |

**Custom error body is surfaced to the user.** The CLI parses JSON error bodies (`content-type: application/json`) with shape `{ detail?, title?, message?, error? }` — "Prefer RFC 7807 detail field, then message field", and prefixes `[error] ` if `error` is present:

```typescript
return NextResponse.json(
  {
    error: "Unauthorized",
    message: "Your subscription has expired. Please renew at company.com/billing",
  },
  { status: 403 }
)
```
"The user will see: `Your subscription has expired. Please renew at company.com/billing`". Changelog example: `[Unauthorized] Your API key has expired. Renew it at https://example.com/api/renew-key.`

Suggested per-scenario messages (verbatim):
```typescript
if (!token) {
  return NextResponse.json({ error: "Unauthorized", message: "Authentication required. Set REGISTRY_TOKEN in your .env.local file" }, { status: 401 })
}
if (isExpiredToken(token)) {
  return NextResponse.json({ error: "Unauthorized", message: "Token expired. Request a new token at company.com/tokens" }, { status: 401 })
}
if (!hasTeamAccess(token, component)) {
  return NextResponse.json({ error: "Forbidden", message: `Component '${component}' is restricted to the Design team` }, { status: 403 })
}
```

### Server-side reference implementation (verbatim)
```typescript title="app/api/registry/[name]/route.ts"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  // Get token from Authorization header.
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  // Or from query parameters.
  const queryToken = request.nextUrl.searchParams.get("token")

  // Check if token is valid.
  if (!isValidToken(token || queryToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if token can access this component.
  if (!hasAccessToComponent(token, params.name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Return the component.
  const component = await getComponent(params.name)
  return NextResponse.json(component)
}
```

### Recommendations (docs)
- "Never commit actual tokens to version control. Use `.env.local`"
- "Use HTTPS always" · "Implement authentication: Require API keys or tokens for private registries" · "Rate limiting" · "Content validation"
- "Rotate Tokens" (30-day example) · "Log Access" (timestamp, userId, component, ip, userAgent)
- Testing: `REGISTRY_TOKEN=your_token npx shadcn@latest add @private/button` and `curl -H "Authorization: Bearer your_token" https://registry.company.com/button.json`
- Dynamic search "works with all authentication patterns. The CLI sends the configured headers and params with the search request, so you can scope search results to the authenticated user."
- Open in v0 supports **only** `?token=` query auth (see §7). If you want paid items openable in v0, accept a query token too.
- Team/user personalization: the server may return different item payloads per token (`getPersonalizedComponent(params.name, preferences)`).

---

## 6. `shadcn build`, serving, and the root index

Source: https://ui.shadcn.com/docs/cli#build , https://ui.shadcn.com/docs/registry/getting-started#serve-your-registry , CLI source `commands/build.ts`, `registry/loader.ts`

```bash
Usage: shadcn build [options] [registry]

build components for a shadcn registry

Arguments:
  registry             path to registry.json file (default: "./registry.json")

Options:
  -o, --output <path>  destination directory for json files (default: "./public/r")
  -c, --cwd <cwd>      the working directory. defaults to the current directory.
  -h, --help           display help for command
```
```bash
npx shadcn@latest build --output ./public/registry
```
(There is no `--registry-file/-r` flag; the registry file is the positional argument. The old `registry:build` command with `-v/--verbose` is the deprecated experimental predecessor and requires `components.json`.)

What it generates **[source]**:
- One `<output>/<item.name>.json` per item (nested dirs created if name contains `/`), each a full `registry-item.json` with `$schema` added and every file's `content` inlined (read from disk; `include`-relative paths honored).
- `<output>/registry.json`: if the source used `include`, a flattened catalog produced by `createRegistryCatalog()` which **strips `content`** from files (`files: item.files?.map(({ content, ...file }) => file)`); if single-file, the source `registry.json` is copied verbatim.
- Uses `readRegistryWithIncludes` → validates schema, uniqueness, include rules.

Serving:
- Static: "If you're running your registry on Next.js, you can serve these files by running the `next` server ... Your files will now be served at `http://localhost:3000/r/[NAME].json` eg. `http://localhost:3000/r/button.json`."
- Dynamic (route handlers, `npm install shadcn`):

```ts title="app/r/registry.json/route.ts"
import { loadRegistry } from "shadcn/registry"

export async function GET() {
  try {
    const registry = await loadRegistry()

    return Response.json(registry)
  } catch (error) {
    console.error(error)

    return Response.json({ error: "Failed to load registry." }, { status: 500 })
  }
}
```

```ts title="app/r/[name].json/route.ts"
import { loadRegistryItem, RegistryItemNotFoundError } from "shadcn/registry"

export async function GET(
  _request: Request,
  context: {
    params: Promise<{
      name: string
    }>
  }
) {
  const { name } = await context.params

  try {
    const item = await loadRegistryItem(name)

    return Response.json(item)
  } catch (error) {
    if (error instanceof RegistryItemNotFoundError) {
      return Response.json(
        { error: `Registry item "${name}" was not found.` },
        { status: 404 }
      )
    }

    console.error(error)

    return Response.json(
      { error: "Failed to load registry item." },
      { status: 500 }
    )
  }
}
```
"Both loaders resolve `include` before returning JSON, so route handlers can use the same source `registry.json` structure without running `shadcn build`." `loadRegistry({ cwd, registryFile })` "lists every item but **omits file contents** — like a built `registry.json` index." `loadRegistryItem(name, { cwd })` reads file contents from disk and inlines them.

**The root index** (`/r/registry.json`) is what `list`, `search` and MCP read; **[source]** it's derived by substituting `registry` for `{name}` in the namespace template. For GitHub addresses the CLI reads the repo's root `registry.json`.

### Content negotiation (host at domain root)
"When the CLI makes a request to a registry, it sends the following headers: **User-Agent**: `shadcn`; **Accept**: `application/vnd.shadcn.v1+json, application/json;q=0.9`."

```typescript title="next.config.ts"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [
            {
              type: "header",
              key: "accept",
              value: "(.*)application/vnd\\.shadcn\\.v1\\+json(.*)",
            },
          ],
          destination: "/r/index.json",
        },
        {
          source: "/",
          has: [
            {
              type: "header",
              key: "user-agent",
              value: "shadcn",
            },
          ],
          destination: "/r/index.json",
        },
      ],
    }
  },
  async headers() {
    return [
      {
        source: "/",
        headers: [{ key: "Vary", value: "Accept, User-Agent" }],
      },
    ]
  },
}

export default nextConfig
```
Enables "**Branded Registry URLs**: `shadcn add https://ui.example.com`".

### Validate
```bash
npx shadcn registry validate            # ./registry.json
npx shadcn registry validate acme/toolkit#v1.0.0
```
"The command checks the root `registry.json`, included registry files, item schema errors, duplicate item names, include rules, and local item file paths. Validation reports all actionable errors it can find in one run." Runs against source files — no build needed.

### Testing commands
```bash
npx shadcn@latest list http://localhost:3000/r/registry.json
npx shadcn@latest search http://localhost:3000/r/registry.json --query button
npx shadcn@latest view http://localhost:3000/r/button.json
npx shadcn@latest add http://localhost:3000/r/button.json
npx shadcn@latest registry add @acme=http://localhost:3000/r/{name}.json
npx shadcn@latest list @acme
npx shadcn@latest search @acme --query button
npx shadcn@latest view @acme/button
npx shadcn@latest add @acme/button
```
"Use the catalog URL for commands that discover items, like `list` and `search`. Use item URLs for commands that read or install a specific item, like `view` and `add`."

### Other CLI commands relevant to registries (from `/docs/cli`)

```bash
Usage: shadcn add [options] [components...]
Arguments:
  components           name, url or local path to component
Options:
  -y, --yes            skip confirmation prompt. (default: false)
  -o, --overwrite      overwrite existing files. (default: false)
  -c, --cwd <cwd>      the working directory. defaults to the current directory.
  -a, --all            add all available components (default: false)
  -p, --path <path>    the path to add the component to.
  -s, --silent         mute output. (default: false)
  --dry-run            preview changes without writing files. (default: false)
  --diff [path]        show diff for a file.
  --view [path]        show file contents.
```
```bash
Usage: shadcn view [options] <items...>      # -c/--cwd
Usage: shadcn search|list [options] <registries...>
  -q, --query <query>    query string
  -l, --limit <number>   maximum number of items to display per registry (default: "100")
  -o, --offset <number>  number of items to skip (default: "0")
```
`init [components...]` accepts "names, url or local path to component" — so `npx shadcn init https://acme.com/r/my-style.json` initializes from a `registry:style`/`registry:base`. Flags: `-t/--template (next, vite, start, react-router, laravel, astro)`, `-b/--base (base, radix, aria)`, `-p/--preset [name]`, `-d/--defaults (--template=next --preset=nova)`, `--rtl`, `--pointer`, `--monorepo`, `--reinstall`. `create` is an alias of `init`. Local files: `npx shadcn init ./template.json`, `npx shadcn add ./block.json`.

`registry` subcommands **[source]**: `registry add`, `registry validate`. `registry:mcp` prints a deprecation ("Use the `shadcn mcp` command instead").

---

## 7. Open in v0

Source: https://ui.shadcn.com/docs/registry/open-in-v0

- "If your registry is hosted and publicly accessible via a URL, you can open a registry item in v0 by using the `https://v0.dev/chat/api/open?url=[URL]` endpoint." e.g. `https://v0.dev/chat/api/open?url=https://ui.shadcn.com/r/styles/new-york/login-01.json`
- "**Important:** `Open in v0` does not support `cssVars`, `css`, `envVars`, namespaced registries, or advanced authentication methods."
- "Open in v0 only supports query parameter authentication. It does not support namespaced registries or advanced authentication methods like Bearer tokens or API keys in headers." → `https://registry.company.com/r/hello-world.json?token=your_secure_token_here`; "1. Check for the `token` query parameter 2. Validate ... 3. Return a `401 Unauthorized` ... 4. Both the shadcn CLI and Open in v0 will handle the 401 response and display an appropriate message". "**Security Note:** Make sure to encrypt and expire tokens. Never expose production tokens in documentation or examples."
- Button component (verbatim minus the SVG path data):

```tsx
import { Button } from "@/components/ui/button"

export function OpenInV0Button({ url }: { url: string }) {
  return (
    <Button
      aria-label="Open in v0"
      className="h-8 gap-1 rounded-[6px] bg-black px-3 text-xs text-white hover:bg-black hover:text-white dark:bg-white dark:text-black"
      asChild
    >
      <a
        href={`https://v0.dev/chat/api/open?url=${url}`}
        target="_blank"
        rel="noreferrer"
      >
        Open in{" "}
        <svg viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-current">
          {/* v0 logo paths */}
        </svg>
      </a>
    </Button>
  )
}
```
```jsx
<OpenInV0Button url="https://example.com/r/hello-world.json" />
```
registry-template variant: `href={`https://v0.dev/chat/api/open?url=${process.env.NEXT_PUBLIC_BASE_URL}/r/${name}.json`}`. See also https://v0.dev/chat/button.

---

## 8. Registry MCP

Source: https://ui.shadcn.com/docs/registry/mcp , https://ui.shadcn.com/docs/mcp , CLI `src/mcp/index.ts`

- "The shadcn MCP server works out of the box with any shadcn-compatible registry. You do not need to do anything special to enable MCP support for your registry."
- **Prerequisite**: "The MCP server works by requesting your registry index. Make sure you have a registry item file at the root of your registry named `registry`. ... `https://acme.com/r/registry.json` ... This file must be a valid JSON file that conforms to the registry schema."
- Consumer setup: add namespace to `components.json`, then `npx shadcn@latest mcp init --client claude|cursor|vscode|codex|opencode`. Config files written **[source]**: `.mcp.json` (claude), `.cursor/mcp.json`, `.vscode/mcp.json` (`servers` key), `opencode.json`; codex must be added manually to `~/.codex/config.toml`:
```toml
[mcp_servers.shadcn]
command = "npx"
args = ["shadcn@latest", "mcp"]
```
Manual Claude Code config:
```json title=".mcp.json"
{ "mcpServers": { "shadcn": { "command": "npx", "args": ["shadcn@latest", "mcp"] } } }
```
- `mcp init` also installs `shadcn@latest` as a dev dependency. The server loads `.env*` files so `${TOKEN}` auth works inside MCP.
- MCP tools **[source]**: `get_project_registries`, `list_items_in_registries`, `search_items_in_registries`, `view_items_in_registries`, `get_item_examples_from_registries` (fuzzy-searches for items named like `<component>-demo` / `<component> example`), `get_add_command_for_items`, `get_audit_checklist`. The server uses `useCache: false`.
- Best practices: "1. **Clear Descriptions** ... 2. **Proper Dependencies**: List all `dependencies` accurately so MCP can install them automatically. 3. **Registry Dependencies** ... 4. **Consistent Naming**: Use kebab-case".
- Design tip derived from the tools: ship `*-demo`/`*-example` items (type `registry:example` if you don't want them in `--type` filters, or `registry:component`) so agents can fetch usage examples.
- Example prompts: "Show me the components in the acme registry", "Create a landing page using items from the acme registry", "Install the Cursor rules from the acme registry".

---

## 9. Registry Directory (open-source index)

Source: https://ui.shadcn.com/docs/registry/registry-index , https://ui.shadcn.com/docs/directory , https://ui.shadcn.com/docs/registry/health

- List: https://ui.shadcn.com/r/registries.json (array of `{ name, url, homepage?, description?, health? }`; source file `apps/v4/registry/directory.json` entries also have `logo` (inline SVG string) and `author`).
- "When you run `shadcn add` or `shadcn search`, the CLI will automatically check the registry index for the registry you are looking for and add it to your `components.json` file."
- "You do not need to submit a public GitHub registry to the registry directory to use it with `owner/repo/item` addresses. The registry directory is for namespaces such as `@acme`."

Adding: "1. Add your registry to `apps/v4/registry/directory.json` 2. Run `pnpm validate:registries` 3. Create a pull request to https://github.com/shadcn-ui/ui ... Once the pull request is merged, your registry is published immediately."

Requirements (verbatim):
"1. The registry must be open source and publicly accessible.
2. The registry must be a valid JSON file that conforms to the registry schema specification.
3. The registry is expected to be a flat registry with no nested items i.e `/registry.json` and `/component-name.json` files are expected to be in the root of the registry.
4. The `files` array, if present, must NOT include a `content` property."

Directory entry format (from `directory.json`):
```json
{
  "name": "@23rd",
  "homepage": "https://23rd.dev",
  "url": "https://23rd.dev/r/{name}.json",
  "description": "Opinionated components for shippers.",
  "logo": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' ...></svg>"
}
```

**Implication for a free→paid registry:** the directory is for *open source, publicly accessible* registries. A mixed registry can list its public namespace (free items) while paid items live behind a different namespace/URL prefix that is not part of the directory listing — but the listed catalog must not fail health checks (see below), so don't 401 on the public `registry.json`.

### Registry Health (experimental, "not live yet")
"Registry Health only applies to registries listed in the shadcn/ui Registry Directory." Checks: Hourly index online/valid; Daily rotating item sample downloads+validates; Weekly `shadcn add --dry-run`. Statuses: Observing / Healthy / Degraded / Unavailable. Score /100 = Reliability 45 + Correctness 25 + Installability 20 + Registry setup 10 ("HTTPS, JSON responses, unique item names, and a matching registry name"). `hidden` after 7 continuous days unavailable; `monitoringLimited` when CDN/WAF challenge blocks the runner (don't bot-block `User-Agent: shadcn`).

---

## 10. Examples (verbatim from /docs/registry/examples and /faq)

Source: https://ui.shadcn.com/docs/registry/examples , https://ui.shadcn.com/docs/registry/faq

### registry:style — custom style that extends shadcn/ui
"On `npx shadcn init`, it will: Install `@tabler/icons-react` as a dependency. Add the `login-01` block and `calendar` component to the project. Add the `editor` from a remote registry. Set the `font-sans` variable to `Inter, sans-serif`. Install a `brand` color in light and dark mode."
```json title="example-style.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "example-style",
  "type": "registry:style",
  "dependencies": ["@tabler/icons-react"],
  "registryDependencies": [
    "login-01",
    "calendar",
    "https://example.com/r/editor.json"
  ],
  "cssVars": {
    "theme": {
      "font-sans": "Inter, sans-serif"
    },
    "light": {
      "brand": "20 14.3% 4.1%"
    },
    "dark": {
      "brand": "20 14.3% 4.1%"
    }
  }
}
```

### registry:style — from scratch (`extends: none`)
```json title="example-style.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "extends": "none",
  "name": "new-style",
  "type": "registry:style",
  "dependencies": ["cn"],
  "registryDependencies": [
    "utils",
    "https://example.com/r/button.json",
    "https://example.com/r/input.json",
    "https://example.com/r/label.json",
    "https://example.com/r/select.json"
  ],
  "cssVars": {
    "theme": {
      "font-sans": "Inter, sans-serif"
    },
    "light": {
      "main": "#88aaee",
      "bg": "#dfe5f2",
      "border": "#000",
      "text": "#000",
      "ring": "#000"
    },
    "dark": {
      "main": "#88aaee",
      "bg": "#272933",
      "border": "#000",
      "text": "#e6e6e6",
      "ring": "#fff"
    }
  }
}
```

### registry:theme
```json title="example-theme.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-theme",
  "type": "registry:theme",
  "cssVars": {
    "light": {
      "background": "oklch(1 0 0)",
      "foreground": "oklch(0.141 0.005 285.823)",
      "primary": "oklch(0.546 0.245 262.881)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      "ring": "oklch(0.746 0.16 232.661)",
      "sidebar-primary": "oklch(0.546 0.245 262.881)",
      "sidebar-primary-foreground": "oklch(0.97 0.014 254.604)",
      "sidebar-ring": "oklch(0.746 0.16 232.661)"
    },
    "dark": {
      "background": "oklch(1 0 0)",
      "foreground": "oklch(0.141 0.005 285.823)",
      "primary": "oklch(0.707 0.165 254.624)",
      "primary-foreground": "oklch(0.97 0.014 254.604)",
      "ring": "oklch(0.707 0.165 254.624)",
      "sidebar-primary": "oklch(0.707 0.165 254.624)",
      "sidebar-primary-foreground": "oklch(0.97 0.014 254.604)",
      "sidebar-ring": "oklch(0.707 0.165 254.624)"
    }
  }
}
```
Custom colors on a style: `{ "name": "custom-style", "type": "registry:style", "cssVars": { "light": { "brand": "oklch(0.99 0.00 0)" }, "dark": { "brand": "oklch(0.14 0.00 286)" } } }`.

### registry:block — page + components
```json title="login-01.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "login-01",
  "type": "registry:block",
  "description": "A simple login form.",
  "registryDependencies": ["button", "card", "input", "label"],
  "files": [
    {
      "path": "blocks/login-01/page.tsx",
      "content": "import { LoginForm } ...",
      "type": "registry:page",
      "target": "app/login/page.tsx"
    },
    {
      "path": "blocks/login-01/components/login-form.tsx",
      "content": "...",
      "type": "registry:component"
    }
  ]
}
```
Install a block and override primitives:
```json title="example-style.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-login",
  "type": "registry:block",
  "registryDependencies": [
    "login-01",
    "https://example.com/r/button.json",
    "https://example.com/r/input.json",
    "https://example.com/r/label.json"
  ]
}
```

### FAQ — complex component (page, 2 components, hook, lib, config file)
```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "hello-world",
  "title": "Hello World",
  "type": "registry:block",
  "description": "A complex hello world component",
  "files": [
    { "path": "registry/new-york/hello-world/page.tsx", "type": "registry:page", "target": "app/hello/page.tsx" },
    { "path": "registry/new-york/hello-world/components/hello-world.tsx", "type": "registry:component" },
    { "path": "registry/new-york/hello-world/components/formatted-message.tsx", "type": "registry:component" },
    { "path": "registry/new-york/hello-world/hooks/use-hello.ts", "type": "registry:hook" },
    { "path": "registry/new-york/hello-world/lib/format-date.ts", "type": "registry:lib" },
    { "path": "registry/new-york/hello-world/hello.config.ts", "type": "registry:file", "target": "~/hello.config.ts" }
  ]
}
```

### registry:ui / lib / hook
```json title="sidebar.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "sidebar",
  "type": "registry:ui",
  "dependencies": ["radix-ui"],
  "registryDependencies": ["button", "separator", "sheet", "tooltip"],
  "files": [{ "path": "ui/sidebar.tsx", "content": "...", "type": "registry:ui" }],
  "cssVars": {
    "light": { "sidebar-background": "oklch(0.985 0 0)", "sidebar-foreground": "oklch(0.141 0.005 285.823)", "sidebar-border": "oklch(0.92 0.004 286.32)" },
    "dark":  { "sidebar-background": "oklch(0.141 0.005 285.823)", "sidebar-foreground": "oklch(0.985 0 0)", "sidebar-border": "oklch(0.274 0.006 286.033)" }
  }
}
```
```json title="utils.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "utils",
  "type": "registry:lib",
  "dependencies": ["cn"],
  "files": [{ "path": "lib/utils.ts", "content": "export { cn } from \"cn\"", "type": "registry:lib" }]
}
```
```json title="use-debounce.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "use-debounce",
  "type": "registry:hook",
  "dependencies": ["react"],
  "files": [{ "path": "hooks/use-debounce.ts", "content": "...", "type": "registry:hook" }]
}
```

### Target placeholders (child + parent)
```json title="alias-child.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "alias-child",
  "type": "registry:item",
  "files": [
    { "path": "registry/new-york/alias/target-alias-button.tsx", "type": "registry:ui", "target": "@ui/target-alias-button.tsx", "content": "..." },
    { "path": "registry/new-york/alias/target-alias-helper.ts", "type": "registry:lib", "target": "@lib/target-alias-helper.ts", "content": "..." },
    { "path": "registry/new-york/alias/prompt-input.tsx", "type": "registry:ui", "target": "@ui/ai/prompt-input.tsx", "content": "..." }
  ]
}
```
```json title="alias-parent.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "alias-parent",
  "type": "registry:item",
  "registryDependencies": ["https://example.com/r/alias-child.json"],
  "files": [
    { "path": "registry/new-york/alias/target-alias-panel.tsx", "type": "registry:component", "target": "@components/target-alias-panel.tsx", "content": "..." },
    { "path": "registry/new-york/alias/use-target-alias.ts", "type": "registry:hook", "target": "@hooks/use-target-alias.ts", "content": "..." }
  ]
}
```
```json title="type-mismatch.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "type-mismatch",
  "type": "registry:item",
  "files": [{ "path": "registry/new-york/example/format-date.ts", "type": "registry:ui", "target": "@lib/format-date.ts", "content": "..." }]
}
```

### registry:font
```json title="font-playfair-display.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "font-playfair-display",
  "type": "registry:font",
  "font": {
    "family": "'Playfair Display Variable', serif",
    "provider": "google",
    "import": "Playfair_Display",
    "variable": "--font-heading",
    "subsets": ["latin"],
    "selector": "h1, h2, h3, h4, h5, h6",
    "dependency": "@fontsource-variable/playfair-display"
  }
}
```
(Also `font-inter` → `--font-sans`, `font-jetbrains-mono` with `"weight": ["400", "500", "600", "700"]` → `--font-mono`, `font-lora` → `--font-serif`.)

### registry:base
```json title="custom-base.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-base",
  "type": "registry:base",
  "config": {
    "style": "custom-base",
    "iconLibrary": "lucide",
    "tailwind": {
      "baseColor": "neutral"
    }
  },
  "dependencies": [
    "class-variance-authority",
    "tw-animate-css",
    "lucide-react"
  ],
  "registryDependencies": ["utils", "font-inter"],
  "cssVars": {
    "light": {
      "background": "oklch(1 0 0)",
      "foreground": "oklch(0.141 0.005 285.823)",
      "primary": "oklch(0.21 0.006 285.885)",
      "primary-foreground": "oklch(0.985 0 0)"
    },
    "dark": {
      "background": "oklch(0.141 0.005 285.823)",
      "foreground": "oklch(0.985 0 0)",
      "primary": "oklch(0.985 0 0)",
      "primary-foreground": "oklch(0.21 0.006 285.885)"
    }
  },
  "css": {
    "@import \"tw-animate-css\"": {},
    "@layer base": {
      "*": {
        "@apply border-border outline-ring/50": {}
      },
      "body": {
        "@apply bg-background text-foreground": {}
      }
    }
  }
}
```
Base from scratch:
```json title="custom-base.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "my-design-system",
  "extends": "none",
  "type": "registry:base",
  "config": { "style": "my-design-system", "iconLibrary": "lucide", "tailwind": { "baseColor": "slate" } },
  "dependencies": ["cn", "tw-animate-css", "lucide-react"],
  "registryDependencies": ["utils", "font-geist"],
  "cssVars": {
    "light": { "background": "oklch(1 0 0)", "foreground": "oklch(0.141 0.005 285.823)" },
    "dark":  { "background": "oklch(0.141 0.005 285.823)", "foreground": "oklch(0.985 0 0)" }
  }
}
```

### Common fields
```json
{ "$schema": "https://ui.shadcn.com/schema/registry-item.json", "name": "custom-component", "type": "registry:ui", "author": "shadcn", "files": [{ "path": "ui/custom-component.tsx", "content": "...", "type": "registry:ui" }] }
```
```json
{ "$schema": "https://ui.shadcn.com/schema/registry-item.json", "name": "custom-item", "type": "registry:item", "devDependencies": ["@types/mdx"], "files": [{ "path": "lib/mdx.ts", "content": "...", "type": "registry:lib" }] }
```
```json
{ "$schema": "https://ui.shadcn.com/schema/registry-item.json", "name": "custom-component", "type": "registry:ui", "meta": { "category": "forms", "version": "2.0.0" }, "files": [{ "path": "ui/custom-component.tsx", "content": "...", "type": "registry:ui" }] }
```

### CSS variables (theme)
```json
{ "name": "custom-theme", "type": "registry:theme", "cssVars": { "theme": { "font-heading": "Inter, sans-serif", "shadow-card": "0 0 0 1px rgba(0, 0, 0, 0.1)" } } }
```
```json
{ "name": "custom-theme", "type": "registry:theme", "cssVars": { "theme": { "spacing": "0.2rem", "breakpoint-sm": "640px", "breakpoint-md": "768px", "breakpoint-lg": "1024px", "breakpoint-xl": "1280px", "breakpoint-2xl": "1536px" } } }
```

### css — layers, utilities, imports, plugins, keyframes
```json title="example-base.json"
{ "name": "custom-style", "type": "registry:style", "css": { "@layer base": { "h1": { "font-size": "var(--text-2xl)" }, "h2": { "font-size": "var(--text-xl)" } } } }
```
```json title="example-card.json"
{ "name": "custom-card", "type": "registry:component", "css": { "@layer components": { "card": { "background-color": "var(--color-white)", "border-radius": "var(--rounded-lg)", "padding": "var(--spacing-6)", "box-shadow": "var(--shadow-xl)" } } } }
```
```json
{ "name": "custom-component", "type": "registry:component", "css": { "@utility content-auto": { "content-visibility": "auto" } } }
```
```json
{ "name": "custom-component", "type": "registry:component", "css": { "@utility scrollbar-hidden": { "scrollbar-hidden": { "&::-webkit-scrollbar": { "display": "none" } } } } }
```
```json
{ "name": "custom-component", "type": "registry:component", "css": { "@utility tab-*": { "tab-size": "var(--tab-size-*)" } } }
```
"Use `@import` to add CSS imports to your registry item. The imports will be placed at the top of the CSS file."
```json
{ "name": "custom-import", "type": "registry:component", "css": { "@import \"tailwindcss\"": {}, "@import \"./styles/base.css\"": {} } }
```
```json
{ "name": "font-import", "type": "registry:item", "css": { "@import url(\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap\")": {}, "@import url('./local-styles.css')": {} } }
```
```json
{ "name": "responsive-import", "type": "registry:item", "css": { "@import \"print-styles.css\" print": {}, "@import url(\"mobile.css\") screen and (max-width: 768px)": {} } }
```
"Use `@plugin` to add Tailwind plugins ... Plugins will be automatically placed after imports and before other content. **Important:** When using plugins from npm packages, you must also add them to the `dependencies` array."
```json title="example-typography.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "typography-component",
  "type": "registry:item",
  "dependencies": ["@tailwindcss/typography"],
  "css": {
    "@plugin \"@tailwindcss/typography\"": {},
    "@layer components": { ".prose": { "max-width": "65ch" } }
  }
}
```
```json
{ "name": "scoped-plugins", "type": "registry:component", "css": { "@plugin \"@headlessui/tailwindcss\"": {}, "@plugin \"tailwindcss/plugin\"": {}, "@plugin \"./custom-plugin.js\"": {} } }
```
"When you add multiple plugins, they are automatically grouped together and deduplicated." "When using both `@import` and `@plugin` directives, imports are placed first, followed by plugins, then other CSS content."
```json title="example-combined.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "combined-example",
  "type": "registry:item",
  "dependencies": ["@tailwindcss/typography", "tw-animate-css"],
  "css": {
    "@import \"tailwindcss\"": {},
    "@import url(\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap\")": {},
    "@plugin \"@tailwindcss/typography\"": {},
    "@plugin \"tw-animate-css\"": {},
    "@layer base": { "body": { "font-family": "Inter, sans-serif" } },
    "@utility content-auto": { "content-visibility": "auto" }
  }
}
```
Animations — "you need to define both `@keyframes` in css and `theme` in cssVars to use animations."
```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "custom-component",
  "type": "registry:component",
  "cssVars": { "theme": { "--animate-wiggle": "wiggle 1s ease-in-out infinite" } },
  "css": { "@keyframes wiggle": { "0%, 100%": { "transform": "rotate(-3deg)" }, "50%": { "transform": "rotate(3deg)" } } }
}
```

### envVars
```json
{ "$schema": "https://ui.shadcn.com/schema/registry-item.json", "name": "custom-item", "type": "registry:item", "envVars": { "NEXT_PUBLIC_APP_URL": "http://localhost:4000", "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/postgres", "OPENAI_API_KEY": "" } }
```

### Universal items (no framework / no components.json)
"As of `2.9.0`, you can create universal items that can be installed without framework detection or components.json. To make an item universal i.e framework agnostic, all the files in the item must have an explicit target."
```json title=".cursor/rules/custom-python.mdc"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "python-rules",
  "type": "registry:item",
  "files": [{ "path": "/path/to/your/registry/default/custom-python.mdc", "type": "registry:file", "target": "~/.cursor/rules/custom-python.mdc", "content": "..." }]
}
```
```json title=".eslintrc.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "my-eslint-config",
  "type": "registry:item",
  "files": [{ "path": "/path/to/your/registry/default/custom-eslint.json", "type": "registry:file", "target": "~/.eslintrc.json", "content": "..." }]
}
```
```json title="my-custom-starter-template.json"
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "my-custom-starter-template",
  "type": "registry:item",
  "dependencies": ["better-auth"],
  "files": [
    { "path": "/path/to/file-01.json", "type": "registry:file", "target": "~/file-01.json", "content": "..." },
    { "path": "/path/to/file-02.vue", "type": "registry:file", "target": "~/pages/file-02.vue", "content": "..." }
  ]
}
```
API note: "A config containing only `registries` is enough when every requested item and dependency is universal: a `registry:item` or `registry:file` whose files all declare explicit targets. Other items require a full resolved project config."

---

## 11. Changelog — registry-relevant changes 2025–2026

Source: https://ui.shadcn.com/docs/changelog (individual entries under `docs/changelog/*.mdx`)

| Date | Change |
|---|---|
| 2025-02-06 | **Updated Registry Schema** — "Define code as a flat JSON file and distribute it via the CLI. Custom styles ... Extend, override, mix & match components from third-party registries ... Install themes, CSS vars, hooks, animations, and Tailwind layers & utilities". |
| 2025-04-09 | **Cross-framework Route Support** — CLI auto-detects framework and adapts `registry:page` targets (Laravel, Vite, React Router…). |
| 2025-04-30 | **MCP** first version (`npx shadcn registry:mcp`, now deprecated). |
| 2025-07-07 | **Local File Support** — `npx shadcn init ./template.json`, `npx shadcn add ./block.json`. "Private components - Keep proprietary components local and private." |
| 2025-07-11 | **Universal Registry Items** — "no framework, no components.json, no tailwind, no react required" (all files need explicit `target`). |
| 2025-08-27 | **CLI 3.0** — namespaced registries (`@registry/name`), private registries with headers/params/env vars, `view`/`search`/`list`, MCP server for all registries (`mcp init`), rewritten resolver ("Up to 3x faster", "Smarter file deduplication and merging", "Updated `build` command"), custom server error messages surfaced to users/LLMs. API deprecations: `fetchRegistry`→`getRegistry`, `resolveRegistryTree`→`resolveRegistryItems`, schemas moved to `shadcn/schema`. |
| 2025-09-02 | **Registry Index** — `https://ui.shadcn.com/r/registries.json`; `npx shadcn add @ai-elements/prompt-input` auto-adds to components.json. |
| 2025-10-28 | **Registry Directory** page (`/docs/directory`). "Built into the CLI. No config required." |
| 2025-12-12 | **`npx shadcn create`** — choose Radix or Base UI, 5 styles (Vega, Nova, Maia, Lyra, Mira), icons, base color, theme, fonts. "When you pull down components, we auto-detect your library and apply the right transformations." |
| 2026-01-20 | Full Base UI docs. |
| 2026-02-02 | `new-york` style uses unified `radix-ui` package; `migrate radix`. |
| 2026-03-06 | **CLI v4** — shadcn/skills (`npx skills add shadcn/ui`), `--preset <code>`, `--dry-run/--diff/--view`, `init --template`, `init --base`, `info`, `docs`, **`registry:base` and `registry:font`** ("distribute an entire design system as a single payload"). |
| 2026-04 | `shadcn apply --preset`, `--only theme,font`; `shadcn preset decode/resolve/url/open`; new styles Sera, Luma (Mar), Rhea (May). |
| 2026-05-05 | **`shadcn@4.7.0`** — `package.json#imports` support; **target aliases** `@ui/`, `@components/`, `@lib/`, `@hooks/` in `files[].target`. |
| 2026-05-20 | **Registry `include` and `shadcn registry validate`**; `loadRegistry`/`loadRegistryItem` exported from `shadcn/registry` for dynamic routes. |
| 2026-05-31 | `shadcn eject` (inline `shadcn/tailwind.css`). |
| 2026-06-01 | **GitHub Registries** — `npx shadcn add <owner>/<repo>/<item>`, source registries, no build. |
| 2026-07-02 | **Base UI is the default** for new projects. "**Building a registry?** Ship a `registry:base` config if you want to pin a specific library. Items without one now init as Base UI." `init -b radix` to keep Radix. |
| 2026-07-31 | **Dynamic Search** — server-side `?q=&type=&limit=&offset=` with `pagination` response. |
| 2026-08-24 | **Private GitHub Registries** — via `gh` credentials or `GH_TOKEN`/`GITHUB_TOKEN`. |
| 2026-09 | `migrate cn` (clsx/tailwind-merge → `cn`). Docs now recommend `"dependencies": ["cn"]` + `export { cn } from "cn"` for `utils`. |

Also 2026-07: React Aria (`aria`) added as a third base; new `registry:*`-adjacent commands `docs -b base|radix|aria`.

---

## 12. registry-template (github.com/shadcn-ui/registry-template)

Source: repo README + tree (cloned 2026-09-12). Tailwind v4; for v3 see `shadcn-ui/registry-template-v3`.

README (verbatim): "The template uses a `registry.json` file to define components and their files. The `shadcn build` command is used to build the registry. The registry items are served as static files under `public/r/[name].json`. The template also includes a route handler for serving registry items. Every registry item are compatible with the `shadcn` CLI. We have also added v0 integration using the `Open in v0` api."

Layout:
```txt
registry.json                       # source catalog (name "acme", homepage "https://acme.com")
components.json                     # style new-york, rsc, tsx, tailwind.css app/globals.css, baseColor neutral, aliases @/...
registry/new-york/ui/{button,card,input,label,textarea}.tsx
registry/new-york/blocks/hello-world/hello-world.tsx
registry/new-york/blocks/example-form/example-form.tsx
registry/new-york/blocks/complex-component/{page.tsx,components/pokemon-card.tsx,components/pokemon-image.tsx,hooks/use-pokemon.ts,lib/pokemon.ts}
registry/new-york/blocks/example-with-css/{example-card.tsx,example-card.css}
public/r/{registry.json,hello-world.json,example-form.json,complex-component.json,example-with-css.json}   # shadcn build output
app/{layout.tsx,page.tsx,globals.css}   # page.tsx renders each block + <OpenInV0Button name="..."/>
components/open-in-v0-button.tsx        # href = https://v0.dev/chat/api/open?url=${NEXT_PUBLIC_BASE_URL}/r/${name}.json
lib/utils.ts, next.config.ts, postcss.config.mjs, eslint.config.mjs, tsconfig.json
```
`package.json` scripts: `"registry:build": "shadcn build"`; deps include `shadcn ^3.0.0`, `next 15.5.9`, `react 19.1.0`, `tailwindcss ^4.1.11`. (Note: the current clone has no `app/r/[name]/route.ts` despite the README's mention — items are served statically from `public/r`; add the `loadRegistryItem` handler from §6 if you want dynamic serving/auth.)

`registry.json` item example (complex, page target):
```json
{
  "name": "complex-component",
  "type": "registry:component",
  "title": "Complex Component",
  "description": "A complex component showing hooks, libs and components.",
  "registryDependencies": ["card"],
  "files": [
    { "path": "registry/new-york/blocks/complex-component/page.tsx", "type": "registry:page", "target": "app/pokemon/page.tsx" },
    { "path": "registry/new-york/blocks/complex-component/components/pokemon-card.tsx", "type": "registry:component" },
    { "path": "registry/new-york/blocks/complex-component/components/pokemon-image.tsx", "type": "registry:component" },
    { "path": "registry/new-york/blocks/complex-component/lib/pokemon.ts", "type": "registry:lib" },
    { "path": "registry/new-york/blocks/complex-component/hooks/use-pokemon.ts", "type": "registry:hook" }
  ]
}
```
Built output `public/r/hello-world.json` gains `"$schema"` and `"content"` per file.

Getting-started guidelines: "Place your registry item in the `registry/[STYLE]/[NAME]` directory ... **Imports should always use the `@/registry` path.** eg. `import { HelloWorld } from "@/registry/default/hello-world/hello-world"` ... Ideally, place your files within a registry item in `components`, `hooks`, `lib` directories." The CLI rewrites `@/registry/...` imports to the consumer's aliases on install.

### Blocks (shadcn's own library) — https://ui.shadcn.com/docs/blocks
Contribution flow: fork, `pnpm install`, `pnpm www:dev`; folder `apps/www/registry/new-york/blocks/<kebab-name>/{page.tsx, components/, hooks/, lib/}`; define in `registry-blocks.tsx` with `name, author, title, description, type: "registry:block", registryDependencies, dependencies, files (page first with target), categories`; `pnpm registry:build`; preview at `/blocks/[CATEGORY]` or `/view/styles/new-york/<name>`; `pnpm registry:capture` for screenshots; PR. Categories in `registry-categories.ts` `{ name, slug, hidden }`. "The following properties are required for the block definition: `name`, `description`, `type`, `files`, and `categories`."

---

## 13. Presets, `shadcn create`, base-ui vs radix (vs aria)

Source: https://ui.shadcn.com/docs/cli (init/apply/preset), https://ui.shadcn.com/docs/registry/api-reference#shadcnpreset , changelog Dec 2025 / Mar–Jul 2026, CLI source `preset/preset.ts`, `utils/get-config.ts`

- `npx shadcn@latest create` = alias of `init`. `init -t next|vite|start|react-router|laravel|astro`, `-b base|radix|aria`, `-p/--preset <code>`, `-d/--defaults` (= `--template=next --preset=nova`).
- **Preset code**: "A preset packs your entire design system config into a short code. Colors, theme, icon library, fonts, radius." `npx shadcn@latest init --preset a1Dg5eFl`; switch in an existing app with `init --preset` or `apply --preset <code> [--only theme|font|theme,font]`. `apply` "keeps the current base and RTL settings from your existing project, even when the preset URL was generated with different values."
- `preset decode <code> [--json]`, `preset resolve|info [-c cwd] [--json]`, `preset url <code>`, `preset open <code>`. Decoded fields: `style, baseColor, theme, chartColor, iconLibrary, font, fontHeading, radius, menuAccent, menuColor` (+ `version`, `url https://ui.shadcn.com/create?preset=<code>`).
- Programmatic: `import { encodePreset, decodePreset, isPresetCode, isValidPreset, generateRandomPreset, PRESET_STYLES, PRESET_BASES, DEFAULT_PRESET_CONFIG, ... } from "shadcn/preset"`. `encodePreset({ style: "vega", baseColor: "stone", theme: "blue", radius: "large", font: "geist" })` → `"bJ4FLU0"`.
- **[source]** `PRESET_BASES = ["radix", "base", "aria"]`; `PRESET_STYLES = ["nova","vega","maia","lyra","mira","luma","sera","rhea"]`; base colors `neutral, zinc, stone, mauve, olive, mist, taupe`. `presetSchema` also has `name, title, description, base, style, baseColor, theme, iconLibrary, font, rtl, menuAccent, menuColor, radius`.
- **How base is encoded**: `components.json.style` is `<base>-<style>` (e.g. `base-nova`, `radix-vega`). `parsePresetStyle("base-nova")` → `{ base: "base", style: "nova" }`. `getBase(style)`: undefined style → `"base"` (new default); legacy unprefixed styles (`new-york`, `new-york-v4`, `default`) → `"radix"`.
- **Impact on registries**:
  - The built-in registry template is `https://ui.shadcn.com/r/styles/{style}/{name}.json`, so shadcn itself serves per-base variants by style directory. You can do the same with the `{style}` placeholder in your namespace URL (`https://registry.tanfust.com/r/{style}/{name}.json`) — the consumer's `style` (e.g. `base-nova`) is substituted.
  - Changelog Dec 2025: "We rebuilt every component for Base UI, keeping the same abstraction. They are fully compatible with your existing components, even those pulled from remote registries. When you pull down components, we auto-detect your library and apply the right transformations."
  - Changelog Jul 2026: "**Building a registry?** Ship a `registry:base` config if you want to pin a specific library. Items without one now init as Base UI."
  - `registry:base.config.style` sets the consumer's style (and therefore the base prefix); `dependencies` should list `radix-ui` **or** `@base-ui/react` accordingly; Radix items should use the unified `radix-ui` package (Feb 2026). Deprecated components differ per base (`toast` only for `base`, `sonner` hidden in `base`).
  - `shadcn docs <component> -b base|radix|aria` gives per-base docs/API links agents can use.

---

## 14. Dynamic (server-side) search — added Jul 2026

Source: https://ui.shadcn.com/docs/registry/dynamic-search

"By default, `shadcn search` fetches your entire `registry.json` and filters items locally." Opt-in: the CLI appends `GET https://acme.com/r/registry.json?q=button&limit=50&offset=0`; "**Dynamic registries** filter the items server-side and return the matching items along with a `pagination` object. When the CLI sees `pagination` in the response, it trusts the results as pre-filtered and skips local filtering. ... There is no configuration or capability negotiation required."

| Parameter | Description |
|---|---|
| `q` | The search query string. |
| `type` | Comma-separated item types, e.g. `registry:ui,registry:block`. |
| `limit` | Maximum number of items to return. |
| `offset` | Number of items to skip. |

"All parameters are optional. A request without `q` or `type` should return all items, paginated." "Search results only need `name`, `type` and `description` for each item."

```json title="registry.json?q=button&limit=2"
{
  "name": "acme",
  "homepage": "https://acme.com",
  "items": [
    { "name": "button", "type": "registry:ui", "description": "A button component." },
    { "name": "icon-button", "type": "registry:ui", "description": "A button component with an icon." }
  ],
  "pagination": { "total": 12, "offset": 0, "limit": 2, "hasMore": true }
}
```

```typescript title="app/r/registry.json/route.ts"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const query = searchParams.get("q")
  const types = searchParams.get("type")?.split(",")
  const limit = Number(searchParams.get("limit") ?? 100)
  const offset = Number(searchParams.get("offset") ?? 0)

  // Filter items using your database or search index.
  const { items, total } = await searchItems({ query, types, limit, offset })

  return NextResponse.json({
    name: "acme",
    homepage: "https://acme.com",
    items,
    pagination: {
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    },
  })
}
```
Auth-scoped search:
```typescript
const token = request.headers.get("authorization")?.replace("Bearer ", "")
const team = await getTeamFromToken(token)
const { items, total } = await searchItems({ query: request.nextUrl.searchParams.get("q"), team })
```
Multi-registry search: CLI sends `q`,`type`, and `limit = offset + limit` to each, merges locally. "Honor the requested `limit` where possible." "Older CLI versions fetch the catalog without query parameters and ignore the `pagination` field. Your registry should return a sensible default response for requests without parameters, e.g. the first page of items." "**Ranking** is up to your server."

---

## 15. GitHub registries (alternative/adjunct distribution)

Source: https://ui.shadcn.com/docs/registry/github

- `npx shadcn@latest add <username>/<repo>/<item>`; repo needs `registry.json` at root (may use `include`); "The GitHub repository becomes the source registry." No build, no server.
- Address: "the first two path segments are the GitHub owner and repository. Any remaining segments are the registry item name, not a file path. An address ending in `.json` is treated as a file path." Refs: `#main`, `#v1.0.0`, `#<40-char sha>`, refs may contain `/`. Default branch if omitted. Git (`git ls-remote`) resolves refs; full SHAs need no Git.
- Requirements: `github.com` only (no GHE), valid schemas, files exist. Limits: 5 MiB/file, avoid symlinks.
- Private repos (Aug 2026): `gh auth login` (token never enters shadcn) or `GH_TOKEN`/`GITHUB_TOKEN` (fine-grained PAT, Contents: Read-only; only sent to `api.github.com`). Anonymous first, credentials only if root `registry.json` isn't public.
- "Use a namespace when you want a stable alias, custom hosting, authentication, request headers, query parameters or private registry support." — i.e. paid/token-gated distribution must be a hosted namespace registry, not a GitHub address.
- Consumer review: `shadcn view`, `add --dry-run`, `--diff`, `--view`.

---

## 16. Programmatic API (for building tooling / the registry server)

Source: https://ui.shadcn.com/docs/registry/api-reference

- `shadcn/registry`: `getRegistriesConfig(cwd)`, `getRegistry("@acme", { config, useCache })`, `getRegistryItems(["@acme/button"], { config })`, `resolveRegistryItems([...], { config })` (merged tree: dependencies, files, cssVars, docs, fonts), `addRegistryItems([...], { cwd, config, overwrite, silent })`, `getRegistries()` (directory), `searchRegistries(["@shadcn"], { query, types, limit, offset, config, continueOnError })` → `{ pagination, items: [{ name, title, type, description, registry, addCommandArgument }], errors? }`, `loadRegistry({ cwd, registryFile })`, `loadRegistryItem(name, { cwd })`.
- `useCache` default `true` — "cached in memory for the lifetime of the process, keyed by the resolved URL" (and headers **[source]**); set `false` in servers/MCP.
- Errors: `RegistryError`, `RegistryNotFoundError`, `RegistryUnauthorizedError`, `RegistryForbiddenError`, `RegistryFetchError`, `RegistryNotConfiguredError`, `RegistryLocalFileError`, `RegistryParseError`, `RegistryValidationError`, `RegistryItemNotFoundError`, `RegistriesIndexParseError`, `RegistryMissingEnvironmentVariablesError`, `RegistryInvalidNamespaceError` (+ `RegistryGoneError` **[source]**).
- `shadcn/schema`: `registrySchema`, `registryItemSchema`, `registryItemFileSchema`, `registryItemTypeSchema`, `registryItemCssVarsSchema`, `registryItemTailwindSchema`, `registryBaseColorSchema`, `configSchema`, `presetSchema`; types `Registry`, `RegistryItem`, `RegistryBaseItem`, `RegistryFontItem`, `Preset`, `ConfigJson`.

```ts
import { registryItemSchema, registrySchema } from "shadcn/schema"

const result = registryItemSchema.safeParse(json)
if (!result.success) {
  console.error(result.error)
}
```

---

## Appendix A — `components.json` (consumer side) fields that matter to registry authors

Source: https://ui.shadcn.com/docs/components-json

`$schema` (`https://ui.shadcn.com/schema.json`), `style` (cannot change after init; `default` deprecated → `new-york`; v4 projects use `<base>-<style>`), `tailwind.{config,css,baseColor,cssVariables,prefix}`, `rsc`, `tsx`, `iconLibrary`, `rtl`, `menuColor`, `menuAccent`, `aliases.{components,utils,ui,lib,hooks}` (tsconfig `paths` or `package.json#imports` like `#components/*`), `registries` (§4). `baseColor` options: `neutral | stone | zinc | mauve | olive | mist | taupe`. `aliases` drive where `registry:ui/lib/hook/component` files land and how `@/registry/...` imports get rewritten.

## Appendix B — Quick design checklist for a free→paid registry

1. Serve `/r/registry.json` (catalog, no `content`) publicly and `/r/{name}.json` (items) — items may be gated.
2. Namespace template `https://registry.tanfust.com/r/{name}.json` (optionally `/r/{style}/{name}.json` for Base UI/Radix variants).
3. Free items: 200 with no auth. Paid items: check `Authorization: Bearer ${TANFUST_TOKEN}` (and `?token=` for Open in v0); return `401`/`403` JSON `{ "error": "...", "message": "..." }` — the CLI prints `message` verbatim (prefixed `[error]`).
4. Env-var placeholders are hard requirements: **[source]** `validateRegistryConfig()` throws `RegistryMissingEnvironmentVariablesError` before any request if any `${VAR}` in the url/headers/params is unset **or empty** (`!getRegistryEnvFromContext(v)`). So a single namespace containing `${TANFUST_TOKEN}` breaks for free users with no token. Use two namespaces — `@tanfust` (plain URL string, no placeholders) and `@tanfust-pro` (object form with `Authorization: Bearer ${TANFUST_TOKEN}`) — or have free users obtain a free-tier token.
5. Reference your own items in `registryDependencies` by `@tanfust/...` or full URL, never bare names.
6. Ship a `registry:base` (with `config.registries` pre-adding your namespaces, `config.style` pinning base/radix) and/or `registry:style`/`registry:theme` for one-command onboarding via `npx shadcn init <url>`.
7. Add `*-demo` items so MCP `get_item_examples_from_registries` works; write good `title`/`description`.
8. Consider dynamic search + auth-scoped results for large/paid catalogs; honor requests with no params.
9. Don't WAF-block `User-Agent: shadcn`; always HTTPS; `Vary: Accept, User-Agent` if negotiating at root.
10. Submit only the open-source, public part to the Registry Directory (flat, no `content`).
