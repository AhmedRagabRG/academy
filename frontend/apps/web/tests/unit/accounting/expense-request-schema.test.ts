import { describe, expect, it } from "vitest"
import { createExpenseRequestSchema } from "@/features/accounting/schemas/expense-request-schemas"

const categories = [
  { id: "category-marketing", status: "active" as const },
  { id: "category-legacy", status: "archived" as const },
]
const subCategories = [
  { id: "sub-facebook", categoryId: "category-marketing", status: "active" as const },
  { id: "sub-old", categoryId: "category-marketing", status: "archived" as const },
  { id: "sub-elsewhere", categoryId: "category-legacy", status: "active" as const },
]

const schema = createExpenseRequestSchema({ precision: 2, categories, subCategories })

const valid = {
  requestDate: "2026-08-01",
  branchId: "branch-cairo",
  categoryId: "category-marketing",
  subCategoryId: "sub-facebook",
  description: "حملة إعلانية",
  amount: "1500.00",
}

const parse = (patch: Partial<typeof valid>) => schema.safeParse({ ...valid, ...patch })
const messageFor = (result: ReturnType<typeof parse>, path: string) =>
  result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path.join(".") === path)?.message

describe("required fields", () => {
  it("accepts a complete request", () => {
    expect(parse({}).success).toBe(true)
  })

  it("accepts one without a sub-category, which is optional", () => {
    expect(parse({ subCategoryId: "" }).success).toBe(true)
  })

  it("requires a date, a branch, a category, and a description", () => {
    expect(messageFor(parse({ requestDate: "" }), "requestDate")).toBeTruthy()
    expect(messageFor(parse({ branchId: "" }), "branchId")).toBeTruthy()
    expect(messageFor(parse({ categoryId: "" }), "categoryId")).toBeTruthy()
    expect(messageFor(parse({ description: "" }), "description")).toBeTruthy()
  })

  it("refuses a whitespace-only description", () => {
    expect(parse({ description: "   " }).success).toBe(false)
  })
})

describe("the amount must be a positive decimal", () => {
  it("accepts ordinary figures", () => {
    for (const amount of ["1", "0.01", "1500.00", "999999.99"])
      expect(parse({ amount }).success, amount).toBe(true)
  })

  it("refuses zero and negative amounts", () => {
    expect(messageFor(parse({ amount: "0" }), "amount")).toContain("أكبر من صفر")
    expect(messageFor(parse({ amount: "0.00" }), "amount")).toContain("أكبر من صفر")
    expect(parse({ amount: "-50" }).success).toBe(false)
  })

  it("refuses a malformed amount without throwing", () => {
    // The refinement must be guarded, or a malformed value throws instead of
    // reporting a validation error.
    for (const amount of ["abc", "1.2.3", "", "1,500", "١٥٠٠"])
      expect(() => parse({ amount }), amount).not.toThrow()
    expect(parse({ amount: "abc" }).success).toBe(false)
  })

  it("refuses more decimal places than the currency allows", () => {
    expect(messageFor(parse({ amount: "10.005" }), "amount")).toContain("2")
    expect(parse({ amount: "10.05" }).success).toBe(true)
  })
})

describe("category and sub-category consistency", () => {
  it("refuses an archived category on a new request", () => {
    expect(messageFor(parse({ categoryId: "category-legacy", subCategoryId: "" }), "categoryId")).toContain(
      "مؤرشف"
    )
  })

  it("refuses a category that does not exist", () => {
    expect(parse({ categoryId: "category-nope", subCategoryId: "" }).success).toBe(false)
  })

  it("refuses a sub-category belonging to a different parent", () => {
    // The spec's edge case: a sub-category chosen, then the main category changed.
    expect(messageFor(parse({ subCategoryId: "sub-elsewhere" }), "subCategoryId")).toContain(
      "لا يتبع"
    )
  })

  it("refuses an archived sub-category", () => {
    expect(messageFor(parse({ subCategoryId: "sub-old" }), "subCategoryId")).toContain(
      "مؤرشف"
    )
  })

  it("refuses a sub-category that does not exist", () => {
    expect(parse({ subCategoryId: "sub-nope" }).success).toBe(false)
  })

  it("reports the parent mismatch rather than the archived state when both apply", () => {
    // Naming the wrong reason sends the user to fix the wrong thing.
    const result = parse({ categoryId: "category-marketing", subCategoryId: "sub-elsewhere" })
    expect(messageFor(result, "subCategoryId")).toContain("لا يتبع")
  })
})

describe("every failure names its field", () => {
  it("reports each invalid field separately rather than one generic failure", () => {
    const result = schema.safeParse({
      requestDate: "",
      branchId: "",
      categoryId: "",
      subCategoryId: "",
      description: "",
      amount: "",
    })
    expect(result.success).toBe(false)
    if (result.success) return
    const paths = new Set(result.error.issues.map((issue) => issue.path.join(".")))
    expect(paths).toContain("requestDate")
    expect(paths).toContain("branchId")
    expect(paths).toContain("categoryId")
    expect(paths).toContain("description")
    expect(paths).toContain("amount")
  })
})
