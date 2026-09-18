//  @ts-check

import { plugin as shadcn } from "@shadcn/lint"
import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  ...tanstackConfig,
  {
    rules: {
      "import/no-cycle": "off",
      "import/order": "off",
      "sort-imports": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
      "pnpm/json-enforce-catalog": "off",
    },
  },
  {
    // Registry items are copied into consumer projects with unknown tsconfig
    // strictness (e.g. noUncheckedIndexedAccess), so defensive checks and
    // explicit assertions that look redundant here are intentional.
    files: ["src/registry/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/naming-convention": "off",
    },
  },
  {
    // @shadcn/lint — design-system enforcement. Components and the theme are
    // discovered from components.json, so no `settings.shadcn` is needed.
    // Applied everywhere, including src/registry/**: those are the files that
    // ship, so they are the last place to stop checking.
    name: "shadcn/lint",
    files: ["**/*.{ts,tsx}"],
    plugins: { shadcn },
    rules: {
      "shadcn/no-restyle": ["error", { allow: ["layout"] }],
      "shadcn/no-raw-colors": "error",
      "shadcn/no-arbitrary-values": ["error", { allow: ["layout"] }],
      "shadcn/no-inline-styles": "error",
      "shadcn/require-static-classes": "error",
      "shadcn/no-unknown-classes": "error",
    },
  },
  {
    // Vendored base-lyra source, rewritten wholesale by `shadcn add`. These
    // rules describe how shadcn authors its own files, not defects here, and a
    // fix would be undone on the next component update. Everything else — the
    // rules that find real problems — still applies, per the same split
    // tanfust uses in its `shadcn/lint-primitives` block.
    name: "shadcn-primitives",
    files: ["src/components/ui/**"],
    rules: {
      "import/consistent-type-specifier-style": "off",
      "no-shadow": "off",
      // base-lyra's `secondary` hover is a color-mix() of two theme tokens,
      // which has no scale form. It is off-token by the rule's definition and
      // correct by the design's.
      "shadcn/no-arbitrary-values": "off",
    },
  },
  {
    ignores: [
      "eslint.config.js",
      ".prettierrc",
      "src/__registry__/**",
      "src/routeTree.gen.ts",
      ".output/**",
      ".smoke/**",
      "public/**",
      "scripts/**",
    ],
  },
]
