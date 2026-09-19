import { describe, expect, it } from "vitest"

import { formatDate, formatRelative } from "@/registry/tanfust/lib/format-date"

// Fixed instant used across the preset assertions below, always paired with
// timeZone: "UTC" so the formatted output does not depend on the machine's
// local time zone.
const FIXED = new Date("2026-09-12T14:05:00Z")

describe("formatDate", () => {
  it("formats the short preset", () => {
    expect(
      formatDate(FIXED, { preset: "short", locale: "en-US", timeZone: "UTC" })
    ).toBe("09/12/2026")
  })

  it("formats the medium preset", () => {
    expect(
      formatDate(FIXED, { preset: "medium", locale: "en-US", timeZone: "UTC" })
    ).toBe("Sep 12, 2026")
  })

  it("formats the long preset", () => {
    expect(
      formatDate(FIXED, { preset: "long", locale: "en-US", timeZone: "UTC" })
    ).toBe("September 12, 2026")
  })

  it("formats the datetime preset", () => {
    expect(
      formatDate(FIXED, {
        preset: "datetime",
        locale: "en-US",
        timeZone: "UTC",
      })
    ).toBe("Sep 12, 2026, 02:05 PM")
  })

  it("formats the time preset", () => {
    expect(
      formatDate(FIXED, { preset: "time", locale: "en-US", timeZone: "UTC" })
    ).toBe("02:05 PM")
  })

  it("accepts a date string, using the default (medium) preset", () => {
    const result = formatDate("2026-09-12", {
      locale: "en-US",
      timeZone: "UTC",
    })
    expect(result).toBe("Sep 12, 2026")
  })

  it("accepts a numeric timestamp, using the default (medium) preset", () => {
    // 1757683500000ms is 2025-09-12T13:25:00.000Z — a different instant from
    // FIXED above, not a typo; it exercises the numeric-input branch of
    // toDate() with its own real, verified output.
    const result = formatDate(1757683500000, {
      locale: "en-US",
      timeZone: "UTC",
    })
    expect(result).toBe("Sep 12, 2025")
  })

  it("throws a RangeError for invalid input", () => {
    expect(() => formatDate("not a date")).toThrow(RangeError)
  })
})

describe("formatRelative", () => {
  it("selects minutes for a small, recent-past difference", () => {
    // `now` is 3 minutes after the input, so the input is 3 minutes in the past.
    const now = new Date(FIXED.getTime() + 3 * 60 * 1000)
    expect(formatRelative(FIXED, { locale: "en-US", now })).toContain(
      "3 minutes"
    )
  })

  it("selects years for a difference more than a year apart", () => {
    // `now` is ~2.19 years after the input. Asserting toContain on "2 years"
    // (rather than the full phrase, or a bare "2") because numeric: "auto"
    // renders a 1-unit difference as a word ("last year"), not a number — a
    // 2-year gap keeps a numeral in the output, and pinning the unit along
    // with it rules out a false pass from an unrelated "2" elsewhere in the
    // string (e.g. a stray "2 days").
    const now = new Date(FIXED.getTime() + 800 * 24 * 60 * 60 * 1000)
    expect(formatRelative(FIXED, { locale: "en-US", now })).toContain("2 years")
  })
})
