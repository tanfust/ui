import { Rule } from "@/components/site/rule"
import { siteConfig } from "@/config/site"

const footerNav = [
  { label: "Store", href: `${siteConfig.links.tanfust}/store` },
  { label: "Studio", href: `${siteConfig.links.tanfust}/studio` },
  { label: "Apps", href: `${siteConfig.links.tanfust}/apps` },
  { label: "Blog", href: `${siteConfig.links.tanfust}/blog` },
  { label: "Privacy", href: `${siteConfig.links.tanfust}/privacy` },
  { label: "Terms", href: `${siteConfig.links.tanfust}/terms` },
] as const

const socialNav = [
  { label: "X", href: "https://x.com/tanfust" },
  { label: "Discord", href: "https://discord.gg/TxdwezHkNJ" },
  { label: "GitHub", href: "https://github.com/tanfust" },
] as const

const linkClass =
  "underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"

/** Footer — mirrors tanfust.com's colophon so the two sites read as one publication. */
export function Colophon() {
  return (
    <footer className="px-6 py-10 font-mono text-[10px] uppercase tracking-wider">
      <Rule variant="double" />

      <div className="mt-6 flex flex-col gap-2">
        <p>Tanfust UI · Issue 001 · MMXXVI</p>
        <p>Set in Geist. Published from Tunis.</p>
      </div>

      <nav aria-label="Site" className="mt-8">
        <ul className="flex flex-wrap items-center gap-2">
          {footerNav.map((item, index) => (
            <li className="flex items-center gap-2" key={item.href}>
              <a className={linkClass} href={item.href}>
                {item.label}
              </a>
              {index < footerNav.length - 1 ? <span aria-hidden>/</span> : null}
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Social">
          <ul className="flex items-center gap-2">
            {socialNav.map((item, index) => (
              <li className="flex items-center gap-2" key={item.label}>
                <a className={linkClass} href={item.href} rel="noreferrer" target="_blank">
                  {item.label}
                </a>
                {index < socialNav.length - 1 ? <span aria-hidden>/</span> : null}
              </li>
            ))}
          </ul>
        </nav>
        <p>© 2026 Tanfust.</p>
      </div>
    </footer>
  )
}
