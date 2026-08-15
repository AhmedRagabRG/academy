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

const countEvents = async (studentId: StudentDetail["id"]) =>
  (await studentsService.listTimeline(studentId, { limit: 500 })).items.length

const file = () =>
  new File([new Uint8Array(500)], "doc.pdf", { type: "application/pdf" })

describe("timeline event accounting", () => {
  beforeEach(() => resetStudentStore())

  it("carries admission facts and creation ahead of everything else", async () => {
    const student = await findByCode("STD-2026-00001")
    const page = await studentsService.listTimeline(student.id, { limit: 500 })
    const categories = page.items.map((event) => event.category)

    expect(categories).toContain("admission-submitted")
    expect(categories).toContain("admission-approved")
    expect(categories).toContain("student-created")
    expect(categories).toContain("enrollment-added")

    const oldest = page.items.at(-1)!
    expect(oldest.category).toBe("admission-submitted")
    expect(oldest.origin).toBe("admissions")
  })

  it("adds exactly one event per successful command", async () => {
    const student = await findByCode("STD-2026-00002")
    let expected = await countEvents(student.id)

    const afterProfile = await studentsService.updateProfile({
      studentId: student.id,
      input: { identity: student.identity, assignment: student.assignment },
      expectedVersion: student.version,
    })
    expect(await countEvents(student.id)).toBe((expected += 1))

    const afterUpload = await studentsService.uploadDocument({
      studentId: student.id,
      typeKey: "birth-certificate",
      file: file(),
      uploadAttemptId: "attempt-a",
      expectedVersion: afterProfile.version,
    })
    expect(await countEvents(student.id)).toBe((expected += 1))

    const reread = await studentsService.get(student.id)
    await studentsService.replaceDocument({
      studentId: student.id,
      documentId: afterUpload.id,
      file: file(),
      uploadAttemptId: "attempt-b",
      expectedVersion: reread.version,
    })
    expect(await countEvents(student.id)).toBe((expected += 1))

    const beforeStatus = await studentsService.get(student.id)
    await studentsService.changeStatus({
      studentId: student.id,
      toStatus: "graduated",
      expectedVersion: beforeStatus.version,
    })
    expect(await countEvents(student.id)).toBe(expected + 1)
  })

  it("adds no event when a command fails", async () => {
    const student = await findByCode("STD-2026-00002")
    const before = await countEvents(student.id)

    await studentsService
      .updateProfile({
        studentId: student.id,
        input: { identity: student.identity, assignment: student.assignment },
        expectedVersion: 999,
      })
      .catch(() => undefined)
    await studentsService
      .changeStatus({
        studentId: student.id,
        toStatus: "withdrawn",
        expectedVersion: student.version,
      })
      .catch(() => undefined)
    await studentsService
      .addNote({ studentId: student.id, content: "  " })
      .catch(() => undefined)

    expect(await countEvents(student.id)).toBe(before)
  })

  it("adds no event for a retried upload that resolves to an existing version", async () => {
    const student = await findByCode("STD-2026-00002")
    const command = {
      studentId: student.id,
      typeKey: "birth-certificate" as const,
      file: file(),
      uploadAttemptId: "attempt-retry",
      expectedVersion: student.version,
    }

    await studentsService.uploadDocument(command)
    const afterFirst = await countEvents(student.id)
    await studentsService.uploadDocument(command)

    expect(await countEvents(student.id)).toBe(afterFirst)
  })

  it("assigns every event an actor and a time", async () => {
    const student = await findByCode("STD-2026-00001")
    const page = await studentsService.listTimeline(student.id, { limit: 500 })
    for (const event of page.items) {
      expect(event.actor.name).toBeTruthy()
      expect(event.occurredAt).toBeTruthy()
      expect(event.sequence).toBeGreaterThan(0)
    }
  })

  it("pages a long history without repeating or skipping events", async () => {
    const student = await findByCode("STD-2026-00001")
    const seen: string[] = []
    let cursor: string | undefined

    do {
      const page = await studentsService.listTimeline(student.id, {
        limit: 3,
        cursor,
      })
      seen.push(...page.items.map((event) => event.id))
      cursor = page.nextCursor
    } while (cursor)

    const all = await studentsService.listTimeline(student.id, { limit: 500 })
    expect(new Set(seen).size).toBe(seen.length)
    expect(seen).toHaveLength(all.items.length)
    expect(seen).toEqual(all.items.map((event) => event.id))
  })

  it("refuses the timeline without students.timeline.view", async () => {
    const student = await findByCode("STD-2026-00001")
    studentScenarios.withoutPermissions(["students.timeline.view"])
    await expect(
      studentsService.listTimeline(student.id, { limit: 10 })
    ).rejects.toMatchObject({ code: "forbidden" })
  })
})
