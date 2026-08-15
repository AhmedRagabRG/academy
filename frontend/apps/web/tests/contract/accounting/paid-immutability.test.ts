import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { AccountingError } from "@/features/accounting/services/accounting-error"
import type {
  ExpenseCategoryId,
  ExpenseRequestId,
} from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())
afterEach(() => accountingScenarios.reset())

const PAID = "request-7" as ExpenseRequestId

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

/**
 * SC-007. Paid is terminal *by construction* — the transition table has no
 * outgoing row from it — so this needs no separate guard, and these cases confirm
 * every route in is closed.
 */
describe("a Paid request accepts no further change", () => {
  it("refuses an edit", async () => {
    const current = await accountingService.getRequest(PAID)
    const error = await captureError(() =>
      accountingService.updateRequest({
        requestId: PAID,
        input: {
          requestDate: current.requestDate,
          branchId: current.branchId,
          categoryId: current.categoryId as ExpenseCategoryId,
          description: "محاولة تعديل",
          amount: "1.00",
        },
        expectedVersion: current.version,
      })
    )
    expect(error.code).toBe("not-editable")
  })

  it("refuses a submission", async () => {
    const current = await accountingService.getRequest(PAID)
    expect(
      (
        await captureError(() =>
          accountingService.submitRequest({
            requestId: PAID,
            expectedVersion: current.version,
          })
        )
      ).code
    ).toBe("invalid-transition")
  })

  it("refuses a decision", async () => {
    const current = await accountingService.getRequest(PAID)
    expect(
      (
        await captureError(() =>
          accountingService.decideRequest({
            requestId: PAID,
            decision: "rejected",
            note: "محاولة",
            expectedVersion: current.version,
          })
        )
      ).code
    ).toBe("invalid-transition")
  })

  it("refuses a cancellation", async () => {
    const current = await accountingService.getRequest(PAID)
    expect(
      (
        await captureError(() =>
          accountingService.cancelRequest({
            requestId: PAID,
            reason: "محاولة إلغاء",
            expectedVersion: current.version,
          })
        )
      ).code
    ).toBe("invalid-transition")
  })

  it("refuses starting a review", async () => {
    const current = await accountingService.getRequest(PAID)
    expect(
      (
        await captureError(() =>
          accountingService.startReview({
            requestId: PAID,
            expectedVersion: current.version,
          })
        )
      ).code
    ).toBe("invalid-transition")
  })

  it("refuses adding an attachment", async () => {
    const current = await accountingService.getRequest(PAID)
    expect(
      (
        await captureError(() =>
          accountingService.uploadAttachment({
            requestId: PAID,
            kind: "invoice",
            fileName: "late.pdf",
            mimeType: "application/pdf",
            sizeBytes: 1000,
            uploadAttempt: "late",
            expectedVersion: current.version,
          })
        )
      ).code
    ).toBe("not-editable")
  })

  it("refuses removing an attachment", async () => {
    const current = await accountingService.getRequest(PAID)
    if (current.attachments.length === 0) return
    expect(
      (
        await captureError(() =>
          accountingService.removeAttachment({
            requestId: PAID,
            attachmentId: current.attachments[0]!.id,
            expectedVersion: current.version,
          })
        )
      ).code
    ).toBe("not-editable")
  })
})

describe("a Paid request is byte-identical after every refused attempt", () => {
  it("keeps its status, amount, version, and history", async () => {
    const before = await accountingService.getRequest(PAID)
    const version = before.version

    await accountingService
      .submitRequest({ requestId: PAID, expectedVersion: version })
      .catch(() => undefined)
    await accountingService
      .decideRequest({
        requestId: PAID,
        decision: "approved",
        expectedVersion: version,
      })
      .catch(() => undefined)
    await accountingService
      .cancelRequest({ requestId: PAID, reason: "سبب", expectedVersion: version })
      .catch(() => undefined)

    const after = await accountingService.getRequest(PAID)
    expect(after.status).toBe("paid")
    expect(after.amount.amount).toBe(before.amount.amount)
    expect(after.version).toBe(before.version)
    expect(after.history).toHaveLength(before.history.length)
  })

  it("offers no transitions and no acting permissions", async () => {
    const request = await accountingService.getRequest(PAID)
    expect(request.derived.availableTransitions).toEqual([])
    expect(request.derived.isEditable).toBe(false)
    expect(request.permissions.update).toBe(false)
    expect(request.permissions.decide).toBe(false)
    expect(request.permissions.markPaid).toBe(false)
    expect(request.permissions.cancel).toBe(false)
    expect(request.permissions.manageAttachments).toBe(false)
  })

  it("still allows reading it and its history", async () => {
    // Terminal means unchangeable, not invisible — auditing depends on reading it.
    const request = await accountingService.getRequest(PAID)
    expect(request.status).toBe("paid")
    expect((await accountingService.listHistory(PAID)).length).toBeGreaterThan(0)
  })

  it("still allows commenting, which is discussion rather than change", async () => {
    const comment = await accountingService.addComment({
      requestId: PAID,
      body: "مراجعة لاحقة",
    })
    expect(comment.body).toBe("مراجعة لاحقة")
    const after = await accountingService.getRequest(PAID)
    expect(after.status).toBe("paid")
  })
})
