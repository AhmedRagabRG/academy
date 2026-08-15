import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  accountingService,
  resetAccountingStore,
} from "@/features/accounting/services/mock-accounting-service"
import { accountingScenarios } from "@/features/accounting/services/mock-scenario-controller"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"
import { AccountingError } from "@/features/accounting/services/accounting-error"
import type {
  AttachmentId,
  ExpenseRequestId,
} from "@/features/accounting/types/common"

beforeEach(() => resetAccountingStore())

/** Read through the service, never imported from the fixtures directly. */
const policy = async () => (await accountingService.lookups()).attachments
afterEach(() => accountingScenarios.reset())

const DRAFT = "request-1" as ExpenseRequestId
const SUBMITTED = "request-2" as ExpenseRequestId

async function captureError(run: () => Promise<unknown>): Promise<AccountingError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof AccountingError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

const upload = async (
  requestId: ExpenseRequestId,
  patch: Record<string, unknown> = {},
  version?: number
) => {
  const current = await accountingService.getRequest(requestId)
  return accountingService.uploadAttachment({
    requestId,
    kind: "invoice",
    fileName: "invoice.pdf",
    mimeType: "application/pdf",
    sizeBytes: 120_000,
    uploadAttempt: "attempt-1",
    expectedVersion: version ?? current.version,
    ...patch,
  })
}

/**
 * FR-020. This is a bug Student Management shipped: a genuine retry carries the
 * version the client held *before* the first attempt succeeded, so checking the
 * version first rejects exactly the case the retry exists to handle. The
 * idempotency key must be checked first.
 */
describe("an upload retry does not duplicate", () => {
  it("produces one attachment for a repeated attempt", async () => {
    const first = await upload(DRAFT)
    const before = first.attachments.length

    // The retry carries the *pre-upload* version, as a real client would.
    const retry = await accountingService.uploadAttachment({
      requestId: DRAFT,
      kind: "invoice",
      fileName: "invoice.pdf",
      mimeType: "application/pdf",
      sizeBytes: 120_000,
      uploadAttempt: "attempt-1",
      expectedVersion: first.version - 1,
    })

    expect(retry.attachments).toHaveLength(before)
  })

  it("does not advance the version on a retry", async () => {
    const first = await upload(DRAFT)
    const retry = await accountingService.uploadAttachment({
      requestId: DRAFT,
      kind: "invoice",
      fileName: "invoice.pdf",
      mimeType: "application/pdf",
      sizeBytes: 120_000,
      uploadAttempt: "attempt-1",
      expectedVersion: first.version - 1,
    })
    expect(retry.version).toBe(first.version)
  })

  it("still records two attachments for two genuinely different attempts", async () => {
    const first = await upload(DRAFT)
    const second = await upload(DRAFT, {
      uploadAttempt: "attempt-2",
      fileName: "receipt.pdf",
    }, first.version)
    expect(second.attachments).toHaveLength(first.attachments.length + 1)
  })

  it("does not deduplicate by file name and size, which can legitimately repeat", async () => {
    // Two different receipts can share both.
    const first = await upload(DRAFT, { uploadAttempt: "a" })
    const second = await upload(DRAFT, { uploadAttempt: "b" }, first.version)
    expect(second.attachments).toHaveLength(first.attachments.length + 1)
  })
})

describe("attachments validate against the configured policy", () => {
  it("accepts every configured type", async () => {
    const acceptedMimeTypes = (await policy()).acceptedMimeTypes
    let version: number | undefined
    for (const [index, mimeType] of acceptedMimeTypes.entries()) {
      const result = await upload(
        DRAFT,
        { mimeType, uploadAttempt: `type-${index}`, fileName: `file-${index}` },
        version
      )
      version = result.version
    }
    const detail = await accountingService.getRequest(DRAFT)
    expect(detail.attachments.length).toBeGreaterThanOrEqual(
      acceptedMimeTypes.length
    )
  })

  it("refuses an unsupported type, naming what is accepted", async () => {
    const error = await captureError(() =>
      upload(DRAFT, { mimeType: "text/plain", fileName: "notes.txt" })
    )
    expect(error.code).toBe("attachment-type-rejected")
    expect(error.details.acceptedTypes).toContain("application/pdf")
  })

  it("refuses a file over the configured maximum, naming the limit", async () => {
    const maxBytes = (await policy()).maxBytes
    const error = await captureError(() =>
      upload(DRAFT, { sizeBytes: maxBytes + 1 })
    )
    expect(error.code).toBe("attachment-too-large")
    expect(error.details.limit).toBeTruthy()
  })

  it("accepts a file at exactly the maximum", async () => {
    const maxBytes = (await policy()).maxBytes
    const result = await upload(DRAFT, { sizeBytes: maxBytes })
    expect(result.attachments.some((a) => a.sizeBytes === maxBytes)).toBe(true)
  })

  it("records nothing when an upload is refused", async () => {
    const before = await accountingService.getRequest(DRAFT)
    await upload(DRAFT, { mimeType: "text/plain" }).catch(() => undefined)

    const after = await accountingService.getRequest(DRAFT)
    expect(after.attachments).toHaveLength(before.attachments.length)
    expect(after.version).toBe(before.version)
  })
})

describe("attachments follow the request's editability", () => {
  it("refuses an upload to a Submitted request", async () => {
    expect((await captureError(() => upload(SUBMITTED))).code).toBe("not-editable")
  })

  it("refuses removing an attachment from a Submitted request", async () => {
    const submitted = await accountingService.getRequest(SUBMITTED)
    if (submitted.attachments.length === 0) return
    const error = await captureError(() =>
      accountingService.removeAttachment({
        requestId: SUBMITTED,
        attachmentId: submitted.attachments[0]!.id,
        expectedVersion: submitted.version,
      })
    )
    expect(error.code).toBe("not-editable")
  })

  it("allows removing from a Draft", async () => {
    const uploaded = await upload(DRAFT)
    const attachment = uploaded.attachments.at(-1)!
    const after = await accountingService.removeAttachment({
      requestId: DRAFT,
      attachmentId: attachment.id,
      expectedVersion: uploaded.version,
    })
    expect(after.attachments.map((a) => a.id)).not.toContain(attachment.id)
  })

  it("refuses removing an attachment that does not exist", async () => {
    const current = await accountingService.getRequest(DRAFT)
    const error = await captureError(() =>
      accountingService.removeAttachment({
        requestId: DRAFT,
        attachmentId: "attachment-nope" as AttachmentId,
        expectedVersion: current.version,
      })
    )
    expect(error.code).toBe("not-found")
  })

  it("requires the attachment permission", async () => {
    accountingScenarios.withoutPermissions([accountingPermissions.attachmentsManage])
    expect((await captureError(() => upload(DRAFT))).code).toBe("forbidden")
  })
})

describe("an attachment records who uploaded it and when", () => {
  it("carries its uploader, time, kind, and size", async () => {
    const result = await upload(DRAFT, { kind: "receipt", fileName: "receipt.pdf" })
    const attachment = result.attachments.at(-1)!
    expect(attachment.kind).toBe("receipt")
    expect(attachment.fileName).toBe("receipt.pdf")
    expect(attachment.sizeBytes).toBe(120_000)
    expect(attachment.uploadedBy.name).toBeTruthy()
    expect(attachment.uploadedAt).toBeTruthy()
  })

  it("writes no history entry — an attachment is not a transition", async () => {
    const before = await accountingService.getRequest(DRAFT)
    const after = await upload(DRAFT)
    expect(after.history).toHaveLength(before.history.length)
  })
})
