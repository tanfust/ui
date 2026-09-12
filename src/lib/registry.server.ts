import type { RegistryItem } from "shadcn/schema"

/**
 * Full item payloads (with file `content`) from the built registry. Only
 * imported from server functions, so the JSON never ships to the client.
 */
const payloads = import.meta.glob<{ default: RegistryItem }>("../../public/r/*.json", { eager: true })

export function getItemPayload(name: string): RegistryItem | undefined {
  const entry = payloads[`../../public/r/${name}.json`] as { default: RegistryItem } | undefined
  return entry?.default
}
