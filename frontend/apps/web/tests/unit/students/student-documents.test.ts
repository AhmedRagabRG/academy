import { describe, expect, it } from "vitest"
import {
  archivedDocument,
  currentVersion,
  documentCompletion,
  findByUploadAttempt,
  isArchived,
  nextVersionNumber,
  sortDocuments,
  validateFileAgainstType,
  versionHistory,
  withNewVersion,
} from "@/features/students/utils/student-documents"
import type {
  StudentDocument,
  StudentDocumentType,
  StudentDocumentVersion,
} from "@/features/students/types/domain"
import type {
  StudentDocumentId,
  StudentDocumentVersionId,
} from "@/features/students/types/common"

const type: StudentDocumentType = {
  key: "national-id",
  label: "بطاقة الرقم القومي",
  required: true,
  multiple: false,
  allowedMimeTypes: ["application/pdf", "image/png"],
  maxBytes: 1000,
}

const version = (
  id: string,
  versionNumber: number,
  uploadAttemptId = `attempt-${id}`
): StudentDocumentVersion => ({
  id: id as StudentDocumentVersionId,
  versionNumber,
  fileName: `file-${versionNumber}.pdf`,
  mimeType: "application/pdf",
  size: 100,
  uploadedAt: "2026-01-01T00:00:00.000Z",
  uploadedBy: { id: "e1", name: "موظف", active: true },
  uploadAttemptId,
})

const document = (
  overrides: Partial<StudentDocument> = {}
): StudentDocument =>
  ({
    id: "doc-1" as StudentDocumentId,
    type,
    state: "present",
    currentVersionId: "v1" as StudentDocumentVersionId,
    versions: [version("v1", 1)],
    ...overrides,
  }) as StudentDocument

describe("file validation", () => {
  it("accepts an allowed type within the size limit", () => {
    expect(
      validateFileAgainstType(
        { name: "a.pdf", type: "application/pdf", size: 500 },
        type
      )
    ).toBeUndefined()
  })

  it("rejects an unsupported type", () => {
    expect(
      validateFileAgainstType(
        { name: "a.docx", type: "application/msword", size: 500 },
        type
      )
    ).toBe("unsupported-file-type")
  })

  it("rejects an oversized file", () => {
    expect(
      validateFileAgainstType(
        { name: "a.pdf", type: "application/pdf", size: 5000 },
        type
      )
    ).toBe("file-too-large")
  })

  it("rejects an empty file as unreadable", () => {
    expect(
      validateFileAgainstType(
        { name: "a.pdf", type: "application/pdf", size: 0 },
        type
      )
    ).toBe("file-unreadable")
  })
})

describe("versioning", () => {
  it("resolves the current version", () => {
    expect(currentVersion(document())?.versionNumber).toBe(1)
    expect(
      currentVersion(document({ currentVersionId: undefined }))
    ).toBeUndefined()
  })

  it("numbers the next version above the highest existing one", () => {
    expect(nextVersionNumber(document())).toBe(2)
    expect(
      nextVersionNumber(
        document({ versions: [version("v1", 1), version("v2", 5)] })
      )
    ).toBe(6)
    expect(nextVersionNumber(document({ versions: [] }))).toBe(1)
  })

  it("appends on replacement and keeps every previous version", () => {
    const replaced = withNewVersion(document(), version("v2", 2))
    expect(replaced.versions).toHaveLength(2)
    expect(replaced.currentVersionId).toBe("v2")
    expect(replaced.versions[0]?.id).toBe("v1")
  })

  it("clears archived state when a new version arrives", () => {
    const archived = archivedDocument(
      document(),
      "2026-02-01T00:00:00.000Z",
      { id: "e1", name: "موظف", active: true },
      "سبب"
    )
    const restored = withNewVersion(archived, version("v2", 2))
    expect(restored.state).toBe("present")
    expect(restored.archivedAt).toBeUndefined()
  })

  it("lists history newest first", () => {
    const history = versionHistory(
      document({ versions: [version("v1", 1), version("v2", 2)] })
    )
    expect(history.map((entry) => entry.versionNumber)).toEqual([2, 1])
  })
})

describe("upload retry safety", () => {
  it("resolves a repeated attempt to the version already stored", () => {
    const doc = document({ versions: [version("v1", 1, "attempt-x")] })
    expect(findByUploadAttempt(doc, "attempt-x")?.id).toBe("v1")
  })

  it("returns nothing for a genuinely new attempt", () => {
    expect(findByUploadAttempt(document(), "attempt-new")).toBeUndefined()
  })
})

describe("archival", () => {
  it("archives without discarding any version", () => {
    const archived = archivedDocument(
      document({ versions: [version("v1", 1), version("v2", 2)] }),
      "2026-02-01T00:00:00.000Z",
      { id: "e1", name: "موظف", active: true },
      "استُبدل بنسخة رسمية"
    )
    expect(archived.state).toBe("archived")
    expect(archived.versions).toHaveLength(2)
    expect(archived.archiveReason).toBe("استُبدل بنسخة رسمية")
    expect(isArchived(archived)).toBe(true)
  })
})

describe("completion counts", () => {
  it("counts only required types toward completion", () => {
    const optional: StudentDocumentType = { ...type, key: "additional-attachment", required: false }
    const counts = documentCompletion([
      document(),
      document({ id: "doc-2" as StudentDocumentId, state: "missing", versions: [] }),
      document({ id: "doc-3" as StudentDocumentId, type: optional, state: "present" }),
      document({ id: "doc-4" as StudentDocumentId, state: "archived" }),
    ])
    expect(counts.requiredTypes).toBe(3)
    expect(counts.present).toBe(1)
    expect(counts.missing).toBe(1)
    expect(counts.archived).toBe(1)
  })
})

describe("ordering", () => {
  it("puts required types first so missing evidence surfaces early", () => {
    const optional: StudentDocumentType = {
      ...type,
      key: "additional-attachment",
      label: "أ مرفقات",
      required: false,
    }
    const sorted = sortDocuments([
      document({ id: "opt" as StudentDocumentId, type: optional }),
      document({ id: "req" as StudentDocumentId }),
    ])
    expect(sorted[0]?.id).toBe("req")
  })
})
