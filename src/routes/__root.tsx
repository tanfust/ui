import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import { Shell } from "@/components/site/shell"
import { ThemeProvider } from "@/components/theme-provider"
import { stampClasses } from "@/components/site/stamp"
import { siteConfig } from "@/config/site"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${siteConfig.name} — essentials for everyday sites and apps` },
      { name: "description", content: siteConfig.description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: siteConfig.name },
      { property: "og:title", content: siteConfig.name },
      { property: "og:description", content: siteConfig.description },
      { property: "og:url", content: siteConfig.url },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", href: "/icon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-icon.png" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootComponent() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  )
}

function NotFound() {
  return (
    <section className="px-6 py-20 font-mono">
      <p className={stampClasses()}>[404]</p>
      <h1 className="mt-4 text-3xl font-black tracking-display uppercase sm:text-5xl">
        Not found.
      </h1>
      <p className="mt-6 text-xs tracking-wider uppercase">
        <a className="underline underline-offset-4 hover:no-underline" href="/">
          [ Back to the registry → ]
        </a>
      </p>
    </section>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <head>
        {/* Hand-written rather than routed through `head()`: the head manager
            keys meta tags by `name`, so a light/dark `theme-color` pair
            collapses to one. Values are the paper and night-ink backgrounds —
            see docs/paper-theme.md §5 in the tanfust repo. */}
        <meta
          content="#f6f3ee"
          media="(prefers-color-scheme: light)"
          name="theme-color"
        />
        <meta
          content="#161310"
          media="(prefers-color-scheme: dark)"
          name="theme-color"
        />
        {/* Dark Reader re-derives its own palette from the page and mangles the
            warm neutrals; the site already ships a real dark theme. */}
        <meta content="true" name="darkreader-lock" />
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{ position: "bottom-right" }}
            plugins={[
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
