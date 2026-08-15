import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import type {
  ExpenseCategoryId,
  ExpenseRequestId,
} from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const DRAFT = "request-1" as ExpenseRequestId
const SUBMITTED = "request-2" as ExpenseRequestId
const UNDER_REVIEW = "request-3" as ExpenseRequestId
const RETURNED = "request-4" as ExpenseRequestId

const historyLength = async (id: ExpenseRequestId) =>
  (await accountingService.listHistory(id)).length

const latest = async (id: ExpenseRequestId) =>
  (await accountingService.listHistory(id)).at(-1)

const reload = (id: ExpenseRequestId) => accountingService.getRequest(id)

/**
 * FR-034. Two guarantees matter equally: a success writes exactly one entry, and
 * a refusal writes none. A history that records attempts is a record of what was
 * tried, not of what happened.
 */
describe("exactly one entry per successful command", () => {
  it("creating a request", async () => {
    const created = await accountingService.createRequest({
      input: {
        requestDate: "2026-08-01",
        branchId: "branch-cairo",
        categoryId: "category-office" as ExpenseCategoryId,
        description: "طلب جديد",
        amount: "100.00",
      },
    })
    const history = await accountingService.listHistory(created.id)
    expect(history).toHaveLength(1)
    expect(history[0]!.action).toBe("created")
  })

  it("submitting", async () => {
    const before = await historyLength(DRAFT)
    const current = await reload(DRAFT)
    await accountingService.submitRequest({
      requestId: DRAFT,
      expectedVersion: current.version,
    })
    expect(await historyLength(DRAFT)).toBe(before + 1)
    expect((await latest(DRAFT))?.action).toBe("submitted")
  })

  it("starting a review", async () => {
    const before = await historyLength(SUBMITTED)
    const current = await reload(SUBMITTED)
    await accountingService.startReview({
      requestId: SUBMITTED,
      expectedVersion: current.version,
    })
    expect(await historyLength(SUBMITTED)).toBe(before + 1)
    expect((await latest(SUBMITTED))?.action).toBe("review-started")
  })

  it("approving", async () => {
    const before = await historyLength(UNDER_REVIEW)
    const current = await reload(UNDER_REVIEW)
    await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "approved",
      expectedVersion: current.version,
    })
    expect(await historyLength(UNDER_REVIEW)).toBe(before + 1)
    expect((await latest(UNDER_REVIEW))?.action).toBe("approved")
  })

  it("rejecting", async () => {
    const before = await historyLength(UNDER_REVIEW)
    const current = await reload(UNDER_REVIEW)
    await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "rejected",
      note: "خارج الميزانية",
      expectedVersion: current.version,
    })
    expect(await historyLength(UNDER_REVIEW)).toBe(before + 1)
    expect((await latest(UNDER_REVIEW))?.action).toBe("rejected")
  })

  it("returning for revision", async () => {
    const before = await historyLength(UNDER_REVIEW)
    const current = await reload(UNDER_REVIEW)
    await accountingService.decideRequest({
      requestId: UNDER_REVIEW,
      decision: "returned",
      note: "تصحيح مطلوب",
      expectedVersion: current.version,
    })
    expect(await historyLength(UNDER_REVIEW)).toBe(before + 1)
    expect((await latest(UNDER_REVIEW))?.action).toBe("returned")
  })

  it("resubmitting", async () => {
    const before = await historyLength(RETURNED)
    const current = await reload(RETURNED)
    await accountingService.submitRequest({
      requestId: RETURNED,
      expectedVersion: current.version,
    })
    expect(await historyLength(RETURNED)).toBe(before + 1)
    expect((await latest(RETURNED))?.action).toBe("resubmitted")
  })

  it("cancelling", async () => {
    const before = await historyLength(DRAFT)
    const current = await reload(DRAFT)
    await accountingService.cancelRequest({
      requestId: DRAFT,
      reason: "لم تعد هناك حاجة",
      expectedVersion: current.version,
    })
    expect(await historyLength(DRAFT)).toBe(before + 1)
    expect((await latest(DRAFT))?.action).toBe("cancelled")
  })
})

describe("commands that are not transitions write nothing", () => {
  it("editing a draft writes no entry", async () => {
    const before = await historyLength(DRAFT)
    const current = await reload(DRAFT)
    await accountingService.updateRequest({
      requestId: DRAFT,
      input: {
        requestDate: current.requestDate,
        branchId: current.branchId,
        categoryId: current.categoryId as ExpenseCategoryId,
        description: "وصف محدّث",
        amount: "555.00",
      },
      expectedVersion: current.version,
    })
    // An edit is not a transition; recording one would make the history a diary.
    expect(await historyLength(DRAFT)).toBe(before)
  })

  it("uploading an attachment writes no entry", async () => {
    const before = await historyLength(DRAFT)
    const current = await reload(DRAFT)
    await accountingService.uploadAttachment({
      requestId: DRAFT,
      kind: "invoice",
      fileName: "invoice.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1000,
      uploadAttempt: "one",
      expectedVersion: current.version,
    })
    expect(await historyLength(DRAFT)).toBe(before)
  })

  it("adding a comment writes no entry", async () => {
    const before = await historyLength(DRAFT)
    await accountingService.addComment({ requestId: DRAFT, body: "ملاحظة" })
    // Comments are discussion; the history records transitions.
    expect(await historyLength(DRAFT)).toBe(before)
  })

  it("reading writes no entry, however many times", async () => {
    const before = await historyLength(DRAFT)
    for (let index = 0; index < 5; index += 1) await reload(DRAFT)
    expect(await historyLength(DRAFT)).toBe(before)
  })
})

describe("the whole journey accumulates one entry per hop", () => {
  it("records seven entries across a return-and-resubmit lifecycle", async () => {
    let current = await reload(DRAFT)
    current = await accountingService.submitRequest({
      requestId: DRAFT,
      expectedVersion: current.version,
    })
    current = await accountingService.startReview({
      requestId: DRAFT,
      expectedVersion: current.version,
    })
    current = await accountingService.decideRequest({
      requestId: DRAFT,
      decision: "returned",
      note: "تصحيح",
      expectedVersion: current.version,
    })
    current = await accountingService.submitRequest({
      requestId: DRAFT,
      expectedVersion: current.version,
    })
    current = await accountingService.startReview({
      requestId: DRAFT,
      expectedVersion: current.version,
    })
    await accountingService.decideRequest({
      requestId: DRAFT,
      decision: "approved",
      expectedVersion: current.version,
    })

    const history = await accountingService.listHistory(DRAFT)
    expect(history.map((entry) => entry.action)).toEqual([
      "created",
      "submitted",
      "review-started",
      "returned",
      "resubmitted",
      "review-started",
      "approved",
    ])
  })
})
