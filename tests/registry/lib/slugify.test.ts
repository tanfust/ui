import { describe, expect, it } from "vitest"

import { slugify, uniqueSlug } from "@/registry/tanfust/lib/slugify"

describe("slugify", () => {
  it("lowercases and collapses punctuation into single hyphens", () => {
    expect(slugify("Hello, World!")).toBe("hello-world")
  })

  it("strips accents from precomposed (NFC) input", () => {
    expect(slugify("Crème brûlée  2026")).toBe("creme-brulee-2026")
  })

  it("strips accents from explicitly decomposed (NFD) input — regression guard", () => {
    // Guards src/registry/tanfust/lib/slugify.ts:13, where the combining-mark
    // range is typed as raw U+0300-U+036F characters sitting on their own in
    // the source file, not as \u{300}-\u{36f} escapes. Any tool that
    // NFC-normalises that file would attach those marks to the adjacent `[`
    // and `-`, silently narrowing or breaking the range.
    //
    // The input below is written with literal \u03xx JS escape sequences
    // (not pre-composed or raw decomposed characters), so the bytes on disk
    // in *this* file are plain ASCII and immune to normalisation themselves —
    // the escapes only become combining-mark code points when the JS engine
    // parses the string literal at test-run time. The assertion right below
    // double-checks that the resulting string really is decomposed (NFD), so
    // if a future edit ever pastes in a pre-composed character instead, this
    // test fails loudly rather than quietly degenerating into a duplicate of
    // the NFC case above.
    const decomposed = "Cre\u0300me bru\u0302le\u0301e  2026"
    expect(decomposed).not.toBe(decomposed.normalize("NFC"))
    expect(slugify(decomposed)).toBe("creme-brulee-2026")
  })

  it("supports a custom separator", () => {
    expect(slugify("Tanfust UI", { separator: "_" })).toBe("tanfust_ui")
  })

  it("truncates to maxLength", () => {
    expect(slugify("hello wonderful world", { maxLength: 8 })).toBe("hello-wo")
  })

  it("trims a trailing separator left by maxLength truncation", () => {
    // "hello wonderful world" collapses to "hello-wonderful-world"; slicing
    // at 6 lands exactly on "hello-", so this exercises the trailing-
    // separator trim inside the maxLength branch (slugify.ts:18-19).
    expect(slugify("hello wonderful world", { maxLength: 6 })).toBe("hello")
  })

  it("returns an empty string for empty input", () => {
    expect(slugify("")).toBe("")
  })

  it("returns an empty string for punctuation-only input", () => {
    expect(slugify("!!!")).toBe("")
  })
})

describe("uniqueSlug", () => {
  it("returns the slug unchanged when it is not taken", () => {
    expect(uniqueSlug("post", [])).toBe("post")
  })

  it("appends the next free numeric suffix when the slug and its first suffix are taken", () => {
    expect(uniqueSlug("post", ["post", "post-2"])).toBe("post-3")
  })
})
