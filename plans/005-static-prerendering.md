# Plan 005: Prerender the docs pages to static HTML, without breaking the shadcn root contract

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat c7f3257..HEAD -- vite.config.ts src/start.ts 'src/routes/docs.$category.$item.tsx' src/lib`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/004-deploy-config-parity.md` — **hard dependency**.
  Step 6 uses `pnpm contract` from that plan as the safety net, and the
  `run_worker_first` fact it establishes is what makes the root-route decision
  here safe rather than a guess.
- **Category**: perf
- **Planned at**: commit `c7f3257`, 2026-09-18

## Why this matters

Every HTML page on this site is rendered per request by a Cloudflare Worker,
with no edge caching. Measured against production on 2026-09-18:

| Request | `content-type` | `cache-control` | `cf-cache-status` |
|---|---|---|---|
| `GET /` | `text/html` | *absent* | *absent* |
| `GET /docs` | `text/html` | *absent* | *absent* |
| `GET /docs/hooks/use-debounce` | `text/html` | *absent* | *absent* |
| `GET /r/registry.json` | `application/json` | `public, max-age=300, s-maxage=3600` | `HIT` |
| `GET /llms.txt` | `text/plain` | `public, max-age=300, s-maxage=3600` | `HIT` |

The JSON payloads are cached at the edge. The HTML — which is generated from
those very same payloads — is not, and never can be, because it is produced by
Worker code on every hit.

None of that HTML depends on anything but build-time data. `src/lib/registry.ts`
imports `public/r/registry.json` statically, and the item route's loader reads
`public/r/<item>.json` through a server function. Both files are written by
`pnpm registry:build` before the app is built. Two visitors to
`/docs/hooks/use-debounce` between deploys get byte-identical HTML, produced
twice.

TanStack Start supports static prerendering directly
(<https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering>).
Turning it on emits HTML at build time for `/docs` and all 13 item pages, which
Cloudflare then serves as static assets — `cf-cache-status: HIT`, no Worker
invocation.

