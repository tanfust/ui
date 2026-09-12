const baseUrl = (import.meta.env.VITE_BASE_URL as string | undefined) ?? "https://ui.tanfust.com"

export const siteConfig = {
  name: "Tanfust UI",
  description:
    "Essential components, hooks and flows for everyday sites and apps. Installed as source with the shadcn CLI.",
  url: baseUrl,
  namespace: "@tanfust",
  registryUrl: `${baseUrl}/r/{name}.json`,
  links: {
    tanfust: "https://tanfust.com",
    store: "https://tanfust.com/store/components",
    github: "https://github.com/tanfust/ui",
  },
} as const

export type SiteConfig = typeof siteConfig
