/**
 * URL-safe slugs. Strips accents (é → e), lowercases, collapses anything that
 * is not a letter or digit into single hyphens, and trims them.
 *
 * @example
 * slugify("Hello, World!")        // "hello-world"
 * slugify("Crème brûlée  2026")   // "creme-brulee-2026"
 * slugify("Tanfust UI", { separator: "_" }) // "tanfust_ui"
 */
export function slugify(input: string, { separator = "-", maxLength }: { separator?: string; maxLength?: number } = {}) {
  let slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${escape(separator)}+|${escape(separator)}+$`, "g"), "")

  if (maxLength && slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(new RegExp(`${escape(separator)}+$`), "")
  }
  return slug
}

/** Make `slug` unique against `taken` by appending -2, -3, … */
export function uniqueSlug(slug: string, taken: Iterable<string>, separator = "-") {
  const set = new Set(taken)
  if (!set.has(slug)) return slug
  let n = 2
  while (set.has(`${slug}${separator}${n}`)) n++
  return `${slug}${separator}${n}`
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