**The catch, and why this plan is MED risk.** Cloudflare's rule: *"if a
requested URL matches a file in the static assets directory, that file will be
served — without invoking Worker code"*
(<https://developers.cloudflare.com/workers/static-assets>). Today `GET /` reaches
the Worker **only because no `/index.html` asset exists**. Prerendering the home
page would create one, the asset would win, and the request middleware in
`src/start.ts` would stop running — silently breaking
`npx shadcn@latest add https://ui.tanfust.com`, the registry's advertised
one-command install. Nothing would error; the CLI would just receive HTML.

This plan therefore prerenders everything **except** `/`, leaving the home page
Worker-rendered so the negotiation is untouched. That gets the win on the 14
pages that matter with zero dependency on out-of-repo Cloudflare config.

## Current state

### `vite.config.ts:11-14`

```ts
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact(), nitro()],
})
```

`tanstackStart()` is called with no options. Prerendering is configured through
its options object.

### `src/start.ts:15-30` — what must keep working

```ts
const shadcnRootNegotiation = createMiddleware({ type: "request" }).server(
  async ({ next, request }) => {
    const url = new URL(request.url)
    if (url.pathname === "/" && request.method === "GET" && isShadcnClient(request)) {
      return Response.json(registry, { ... })
    }
    return next()
  }
)
```

It matches `url.pathname === "/"` and nothing else. So **only `/` is
sensitive**; every other route is free to become a static asset.

### The routes

From `src/routes/`:

- `/` — `index.tsx`. Static content, but **must not be prerendered** (above).
- `/docs` — `docs.index.tsx`, inside the `docs.tsx` layout. Fully static.
- `/docs/$category/$item` — `docs.$category.$item.tsx`. 13 concrete pages; the
  loader calls the `getItem` server function, which reads a build-time JSON
  payload.

The 13 item pages are every non-example, non-internal entry in
`public/r/registry.json`. Enumerate them with:

```bash
node -e "const r=require('./public/r/registry.json');const skip=new Set(['registry:example','registry:internal']);console.log(r.items.filter(i=>!skip.has(i.type)).map(i=>i.name).join('\n'))"
```

Their URLs are `/docs/<category>/<name>`, where category comes from
`categoryOf()` in `src/lib/registry.ts:34-42` — the item's declared
`categories[0]`, falling back to its file's folder.

### `src/routes/docs.$category.$item.tsx:15-24` — the loader

```tsx
export const Route = createFileRoute("/docs/$category/$item")({
  loader: async ({ params }) => {
    const summary = getRegistryItem(params.item)
    const category = CATEGORIES.find((c) => c.slug === params.category)
    if (!summary || !category || categoryOf(summary) !== category.slug)
      throw notFound()
    const item = await getItem({ data: params.item })
    if (!item) throw notFound()
    return { item, category }
  },
```

The `throw notFound()` on a bad path matters: a prerender crawl that follows a
broken link would hit it. With `failOnError: true` that fails the build, which
is the behaviour you want.

### Conventions to honor

- `vite.config.ts` carries a prose comment explaining the deployment target.
  Extend it rather than replacing it, in the same reasoning-first voice.
- Prettier: `semi: false`, double quotes, 80 columns.
- Do not hand-maintain lists of items anywhere — `AGENTS.md`: *"It reads
  `public/r/*.json` — never hand-maintain item lists."* So rely on
  `crawlLinks` discovering item pages from the rendered HTML, **not** on a
  hardcoded `pages: []` array.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Build registry | `pnpm registry:build` | exit 0 |
| Build | `pnpm build` | exit 0, writes `.output/` |
| Serve the build | `PORT=3999 node .output/server/index.mjs` | listens on :3999 |
| Contract check | `pnpm contract` | exit 0 (from plan 004) |
| Typecheck / lint | `pnpm typecheck`, `pnpm lint` | exit 0 |
| Smoke | `pnpm smoke base` | exit 0 |

## Scope

**In scope**:
- `vite.config.ts` — the `tanstackStart()` options object only
- `docs/deployment.md` — extend the section plan 004 created
- `README.md` — one sentence in "How it works", only if it becomes inaccurate

**Out of scope** (do NOT touch):
- `src/start.ts` — the negotiation is correct; this plan works *around* it.
- `src/routes/**` — no route should need changing. If one does, that is a STOP
  condition, not an edit.
- The build target — no `@cloudflare/vite-plugin`, no `wrangler`, no deploy
  changes. Same reasoning as plan 004.
- `public/_headers` — static assets already carry the right rules. Prerendered
  HTML lands under a different path and picks up Cloudflare's asset defaults;
  do not add rules for it in this plan.
- `scripts/smoke-install.sh`, `scripts/check-contract.sh` — both must keep
  passing unmodified. That is the point.
- Any hardcoded list of routes or items.

## Git workflow

- Branch: `perf/static-prerendering`
- Conventional Commits, e.g. `perf(docs-site): prerender the docs pages at build time`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the prerequisite

Confirm `plans/004-deploy-config-parity.md` is DONE in `plans/README.md`, that
`docs/deployment.md` exists, and that `pnpm contract` runs. Then establish the
baseline:

```bash
pnpm build
pnpm contract
```

**Verify**: `pnpm contract` exits 0 **before** any change. If it does not, stop
— you have no safety net.

### Step 2: Record what the build produces today

```bash
find .output/public -name '*.html' | sort
```

Record the output. Expect few or no HTML files, since nothing is prerendered.
This is the "before" for Step 4.

**Verify**: you have the list written down.

### Step 3: Enable prerendering, excluding the root

In `vite.config.ts`, pass options to `tanstackStart()`:

```ts
plugins: [
  devtools(),
  tailwindcss(),
  tanstackStart({
    prerender: {
      enabled: true,
      // Item pages are discovered by crawling the catalog links on `/docs`
      // and the home page, so no route list is hand-maintained here —
      // AGENTS.md: the site never hand-maintains item lists.
      crawlLinks: true,
      failOnError: true,
      // `/` stays Worker-rendered, deliberately. Cloudflare serves a matching
      // static asset WITHOUT invoking Worker code, so an emitted /index.html
      // would shadow the shadcn content negotiation in src/start.ts and break
      // `npx shadcn@latest add https://ui.tanfust.com`. See docs/deployment.md.
      filter: ({ path }) => path !== "/",
    },
  }),
  viteReact(),
  nitro(),
],
```

Two notes on `filter`:

- It is applied to **discovered** paths, so `/` can still be crawled for the
  links it contains while being excluded from output. If the build emits an
  `index.html` anyway, that is a STOP condition — see below.
- `failOnError: true` makes a broken internal link fail the build rather than
  ship a missing page. That is wanted here, because the item route throws
  `notFound()` for an unknown category/item pair.

**Verify**: `pnpm typecheck && pnpm lint` → both exit 0. If `typecheck` rejects
the options object, the installed `@tanstack/react-start` (1.168.52) may name
these options differently — STOP and report rather than guessing.

### Step 4: Confirm what got prerendered

```bash
pnpm build
find .output/public -name '*.html' | sort
```

Expected: an HTML file for `/docs` and one per item page — 14 in total, matching
the item count from the enumeration command in "Current state" plus one for
`/docs`. Confirm the count:

```bash
node -e "const r=require('./public/r/registry.json');const skip=new Set(['registry:example','registry:internal']);console.log('expected item pages:', r.items.filter(i=>!skip.has(i.type)).length)"
find .output/public -name '*.html' | wc -l
```

**Verify (all three)**:
1. The HTML file count is the item count + 1.
2. There is **no** root `index.html` — check explicitly:
   `find .output/public -maxdepth 1 -name 'index.html'` → no output.
3. A prerendered page has real content, not an empty shell:
   `grep -c "use-debounce" .output/public/docs/hooks/use-debounce/index.html`
   → at least 1. (Adjust the path to match what `find` actually printed;
   `autoSubfolderIndex` defaults to true, so pages land at
   `<route>/index.html`.)

### Step 5: Confirm the root contract still holds

This is the assertion the whole plan turns on.

```bash
pnpm contract
```

**Verify**: exits 0. In particular its assertion that `GET /` with
`Accept: application/vnd.shadcn.v1+json` returns the catalog JSON, and its
counter-assertion that a browser `Accept` still gets `text/html`.

Then check by hand that a prerendered page is actually being served as one:

```bash
PORT=3999 node .output/server/index.mjs &
sleep 3
curl -sS -o /dev/null -D - http://127.0.0.1:3999/docs/hooks/use-debounce
curl -sS -H 'Accept: application/vnd.shadcn.v1+json' http://127.0.0.1:3999/ | head -c 120
kill %1
```

**Verify**: the item page returns `200 text/html`, and the root still returns
JSON beginning `{"$schema":"https://ui.shadcn.com/schema/registry.json"`.

Note the local Node server does not reproduce Cloudflare's asset-precedence
behaviour — that is exactly the gap `docs/deployment.md` records. Local success
is necessary, not sufficient; Step 7 is what covers the rest.

### Step 6: Confirm nothing else regressed

```bash
pnpm registry:check
pnpm smoke base
```

`pnpm smoke base` boots `.output/server/index.mjs` and installs every item into
a fresh consumer. It must still pass — prerendering changes what is in
`.output/public`, and the smoke test's registry URL reads `/r/*.json` from
there.

**Verify**: both exit 0.

### Step 7: Document the new constraint

Extend `docs/deployment.md` with a short section stating:

- `/docs` and every item page are prerendered at build time and served as
  static assets.
- `/` is **deliberately excluded**, with the reason: Cloudflare serves a
  matching asset without invoking the Worker, so an `/index.html` would shadow
  the negotiation in `src/start.ts`. Point at the `filter` in `vite.config.ts`.
- What it would take to prerender `/` as well: `assets.run_worker_first` must
  include `/` in the out-of-repo Wrangler configuration — and because
  `_headers` does not apply to Worker responses, the `Cache-Control` that
  `src/start.ts` already sets inline would remain the mechanism for that route.
  Flag it as a possible follow-up, not a to-do.
- That `pnpm contract` is the check guarding all of this.

**Verify**: `grep -n "run_worker_first" docs/deployment.md` → at least one match.

### Step 8: Full check

```bash
pnpm format
pnpm registry:check
pnpm lint
pnpm typecheck
pnpm build
pnpm contract
pnpm smoke base
```

**Verify**: all seven exit 0.

### Step 9: Post-deploy verification (for the operator, not the executor)

Record this in your report rather than performing it. Once deployed, the win
and the safety are both confirmed with:

```bash
curl -sS -o /dev/null -D - https://ui.tanfust.com/docs/hooks/use-debounce   # expect cf-cache-status
curl -sS -H 'Accept: application/vnd.shadcn.v1+json' https://ui.tanfust.com/ # expect JSON
bash scripts/check-contract.sh https://ui.tanfust.com
```

If the second command returns HTML after deploying, `/` is being served from an
asset — roll back and set `run_worker_first` as described in Step 7.

## Test plan

No new unit tests. The verification is `pnpm contract` (plan 004), which
already covers the six contract assertions, plus the three structural checks in
Step 4 (file count, no root `index.html`, real content in a prerendered page)
and `pnpm smoke base`. If `plans/003-registry-item-tests.md` has landed, also
run `pnpm test`; it should be unaffected.

## Done criteria

ALL must hold:

- [ ] `vite.config.ts` passes `prerender: { enabled: true, crawlLinks: true, failOnError: true, filter }` to `tanstackStart()`
- [ ] `find .output/public -maxdepth 1 -name 'index.html'` → **no output**
- [ ] `find .output/public -name '*.html' | wc -l` equals the public item count + 1
- [ ] A prerendered item page contains its item name in the HTML
- [ ] `pnpm contract` exits 0
- [ ] `pnpm smoke base` exits 0
- [ ] `pnpm registry:check`, `pnpm lint`, `pnpm typecheck` all exit 0
- [ ] `git status --porcelain` lists only `vite.config.ts`, `docs/deployment.md`
      and possibly `README.md`
- [ ] `docs/deployment.md` explains the `/` exclusion and mentions `run_worker_first`
- [ ] No route file, `src/start.ts`, or script was modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm contract` does not pass **before** you change anything (Step 1). Fix
  that first, or plan 004 is not actually done.
- `plans/004-deploy-config-parity.md` is not DONE, or `docs/deployment.md` does
  not exist. This plan depends on both.
- `pnpm typecheck` rejects the `prerender` options object. The installed
  `@tanstack/react-start` is 1.168.52; option names may differ from the docs
  this plan cites. Report the type error rather than guessing at option names.
- The build emits a root `.output/public/index.html` despite the `filter`. Do
  **not** work around it by deleting the file in a postbuild step — that hides
  the problem from anyone reading the config. Report it; the real answer is
  then `run_worker_first`, which lives outside this repo.
- `pnpm contract` fails after enabling prerendering, in particular the
  shadcn-`Accept` assertion. Revert `vite.config.ts` and report.
- `pnpm smoke base` fails. The smoke test and prerendering share `.output`;
  a conflict there is a real finding.
- The prerendered item pages come out empty or missing their content. That
  would mean the `getItem` server function does not resolve during the
  prerender pass — an important finding about the data flow, worth reporting
  rather than patching around.
- Fewer pages are emitted than expected. `crawlLinks` follows anchors in the
  rendered HTML; if `plans/001-link-navigation.md` has landed, those are
  `<Link>`-rendered anchors, which is fine. If the count is short, report which
  pages are missing — do **not** add a hardcoded `pages: []` list, which
  AGENTS.md forbids.

## Maintenance notes

- **The invariant to preserve forever**: `/` must not become a static asset
  while `src/start.ts` owns the shadcn content negotiation. The `filter` in
  `vite.config.ts` is what enforces it, and its comment says why. Anyone who
  deletes that `filter` breaks `npx shadcn@latest add https://ui.tanfust.com`
  with no error anywhere. `pnpm contract` is the guard, which is why plan 004
  comes first.
- New routes are prerendered automatically via `autoStaticPathsDiscovery` and
  `crawlLinks`. A route that genuinely needs per-request rendering must be
  added to the `filter`, with a comment saying why.
- `failOnError: true` means a broken internal link now fails the build. That is
  intended — the item route throws `notFound()` for unknown paths — but it does
  make CI stricter, so expect it to catch typos in links.
- Follow-up deliberately deferred: prerendering `/` as well, which needs
  `assets.run_worker_first` to include `/` in the out-of-repo Wrangler config.
  Worth doing — the home page is the most-hit route — but it cannot be verified
  from this repository, so it should be a coordinated change with a production
  check immediately after.
- A reviewer should scrutinise: that the `filter` excluding `/` is present and
  commented, that no hardcoded route list was introduced, and that
  `pnpm contract` was run both before and after.
