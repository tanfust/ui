# Plan 004: Make the repo able to reproduce its own Cloudflare deployment

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat c7f3257..HEAD -- vite.config.ts package.json public/_headers .github/workflows/registry.yml scripts/`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.
>
> **Read this first**: the production site is **working correctly**. This plan
> does not fix a user-facing bug. Do not "repair" production behaviour.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `c7f3257`, 2026-09-18

## Why this matters

`https://ui.tanfust.com` is deployed on Cloudflare Workers with static assets,
and it works. Measured on 2026-09-18:

| Request | Result |
|---|---|
| `GET /r/registry.json` | `200`, `server: cloudflare`, `cf-cache-status: HIT`, `access-control-allow-origin: *`, `cache-control: public, max-age=300, s-maxage=3600`, `vary: Accept` |
| `GET /llms.txt` | `200`, `cf-cache-status: HIT`, same cache rule |
| `GET /` with `Accept: application/vnd.shadcn.v1+json` | `200`, returns the catalog JSON |
| `GET /`, `/docs`, `/docs/hooks/use-debounce` | `200 text/html`, **no** `cache-control`, **no** `cf-cache-status` |

So `public/_headers` is being honoured (that is Workers Static Assets doing its
job), and the content negotiation in `src/start.ts` is live.

The problem is that **nothing in this repository produces that deployment**.
`vite.config.ts:13` calls `nitro()` with no preset, whose default is
`node-server`; `package.json` has `"start": "node .output/server/index.mjs"`;
CI builds `.output` and uploads it as an artifact; and there is no
`wrangler.jsonc`, no `@cloudflare/vite-plugin`, and no `wrangler` dependency.
The deploy configuration lives somewhere outside this repo.

Three concrete costs:

1. **CI validates a runtime nobody runs.** `pnpm build` and `pnpm smoke`
   exercise a Node server; users are served by a Worker. A regression that only
   manifests on workerd passes CI.
2. **The contract that matters is untested.** `npx shadcn@latest add https://ui.tanfust.com`
   works only because `/` reaches the Worker. Nothing asserts that, anywhere.
3. **It blocks `plans/005-static-prerendering.md`.** Prerendering emits an
   `/index.html` asset, and Cloudflare serves a matching static asset *without
   invoking Worker code* — so it would silently break the negotiation above.
   You cannot reason about that safely while the repo disagrees with production
   about what it even builds.

After this plan: the repo documents how it is actually served, and CI asserts
the registry's public contract against a local build on every PR.

## Current state

### `vite.config.ts` (whole file)

```ts
import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { nitro } from "nitro/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// Deployment target: Nitro (Node server by default; swap the preset for
// cloudflare/netlify/vercel — see docs/plan.md). Static assets in `public/`
// (the registry JSON under /r) are served as-is by every target.
const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact(), nitro()],
})

export default config
```

Note the comment points at `docs/plan.md`, which **does not exist** in this
repository (`find . -name 'plan.md' -not -path './node_modules/*'` finds
nothing). That is a stale pointer to fix.

### `src/start.ts` — the contract that must keep working

```ts
const shadcnRootNegotiation = createMiddleware({ type: "request" }).server(
  async ({ next, request }) => {
    const url = new URL(request.url)
    if (url.pathname === "/" && request.method === "GET" && isShadcnClient(request)) {
      return Response.json(registry, {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=3600",
          Vary: "Accept, User-Agent",
        },
      })
    }
    return next()
  }
)

function isShadcnClient(request: Request) {
  const accept = request.headers.get("accept") ?? ""
  const userAgent = request.headers.get("user-agent") ?? ""
  return accept.includes("application/vnd.shadcn.v1+json") || userAgent === "shadcn"
}
```

### `public/_headers`

```
/r/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300, s-maxage=3600
  Vary: Accept

/llms.txt
  Cache-Control: public, max-age=300, s-maxage=3600
```

Verified live as applied. Relevant Cloudflare rule, from
<https://developers.cloudflare.com/workers/static-assets/headers>: *"Custom
headers defined in the `_headers` file are not applied to responses generated
by your Worker code."* So these rules cover `/r/*` and `/llms.txt` (assets) but
**not** `/` — which is why `src/start.ts` sets its own `Cache-Control` inline.
That split is correct and must be preserved.

### `scripts/smoke-install.sh:30-38` — the coupling to the Node build

```bash
echo "▸ serving registry on :$PORT"
# `exec` so the subshell is replaced by node and $! is node's own pid. Without
# it the trap kills the wrapper and leaks the server, which the next run then
# silently talks to.
(cd "$ROOT" && exec env PORT="$PORT" node .output/server/index.mjs >"$SMOKE_DIR/server-$BASE.log" 2>&1) &
SERVER_PID=$!
```

