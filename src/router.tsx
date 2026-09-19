import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: "intent",
    // Deliberately no override for the preload stale-time default: setting
    // it to 0 exists for handing freshness to an external cache (TanStack
    // Query), which this site does not use. At 0 every hover-preload is
    // discarded and refetched on click.
  })

  return router
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
