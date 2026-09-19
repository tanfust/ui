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
