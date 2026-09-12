/**
 * Turn a path into an absolute URL for the current deployment. Reads the
 * origin from the first defined of: an explicit `base`, `NEXT_PUBLIC_APP_URL`,
 * `VITE_APP_URL`, `APP_URL`, Vercel's `VERCEL_URL`, then falls back to
 * `http://localhost:3000`. Use it for Open Graph images, emails, webhooks.
 *
 * @example
 * absoluteUrl("/og.png")            // "https://app.example.com/og.png"
 * absoluteUrl("/x", "https://a.b") // "https://a.b/x"
 */
export function absoluteUrl(path = "/", base?: string) {
  const origin = (base ?? detectOrigin()).replace(/\/$/, "")
  return new URL(path, origin + "/").toString()
}

function detectOrigin() {
  const env = readEnv()
  const explicit = env.NEXT_PUBLIC_APP_URL ?? env.VITE_APP_URL ?? env.APP_URL
  if (explicit) return explicit.startsWith("http") ? explicit : `https://${explicit}`
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`
  if (typeof window !== "undefined" && window.location) return window.location.origin
  return "http://localhost:3000"
}

function readEnv(): Record<string, string | undefined> {
  // Vite exposes import.meta.env; Node/Next expose process.env. Both are optional here.
  const fromImportMeta = (() => {
    try {
      return (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
    } catch {
      return {}
    }
  })()
  const fromProcess = typeof process !== "undefined" ? process.env : {}
  return { ...fromProcess, ...fromImportMeta }
}
