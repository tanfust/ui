import { createMiddleware, createStart } from "@tanstack/react-start"

import { registry } from "@/lib/registry"

/**
 * Content negotiation at the domain root.
 *
 * The shadcn CLI identifies itself with `User-Agent: shadcn` and
 * `Accept: application/vnd.shadcn.v1+json`. Answering `/` with the catalog for
 * those requests lets people run `npx shadcn@latest add https://ui.tanfust.com`.
 * Browsers still get the SSR'd page.
 */
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

export const startInstance = createStart(() => ({
  requestMiddleware: [shadcnRootNegotiation],
}))
