import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const paging = { page: 1, pageSize: 1000 }
const context = () => accountingService.getAccountingExportContext(paging)

/** Names and text that must never cross into a reporting or audit hand-off. */
const PERSONAL_FIELDS = [
  "requesterName",
  "requestedBy",
  "description",
  "attachments",
  "comments",
  "history",
  "reviewer",
  "cancelReason",
  "branchLabel",
  "categoryLabel",
]

describe("the export context is minimal", () => {
  it("exposes exactly the documented fields and no more", () => {
    // Comparing the whole key set, so **adding** a field fails here rather than
    // leaking unnoticed.
    return context().then((result) => {
      for (const request of result.requests)
        expect(Object.keys(request).sort()).toEqual(
          [
            "amount",
            "branchId",
            "categoryId",
            "decidedAt",
            "id",
            "paidAt",
            "requestDate",
            "requestNumber",
            "status",
            "subCategoryId",
          ].sort()
        )
    })
  })

  it("carries no personal or free-text field", async () => {
    const result = await context()
    for (const request of result.requests)
      for (const field of PERSONAL_FIELDS)
        expect(Object.keys(request), field).not.toContain(field)
  })

  it("does not leak a requester name anywhere in the serialized payload", async () => {
    // A leak through a nested object would escape a field-name check but not this.
    const serialized = JSON.stringify(await context())
    expect(serialized).not.toContain("مدير فرع")
    expect(serialized).not.toContain("مدير مالي")
  })

  it("does not leak a description", async () => {
    const serialized = JSON.stringify(await context())
    expect(serialized).not.toContain("حملة إعلانية")
    expect(serialized).not.toContain("قرطاسية الربع الثالث")
  })

  it("identifies the branch and category by id, not by label", async () => {
    const result = await context()
    for (const request of result.requests) {
      expect(request.branchId).toMatch(/^branch-/)
      expect(request.categoryId).toMatch(/^category-/)
    }
  })
})

describe("it carries settled facts", () => {
  it("states its currency, precision, and as-of time", async () => {
    const result = await context()
    expect(result.currency).toBe("EGP")
    expect(result.precision).toBe(2)
    expect(Number.isNaN(new Date(result.asOf).getTime())).toBe(false)
  })

  it("carries money as decimal strings, never numbers", async () => {
    const result = await context()
    for (const request of result.requests)
      expect(typeof request.amount.amount).toBe("string")
  })

  it("carries the decision and payment times where they exist", async () => {
    const result = await context()
    const paid = result.requests.find((request) => request.status === "paid")
    expect(paid?.paidAt).toBeTruthy()
    const approved = result.requests.find((request) => request.status === "approved")
    expect(approved?.decidedAt).toBeTruthy()
  })

  it("leaves them absent where they do not", async () => {
    const result = await context()
    const draft = result.requests.find((request) => request.status === "draft")
    expect(draft?.paidAt).toBeUndefined()
    expect(draft?.decidedAt).toBeUndefined()
  })
})

describe("it obeys the same access rules as everything else", () => {
  it("requires the export permission", async () => {
    accountingScenarios.withoutPermissions([accountingPermissions.export])
    await expect(context()).rejects.toMatchObject({ code: "forbidden" })
  })

  it("respects branch scope", async () => {
    const wide = await context()
    accountingScenarios.scopeToBranches(["branch-cairo"])
    const scoped = await context()
    expect(scoped.requests.length).toBeLessThan(wide.requests.length)
  })

  it("returns nothing for a user with no branches", async () => {
    accountingScenarios.scopeToBranches([])
    expect((await context()).requests).toEqual([])
  })
})
