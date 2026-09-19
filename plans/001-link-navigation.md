# Plan 001: Navigate with `<Link>` so SPA routing and preloading actually work

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat c7f3257..HEAD -- src/router.tsx src/components/site/masthead.tsx src/components/docs/sidebar.tsx src/routes/index.tsx src/routes/__root.tsx 'src/routes/docs.$category.$item.tsx'`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `c7f3257`, 2026-09-18

## Why this matters

The router is configured with `defaultPreload: "intent"` (`src/router.tsx:9`),
which preloads a route's data when the user hovers or focuses a link. That
setting currently does nothing, because almost every internal link on the site
is a raw `<a href>` rather than TanStack Router's `<Link>`. A raw anchor is a
full document navigation: the browser tears down the page, re-downloads and
re-executes the entire JS bundle, and re-runs hydration — on every sidebar
click, every catalog entry on the home page, and every masthead link.

Two files (`masthead.tsx`, `sidebar.tsx`) already import `Link` and use it for
exactly one link each, then fall back to `<a>` for the rest, so this is
inconsistency rather than a deliberate policy. Both also hand-roll active-link
state with `useRouterState` when `Link` provides `activeProps` for it.

After this plan: navigation is client-side, hovering a link preloads it, and
the active-state logic is deleted rather than maintained.

## Current state

Files and their role:

- `src/router.tsx` — router construction; holds the preload settings.
- `src/components/site/masthead.tsx` — site header; primary nav (Registry / Docs).
- `src/components/docs/sidebar.tsx` — docs sidebar; one link per registry item.
- `src/routes/index.tsx` — home page; the catalog list links to every item page.
- `src/routes/docs.$category.$item.tsx` — item page; breadcrumb + `@tanfust/*` dependency links.
- `src/routes/__root.tsx` — 404 component; "Back to the registry" link.

### `src/router.tsx` (whole file)

```tsx
import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

`defaultPreloadStaleTime: 0` is wrong here. The TanStack Router docs define
that value as the setting for **external cache integration** — you set it to 0
so that a cache like TanStack Query, rather than the router, decides freshness
("Passing all loader events to an external cache",
<https://tanstack.com/router/latest/docs/guide/data-loading>). This repo has no
Query client; `@tanstack/react-query` is not installed and the
`@tanstack/react-router-ssr-query` package in `package.json` is never imported.
With no external cache behind it, `0` means every preload is stale on arrival,
so the data fetched on hover is thrown away and refetched on click. It is
latent today only because the `<a>` tags mean no preload ever fires — fixing
the links without fixing this would turn every hover-then-click into two
requests.

### `src/components/site/masthead.tsx:8-10` and `:36-64`

```tsx
const nav: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Registry", href: "/" },
  { label: "Docs", href: "/docs" },
]
```

```tsx
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  ...
              {nav.map((item, index) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)
                return (
                  <li className="flex items-center gap-2" key={item.href}>
                    <a
                      aria-current={active ? "page" : undefined}
                      className={cn(linkClass, active && "font-bold underline")}
                      href={item.href}
                    >
                      {item.label}
                    </a>
```

Note line 28-33 of the same file already uses `<Link to="/">` for the wordmark.
That is the pattern to follow.

### `src/components/docs/sidebar.tsx:44-60`

```tsx
                  {items.map((item) => {
                    const href = `/docs/${category.slug}/${item.name}`
                    const active = pathname === href
                    return (
                      <li key={item.name}>
                        <a
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "underline-offset-4 hover:underline",
                            active
                              ? "font-bold underline"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          href={href}
                        >
                          {item.name}
                        </a>
```

Line 13 reads `const pathname = useRouterState({ select: (s) => s.location.pathname })`
and line 20-28 already uses `<Link to="/docs">` for the "[00] Installation" entry.

### `src/routes/index.tsx:133-140`

```tsx
                        <li key={item.name}>
                          <a
                            className="underline underline-offset-4 hover:no-underline"
                            href={`/docs/${category.slug}/${item.name}`}
                          >
                            {item.name}
                          </a>
                        </li>
```

### `src/routes/docs.$category.$item.tsx:59-62` (breadcrumb)

```tsx
          <a className="underline-offset-4 hover:underline" href="/docs">
            Docs
          </a>
```

### `src/routes/docs.$category.$item.tsx:194-208` (`DepLink`)

```tsx
function DepLink({ dep }: { dep: string }) {
  if (dep.startsWith("@tanfust/")) {
    const name = dep.slice("@tanfust/".length)
    const item = getRegistryItem(name)
    const slug = item ? categoryOf(item) : undefined
    return slug ? (
      <a
        className="underline underline-offset-4 hover:no-underline"
        href={`/docs/${slug}/${name}`}
      >
        {dep}
      </a>
    ) : (
      <span>{dep}</span>
    )
  }
```

### `src/routes/__root.tsx:56-60`

```tsx
      <p className="mt-6 text-xs tracking-wider uppercase">
        <a className="underline underline-offset-4 hover:no-underline" href="/">
          [ Back to the registry → ]
        </a>
      </p>
```

### Conventions to honor

- **Route paths are typed.** The item route file is
  `src/routes/docs.$category.$item.tsx`, so its `to` value is the literal
  string `"/docs/$category/$item"` and the segments are supplied via `params`:

  ```tsx
  <Link to="/docs/$category/$item" params={{ category: "hooks", item: "use-debounce" }}>
  ```

  Never interpolate the path into `to`. `src/routeTree.gen.ts` is generated —
  do not edit it.

- **`activeProps` replaces the manual active check.** From the TanStack Router
  docs: activeProps "returns additional props applied when the link is in the
  active state… `style`s are merged, `className`s are concatenated". So the
  base classes stay in `className` and only the *additional* active classes go
  in `activeProps.className` — do not repeat the base classes there, and do not
  keep a `cn(base, active && …)` call. `Link` also sets `data-status="active"`
  automatically. `aria-current` is **not** automatic: keep it by putting
  `"aria-current": "page"` in `activeProps`.

- **`activeOptions={{ exact: true }}` for `/`.** By default a link is active
  when its pathname is a *prefix* of the current route, so `to="/"` would be
  active everywhere. The current code special-cases this already
  (`item.href === "/" ? pathname === "/" : …`); `exact: true` is the
  equivalent. `/docs` should keep prefix matching so it stays active on item
  pages, which is what `pathname.startsWith("/docs")` does today.

- **ESLint enforces static class strings.** `eslint.config.js` enables
  `shadcn/require-static-classes`, `shadcn/no-unknown-classes` and
  `shadcn/no-arbitrary-values` on `**/*.{ts,tsx}`. Keep class strings as plain
  literals inside the `activeProps` object. `pnpm lint` must pass.

- **Formatting** is Prettier with `semi: false`, double quotes, 80 columns, and
  `prettier-plugin-tailwindcss` (which reorders Tailwind classes). Run
  `pnpm format` before the final verification so class order matches.

## Commands you will need

| Purpose   | Command            | Expected on success            |
|-----------|--------------------|--------------------------------|
| Install   | `pnpm install`     | exit 0                         |
| Build registry | `pnpm registry:build` | exit 0, "✔ registry built" |
| Typecheck | `pnpm typecheck`   | exit 0, no output              |
| Lint      | `pnpm lint`        | exit 0, no output              |
| Format    | `pnpm format`      | exit 0                         |
| Dev server | `pnpm dev`        | serves on http://localhost:3000 |

`pnpm typecheck` needs `src/__registry__/index.tsx` to exist; it is generated
and git-ignored, so run `pnpm registry:build` once first if you have a fresh
clone.

## Scope

**In scope** (the only files you should modify):
- `src/router.tsx`
- `src/components/site/masthead.tsx`
- `src/components/docs/sidebar.tsx`
- `src/routes/index.tsx`
- `src/routes/docs.$category.$item.tsx`
- `src/routes/__root.tsx`

**Out of scope** (do NOT touch, even though they look related):
- `src/routes/docs.index.tsx:102` — `href="/llms.txt"`. That is a static file
  in `public/`, not a route. It must stay an `<a>`; `<Link>` would fail to
  match a route and break it.
- `src/routes/docs.$category.$item.tsx:85` — `href={`/r/${item.name}.json`}`.
  Same reason: a static JSON payload under `public/r/`, not a route.
- `src/routes/index.tsx:59` — `href="#install"`. A same-page fragment anchor.
- Every external link: `siteConfig.links.*` in `masthead.tsx` and
  `index.tsx`, all of `src/components/site/colophon.tsx`, the npmjs.com and
  ui.shadcn.com links in `docs.$category.$item.tsx:176,223`, and
  `src/components/open-in-v0-button.tsx`.
- `src/routeTree.gen.ts` and `src/__registry__/` — generated.
- The visual design. Rendered classes, spacing and copy must be unchanged.

## Git workflow

- Branch: `perf/link-navigation`
- Commit style is Conventional Commits — `git log --oneline` shows
  `feat(registry)!: ship ink on paper to consumers`, `chore(lint): adopt @shadcn/lint`.
  Use e.g. `perf(docs-site): navigate with Link instead of raw anchors`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix the preload staleness in `src/router.tsx`

Delete the `defaultPreloadStaleTime: 0` line. With it gone the router's own
default applies and preloaded data is reused on the subsequent navigation.

Then add a comment recording why, so it does not get re-added:

```tsx
export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: "intent",
    // No `defaultPreloadStaleTime: 0` — that value exists for handing
    // freshness to an external cache (TanStack Query), which this site does
    // not use. At 0 every hover-preload is discarded and refetched on click.
  })

  return router
}
```

**Verify**: `grep -n "defaultPreloadStaleTime" src/router.tsx` → no matches.

### Step 2: Pin the item route's loader data as immutable

`src/routes/docs.$category.$item.tsx` loads its payload from a server function
that reads `public/r/<item>.json` — a file baked at build time. It cannot
change while a browser session is open, so there is no reason to ever refetch
it. Add `staleTime: Infinity` to the route options, next to the existing
`loader`:

```tsx
export const Route = createFileRoute("/docs/$category/$item")({
  // The payload is built by `pnpm registry:build` and is constant for the
  // lifetime of a deploy, so a loaded item never needs refetching.
  staleTime: Infinity,
  loader: async ({ params }) => {
    ...
```

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Convert the masthead nav

In `src/components/site/masthead.tsx`:

1. Change the `nav` array to carry typed route targets and their active
   matching, e.g.:

   ```tsx
   const nav = [
     { label: "Registry", to: "/", exact: true },
     { label: "Docs", to: "/docs", exact: false },
   ] as const
   ```

2. Replace the `<a>` with `<Link to={item.to} activeOptions={{ exact: item.exact }} …>`,
   moving the active classes into `activeProps`:

   ```tsx
   <Link
     activeOptions={{ exact: item.exact }}
     activeProps={{ "aria-current": "page", className: "font-bold underline" }}
     className={linkClass}
     to={item.to}
   >
     {item.label}
   </Link>
   ```

3. Delete the `const active = …` computation and the
   `const pathname = useRouterState(…)` line, then remove `useRouterState`
   from the import on line 1 and `cn` from the import on line 6 **if and only
   if** they have no other use in the file. Check with
   `grep -n "useRouterState\|cn(" src/components/site/masthead.tsx`.

Leave the wordmark `<Link to="/">` on lines 28-33 and the external
`tanfust.com` `<a>` unchanged.

**Verify**: `pnpm typecheck && pnpm lint` → both exit 0.

### Step 4: Convert the docs sidebar

In `src/components/docs/sidebar.tsx`, replace the per-item `<a>` with:

```tsx
<Link
  activeProps={{ "aria-current": "page", className: "font-bold underline" }}
  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
  params={{ category: category.slug, item: item.name }}
  to="/docs/$category/$item"
>
  {item.name}
</Link>
```

Note the inactive branch's classes (`text-muted-foreground hover:text-foreground`)
become the base `className`; because `activeProps.className` is *concatenated*,
the active link would otherwise keep the muted colour. If that reads wrong in
the browser, add `inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}`
and drop those two classes from the base instead — both are acceptable; pick
whichever renders identically to `main`.

Then delete the `const href = …` and `const active = …` lines, and the
`useRouterState` call on line 13 plus its import — but only after confirming
the `[00] Installation` `<Link to="/docs">` on lines 20-28 no longer needs
`pathname`; give it `activeOptions={{ exact: true }}` and
`activeProps={{ className: "font-bold underline" }}` instead of the
`cn(…, pathname === "/docs" && …)` it uses today.

**Verify**: `pnpm typecheck && pnpm lint` → both exit 0.

### Step 5: Convert the home-page catalog links

In `src/routes/index.tsx`, replace the `<a href={`/docs/${category.slug}/${item.name}`}>`
with a `<Link to="/docs/$category/$item" params={{ category: category.slug, item: item.name }}>`,
keeping the same `className`. Add `Link` to the existing
`@tanstack/react-router` import on line 1.

**Verify**: `pnpm typecheck && pnpm lint` → both exit 0.

### Step 6: Convert the item-page breadcrumb and dependency links

In `src/routes/docs.$category.$item.tsx`:

- The breadcrumb `<a href="/docs">Docs</a>` → `<Link to="/docs">Docs</Link>`.
- In `DepLink`, the `@tanfust/` branch → `<Link to="/docs/$category/$item" params={{ category: slug, item: name }}>`.

Add `Link` to the `@tanstack/react-router` import on line 1. Leave the
`/r/<item>.json` anchor and both external anchors alone.

**Verify**: `pnpm typecheck && pnpm lint` → both exit 0.

### Step 7: Convert the 404 link

In `src/routes/__root.tsx`, the `NotFound` component's
`<a href="/">[ Back to the registry → ]</a>` → `<Link to="/">`. `Link` is not
yet imported in this file; add it to the existing import block on lines 1-6.

**Verify**: `pnpm typecheck && pnpm lint` → both exit 0.

### Step 8: Format and confirm no internal anchors remain

```bash
pnpm format
```

Then confirm the only remaining `href=` occurrences pointing at a route are
gone:

```bash
grep -rn 'href=' src/routes src/components --include='*.tsx' | grep -v 'src/registry'
```

Every remaining line must be one of: an `http`/`https` URL, `/llms.txt`,
`/r/<something>.json`, or `#install`. If any line points at `/` or `/docs…`,
it was missed — go back and convert it.

**Verify**: `pnpm registry:build && pnpm typecheck && pnpm lint` → all exit 0.

### Step 9: Confirm behaviour in the browser

Run `pnpm dev`, open http://localhost:3000, and check:

1. Clicking a catalog entry on the home page does **not** show a full page
   reload (the browser's reload/spinner indicator does not fire; the masthead
   does not flash).
2. The active sidebar item is bold and underlined on an item page, and carries
   `aria-current="page"` in devtools.
3. "Registry" in the masthead is bold only on `/`, and "Docs" is bold on
   `/docs` and on item pages.
4. Hovering a sidebar link issues the item's server-function request once in
   the Network tab; clicking it issues **no second request**.

**Verify**: all four hold. Item 4 is the check that Step 1 worked.

## Test plan

This repo has no test runner (see `plans/003-registry-item-tests.md`, which
adds one for the shipped registry items only). Verification for this plan is
`pnpm typecheck`, `pnpm lint`, and the manual browser checks in Step 9. Do not
add a test framework as part of this plan.

## Done criteria

ALL must hold:

- [ ] `pnpm registry:build` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `grep -n "defaultPreloadStaleTime" src/router.tsx` returns no matches
- [ ] `grep -rn 'href="/docs\|href={`/docs' src/routes src/components` returns no matches
- [ ] `grep -rn "useRouterState" src/components` returns no matches
- [ ] `git status --porcelain` lists only the six in-scope files
- [ ] Step 9's four browser checks pass, including no duplicate request on click
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows an in-scope file changed and the "Current state"
  excerpts no longer match the live code.
- `pnpm lint` reports a `shadcn/require-static-classes` or
  `shadcn/no-unknown-classes` error on a class string you moved into
  `activeProps`, and the obvious fix (a plain string literal) does not clear
  it. Do not disable the rule.
- `pnpm typecheck` rejects `to="/docs/$category/$item"` — that would mean
  `src/routeTree.gen.ts` is stale or the route file was renamed. Run
  `pnpm registry:build` and retry once; if it still fails, stop.
- Converting a link changes what renders (different classes, different
  spacing). The design must be byte-identical; report rather than adjusting
  the design.
- You find you need to touch `src/routeTree.gen.ts`, `src/__registry__/`, or
  any file outside the in-scope list.

## Maintenance notes

- Any new internal link added later should be `<Link>`. The grep in the Done
  criteria is a cheap CI guard if someone wants to add one.
- If TanStack Query is ever introduced to this site, `defaultPreloadStaleTime: 0`
  becomes correct again — that is exactly the case it is for. The comment added
  in Step 1 says so.
- `staleTime: Infinity` on the item route is safe only while item payloads are
  build-time constants. If item data ever becomes dynamic (fetched from an API
  rather than `public/r/`), revisit it.
- A reviewer should scrutinise: that `activeProps.className` does not duplicate
  base classes (they concatenate), and that no static-asset link
  (`/llms.txt`, `/r/*.json`) was converted to `<Link>`.
