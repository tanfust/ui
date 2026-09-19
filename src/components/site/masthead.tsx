import { Link } from "@tanstack/react-router"

import { ModeToggle } from "@/components/site/mode-toggle"
import { siteConfig } from "@/config/site"
import { stampClasses } from "@/components/site/stamp"

const nav = [
  { label: "Registry", to: "/", exact: true },
  { label: "Docs", to: "/docs", exact: false },
] as const

const linkClass =
  "inline-flex h-7 items-center underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"

/** Site header — same footprint and type scale as tanfust.com's masthead. */
export function Masthead() {
  return (
    <header className="border-b border-foreground">
      <div
        className={stampClasses({
          className:
            "flex flex-wrap items-center justify-between gap-3 px-6 py-3",
        })}
      >
        <Link
          className="text-sm font-bold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          to="/"
        >
          TANFUST <span className="font-normal opacity-70">/ UI</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Primary">
            <ul className="flex items-center gap-2">
              {nav.map((item, index) => {
                return (
                  <li className="flex items-center gap-2" key={item.to}>
                    <Link
                      activeOptions={{ exact: item.exact }}
                      activeProps={{
                        "aria-current": "page",
                        className: "font-bold underline",
                      }}
                      className={linkClass}
                      to={item.to}
                    >
                      {item.label}
                    </Link>
                    {index < nav.length - 1 ? <span aria-hidden>/</span> : null}
                  </li>
                )
              })}
              <li className="flex items-center gap-2">
                <span aria-hidden>/</span>
                <a
                  className={linkClass}
                  href={siteConfig.links.tanfust}
                  rel="noreferrer"
                >
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
