# Tanfust UI Registry — Plan

Repo: `github.com/tanfust/ui` · Host: `ui.tanfust.com` · Namespace: `@tanfust` (free) / `@tanfust-pro` (paid, later)
Written 2026-09-12 against `shadcn@4.21.0` and the current shadcn registry docs.

## 1. What we are building

A shadcn-compatible registry that distributes the essentials a real site or app needs, installed with one command:

```bash
npx shadcn@latest add @tanfust/onboarding-wizard
```

Not a broad component zoo. Each item earns its place ("less, but better"). Items are copied into the consumer's codebase as source, the way shadcn works, so users own the code. Free items ship now; paid items are added later behind a licence token bought on tanfust.com, using the same registry protocol.

Decisions already taken: the registry and its docs live in the `tanfust/ui` repo as a standalone Next app on `ui.tanfust.com`; items are base-agnostic (they depend on shadcn items, never import Radix or Base UI directly); v1 covers foundations plus two flows (onboarding wizard, account & team settings); every item gets a full docs page; code is extracted from `tanfust.agency` where it exists and written fresh otherwise; design tokens mirror tanfust.agency (zinc, Geist Sans + Geist Mono with mono headings, radius 0.625rem, inverted/bold menus).

## 2. How the registry protocol works (the parts that shape the design)

A registry is two JSON surfaces over HTTPS. The catalog at `/r/registry.json` lists every item without file contents and is what `shadcn list`, `shadcn search`, and the MCP server read. Each item at `/r/{name}.json` is a full `registry-item.json` with file contents inlined and is what `shadcn add`, `shadcn view`, and Open in v0 read. Consumers reach us through a namespace in their `components.json`:

```json
{ "registries": { "@tanfust": "https://ui.tanfust.com/r/{name}.json" } }
```

The CLI substitutes `{name}`; for the catalog it substitutes the literal `registry`. Once we are in the shadcn Registry Directory, `npx shadcn add @tanfust/x` adds that line automatically.

Three rules follow from the protocol and drive everything below. First, bare names in `registryDependencies` (`"button"`) always mean shadcn's own registry, so our items reference each other as `@tanfust/name`, never bare. Second, a namespace whose URL or headers contain `${VAR}` fails before any request if the variable is unset or empty, so free and paid cannot share one namespace: `@tanfust` is a plain URL, `@tanfust-pro` carries `Authorization: Bearer ${TANFUST_TOKEN}`. Third, on 401/403 the CLI prints the server's JSON `message` verbatim, which is our upsell surface ("This item is part of Tanfust Pro — get access at tanfust.com/store/components").

Since CLI v4 we also have `registry:base` (an entire design system, including pre-registered namespaces, installed by `npx shadcn init <url>`), `registry:font`, `include` to split `registry.json` by folder, `shadcn registry validate`, target aliases (`@ui/`, `@components/`, `@lib/`, `@hooks/`), server-side search, and `loadRegistry`/`loadRegistryItem` from `shadcn/registry` for dynamic route handlers. Base UI is now the default base for new projects; because our items only compose shadcn items, the CLI's own base detection handles Radix vs Base UI consumers for us.

## 3. Repo layout

