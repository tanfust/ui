import { describe, expect, it } from "vitest"

import { absoluteUrl } from "@/registry/tanfust/lib/absolute-url"

// Only the explicit `base` form is tested. The `detectOrigin()` fallback
// reads process.env and import.meta.env, which behave differently under
// vitest than in a real app build; testing it would pin an artefact of the
// test environment rather than the function's own behaviour.
describe("absoluteUrl", () => {
  it("joins a leading-slash path onto the base", () => {
    expect(absoluteUrl("/og.png", "https://a.b")).toBe("https://a.b/og.png")
  })

  it("strips a trailing slash from the base before joining", () => {
    expect(absoluteUrl("/og.png", "https://a.b/")).toBe("https://a.b/og.png")
  })

  it("joins a path without a leading slash", () => {
    expect(absoluteUrl("og.png", "https://a.b")).toBe("https://a.b/og.png")
  })

  it("defaults the path to '/'", () => {
    expect(absoluteUrl(undefined, "https://a.b")).toBe("https://a.b/")
  })

  it("treats a base carrying a path as an origin, dropping the path", () => {
    // Pins documented, intended behaviour — the `base` parameter is an
    // origin, not a full URL, so any path component on it is discarded
    // rather than preserved. Not a bug.
    expect(absoluteUrl("/x", "https://a.b/sub")).toBe("https://a.b/x")
  })
})
