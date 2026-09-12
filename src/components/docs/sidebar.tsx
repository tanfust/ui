import { Link, useRouterState } from "@tanstack/react-router"

import { CATEGORIES, getItemsByCategory } from "@/lib/registry"
import { cn } from "@/lib/utils"

const pad = (n: number) => String(n).padStart(2, "0")

/** Category → items navigation, generated from the built catalog. */
export function DocsSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const groups = getItemsByCategory()

  return (
    <nav aria-label="Docs" className="font-mono text-xs">
      <ul className="flex flex-col gap-6">
        <li>
          <Link
            className={cn(
              "uppercase tracking-wider underline-offset-4 hover:underline",
              pathname === "/docs" && "font-bold underline"
            )}
            to="/docs"
          >
            [00] Installation
          </Link>
        </li>
        {CATEGORIES.map((category, i) => {
          const items = groups.get(category.slug) ?? []
          return (
            <li className="flex flex-col gap-2" key={category.slug}>
              <span className="uppercase tracking-wider">
                [{pad(i + 1)}] {category.title}
              </span>
              {items.length === 0 ? (
                <span className="pl-4 text-[10px] uppercase tracking-wider opacity-60">coming soon</span>
              ) : (
                <ul className="flex flex-col gap-1 border-l border-border pl-4">
                  {items.map((item) => {
                    const href = `/docs/${category.slug}/${item.name}`
                    const active = pathname === href
                    return (
                      <li key={item.name}>
                        <a
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "underline-offset-4 hover:underline",
                            active ? "font-bold underline" : "text-muted-foreground hover:text-foreground"
                          )}
                          href={href}
                        >
                          {item.name}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
