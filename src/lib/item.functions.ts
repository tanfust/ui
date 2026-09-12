import { createServerFn } from "@tanstack/react-start"
import type { RegistryItem } from "shadcn/schema"

/** Fetch one item's full payload (file contents included) on the server. */
export const getItem = createServerFn({ method: "GET" })
  .inputValidator((name: string) => {
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error("Invalid item name")
    return name
  })
  .handler(async ({ data: name }): Promise<RegistryItem | null> => {
    const { getItemPayload } = await import("@/lib/registry.server")
    return getItemPayload(name) ?? null
  })
