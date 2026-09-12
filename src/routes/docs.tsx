import { Outlet, createFileRoute } from "@tanstack/react-router"

import { DocsSidebar } from "@/components/docs/sidebar"

export const Route = createFileRoute("/docs")({ component: DocsLayout })

function DocsLayout() {
  return (
    <div className="grid flex-1 md:grid-cols-[14rem_1fr]">
      <aside className="border-b border-foreground px-6 py-8 md:border-r md:border-b-0">
        <div className="md:sticky md:top-8">
          <DocsSidebar />
        </div>
      </aside>
      <div className="min-w-0 px-6 py-10">
        <Outlet />
      </div>
    </div>
  )
}
