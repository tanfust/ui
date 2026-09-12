import { Link, useRouterState } from "@tanstack/react-router"

import { ModeToggle } from "@/components/site/mode-toggle"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

const nav: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Registry", href: "/" },
  { label: "Docs", href: "/docs" },
]

const linkClass =
  "inline-flex h-7 items-center underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"

/** Site header — same footprint and type scale as tanfust.com's masthead. */
export function Masthead() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <header className="border-b border-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 font-mono text-[10px] uppercase tracking-wider">
        <Link
          className="text-sm font-bold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          to="/"
        >
          TANFUST <span className="font-normal opacity-60">/ UI</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Primary">
            <ul className="flex items-center gap-2">
              {nav.map((item, index) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                return (
                  <li className="flex items-center gap-2" key={item.href}>
                    <a
                      aria-current={active ? "page" : undefined}
                      className={cn(linkClass, active && "font-bold underline")}
                      href={item.href}
                    >
                      {item.label}
                    </a>
                    {index < nav.length - 1 ? <span aria-hidden>/</span> : null}
                  </li>
                )
              })}
              <li className="flex items-center gap-2">
                <span aria-hidden>/</span>
                <a className={linkClass} href={siteConfig.links.tanfust} rel="noreferrer">
                  tanfust.com ↗
                </a>
              </li>
            </ul>
          </nav>

          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
