# Plan 003: Unit-test the `lib` items that ship into consumers' projects

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat c7f3257..HEAD -- src/registry/tanfust/lib package.json .github/workflows/registry.yml`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `c7f3257`, 2026-09-18

## Why this matters

This repo is a registry: the files under `src/registry/tanfust/lib/` are
**copied as source into other people's projects** and then maintained by them.
A wrong regex or a wrong rounding rule does not produce a bug report against a
version we can patch — it is pasted into every consumer and stays there.

There is currently no test runner in the repo at all. CI runs
`registry:check`, `lint`, `typecheck`, `build` and `smoke`. The smoke test
(`scripts/smoke-install.sh`) is good at what it does — it installs every item
into fresh Base UI and Radix consumers and typechecks them, which is how the
base-agnostic rule is enforced — but it never *executes* a single function. It
would pass with a `slugify` that returns the empty string for every input.

A concrete example of what that misses: `src/registry/tanfust/lib/slugify.ts:13`
strips accents with a character-class range typed as **raw combining marks**:

```ts
.replace(/[̀-ͯ]/g, "")
```

The two characters between the brackets are U+0300 and U+036F — unpaired
combining diacriticals sitting on their own in the source file. It behaves
correctly today (verified: `slugify("Crème brûlée  2026")` → `"creme-brulee-2026"`),
but any tool that NFC-normalises the file would attach those marks to the
adjacent `[` and `-` and silently change the range. That is exactly the class
of defect a one-line test catches and code review does not.

After this plan: the four `lib` items have executable coverage, CI runs it, and
the accent-stripping behaviour is pinned by a test that fails if the range is
ever mangled.

## Current state

### The four items in scope

`src/registry/tanfust/lib/` contains, all with zero runtime dependencies:

- `slugify.ts` — `slugify(input, { separator, maxLength })`, `uniqueSlug(slug, taken, separator)`
- `format-currency.ts` — `formatCurrency(amount, { currency, locale, minorUnits, trimZeros })`, `formatCompact(value, { locale })`
- `format-date.ts` — `formatDate(input, { preset, locale, timeZone })`, `formatRelative(input, { locale, now })`
- `absolute-url.ts` — `absoluteUrl(path, base)`

### `src/registry/tanfust/lib/slugify.ts:9-24`

```ts
export function slugify(input: string, { separator = "-", maxLength }: { separator?: string; maxLength?: number } = {}) {
  let slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${escape(separator)}+|${escape(separator)}+$`, "g"), "")

  if (maxLength && slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(new RegExp(`${escape(separator)}+$`), "")
  }
  return slug
}
```

### `src/registry/tanfust/lib/format-currency.ts:11-27`

```ts
export function formatCurrency(
  amount: number,
  { currency = "USD", locale, minorUnits = true, trimZeros = false }: {...} = {}
) {
  const value = minorUnits ? amount / 100 : amount
  const wholeNumber = Number.isInteger(value)
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: trimZeros && wholeNumber ? 0 : undefined,
    maximumFractionDigits: trimZeros && wholeNumber ? 0 : undefined,
  }).format(value)
}
```

### `src/registry/tanfust/lib/format-date.ts:3-7`

```ts
function toDate(input: DateInput) {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) throw new RangeError(`Invalid date: ${String(input)}`)
  return d
}
```

### `src/registry/tanfust/lib/absolute-url.ts:11-14`

```ts
export function absoluteUrl(path = "/", base?: string) {
  const origin = (base ?? detectOrigin()).replace(/\/$/, "")
  return new URL(path, origin + "/").toString()
}
```

### Observed actual outputs (verified on Node 26 / ICU 78 while writing this plan)

Use these as the expected values — they were measured, not guessed:

| Call | Returns |
|---|---|
| `slugify("Hello, World!")` | `"hello-world"` |
| `slugify("Crème brûlée  2026")` | `"creme-brulee-2026"` |
| `slugify("Crème brûlée  2026")` (decomposed) | `"creme-brulee-2026"` |
| `slugify("Tanfust UI", { separator: "_" })` | `"tanfust_ui"` |
| `slugify("hello wonderful world", { maxLength: 8 })` | `"hello-wo"` |
| `slugify("")` | `""` |
| `slugify("!!!")` | `""` |
| `uniqueSlug("post", [])` | `"post"` |
| `uniqueSlug("post", ["post", "post-2"])` | `"post-3"` |
| `formatCurrency(1999, { locale: "en-US" })` | `"$19.99"` |
| `formatCurrency(19.99, { minorUnits: false, locale: "en-US" })` | `"$19.99"` |
| `formatCurrency(2000, { trimZeros: true, locale: "en-US" })` | `"$20"` |
| `formatCurrency(1999, { trimZeros: true, locale: "en-US" })` | `"$19.99"` |
| `formatCompact(1200, { locale: "en-US" })` | `"1.2K"` |
| `formatCompact(3_400_000, { locale: "en-US" })` | `"3.4M"` |
| `absoluteUrl("/og.png", "https://a.b/")` | `"https://a.b/og.png"` |
| `absoluteUrl("og.png", "https://a.b")` | `"https://a.b/og.png"` |
| `absoluteUrl("/x", "https://a.b/sub")` | `"https://a.b/x"` |

**Locale trap — read this before writing currency assertions.**
`formatCurrency(1999, { currency: "EUR", locale: "fr-FR" })` returns
`"19,99 €"` — the separator before `€` is U+00A0, a non-breaking space,
**not** an ordinary space. Which non-breaking space ICU emits has changed
between ICU releases, and CI runs Node 22 while you may be on a newer Node.
Therefore: assert exact strings only for `en-US`, and for any other locale
either normalise (`.replace(/\s/gu, " ")`) before comparing, or assert with
`toContain("19,99")` rather than equality. A test that pins `"19,99 €"` with a
plain space will pass locally and fail in CI.

`absoluteUrl("/x", "https://a.b/sub")` dropping `/sub` is current, intended
behaviour (the parameter is an *origin*). Pin it as-is; do not "fix" it.

### Conventions to honor

- ESM only (`"type": "module"` in `package.json`), Node 22+, pnpm 10.
- Prettier: `semi: false`, double quotes, 2-space indent, 80 columns,
  `trailingComma: "es5"`. Run `pnpm format`.
- The `@` alias maps to `./src/*` (`tsconfig.json` `paths`).
- `tsconfig.json` sets `verbatimModuleSyntax: true` (type imports must be
  `import type`), `noUnusedLocals` and `noUnusedParameters` — an unused import
  in a test file will fail `pnpm typecheck`.
- `eslint.config.js` relaxes several rules for `src/registry/**` because those
  files ship into unknown tsconfigs. Test files live outside that tree and get
  the default TanStack config.

## Commands you will need

| Purpose   | Command                  | Expected on success             |
|-----------|--------------------------|---------------------------------|
| Install   | `pnpm install`           | exit 0                          |
| Build registry | `pnpm registry:build` | exit 0                         |
| Typecheck | `pnpm typecheck`         | exit 0, no output               |
| Lint      | `pnpm lint`              | exit 0, no output               |
| Format    | `pnpm format`            | exit 0                          |
| Tests (new) | `pnpm test`            | all pass                        |

## Scope

**In scope**:
- `package.json` — add `vitest` to `devDependencies` and a `test` script
- `vitest.config.ts` (create)
- `tests/registry/lib/slugify.test.ts` (create)
- `tests/registry/lib/format-currency.test.ts` (create)
- `tests/registry/lib/format-date.test.ts` (create)
- `tests/registry/lib/absolute-url.test.ts` (create)
- `.github/workflows/registry.yml` — add a test step
- `CONTRIBUTING.md` — one line telling contributors to run `pnpm test`

**Out of scope** (do NOT touch, even though they look related):
- **Every file under `src/registry/tanfust/`.** This plan adds tests that pin
  *current* behaviour. If a test reveals what looks like a bug, write the test
  to match today's output, mark it with a `// TODO(plan-003):` comment
  explaining the concern, and report it — do not change a shipped item here.
  Changing a registry item is a breaking change for consumers and needs its own
  `meta.version` bump and changelog entry.
- `src/registry/tanfust/hooks/` — the five hooks need React Testing Library and
  a jsdom environment. Deliberately deferred; see Maintenance notes.
- `scripts/smoke-install.sh` — a different kind of test, working correctly.
- `vite.config.ts` — the app build config. Tests get their own config file so
  they never load the TanStack Start and Nitro plugins.
- `public/r/**`, `src/routeTree.gen.ts`, `src/__registry__/` — generated.

## Git workflow

- Branch: `test/registry-lib-items`
- Conventional Commits, e.g. `test(lib): cover the four shipped lib items`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add vitest

```bash
pnpm add -D vitest
```

Then add to the `scripts` block in `package.json`, after `"typecheck"`:

```json
"test": "vitest run",
"test:watch": "vitest",
```

**Verify**: `pnpm vitest --version` prints a version.

### Step 2: Create `vitest.config.ts`

A dedicated config, so vitest never picks up `vite.config.ts` (which loads the
TanStack Start, Nitro and Tailwind plugins — none of which a node-environment
unit test needs, and which would slow or break the run).

```ts
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Deliberately separate from vite.config.ts: these are plain node unit tests
// for the zero-dependency `lib` items, so they must not load the Start, Nitro
// or Tailwind plugins.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
})
```

Do not enable `globals: true`. Import `describe`, `it` and `expect` from
`"vitest"` explicitly in each test file, so no change to `tsconfig.json`'s
`types` array is needed.

**Verify**: `pnpm test` → exits 0 with "No test files found" (or equivalent).

### Step 3: `tests/registry/lib/slugify.test.ts`

Import from the alias: `import { slugify, uniqueSlug } from "@/registry/tanfust/lib/slugify"`.

Cover:
- `slugify("Hello, World!")` → `"hello-world"`
- accent stripping, precomposed input: `slugify("Crème brûlée  2026")` → `"creme-brulee-2026"`
- **the regression guard** — accent stripping with an explicitly *decomposed*
  input written as escapes so the test file itself cannot be normalised away:
  `slugify("Crème brûlée  2026")` → `"creme-brulee-2026"`.
  Add a comment naming what it guards: the combining-mark range in
  `slugify.ts:13` is typed as raw U+0300–U+036F characters, so NFC
  normalisation of that file would silently break it.
- custom separator: `slugify("Tanfust UI", { separator: "_" })` → `"tanfust_ui"`
- `maxLength` truncation: `slugify("hello wonderful world", { maxLength: 8 })` → `"hello-wo"`
- `maxLength` that lands on a separator, so the trailing-separator trim is
  exercised — pick an input where `slice(0, maxLength)` ends in `-` and assert
  the result has no trailing separator (run it once to get the value rather
  than predicting it)
- empty and punctuation-only input both → `""`
- `uniqueSlug("post", [])` → `"post"`; `uniqueSlug("post", ["post", "post-2"])` → `"post-3"`

**Verify**: `pnpm test` → this file's tests all pass.

### Step 4: `tests/registry/lib/format-currency.test.ts`

Cover, all with `locale: "en-US"` for exact-equality assertions:
- minor units by default: `formatCurrency(1999, { locale: "en-US" })` → `"$19.99"`
- `minorUnits: false`: `formatCurrency(19.99, { minorUnits: false, locale: "en-US" })` → `"$19.99"`
- `trimZeros` on a whole value → `"$20"`; on a non-whole value → `"$19.99"`
  (this is the branch `trimZeros && wholeNumber`)
- `formatCompact(1200, { locale: "en-US" })` → `"1.2K"`;
  `formatCompact(3_400_000, { locale: "en-US" })` → `"3.4M"`
- a non-USD currency, asserted **without** pinning whitespace — see the locale
  trap in "Current state". Use
  `expect(formatCurrency(1999, { currency: "EUR", locale: "fr-FR" }).replace(/\s/gu, " ")).toBe("19,99 €")`
  and add a comment saying why the normalisation is there.

**Verify**: `pnpm test` → this file's tests all pass.

### Step 5: `tests/registry/lib/format-date.test.ts`

Always pass an explicit `locale` **and** `timeZone: "UTC"` so results do not
depend on the machine's zone.

Cover:
- each of the five presets (`short`, `medium`, `long`, `datetime`, `time`) for
  a fixed date such as `new Date("2026-09-12T14:05:00Z")` with
  `locale: "en-US", timeZone: "UTC"`. Run each once to obtain the expected
  string rather than predicting ICU output.
- string and numeric input accepted: `formatDate("2026-09-12", …)` and
  `formatDate(1757683500000, …)` produce a non-empty string
- invalid input throws: `expect(() => formatDate("not a date")).toThrow(RangeError)`
- `formatRelative` unit selection, using the `now` option so the test is
  deterministic — e.g. `now` 3 minutes after the input, and a case more than a
  year apart. Assert with `toContain` on the numeral rather than pinning the
  full phrase, since `numeric: "auto"` produces words like "yesterday".

**Verify**: `pnpm test` → this file's tests all pass.

### Step 6: `tests/registry/lib/absolute-url.test.ts`

Only test the **explicit `base`** form. The `detectOrigin()` fallback reads
`process.env` and `import.meta.env`, which behave differently under vitest than
in a real app build; testing it would pin an artefact of the test environment.

Cover:
- `absoluteUrl("/og.png", "https://a.b")` → `"https://a.b/og.png"`
- trailing slash on base is stripped: `absoluteUrl("/og.png", "https://a.b/")` → `"https://a.b/og.png"`
- path without a leading slash: `absoluteUrl("og.png", "https://a.b")` → `"https://a.b/og.png"`
- default path: `absoluteUrl(undefined, "https://a.b")` → `"https://a.b/"`
- a base carrying a path is treated as an origin:
  `absoluteUrl("/x", "https://a.b/sub")` → `"https://a.b/x"`, with a comment
  noting this pins documented behaviour (the parameter is an origin), not a bug

**Verify**: `pnpm test` → all four files pass.

### Step 7: Wire into CI

In `.github/workflows/registry.yml`, in the `build` job, add a test step
immediately after `- run: pnpm typecheck` and before `- run: pnpm build`:

```yaml
      - run: pnpm test
```

Keep the existing two-space list indentation of the surrounding steps.

**Verify**: `grep -n "pnpm test" .github/workflows/registry.yml` → one match,
positioned between the `typecheck` and `build` lines (confirm with
`grep -n "pnpm typecheck\|pnpm test\|pnpm build" .github/workflows/registry.yml`).

### Step 8: Document it and run everything

Add `pnpm test` to the command list in `CONTRIBUTING.md` step 4, which
currently reads:

> 4. Run `pnpm registry:build`, then `pnpm lint && pnpm typecheck && pnpm build`.

Make it `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

Then:

```bash
pnpm format
pnpm registry:build
pnpm lint
pnpm typecheck
pnpm test
```

If `pnpm lint` reports errors in `tests/**`, fix the test code rather than
adding an ESLint override. Only if a rule is genuinely inapplicable to test
files (for example a naming-convention rule firing on a test title) add a
narrow `files: ["tests/**/*.ts"]` block to `eslint.config.js`, and say so in
your report.

**Verify**: all five commands exit 0.

## Test plan

This plan *is* the test plan. The structural pattern to follow, since no
existing test file exists: one `describe` per exported function, one `it` per
case listed in Steps 3–6, explicit `import { describe, expect, it } from "vitest"`
at the top of each file. Aim for the ~30 cases enumerated above.

Expected: `pnpm test` reports 4 test files and roughly 30 passing tests, 0
failures.

## Done criteria

ALL must hold:

- [ ] `pnpm test` exits 0 with 4 test files and ≥ 25 passing tests
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm registry:check` exits 0
- [ ] `git status --porcelain src/registry` prints **nothing** — no shipped
      item was modified
- [ ] `grep -n "pnpm test" .github/workflows/registry.yml` returns a match
- [ ] A test exists asserting `slugify` strips **decomposed** combining marks
      written as `̀`-style escapes
- [ ] No test asserts an exact non-`en-US` locale string containing a literal
      space around a currency symbol
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows a `src/registry/tanfust/lib/` file changed and the
  excerpts above no longer match.
- A test you write reveals behaviour you believe is a **bug**. Pin the current
  behaviour, add a `// TODO(plan-003):` comment, finish the plan, and report
  the concern. Do not change the item.
- `pnpm test` fails on CI (Node 22) with a locale/ICU difference after passing
  locally — report the exact diff rather than loosening the assertion until it
  passes.
- Adding `vitest` changes `pnpm-lock.yaml` in a way that breaks
  `pnpm install --frozen-lockfile`, or causes any other CI step to fail.
- You conclude a shipped item under `src/registry/` must be edited.

## Maintenance notes

- **Deliberately deferred: the five hooks** in `src/registry/tanfust/hooks/`.
  They need `@testing-library/react`, `jsdom` and a second vitest project
  entry, which roughly doubles this plan's surface. Worth a follow-up —
  `use-stepper.ts` in particular is a state machine with skip/complete/reset
  transitions that is well suited to unit tests, and its `optional = []`
  default parameter re-creates an array on every render, which breaks the
  memoisation of `skip` and `canSkip`. A test would document the intended
  contract before that is changed.
- The rule these tests encode: an item under `src/registry/` is a published
  artifact. Changing its observable behaviour is a breaking change for every
  consumer that already copied it, and needs a `meta.version` bump in the
  category's `registry.json`.
- A reviewer should scrutinise: that no assertion pins ICU-version-dependent
  whitespace, and that `git status src/registry` really is clean.
