import { Link } from "@tanstack/react-router"

import { CATEGORIES, getItemsByCategory } from "@/lib/registry"
import { stampClasses } from "@/components/site/stamp"

const pad = (n: number) => String(n).padStart(2, "0")

/** Category → items navigation, generated from the built catalog. */
export function DocsSidebar() {
  const groups = getItemsByCategory()

  return (
    <nav aria-label="Docs" className="font-mono text-xs">
      <ul className="flex flex-col gap-6">
        <li>
          <Link
            activeOptions={{ exact: true }}
            activeProps={{ className: "font-bold underline" }}
            className="tracking-wider uppercase underline-offset-4 hover:underline"
            to="/docs"
          >
            [00] Installation
          </Link>
        </li>
        {CATEGORIES.map((category, i) => {
          const items = groups.get(category.slug) ?? []
          return (
            <li className="flex flex-col gap-2" key={category.slug}>
              <span className="tracking-wider uppercase">
                [{pad(i + 1)}] {category.title}
              </span>
              {items.length === 0 ? (
                <span
                  className={stampClasses({ className: "pl-4", dim: true })}
                >
                  coming soon
                </span>
              ) : (
                <ul className="flex flex-col gap-1 border-l border-border pl-4">
                  {items.map((item) => {
                    return (
                      <li key={item.name}>
                        <Link
                          activeProps={{
                            "aria-current": "page",
                            className: "font-bold underline",
                          }}
                          className="underline-offset-4 hover:underline"
                          inactiveProps={{
                            className:
                              "text-muted-foreground hover:text-foreground",
                          }}
                          params={{ category: category.slug, item: item.name }}
                          to="/docs/$category/$item"
                        >
                          {item.name}
                        </Link>
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
