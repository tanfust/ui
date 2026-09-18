# Tanfust UI — agent guide

This repo is a **shadcn-compatible registry** (`@tanfust`) plus the docs site that serves it at
`https://ui.tanfust.com`. Items are copied as source into consumers' projects via
`npx shadcn@latest add @tanfust/<item>`. The registry and item schemas are documented at
https://ui.shadcn.com/docs/registry — read them before changing item definitions.

## Layout

| Path | What |
|---|---|
| `registry.json` | Root catalog: `name`, `homepage`, `include[]` — one included file per category |
| `src/registry/tanfust/<category>/registry.json` | Item definitions for that category (`foundations`, `hooks`, `lib`, `flows`, `examples`) |
| `src/registry/tanfust/<category>/…` | Item source files. Imports must use `@/registry/tanfust/...` (the CLI rewrites them on install) |
| `src/registry/tanfust/examples/` | `<item>-demo.tsx` per public item — rendered on the item's docs page and returned by the MCP server as usage examples |
| `public/r/` | **Generated** by `pnpm registry:build`. Committed. CI fails if stale (`pnpm registry:check`) |
| `src/__registry__/index.tsx` | **Generated** lazy import map of `registry:example` items for docs previews. Git-ignored |
| `src/routes/`, `src/components/`, `src/lib/` | The docs site (TanStack Start). It reads `public/r/*.json` — never hand-maintain item lists |
| `src/components/site/` | Chrome shared with tanfust.com: shell, shell-frame, masthead, colophon, section-header, stamp |
| `src/components/ui/` | shadcn primitives on **base-lyra** (Base UI), taken as shipped. Docs-site only — never shipped by the registry |
| `scripts/build-registry.mjs` | validate → build → `__registry__` → `public/llms.txt` |
| `scripts/smoke-install.sh` | Installs every item into a fresh Base UI or Radix consumer and typechecks it |

## Rules for registry items

1. **Base-agnostic.** Items depend on shadcn items through `registryDependencies` (`"button"`, `"card"`, …) and import them from `@/components/ui/<name>`. Never import `radix-ui`, `@radix-ui/*` or `@base-ui/*` directly. The smoke test fails otherwise.
2. **Reference our own items as `@tanfust/<name>`** in `registryDependencies`, never bare (bare names mean shadcn's registry).
3. **Every item** has `name` (kebab-case), `type`, `title`, `description` (written for humans *and* LLMs), `author: "Tanfust <https://tanfust.com>"`, `categories`, `meta: { tier: "free", version }`. Flows also set `docs` (post-install instructions).
4. **Flows are `registry:block`.** First file is the `registry:page` with a `target` (`app/<route>/page.tsx`); then components, hooks, lib, `actions.ts`. Server actions are provider-agnostic stubs with typed inputs and zod schemas.
5. **Every public item ships a demo**: `<name>-demo` of type `registry:example` in `src/registry/tanfust/examples/`, default-exporting a component that renders without a backend. The docs preview and the MCP server both use it.
6. **Names are flat** (no `/`) — the Registry Directory requires a flat registry.
7. **Demos are self-contained.** They may import the item they demonstrate and plain HTML/Tailwind with semantic tokens; nothing that would not resolve in a consumer project.
8. Use `cn()` from `@/lib/utils`, semantic tokens (`bg-background`, `text-muted-foreground`), `flex gap-*` not `space-*`, `size-*` for square dims. The shadcn skill (`npx skills add shadcn/ui`) has the full style rules.

## Workflow

```bash
pnpm install
pnpm registry:build        # validate + build + generated files
pnpm dev                   # runs registry:build first, then vite dev on :3000
pnpm lint && pnpm typecheck
pnpm build && pnpm smoke base && pnpm smoke radix   # what CI runs
```

Test the registry like a consumer would:

```bash
npx shadcn@latest list http://localhost:3000/r/registry.json
npx shadcn@latest view http://localhost:3000/r/<item>.json
npx shadcn@latest add http://localhost:3000/r/<item>.json --dry-run
```

Commit `public/r` together with the source change that produced it. Do not edit `public/r`, `src/routeTree.gen.ts` or
`src/__registry__` by hand.

## Docs site

Brutalist Mono, the same visual language as tanfust.com: bordered centre column, indexed sections
`[NN]`, mono type except the headline, semantic tokens only (`bg-background`, `text-foreground`,
`border-foreground` — never raw black/white), bracketed CTAs `[ Label → ]`, typographic glyphs
instead of icon libraries, light by default with dark mode via `next-themes` (`d` hotkey).
**Ink on paper** — a warm neutral oklch scale (hue 70-85, chroma ≤ 0.014), `--radius: 0`,
Geist Sans for body, Geist Mono for labels. `--input` and `--ring` are deliberately darker
than `--border`: a field boundary and a focus ring clear 3:1 (WCAG 1.4.11), a hairline need
not. Secondary text uses `text-muted-foreground` or `opacity-70`, never `opacity-60` or lower.

Use `stampClasses()` from `@/components/site/stamp` rather than retyping `font-mono
uppercase tracking-wider`, and the named scale (`text-2xs`, `tracking-display`,
`leading-display`) rather than arbitrary values. Buttons and rules come from
`@/components/ui/{button,separator}`; `buttonVariants()` on a `<Link>` or `<a>`, never
`<Button render={<Link/>}>` — Base UI's `Button` puts `type="button"` on the anchor.
The variant names rotated with base-lyra: filled is `default`, bordered is `outline`, and
the underline-on-hover one is `link`.

tanfust.com is the source of truth for all of this — its `docs/design.md` and
`docs/paper-theme.md` carry the reasoning. Change it there first.

Item pages are generated: preview (`<item>-demo`), install command (package-manager tabs), source
per file, then font/config/cssVars/css blocks when present, then dependencies.

## Stack

TanStack Start (Vite 8, Nitro server output in `.output/`), React 19, Tailwind v4, `shadcn` ^4.21 (CLI + `shadcn/schema` + `shadcn/tailwind.css`), Geist via `@fontsource-variable/*`, pnpm. Root content negotiation for the shadcn CLI lives in `src/start.ts` (request middleware). Deploy target is Nitro `node-server` by default; switch the preset (cloudflare, netlify, vercel) in `vite.config.ts`.