This is why the Node preset cannot simply be swapped out: the smoke test boots
`.output/server/index.mjs` directly. Any change to the build target breaks it.
**This plan does not change the build target.** It documents and guards first.

### `.github/workflows/registry.yml` — the `build` job's steps

```yaml
      - run: pnpm install --frozen-lockfile
      - name: Registry output is committed and up to date
        run: pnpm registry:check
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build
        env:
          VITE_BASE_URL: https://ui.tanfust.com
```

### Conventions to honor

- Shell scripts in `scripts/` use `#!/usr/bin/env bash`, `set -euo pipefail`, a
  `▸`/`✔`/`✖` output vocabulary, and a leading comment block explaining
  non-obvious choices. Match `scripts/smoke-install.sh`.
- `scripts/` is excluded from ESLint (`eslint.config.js` `ignores`).
- Markdown in this repo is written in full prose with a reasoning-first voice —
  see `AGENTS.md` and `SECURITY.md`. Match that register in `docs/deployment.md`.
- Conventional Commits.

> **Formatting caveat (added 2026-09-19, after plan 001 executed).** Do **not**
> run the repo-wide `pnpm format`. `main` already has pre-existing Prettier
> drift: `pnpm check` fails on 21 committed files (including
> `scripts/build-registry.mjs`, `src/lib/registry.ts`, every
> `src/registry/tanfust/**` item and `src/routeTree.gen.ts`). A repo-wide
> `prettier --write` therefore rewrites files outside this plan's scope and, via
> `registry:build`, cascades into `public/r/*.json`. Instead run Prettier scoped
> to the files this plan actually touches, e.g.
> `npx prettier --write <the in-scope files>`, and verify with
> `npx prettier --check <the in-scope files>`. Fixing the repo-wide drift is a
> separate change — see `plans/README.md`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Build | `pnpm build` | exit 0, writes `.output/` |
| Serve the build | `PORT=3999 node .output/server/index.mjs` | listens on :3999 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Probe production (read-only) | `curl -sS -o /dev/null -D - https://ui.tanfust.com/r/registry.json` | `200` + the headers above |

All `curl` usage in this plan is read-only `GET` against a public site. Do not
issue any other HTTP method, and do not attempt to deploy.

## Scope

**In scope**:
- `docs/deployment.md` (create)
- `scripts/check-contract.sh` (create)
- `package.json` — add a `contract` script
- `.github/workflows/registry.yml` — run the contract check
- `vite.config.ts` — **comment only** (fix the dead `docs/plan.md` pointer)
- `README.md` — only if Step 1 finds it inaccurate

**Out of scope** (do NOT touch):
- **The build target.** Do not add `@cloudflare/vite-plugin`, do not add
  `wrangler` or a `wrangler.jsonc`, do not change the `nitro()` call, do not
  add a deploy script or a CI deploy job. Production is working and its
  configuration lives outside this repo; changing the build here could break a
  deployment you cannot see or test. Recording what is true is this plan's
  whole job.
- `scripts/smoke-install.sh` — it depends on `.output/server/index.mjs`, which
  this plan leaves intact.
- `public/_headers` — verified correct and live.
- `src/start.ts` — the negotiation works; this plan only adds a test for it.
- Any prerendering configuration — that is `plans/005-static-prerendering.md`.

## Git workflow

- Branch: `chore/deploy-config-parity`
- Conventional Commits, e.g. `chore(deploy): document the Cloudflare target and guard the registry contract`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Establish the facts

Ask the operator for the deployment configuration's location (a Workers Builds
project, a `wrangler.jsonc` in another repo, or a dashboard build command) and
in particular **whether `assets.run_worker_first` is set, and to what**. Record
the answer; it is the key input for plan 005.

Independently, re-run the read-only probes and record the current output — the
values in "Current state" were measured on 2026-09-18 and may have moved:

```bash
curl -sS -o /dev/null -D - https://ui.tanfust.com/
curl -sS -o /dev/null -D - https://ui.tanfust.com/r/registry.json
curl -sS -o /dev/null -D - https://ui.tanfust.com/llms.txt
curl -sS -H 'Accept: application/vnd.shadcn.v1+json' https://ui.tanfust.com/ | head -c 200
```

If the operator is unavailable, continue with Steps 2–6 using only what the
probes show, and note the unanswered `run_worker_first` question prominently in
`docs/deployment.md` and in your report. Do **not** guess its value.

**Verify**: you have written down, for each of the four probes, the status code
and whether `cf-cache-status` was present.

### Step 2: Write `scripts/check-contract.sh`

A script asserting the registry's public contract against a base URL, defaulting
to a locally served build. This is the guard that makes plan 005 safe to attempt.

