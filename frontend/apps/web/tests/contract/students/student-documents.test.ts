import { beforeEach, describe, expect, it } from "vitest"
import {
  resetStudentStore,
  studentsService,
} from "@/features/students/services/mock-students-service"
import { studentScenarios } from "@/features/students/services/mock-scenario-controller"
import type { StudentDetail } from "@/features/students/types/projections"

async function findByCode(code: string): Promise<StudentDetail> {
  const page = await studentsService.list({ page: 1, pageSize: 50 })
  return studentsService.get(
    page.items.find((item) => item.studentCode === code)!.id
  )
}

const file = (name: string, type = "application/pdf", size = 1000) =>
  new File([new Uint8Array(size)], name, { type })

describe("student documents", () => {
  beforeEach(() => resetStudentStore())

  it("presents every configured type, distinguishing present, missing, and archived", async () => {
    const student = await findByCode("STD-2026-00003")
    const documents = await studentsService.listDocuments(student.id)

    expect(documents.length).toBe(7)
    expect(documents.some((item) => item.state === "present")).toBe(true)
    expect(documents.some((item) => item.state === "missing")).toBe(true)
    expect(documents.some((item) => item.state === "archived")).toBe(true)
  })

  it("uploads an accepted file with full metadata", async () => {
    const student = await findByCode("STD-2026-00002")
    const uploaded = await studentsService.uploadDocument({
      studentId: student.id,
      typeKey: "birth-certificate",
      file: file("birth.pdf"),
      uploadAttemptId: "attempt-1",
      expectedVersion: student.version,
    })

    const version = uploaded.versions.at(-1)!
    expect(uploaded.state).toBe("present")
    expect(version.fileName).toBe("birth.pdf")
    expect(version.size).toBe(1000)
    expect(version.uploadedBy.id).toBeTruthy()
    expect(version.uploadedAt).toBeTruthy()
  })

  it("refuses an unsupported type, an oversized file, and an empty file", async () => {
    const student = await findByCode("STD-2026-00002")
    const attempt = (f: File) =>
      studentsService.uploadDocument({
        studentId: student.id,
        typeKey: "admission-declaration",
        file: f,
        uploadAttemptId: `attempt-${f.name}`,
        expectedVersion: student.version,
      })

    await expect(attempt(file("a.png", "image/png"))).rejects.toMatchObject({
      code: "unsupported-file-type",
    })
    await expect(
      attempt(file("big.pdf", "application/pdf", 10_000_000))
    ).rejects.toMatchObject({ code: "file-too-large" })
    await expect(
      attempt(file("empty.pdf", "application/pdf", 0))
    ).rejects.toMatchObject({ code: "file-unreadable" })
  })

  it("leaves an existing document untouched when an upload is refused", async () => {
    const student = await findByCode("STD-2026-00001")
    const before = (await studentsService.listDocuments(student.id)).find(
      (item) => item.type.key === "national-id"
    )!

    await studentsService
      .replaceDocument({
        studentId: student.id,
        documentId: before.id,
        file: file("bad.exe", "application/x-msdownload"),
        uploadAttemptId: "attempt-bad",
        expectedVersion: student.version,
      })
      .catch(() => undefined)

    const after = (await studentsService.listDocuments(student.id)).find(
      (item) => item.id === before.id
    )!
    expect(after.versions).toHaveLength(before.versions.length)
    expect(after.currentVersionId).toBe(before.currentVersionId)
  })

  it("versions a replacement and keeps the previous version retrievable", async () => {
    const student = await findByCode("STD-2026-00001")
    const target = (await studentsService.listDocuments(student.id)).find(
      (item) => item.type.key === "national-id"
    )!

    const replaced = await studentsService.replaceDocument({
      studentId: student.id,
      documentId: target.id,
      file: file("new-id.pdf"),
      uploadAttemptId: "attempt-replace",
      expectedVersion: student.version,
    })

    expect(replaced.versions).toHaveLength(2)
    const history = await studentsService.documentHistory(
      student.id,
      target.id
    )
    expect(history).toHaveLength(2)
    expect(history.map((v) => v.versionNumber)).toEqual([2, 1])
  })

  it("never creates a duplicate when an interrupted upload is retried", async () => {
    const student = await findByCode("STD-2026-00002")
    const command = {
      studentId: student.id,
      typeKey: "birth-certificate" as const,
      file: file("birth.pdf"),
      uploadAttemptId: "attempt-retry",
      expectedVersion: student.version,
    }

    const first = await studentsService.uploadDocument(command)
    const retried = await studentsService.uploadDocument(command)

    expect(retried.versions).toHaveLength(first.versions.length)
  })

  it("archives without deleting, keeping every version", async () => {
    const student = await findByCode("STD-2026-00001")
    const target = (await studentsService.listDocuments(student.id)).find(
      (item) => item.type.key === "national-id"
    )!

    const archived = await studentsService.archiveDocument({
      studentId: student.id,
      documentId: target.id,
      reason: "استُبدل بنسخة رسمية",
      expectedVersion: student.version,
    })

    expect(archived.state).toBe("archived")
    expect(archived.versions).toHaveLength(target.versions.length)
    expect(archived.archiveReason).toBe("استُبدل بنسخة رسمية")

    const history = await studentsService.documentHistory(student.id, target.id)
    expect(history.length).toBeGreaterThan(0)
  })

  it("refuses archiving an already archived document", async () => {
    const student = await findByCode("STD-2026-00003")
    const archived = (await studentsService.listDocuments(student.id)).find(
      (item) => item.state === "archived"
    )!

    await expect(
      studentsService.archiveDocument({
        studentId: student.id,
        documentId: archived.id,
        expectedVersion: student.version,
      })
    ).rejects.toMatchObject({ code: "document-archived" })
  })

  it("records exactly one timeline event per document change", async () => {
    const student = await findByCode("STD-2026-00002")
    const before = await studentsService.listTimeline(student.id, { limit: 200 })

    const uploaded = await studentsService.uploadDocument({
      studentId: student.id,
      typeKey: "birth-certificate",
      file: file("birth.pdf"),
      uploadAttemptId: "attempt-event",
      expectedVersion: student.version,
    })

    const after = await studentsService.listTimeline(student.id, { limit: 200 })
    expect(after.items.length).toBe(before.items.length + 1)
    expect(after.items[0]?.category).toBe("document-uploaded")
    expect(after.items[0]?.subjectRef).toBe(uploaded.id)
  })

  it("adds no timeline event when a document command fails", async () => {
    const student = await findByCode("STD-2026-00002")
    const before = await studentsService.listTimeline(student.id, { limit: 200 })

    await studentsService
      .uploadDocument({
        studentId: student.id,
        typeKey: "birth-certificate",
        file: file("bad.png", "image/gif"),
        uploadAttemptId: "attempt-fail",
        expectedVersion: student.version,
      })
      .catch(() => undefined)

    const after = await studentsService.listTimeline(student.id, { limit: 200 })
    expect(after.items.length).toBe(before.items.length)
  })

  it("separates view permission from manage permission", async () => {
    const student = await findByCode("STD-2026-00001")
    studentScenarios.withoutPermissions(["students.documents.manage"])

    await expect(
      studentsService.listDocuments(student.id)
    ).resolves.toBeDefined()
    await expect(
      studentsService.uploadDocument({
        studentId: student.id,
        typeKey: "additional-attachment",
        file: file("extra.pdf"),
        uploadAttemptId: "attempt-perm",
        expectedVersion: student.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses reading documents without students.documents.view", async () => {
    const student = await findByCode("STD-2026-00001")
    studentScenarios.withoutPermissions(["students.documents.view"])
    await expect(
      studentsService.listDocuments(student.id)
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses document changes on an archived student", async () => {
    const student = await findByCode("STD-2026-00006")
    await expect(
      studentsService.uploadDocument({
        studentId: student.id,
        typeKey: "additional-attachment",
        file: file("extra.pdf"),
        uploadAttemptId: "attempt-archived",
        expectedVersion: student.version,
      })
    ).rejects.toMatchObject({ code: "archived-read-only" })
  })
})