```txt
ui/
├─ registry.json                      # root: name, homepage, include[]
├─ registry/
│  └─ tanfust/                        # [STYLE] dir per shadcn convention; imports use @/registry/tanfust/...
│     ├─ foundations/registry.json    # base, theme, fonts
│     │  ├─ base.json                 # registry:base "tanfust"
│     │  └─ theme.json                # registry:theme "theme-tanfust" (tokens only)
│     ├─ hooks/registry.json          # use-stepper, use-media-query, use-debounce, use-copy-to-clipboard, use-mobile
│     ├─ lib/registry.json            # format-date, format-currency, absolute-url, slugify
│     ├─ flows/registry.json
│     │  ├─ onboarding-wizard/        # page.tsx, components/, hooks/, lib/, actions.ts
│     │  ├─ settings-account/
│     │  ├─ settings-team/
│     │  └─ settings-shell/           # shared settings layout + nav the two settings flows depend on
│     └─ examples/registry.json       # *-demo items (registry:example) for docs previews + MCP examples
├─ public/r/                          # shadcn build output — committed, served statically
├─ app/                               # docs site (ui.tanfust.com)
│  ├─ (docs)/docs/[[...slug]]/page.tsx
│  ├─ r/registry.json/route.ts        # later: dynamic catalog (search, pro tier)
│  └─ r/pro/[name]/route.ts           # later: token-gated pro items
├─ components/docs/                   # preview frame, code tabs, install command, sidebar, search
├─ __registry__/index.tsx             # generated lazy-import map for previews
├─ scripts/build-registry.ts          # validate → shadcn build → generate __registry__ → llms.txt
├─ examples/
│  ├─ consumer-base/                  # Base UI app used by CI to smoke-install every item
│  └─ consumer-radix/                 # Radix app, same
├─ AGENTS.md (+ CLAUDE.md → @AGENTS.md)
└─ .github/workflows/registry.yml     # validate, build, typecheck, smoke-install both bases
```

The root `registry.json` uses `include` so each category is authored next to its files, and `shadcn build` flattens it into `public/r/registry.json`. Item names stay flat (no `/`) because the Registry Directory requires a flat registry.

## 4. Item design

### 4.1 Naming and metadata

Names are kebab-case nouns: `onboarding-wizard`, `settings-account`, `settings-team`, `use-stepper`, `format-currency`. Every item has `title`, a one-to-two-sentence `description` written for both humans and LLMs (the MCP server reads it), `author: "Tanfust <hello@tanfust.com>"`, `categories`, and `meta: { tier: "free", version: "1.0.0", since: "2026-09" }`. Flows carry a `docs` string that prints after install (where to wire the actions, which env vars).

### 4.2 Foundations

