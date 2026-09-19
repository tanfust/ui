# Plan 006: Clear the Prettier drift and stop it recurring

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. SKIP updating
> `plans/README.md`; your reviewer maintains it.
>
> **Drift check (run first)**: `git log --oneline -1` should be at or after
> `c389997`. Run `pnpm check` and confirm it fails on **19** files. If the
> number differs, compare against the list in "Current state" before
> proceeding; a large mismatch is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED — it changes bytes shipped to consumers (see below)
- **Depends on**: none (001–005 already merged)
- **Category**: tech-debt
- **Planned at**: commit `c389997`, 2026-09-19

## Why this matters

`pnpm check` (`prettier --check "**/*.{ts,tsx,js,jsx,mjs}"`) fails on 19
committed files. CI runs `pnpm lint` but never `pnpm check`, so the drift
accumulated unnoticed and every contributor running `pnpm format` — which
`CONTRIBUTING.md` tells them to — produces a diff touching files they never
edited. That is how a formatting change hides a real one.

This is not purely cosmetic, and that is the thing to understand before
starting. **13 of the 19 files live under `src/registry/tanfust/`, which is the
product.** Those files are copied verbatim into consumers' projects, and
`shadcn build` embeds their content byte-for-byte into `public/r/*.json`
(verified: the `content` field of `public/r/slugify.json` is character-identical
to `src/registry/tanfust/lib/slugify.ts`). Reformatting them therefore changes
the payloads the CLI serves. Existing installs are unaffected — items are copied
source, not a dependency — but new installs get the reformatted source.

## Current state

`pnpm check` fails on these 19, in three groups:

**Shipped (13)** — under `src/registry/tanfust/`, embedded in `public/r/*.json`:
`examples/absolute-url-demo.tsx`, `examples/format-currency-demo.tsx`,
`examples/format-date-demo.tsx`, `examples/use-copy-to-clipboard-demo.tsx`,
`examples/use-media-query-demo.tsx`, `examples/use-mobile-demo.tsx`,
`examples/use-stepper-demo.tsx`, `hooks/use-copy-to-clipboard.ts`,
`hooks/use-stepper.ts`, `lib/absolute-url.ts`, `lib/format-currency.ts`,
`lib/format-date.ts`, `lib/slugify.ts`

**Generated (1)**: `src/routeTree.gen.ts`

**Internal (5)**: `src/components/theme-provider.tsx`, `src/config/site.ts`,
`src/lib/install.ts`, `src/lib/registry.server.ts`, `src/start.ts`

`.prettierignore` currently contains only:

```
package-lock.json
pnpm-lock.yaml
yarn.lock
```

### Three decisions already made — implement them, do not relitigate

1. **`src/routeTree.gen.ts` gets ignored, not formatted.** It is emitted by the
   TanStack router plugin, whose output is not Prettier-formatted, so formatting
   it would be overwritten on the next dev/build run — permanent churn.
   `eslint.config.js` already ignores it; `.prettierignore` will mirror that.
2. **The 13 shipped files DO get formatted.** `CONTRIBUTING.md` states Prettier
   is the source of truth and applies to items too; `AGENTS.md` puts the shipped
   files last in line to stop checking, not first. Consistent formatting in what
   ships is the point.
3. **No `meta.version` bump for the reformatted items.** Version tracks an
   item's contract. Whitespace does not change behaviour — verified: the full
   test suite passes against Prettier's output of `slugify.ts`, and Prettier
   preserves that file's raw U+0300–U+036F combining-mark range byte-identically
   (`cc 80 2d cd af` before and after). Bumping 13 versions for line wrapping
   would be noise in every consumer's update check.

### Conventions

- Prettier config (`.prettierrc`): `semi: false`, double quotes, `tabWidth: 2`,
  `printWidth: 80`, `trailingComma: "es5"`, plus `prettier-plugin-tailwindcss`.
- Conventional Commits. Recent examples: `perf(docs-site): …`, `test(lib): …`,
  `chore(deploy): …`.
- `public/r/**` is generated and **committed**; `pnpm registry:check` fails CI
  if it is stale.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `pnpm install` | exit 0 |
| Registry build | `pnpm registry:build` | exit 0 |
| Format check | `pnpm check` | exit 0 once done |
| Format | `pnpm format` | exit 0 |
| Lint / typecheck | `pnpm lint`, `pnpm typecheck` | exit 0 |
| Tests | `pnpm test` | 4 files, 32 tests |
| Registry freshness | `pnpm registry:check` | exit 0 |
| Contract | `pnpm build && pnpm contract` | 6/6 |
| Smoke | `pnpm smoke base` | "✔ smoke (base) passed" |

## Scope

**In scope**: `.prettierignore`; the 18 drifted files Prettier rewrites (all
except `src/routeTree.gen.ts`); `public/r/*.json` (regenerated, never
hand-edited); `.github/workflows/registry.yml`.

**Out of scope**: `src/routeTree.gen.ts` (ignored, not formatted); any
*semantic* edit to any file — this change must be whitespace-only; `meta.version`
in any `registry.json`; `plans/**`.

## Git workflow

