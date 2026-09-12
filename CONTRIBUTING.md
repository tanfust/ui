# Contributing

Thanks for helping make the essentials better. This registry is deliberately small: every item
has to earn its place, so the bar is "would most sites or apps need this?" rather than "is this
neat?". Open an [item request](https://github.com/tanfust/ui/issues/new?template=item_request.yml)
before building anything large.

## Setup

```bash
git clone https://github.com/tanfust/ui.git
cd ui
pnpm install
pnpm dev          # builds the registry, then serves the docs on http://localhost:3000
```

Requires Node 22+ and pnpm 10 (`corepack enable` picks up the pinned version).

## Adding or changing an item

1. Put the source under `src/registry/tanfust/<category>/` — `hooks/`, `lib/`, `flows/` or
   `foundations/`. Import shadcn primitives from `@/components/ui/<name>` and other Tanfust items
   from `@/registry/tanfust/...`; the CLI rewrites both on install.
2. Describe it in that category's `registry.json`: `name` (kebab-case, flat), `type`, `title`, a
   `description` written for people *and* LLMs, `author`, `categories`, `meta.version`, and
   `files`. Reference other Tanfust items as `@tanfust/<name>`, shadcn items by bare name.
3. Add `src/registry/tanfust/examples/<name>-demo.tsx` (default export, renders without a backend)
   and register it in `examples/registry.json` as `registry:example`. It becomes the docs preview
   and the usage example the MCP server returns.
4. Run `pnpm registry:build`, then `pnpm lint && pnpm typecheck && pnpm build`. Commit the
   regenerated `public/r/` together with your change — CI fails if it is stale.
5. Open a pull request. CI validates the registry, builds the site, and smoke-installs every item
   into fresh Base UI and Radix projects.

The full rules (base-agnostic imports, semantic tokens, flat names, self-contained demos) are in
[AGENTS.md](./AGENTS.md); they apply to humans too.

## Style

Prettier and the TanStack ESLint config are the source of truth: `pnpm format`, `pnpm lint`.
Use semantic Tailwind tokens (`bg-background`, `text-muted-foreground`), never raw colours, and
`cn()` from `@/lib/utils` for conditional classes.

## Reporting problems

Bugs and install failures: [open an issue](https://github.com/tanfust/ui/issues/new?template=bug_report.yml)
with the command you ran, your `components.json`, and the CLI output. Security concerns: see
[SECURITY.md](./SECURITY.md).