`tanfust` is a `registry:base`. It installs the Tanfust tokens and fonts, pins nothing about the primitive library (no `config.style`, so the consumer's Base UI/Radix choice stands), and pre-registers our namespace:

```json
{
  "name": "tanfust",
  "type": "registry:base",
  "title": "Tanfust",
  "description": "Essentialist design system: zinc palette, Geist Sans + Geist Mono, mono headings, 0.625rem radius.",
  "config": {
    "iconLibrary": "lucide",
    "tailwind": { "baseColor": "zinc" },
    "menuColor": "inverted",
    "menuAccent": "bold",
    "registries": { "@tanfust": "https://ui.tanfust.com/r/{name}.json" }
  },
  "registryDependencies": ["utils", "@tanfust/font-geist-sans", "@tanfust/font-geist-mono"],
  "cssVars": {
    "theme": { "font-sans": "var(--font-geist-sans)", "font-mono": "var(--font-geist-mono)", "font-heading": "var(--font-geist-mono)" },
    "light": { "radius": "0.625rem", "...": "copied from tanfust.agency app/globals.css" },
    "dark":  { "...": "copied from tanfust.agency app/globals.css" }
  }
}
```

`theme-tanfust` (`registry:theme`) carries only the `cssVars` for people who want the look without the base. `font-geist-sans` and `font-geist-mono` are `registry:font` items (Google provider, `import: "Geist"` / `"Geist_Mono"`; `dependency` set to `@fontsource-variable/geist` / `@fontsource-variable/geist-mono` for non-Next consumers — both verified on npm at 5.3.0). `@tanfust-pro` is deliberately not pre-registered in the base; it is added at purchase time so free users never hit the missing-env-var error.

Onboarding for a new project becomes `npx shadcn@latest init https://ui.tanfust.com/r/tanfust.json`.

### 4.3 Hooks and lib

Small, dependency-free, typed. `use-mobile` and `use-stepper` come from tanfust.agency and the onboarding flow respectively; the rest are written fresh. Each is a single-file `registry:hook` or `registry:lib` with a matching `*-demo` example.

### 4.4 Flows

A flow is a `registry:block` whose first file is a `registry:page` with a `target`, followed by components, hooks, lib, and an `actions.ts` with provider-agnostic server actions the consumer fills in (typed inputs, zod schemas, `TODO` bodies, Supabase snippet in `docs`). The CLI rewrites the page target per framework (Next app router, pages, React Router, Laravel), so we author for Next and get the rest for free.

| Item | Target | Contents | Depends on |
|---|---|---|---|
| `onboarding-wizard` | `app/onboarding/page.tsx` | Stepper with progress, back/skip/next, per-step zod validation, state persisted in URL + localStorage, completion screen | `@tanfust/use-stepper`, shadcn `button card input label field progress` |
| `settings-shell` | `app/settings/layout.tsx` | Settings layout with side nav (mobile: tabs), page header, section cards | shadcn `separator tabs sidebar`… |
| `settings-account` | `app/settings/account/page.tsx` | Profile form, email/password change, notification preferences, danger zone with confirm dialog | `@tanfust/settings-shell`, shadcn `alert-dialog switch avatar` |
| `settings-team` | `app/settings/team/page.tsx` | Members table, invite dialog, role select, remove/transfer ownership | `@tanfust/settings-shell`, shadcn `table dialog select dropdown-menu badge` |

Each flow also ships a `*-demo` (`registry:example`) that renders the flow inside the docs preview frame without a real backend.

### 4.5 Base-agnostic rule, enforced

Items import only from `@/registry/tanfust/...` (rewritten to the consumer's aliases on install) and from shadcn item paths (`@/components/ui/button`). No `radix-ui`, no `@base-ui/react` in any item file. CI greps for it, and the two `examples/consumer-*` apps run `shadcn add` for every item and `tsc --noEmit` on both bases.

## 5. Docs site (ui.tanfust.com)

Styled per `docs/design.md` in tanfust.agency (Brutalist Mono: indexed sections, mono everywhere but hero headlines, semantic tokens, dark mode). Pages:

`/` — what it is, the one install command, the base init command, links to categories.
`/docs/installation` — add the namespace (CLI and manual), `init` with the Tanfust base, MCP setup (`npx shadcn@latest mcp init --client claude`), Open in v0 note, what happens on install (files, deps, cssVars).
`/docs/[category]/[item]` — for every item: live preview (from `__registry__` lazy import of the demo), code tabs per file (contents read from `public/r/{name}.json` at build so docs and registry can never drift), install command with pnpm/npm/yarn/bun tabs, dependencies and registryDependencies listed, cssVars shown when present, "Open in v0" button, `meta.version` and changelog link.
Sidebar and search (cmdk) are generated from `public/r/registry.json`, so adding an item to the registry adds it to the site with zero extra wiring.
`/llms.txt` and `/llms-full.txt` — item list with descriptions and install commands, following tanfust.agency's agent-discovery approach; `robots.txt` allows `User-Agent: shadcn` (Registry Health flags WAF challenges).

The site is a Next 16 app (upgrade from the template's Next 15.5) on Vercel with `NEXT_PUBLIC_BASE_URL=https://ui.tanfust.com`. `next.config.ts` adds the content-negotiation rewrite so `npx shadcn add https://ui.tanfust.com` resolves the catalog at the domain root.

## 6. Paid tier (design now, build in phase 4)

The store, licences, and fulfilment already exist in tanfust.agency (`paddle.licenses`, releases/entitlements, token download links). The registry needs one addition there: a per-user registry token, minted from the account page, stored hashed, revocable, checked by an internal endpoint (`GET /api/v1/registry/verify` with a shared secret, returns entitled `product_key`s). `ui.tanfust.com` gets a route handler:

`/r/pro/{name}.json` reads `Authorization: Bearer` or `?token=` (the latter only for Open in v0), calls the verify endpoint (cached briefly), then serves the item via `loadRegistryItem` from a `registry/tanfust-pro/` source that `shadcn build` never writes to `public/`. Denials return `{ "error": "Unauthorized", "message": "…tanfust.com/store/components" }` with 401, or 403 when the token is valid but the item is outside the licence. Pro items reference free ones as `@tanfust/...` (each dependency resolves with its own auth context), and free items never depend on pro.

Consumers get, after purchase, a snippet to paste:

```json
{ "registries": { "@tanfust-pro": { "url": "https://ui.tanfust.com/r/pro/{name}.json", "headers": { "Authorization": "Bearer ${TANFUST_TOKEN}" } } } }
```

plus `TANFUST_TOKEN=…` in `.env.local`. The docs site shows pro items in the same sidebar with a lock badge; the public catalog stays free-only so the Registry Directory listing and Health checks are never affected. Server-side search (`pagination` response) can later scope results per token.

## 7. Personalizing the template — concrete changes

Reset the template: rename `acme` → `tanfust`, homepage → `https://ui.tanfust.com`, delete the four demo items and `registry/new-york/*`, keep `components/open-in-v0-button.tsx` (rewritten to take a URL), replace `app/page.tsx` and `app/layout.tsx` (Geist fonts, metadata, theme provider). Upgrade to Next 16.3, `shadcn ^4.21`, React 19.2, Tailwind 4.1; move the app's own `components.json` to `style: "radix-sera"` to match tanfust.agency (this only affects the docs app's primitives, not the items). Add `AGENTS.md` describing the item rules (base-agnostic, `@/registry` imports, page-first files, `*-demo` per item, run `pnpm registry:build` before commit) and `CLAUDE.md` → `@AGENTS.md`. Add `scripts/build-registry.ts` (`shadcn registry validate` → `shadcn build` → generate `__registry__/index.tsx` → write `llms.txt`), `examples/consumer-base` and `examples/consumer-radix`, and the CI workflow. Commit `.agents/skills/shadcn` and `skills-lock.json` (already present, untracked).

## 8. Phases

Phase 0 — Reset (½ day). Template cleanup, dependency upgrade, `registry.json` with `include`, empty category files, `AGENTS.md`, build script, CI skeleton, Vercel project on `ui.tanfust.com`. Exit: `npx shadcn list https://ui.tanfust.com/r/registry.json` returns an empty valid catalog.

Phase 1 — Foundations (2–3 days). `tanfust` base, `theme-tanfust`, two font items, five hooks, four lib utilities, each with a demo. Docs skeleton: installation page, generated sidebar, item page with preview/code/install. Exit: `npx shadcn init https://ui.tanfust.com/r/tanfust.json` produces a project that matches tanfust.com's look on both bases.

Phase 2 — Flows (1–1.5 weeks). `settings-shell`, `settings-account`, `settings-team` (extracted from tanfust.agency's account pages and genericized), then `onboarding-wizard` with `use-stepper`. Smoke-install in both consumer apps. Exit: all four flows install clean, typecheck, and render in the docs previews.

Phase 3 — Launch (2–3 days). `llms.txt`, root content negotiation, MCP docs, PR to `shadcn-ui/ui` `apps/v4/registry/directory.json` for `@tanfust`, link from tanfust.com/store/components, announce.

Phase 4 — Pro (when there is a first paid item). Registry token in tanfust.agency account page + verify endpoint, `/r/pro/{name}` handler, lock badges, purchase-time snippet, then the first pro items (candidates: billing/plan-picker flow, auth flow, marketing blocks).

## 9. Open points

Whether `settings-team` should ship a roles model (owner/admin/member) as a `registry:lib` enum or leave roles to the consumer. Whether the docs previews render inside an iframe (true isolation, slower) or inline (simpler, risk of style bleed) — shadcn uses inline with a scoped wrapper. Whether to publish a `@tanfust` GitHub-address mirror (`npx shadcn add tanfust/ui/onboarding-wizard`) for people who prefer pinning to a tag; the repo would need to be public for that.

## Sources

shadcn registry docs (Introduction, Getting Started, registry.json, registry-item.json, Namespaces, Authentication, MCP, Open in v0, Registry Directory, Registry Health, Dynamic Search, GitHub Registries, API Reference, Examples, FAQ), CLI docs and `shadcn@4.21.0` source, `shadcn-ui/registry-template`, and the `tanfust.agency` repo (`components.json`, `app/globals.css`, `docs/design.md`, `docs/brand-foundation.md`, `docs/publishing-products.md`, `lib/product-access.ts`, `app/library/access/[token]/route.ts`).
