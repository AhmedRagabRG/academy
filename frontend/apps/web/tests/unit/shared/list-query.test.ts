import { describe, expect, it } from "vitest"
import {
  clampPage,
  clampPaging,
  isInvertedRange,
  isWithinRange,
  normalizeArabic,
  normalizeDigits,
  normalizeIds,
  normalizeRange,
  normalizeSearchTerm,
  serializeQuery,
} from "@/shared/utils/list-query"

/**
 * These helpers are shared by Student Finance and Accounting. The day-boundary
 * rule below is a fixed defect, not a preference: comparing a record created at
 * 09:00 against a date-only `to` of that same day used to exclude it, silently
 * dropping every row from the last day of a range. It lives here precisely so a
 * second module cannot reintroduce it with its own copy.
 */
describe("date-only bounds cover the whole day", () => {
  it("includes a record recorded during the day named by the upper bound", () => {
    expect(
      isWithinRange("2026-01-15T09:00:00.000Z", { to: "2026-01-15" })
    ).toBe(true)
  })

  it("includes the very last millisecond of that day", () => {
    expect(
      isWithinRange("2026-01-15T23:59:59.999Z", { to: "2026-01-15" })
    ).toBe(true)
  })

  it("excludes the first millisecond of the following day", () => {
    expect(
      isWithinRange("2026-01-16T00:00:00.000Z", { to: "2026-01-15" })
    ).toBe(false)
  })

  it("includes midnight of the day named by the lower bound", () => {
    expect(
      isWithinRange("2026-01-15T00:00:00.000Z", { from: "2026-01-15" })
    ).toBe(true)
  })

  it("excludes the last millisecond before it", () => {
    expect(
      isWithinRange("2026-01-14T23:59:59.999Z", { from: "2026-01-15" })
    ).toBe(false)
  })

  it("matches any time of day for a single-day range", () => {
    for (const time of ["00:00:00.000Z", "09:00:00.000Z", "23:59:59.999Z"])
      expect(
        isWithinRange(`2026-01-15T${time}`, {
          from: "2026-01-15",
          to: "2026-01-15",
        }),
        time
      ).toBe(true)
  })

  it("treats an explicit timestamp bound as that exact instant, not the whole day", () => {
    expect(
      isWithinRange("2026-01-15T09:00:00.000Z", {
        to: "2026-01-15T08:00:00.000Z",
      })
    ).toBe(false)
  })
})

describe("open and absent bounds", () => {
  it("treats a missing range as no constraint", () => {
    expect(isWithinRange("2026-03-01T00:00:00.000Z")).toBe(true)
  })

  it("treats a missing upper bound as open-ended", () => {
    expect(
      isWithinRange("2030-01-01T00:00:00.000Z", { from: "2026-01-01T00:00:00.000Z" })
    ).toBe(true)
  })

  it("refuses an unparseable value rather than admitting it", () => {
    expect(isWithinRange("not-a-date", { from: "2026-01-01" })).toBe(false)
  })
})

describe("inverted ranges are detectable, not silently empty", () => {
  it("reports a from later than its to", () => {
    expect(isInvertedRange({ from: "2026-06-01", to: "2026-01-01" })).toBe(true)
  })

  it("reports nothing when either bound is absent", () => {
    expect(isInvertedRange({ from: "2026-06-01" })).toBe(false)
    expect(isInvertedRange({ to: "2026-06-01" })).toBe(false)
    expect(isInvertedRange(undefined)).toBe(false)
  })

  it("accepts a range whose bounds are equal", () => {
    expect(isInvertedRange({ from: "2026-06-01", to: "2026-06-01" })).toBe(false)
  })

  it("accepts a richer range object carrying the field it applies to", () => {
    // Student Finance's ranges name their field; the helper must not reject them.
    expect(
      isInvertedRange({ field: "issueDate", from: "2026-06-01", to: "2026-01-01" })
    ).toBe(true)
  })
})

describe("normalizeRange drops a range that constrains nothing", () => {
  it("returns undefined for an empty range, so it never becomes a cache-key difference", () => {
    expect(normalizeRange({})).toBeUndefined()
    expect(normalizeRange(undefined)).toBeUndefined()
  })

  it("keeps a range with either bound", () => {
    expect(normalizeRange({ from: "2026-01-01" })).toEqual({ from: "2026-01-01" })
  })
})

describe("search normalization", () => {
  it("folds Arabic-Indic digits to Latin", () => {
    expect(normalizeDigits("٢٠٢٦")).toBe("2026")
    expect(normalizeDigits("۲۰۲۶")).toBe("2026")
  })

  it("folds alef, yaa, and taa-marbuta variants", () => {
    expect(normalizeArabic("أحمد")).toBe("احمد")
    expect(normalizeArabic("مصطفى")).toBe("مصطفي")
    expect(normalizeArabic("منحة")).toBe("منحه")
  })

  it("collapses whitespace and lowercases", () => {
    expect(normalizeSearchTerm("  EXP-2026   00001 ")).toBe("exp-2026 00001")
  })
})

describe("paging clamps rather than discarding filters", () => {
  it("clamps above the last page", () => {
    expect(clampPage(500, 20, 40)).toBe(2)
  })

  it("clamps below the first page", () => {
    expect(clampPage(0, 20, 40)).toBe(1)
    expect(clampPage(-3, 20, 40)).toBe(1)
  })

  it("returns page one for an empty result", () => {
    expect(clampPage(3, 20, 0)).toBe(1)
  })

  it("caps the page size at the maximum", () => {
    expect(clampPaging(1, 5000, 20).pageSize).toBe(100)
  })

  it("falls back to the default size for a nonsense value", () => {
    expect(clampPaging(1, 0, 20).pageSize).toBe(20)
  })
})

describe("query serialization is order-independent", () => {
  it("produces the same key whatever order the properties arrive in", () => {
    expect(serializeQuery({ a: 1, b: 2 })).toBe(serializeQuery({ b: 2, a: 1 }))
  })
})

describe("id filters are de-duplicated and sorted", () => {
  it("normalizes so order never causes a cache miss", () => {
    expect(normalizeIds(["b", "a", "b"])).toEqual(["a", "b"])
  })

  it("returns undefined for an empty or blank list", () => {
    expect(normalizeIds([])).toBeUndefined()
    expect(normalizeIds(undefined)).toBeUndefined()
  })
})
