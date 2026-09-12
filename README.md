# Tanfust UI

Essential components, hooks and flows for everyday sites and apps — a
[shadcn](https://ui.shadcn.com/docs/registry)-compatible registry served at
**https://ui.tanfust.com**.

```bash
# add the namespace once
npx shadcn@latest registry add @tanfust=https://ui.tanfust.com/r/{name}.json

# install anything
npx shadcn@latest add @tanfust/onboarding-wizard

# or start a new project with the Tanfust design system
npx shadcn@latest init https://ui.tanfust.com/r/tanfust.json
```

Items are copied into your project as source. No wrapper package.

## Develop

```bash
pnpm install
pnpm dev            # builds the registry, then starts the docs site (TanStack Start) on :3000
```

See [AGENTS.md](./AGENTS.md) for the item rules and [docs/plan.md](./docs/plan.md) for the roadmap.

## License

Free items: MIT. Paid items (coming later via [tanfust.com](https://tanfust.com/store/components)) are licensed per purchase.
