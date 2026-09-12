# Tanfust UI

Essential components, hooks and flows for everyday sites and apps — a
[shadcn](https://ui.shadcn.com/docs/registry)-compatible registry, served at
**[ui.tanfust.com](https://ui.tanfust.com)**.

Items are copied into your project as source. No wrapper package, no lock-in.
Everything here is base-agnostic: it composes shadcn items and works whether your
project uses Radix or Base UI.

## Use it

```bash
# add the namespace once
npx shadcn@latest registry add @tanfust=https://ui.tanfust.com/r/{name}.json

# install anything
npx shadcn@latest add @tanfust/use-debounce

# or start a new project from the Tanfust design system
npx shadcn@latest init https://ui.tanfust.com/r/tanfust.json
```

Browse items at [ui.tanfust.com/docs](https://ui.tanfust.com/docs), from the terminal with
`npx shadcn@latest list @tanfust`, or let an agent do it: the registry works with the shadcn MCP
server (`npx shadcn@latest mcp init --client claude`) and publishes an index at
[/llms.txt](https://ui.tanfust.com/llms.txt).

## What's inside

| Category | Items |
|---|---|
| Foundations | `tanfust` (design-system base), `theme-tanfust`, `font-geist-sans`, `font-geist-mono` |
| Hooks | `use-mobile`, `use-media-query`, `use-debounce`, `use-copy-to-clipboard`, `use-stepper` |
| Lib | `format-date`, `format-currency`, `absolute-url`, `slugify` |
| Flows | coming next — onboarding wizard, account & team settings |

## Develop

```bash
pnpm install
pnpm dev            # builds the registry, then starts the docs site on :3000
pnpm build          # registry + TanStack Start production build (.output/)
```

The docs site is a [TanStack Start](https://tanstack.com/start) app; the registry is plain JSON
under `public/r/`, generated from `src/registry/` by `pnpm registry:build`. See
[AGENTS.md](./AGENTS.md) for the layout and the rules every item follows.

## License

[MIT](./LICENSE) — the registry items and the site.
