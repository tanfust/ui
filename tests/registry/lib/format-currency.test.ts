import { describe, expect, it } from "vitest"

import {
  formatCompact,
  formatCurrency,
} from "@/registry/tanfust/lib/format-currency"

describe("formatCurrency", () => {
  it("treats the amount as minor units (cents) by default", () => {
    expect(formatCurrency(1999, { locale: "en-US" })).toBe("$19.99")
  })

  it("treats the amount as a major-unit value when minorUnits is false", () => {
    expect(formatCurrency(19.99, { minorUnits: false, locale: "en-US" })).toBe(
      "$19.99"
    )
  })

  it("trims fraction digits for a whole value when trimZeros is set", () => {
    expect(formatCurrency(2000, { trimZeros: true, locale: "en-US" })).toBe(
      "$20"
    )
  })

  it("keeps fraction digits for a non-whole value even when trimZeros is set", () => {
    expect(formatCurrency(1999, { trimZeros: true, locale: "en-US" })).toBe(
      "$19.99"
    )
  })

  it("formats a non-USD currency", () => {
    // ICU inserts U+00A0 (non-breaking space) before the "€" symbol here,
    // and which non-breaking space it uses has changed across ICU releases
    // (CI runs Node 22; this may run on a newer Node). Normalise all
    // whitespace before comparing so the assertion doesn't pin an
    // ICU-version-dependent character.
    const result = formatCurrency(1999, { currency: "EUR", locale: "fr-FR" })
    expect(result.replace(/\s/gu, " ")).toBe("19,99 €")
  })
})

describe("formatCompact", () => {
  it("compacts thousands", () => {
    expect(formatCompact(1200, { locale: "en-US" })).toBe("1.2K")
  })

  it("compacts millions", () => {
    expect(formatCompact(3_400_000, { locale: "en-US" })).toBe("3.4M")
  })
})
