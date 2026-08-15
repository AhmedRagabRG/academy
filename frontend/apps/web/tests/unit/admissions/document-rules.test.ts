import { describe, expect, it } from "vitest"
import {
  documentCompletion,
  validateAdmissionFile,
} from "@/features/admissions/utils/admission-documents"
import { makeEmptyDocuments } from "@/features/admissions/data/admissions-fixtures"

describe("admission document rules", () => {
  it("validates MIME and size against the requirement snapshot", () => {
    const requirement = makeEmptyDocuments()[0]!.requirement
    expect(
      validateAdmissionFile(
        { name: "virus.exe", type: "application/octet-stream", size: 10 },
        requirement
      )
    ).toBe("document-type-invalid")
    expect(
      validateAdmissionFile(
        {
          name: "id.pdf",
          type: "application/pdf",
          size: requirement.maxBytes + 1,
        },
        requirement
      )
    ).toBe("document-too-large")
  })

  it("reports unresolved required evidence", () => {
    const completion = documentCompletion(makeEmptyDocuments())
    expect(completion.required).toBeGreaterThan(0)
    expect(completion.missing).toBe(completion.required)
  })
})