It takes `BASE_URL` as `$1`, defaulting to `http://127.0.0.1:3998`, and when no
argument is given it starts and stops the built Node server itself — model that
lifecycle on `scripts/smoke-install.sh:22-45` (the port-in-use refusal, the
`exec` subshell so `$!` is node's own pid, the `trap … EXIT` cleanup, and the
readiness poll loop). Reuse that structure rather than inventing one; the
comments there explain why each piece exists.

Assertions, each printing `▸`/`✔`/`✖` and failing the script on error:

1. `GET /r/registry.json` → `200`, `content-type` contains `application/json`,
   body parses as JSON and has a non-empty `items` array.
2. `GET /` with `-H 'Accept: application/vnd.shadcn.v1+json'` → `200`, body
   parses as JSON, and `.name` equals `tanfust`. **This is the load-bearing
   assertion** — it is what `npx shadcn@latest add https://ui.tanfust.com`
   depends on.
3. `GET /` with `-H 'User-Agent: shadcn'` → same as (2); `src/start.ts`
   accepts either signal.
4. `GET /` with an ordinary browser `Accept: text/html` → `200` and
   `content-type` contains `text/html`. This is the counter-assertion that the
   negotiation has not started hijacking browser traffic.
5. `GET /llms.txt` → `200`, `content-type` contains `text/plain`.
6. `GET /r/use-debounce.json` → `200` and the body's `.name` is `use-debounce`,
   proving individual item payloads are reachable.

Do **not** assert on `access-control-allow-origin` or `cache-control` when
running locally: those come from `public/_headers`, which is a Cloudflare
Workers feature and is **not** applied by the Nitro Node server. Instead, note
in a comment that those are verifiable only against production, and gate them
behind an optional `--production-headers` flag that is off by default.

Make it executable: `chmod +x scripts/check-contract.sh`.

**Verify**:
```bash
pnpm build
bash scripts/check-contract.sh
```
→ exits 0, prints a `✔` for each of the six assertions.

Then prove the check actually fails when the contract is broken:
```bash
git stash push src/start.ts 2>/dev/null || true
```
— or more simply, temporarily edit `isShadcnClient` in `src/start.ts` to
`return false`, run `pnpm build && bash scripts/check-contract.sh`, confirm it
exits non-zero on assertion 2, then **revert the edit** with
`git checkout -- src/start.ts` and rebuild.

**Verify**: `git status --porcelain src/start.ts` prints nothing afterwards.

### Step 3: Add the `contract` script

In `package.json`, after `"smoke"`:

```json
"contract": "bash scripts/check-contract.sh"
```

**Verify**: `pnpm contract` behaves as in Step 2.

### Step 4: Run it in CI

In `.github/workflows/registry.yml`, in the `build` job, add a step after
`- run: pnpm build` and before the `upload-artifact` step:

```yaml
      - name: Registry contract (catalog, item payloads, shadcn root negotiation)
        run: pnpm contract
```

Match the surrounding indentation.

**Verify**: `grep -n "pnpm contract\|pnpm build\|upload-artifact" .github/workflows/registry.yml`
shows `pnpm contract` between the two.

### Step 5: Write `docs/deployment.md`

Create `docs/` (it does not exist yet) and write the file. It must state, in
prose matching the repo's voice:

- **What serves the site today**, with the probe evidence from Step 1 —
  Cloudflare Workers with static assets; `public/` served as assets with
  `_headers` applied; `/`, `/docs` and item pages rendered by the Worker with
  no edge caching.
- **Where the deploy configuration lives**, per Step 1's answer. If unknown,
  say so explicitly and label it an open question — an honest gap is more
  useful than an invented answer.
