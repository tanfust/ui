## What

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] `pnpm registry:build` was run and the regenerated `public/r/` is committed
- [ ] New or changed items have a `<name>-demo` in `src/registry/tanfust/examples/`
- [ ] Items import only `@/components/ui/*` and `@/registry/tanfust/*` — no `radix-ui` / `@base-ui/*`
- [ ] `pnpm lint && pnpm typecheck && pnpm build` pass locally
- [ ] `meta.version` bumped for changed items
