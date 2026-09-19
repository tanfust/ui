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
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact(), nitro()],
})

export default config