- **That this repo builds a Node server, not a Worker**, and why that has not
  been changed: `scripts/smoke-install.sh` boots `.output/server/index.mjs`,
  so the two move together. Note that the current TanStack Start docs prescribe
  `@cloudflare/vite-plugin` plus a `wrangler.jsonc` with
  `"main": "@tanstack/react-start/server-entry"` for a Workers target
  (<https://tanstack.com/start/latest/docs/framework/react/guide/hosting>),
  **not** a Nitro preset — so a future migration is a real piece of work, not a
  one-line preset swap.
- **The two invariants** any change must preserve, each with the reason:
  1. `_headers` applies to static assets only, never to Worker responses —
     which is why `src/start.ts` sets its own `Cache-Control`.
  2. Cloudflare serves a matching static asset **without invoking Worker
     code**. `/` currently reaches the Worker only because no `/index.html`
     asset exists. Anything that creates one — static prerendering above all —
     breaks `npx shadcn@latest add https://ui.tanfust.com` unless
     `assets.run_worker_first` includes `/`. Cite
     <https://developers.cloudflare.com/workers/static-assets> and point at
     `plans/005-static-prerendering.md`.
- **How to check it**: `pnpm contract` locally,
  `bash scripts/check-contract.sh https://ui.tanfust.com` against production.

**Verify**: `bash scripts/check-contract.sh https://ui.tanfust.com` exits 0,
confirming the documented contract holds in production too.

### Step 6: Fix the stale pointer and reconcile the README

In `vite.config.ts`, replace the dead `docs/plan.md` reference. Change only the
comment; leave the plugin list untouched:

```ts
// Build target: Nitro's default `node-server` preset — see docs/deployment.md.
// Production is served by Cloudflare Workers with static assets, configured
// outside this repository; docs/deployment.md records the gap and the
// invariants that depend on it. Static assets in `public/` (the registry JSON
// under /r, llms.txt, _headers) are emitted by every target.
```

Then re-read `README.md`'s "How it works" paragraph, which says the docs site
is "TanStack Start, deployed on Cloudflare". Step 1 confirms that is true, so
leave it — but add a pointer to `docs/deployment.md` so the detail is
discoverable. Only change the README's wording if Step 1 contradicted it.

**Verify**: `grep -rn "docs/plan.md" . --include='*.ts' --include='*.md' --exclude-dir=node_modules`
returns no matches.

### Step 7: Full check

```bash
npx prettier --write vite.config.ts
pnpm registry:check
pnpm lint
pnpm typecheck
pnpm build
pnpm contract
```

**Verify**: all six exit 0.

## Test plan

`scripts/check-contract.sh` **is** the test this plan delivers, and Step 2
includes its own negative test (break `isShadcnClient`, confirm the check
fails, revert). No unit-test framework is involved; if
`plans/003-registry-item-tests.md` has already landed, leave `pnpm test`
untouched — the contract check is a separate concern and belongs in its own
script.

## Done criteria

ALL must hold:

- [ ] `scripts/check-contract.sh` exists and is executable (`test -x`)
- [ ] `pnpm contract` exits 0 against a local `pnpm build`
- [ ] `bash scripts/check-contract.sh https://ui.tanfust.com` exits 0
- [ ] The check was demonstrated to **fail** when `isShadcnClient` is stubbed
      to `false`, and `git status --porcelain src/start.ts` is clean afterwards
- [ ] `docs/deployment.md` exists and names both invariants and the
      `run_worker_first` question
- [ ] `grep -rn "docs/plan.md" --include='*.ts' --include='*.md' --exclude-dir=node_modules .` → no matches
- [ ] `grep -n "pnpm contract" .github/workflows/registry.yml` → one match
- [ ] `git status --porcelain` shows **no** change to `vite.config.ts`'s plugin
      array, `public/_headers`, `src/start.ts`, or `scripts/smoke-install.sh`
      (`git diff vite.config.ts` shows comment lines only)
- [ ] No `wrangler` config, `@cloudflare/*` dependency, or deploy job was added
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any production probe in Step 1 differs from the table in "Current state" —
  especially if `GET /` with the shadcn `Accept` header no longer returns JSON,
  or `/r/registry.json` has lost its CORS or cache headers. That would mean
  something regressed in production and is more urgent than this plan.
- The operator's answer reveals the deployment is **not** Cloudflare Workers
  with static assets. Everything downstream, including plan 005, rests on that.
- You find yourself wanting to change `vite.config.ts`'s plugin array, add
  `wrangler`, or add a deploy step. That is explicitly out of scope; report the
  case for it instead.
- `scripts/check-contract.sh` cannot make assertion 2 pass against a local
  build. That would mean the negotiation depends on something only production
  provides — a genuinely important finding. Report it rather than weakening the
  assertion.
- `pnpm contract` passes locally but fails against production, or vice versa.
  Report the difference; it is exactly the drift this plan exists to surface.

## Maintenance notes

- `docs/deployment.md` is only worth having if it stays true. Anyone changing
  `vite.config.ts`'s build target, `public/_headers`, or `src/start.ts` should
  update it in the same commit.
- The two invariants are the load-bearing content. The second one — assets
  shadow the Worker — is what makes `plans/005-static-prerendering.md` risky;
  005 should not be attempted until it is written down and the
  `run_worker_first` value is known.
- Follow-up deliberately deferred: migrating the build to
  `@cloudflare/vite-plugin` so CI exercises workerd. That is worth doing, but
  it requires reworking `scripts/smoke-install.sh` (which boots
  `.output/server/index.mjs`) and coordinating with the out-of-repo deploy
  configuration. Do it as its own change, with `pnpm contract` already in place
  as the safety net — which is precisely what this plan builds.
- A reviewer should scrutinise: that nothing in the diff changes what is built
  or deployed, and that the contract check genuinely fails when the contract is
  broken rather than passing vacuously.
