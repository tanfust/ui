//  @ts-check

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
    ignores: ["eslint.config.js", ".prettierrc", "src/__registry__/**", "src/routeTree.gen.ts", ".output/**", ".smoke/**", "public/**", "scripts/**"],
  },
]
