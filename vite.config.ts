import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { nitro } from "nitro/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// Build target: Nitro's default `node-server` preset — see docs/deployment.md.
// Production is served by Cloudflare Workers with static assets, configured
// outside this repository; docs/deployment.md records the gap and the
// invariants that depend on it. Static assets in `public/` (the registry JSON
// under /r, llms.txt, _headers) are emitted by every target.
const config = defineConfig({
  resolve: { tsconfigPaths: true },
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
})

export default config