- Branch: `style/prettier-drift`
- **Two commits, in this order**, so CI would pass at each:
  1. `.prettierignore` + the formatting sweep + regenerated `public/r`
  2. the CI `pnpm check` step
  Adding the CI step first would fail CI on its own commit.
- Do NOT push or open a PR.

## Steps

### Step 1: Extend `.prettierignore`

Append the generated/derived paths, mirroring `eslint.config.js`'s ignores.
Keep the three existing lines:

```
package-lock.json
pnpm-lock.yaml
yarn.lock

# Generated — formatting these is undone by the next generator run.
# Mirrors the ignores in eslint.config.js.
src/routeTree.gen.ts
src/__registry__/
public/r/
.output/
.smoke/
```

**Verify**: `npx prettier --check src/routeTree.gen.ts` now reports it as
ignored rather than failing. Then `pnpm check 2>&1 | grep -c '^\[warn\].*\.tsx\?$'`
→ **18** (the 19 minus routeTree).

### Step 2: Run the sweep

```bash
pnpm format
```

This is the one place a repo-wide `pnpm format` is correct — it is the entire
point of this plan. (Earlier plans forbade it; that guidance does not apply here.)

**Verify**: `pnpm check` → exit 0. Then confirm the change is whitespace-only:

```bash
git diff --ignore-all-space --stat
```

→ must print **nothing** (no file differs once whitespace is ignored). If any
file shows a non-whitespace difference, that is a STOP condition.

**Verify**: `git status --porcelain src/routeTree.gen.ts` → empty (it was
ignored, not formatted).

### Step 3: Regenerate the payloads

The 13 shipped files were reformatted, and their content is embedded in
`public/r/*.json`, so the payloads are now stale.

```bash
pnpm registry:build
git status --porcelain public/r | head
```

**Verify**: `public/r/*.json` show as modified — expected, this is the cascade.
Then `pnpm registry:check` → exit 0 (regenerating twice is idempotent).

Spot-check the cascade landed correctly:

```bash
node -e "
const fs=require('fs');
const p=JSON.parse(fs.readFileSync('public/r/slugify.json','utf8'));
const d=fs.readFileSync('src/registry/tanfust/lib/slugify.ts','utf8');
console.log('payload matches formatted source:', p.files[0].content===d);
"
```

**Verify**: prints `true`.

### Step 4: Prove nothing broke

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm contract && pnpm smoke base
```

**Verify**: all exit 0; `pnpm test` → 4 files / 32 tests; `pnpm contract` →
6 passed, 0 failed; smoke → "✔ smoke (base) passed".

The test suite is the real safety net here: `tests/registry/lib/slugify.test.ts`
contains a guard asserting `slugify` still strips **decomposed** combining marks.
If Prettier had mangled the combining-mark range in `slugify.ts:13`, that test
fails. It must pass.

Commit these as commit 1.

### Step 5: Make CI enforce it

In `.github/workflows/registry.yml`, add a step immediately after
`- run: pnpm lint`:

```yaml
      - run: pnpm check
```

Match the surrounding indentation.

**Verify**: `grep -n "pnpm lint\|pnpm check\|pnpm typecheck" .github/workflows/registry.yml`
shows `check` between `lint` and `typecheck`. Then `pnpm check` → exit 0.

Commit as commit 2.

## Done criteria

- [ ] `pnpm check` exits 0
- [ ] `git diff --ignore-all-space --stat <base>..HEAD -- '*.ts' '*.tsx' '*.mjs'` prints nothing (whitespace-only)
- [ ] `git status --porcelain src/routeTree.gen.ts` empty; it is listed in `.prettierignore`
- [ ] `pnpm registry:check` exits 0 and `public/r/*.json` is committed
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm contract`, `pnpm smoke base` all exit 0
- [ ] `pnpm test` → 4 files, 32 tests, including the slugify decomposed-marks guard
- [ ] `grep -n "pnpm check" .github/workflows/registry.yml` → one match, after `pnpm lint`
- [ ] No `meta.version` changed: `git diff <base>..HEAD -- 'src/registry/**/registry.json'` prints nothing
- [ ] Exactly two commits on `style/prettier-drift`

## STOP conditions

- `pnpm check` fails on a substantially different file count than 19.
- `git diff --ignore-all-space` shows a **non-whitespace** change — Prettier
  should never alter semantics; report what changed.
- `pnpm test` fails, especially the slugify decomposed-marks guard. That would
  mean formatting mangled the combining-mark range — revert and report
  immediately; do not "fix" the test.
- `pnpm smoke base` or `pnpm contract` fails.
- You find yourself wanting to edit `src/routeTree.gen.ts`, bump a
  `meta.version`, or hand-edit anything under `public/r/`.

## Maintenance notes

- After this, `pnpm check` in CI keeps the drift from returning. If the router
  plugin ever starts emitting Prettier-clean output, `src/routeTree.gen.ts`
  could come out of `.prettierignore` — until then it must stay.
- Reformatting shipped items is a consumer-visible (if cosmetic) change. Anyone
  doing it again should regenerate `public/r` in the same commit; `pnpm registry:check`
  enforces that in CI.
- Reviewer should scrutinise: that `git diff --ignore-all-space` really is empty
  (proving whitespace-only), and that no `meta.version` moved.
