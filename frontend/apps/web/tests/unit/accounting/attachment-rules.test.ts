import { describe, expect, it } from "vitest"
import {
  dropzoneAccept,
  formatBytes,
  validateAttachment,
} from "@/features/accounting/utils/attachment-rules"

/** The rules under test are pure; the policy is supplied, never imported. */
const attachmentPolicy = {
  acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
  maxBytes: 5 * 1024 * 1024,
}

const file = (mimeType: string, sizeBytes = 1000) => ({ mimeType, sizeBytes })

describe("accepted types come from configuration", () => {
  it("accepts every configured type", () => {
    for (const mimeType of attachmentPolicy.acceptedMimeTypes)
      expect(validateAttachment(file(mimeType), attachmentPolicy).ok, mimeType).toBe(true)
  })

  it("refuses anything else, naming what is accepted", () => {
    const result = validateAttachment(
      file("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      attachmentPolicy
    )
    expect(result.ok).toBe(false)
    if (result.ok || result.code !== "attachment-type-rejected")
      throw new Error("expected a type refusal")
    // The refusal must say what would have worked.
    expect(result.acceptedTypes).toContain("application/pdf")
  })

  it("matches case-insensitively", () => {
    expect(validateAttachment(file("APPLICATION/PDF"), attachmentPolicy).ok).toBe(true)
  })

  it("follows a narrowed policy without a code change", () => {
    const pdfOnly = { acceptedMimeTypes: ["application/pdf"], maxBytes: 1000 }
    expect(validateAttachment(file("image/png", 500), pdfOnly).ok).toBe(false)
    expect(validateAttachment(file("application/pdf", 500), pdfOnly).ok).toBe(true)
  })
})

describe("the size limit comes from configuration", () => {
  it("accepts a file at exactly the limit", () => {
    expect(
      validateAttachment(file("application/pdf", attachmentPolicy.maxBytes), attachmentPolicy)
        .ok
    ).toBe(true)
  })

  it("refuses one byte over, naming the limit", () => {
    const result = validateAttachment(
      file("application/pdf", attachmentPolicy.maxBytes + 1),
      attachmentPolicy
    )
    expect(result.ok).toBe(false)
    if (result.ok || result.code !== "attachment-too-large")
      throw new Error("expected a size refusal")
    expect(result.limit).toBeTruthy()
  })

  it("refuses an empty file even though its type is accepted", () => {
    // An empty invoice passes a type check and carries nothing.
    expect(validateAttachment(file("application/pdf", 0), attachmentPolicy).ok).toBe(false)
  })

  it("checks the type before the size, so a wrong type is reported as one", () => {
    const result = validateAttachment(file("text/plain", 999_999_999), attachmentPolicy)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe("attachment-type-rejected")
  })
})

describe("size formatting", () => {
  it("reads in the largest sensible unit", () => {
    expect(formatBytes(512)).toBe("512 بايت")
    expect(formatBytes(2048)).toBe("2 ك.ب")
    expect(formatBytes(5 * 1024 * 1024)).toBe("5 م.ب")
  })

  it("handles zero without producing NaN", () => {
    expect(formatBytes(0)).toBe("0 بايت")
  })
})

describe("the dropzone accept map is derived, not repeated", () => {
  it("covers every configured type", () => {
    const accept = dropzoneAccept(attachmentPolicy)
    expect(Object.keys(accept)).toEqual(
      expect.arrayContaining(attachmentPolicy.acceptedMimeTypes)
    )
  })

  it("narrows with the policy", () => {
    expect(
      Object.keys(dropzoneAccept({ acceptedMimeTypes: ["application/pdf"], maxBytes: 1 }))
    ).toEqual(["application/pdf"])
  })
})
