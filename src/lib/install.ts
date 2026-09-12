import { siteConfig } from "@/config/site"

export const PACKAGE_MANAGERS = ["pnpm", "npm", "yarn", "bun"] as const
export type PackageManager = (typeof PACKAGE_MANAGERS)[number]

const runners: Record<PackageManager, string> = {
  pnpm: "pnpm dlx shadcn@latest",
  npm: "npx shadcn@latest",
  yarn: "yarn shadcn@latest",
  bun: "bunx --bun shadcn@latest",
}

export function shadcnCommand(pm: PackageManager, args: string) {
  return `${runners[pm]} ${args}`
}

export function addCommand(pm: PackageManager, itemName: string) {
  return shadcnCommand(pm, `add ${siteConfig.namespace}/${itemName}`)
}

export function registryAddCommand(pm: PackageManager) {
  return shadcnCommand(pm, `registry add ${siteConfig.namespace}=${siteConfig.registryUrl}`)
}

export function initCommand(pm: PackageManager) {
  return shadcnCommand(pm, `init ${siteConfig.url}/r/tanfust.json`)
}

export function itemUrl(itemName: string) {
  return `${siteConfig.url}/r/${itemName}.json`
}
