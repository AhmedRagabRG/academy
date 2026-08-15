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

describe("student notes", () => {
  beforeEach(() => resetStudentStore())

  it("stores author, creation time, and content", async () => {
    const student = await findByCode("STD-2026-00002")
    const note = await studentsService.addNote({
      studentId: student.id,
      content: "تم التواصل مع ولي الأمر",
    })

    expect(note.content).toBe("تم التواصل مع ولي الأمر")
    expect(note.author.id).toBeTruthy()
    expect(note.author.name).toBeTruthy()
    expect(note.createdAt).toBeTruthy()
  })

  it("orders notes newest first", async () => {
    const student = await findByCode("STD-2026-00001")
    const notes = await studentsService.listNotes(student.id)
    expect(notes).toHaveLength(2)
    expect(
      notes[0]!.createdAt >= notes[1]!.createdAt
    ).toBe(true)
  })

  it("refuses empty and whitespace-only content", async () => {
    const student = await findByCode("STD-2026-00002")
    for (const content of ["", "   ", "\n\t"])
      await expect(
        studentsService.addNote({ studentId: student.id, content })
      ).rejects.toMatchObject({ code: "note-content-empty" })

    expect(await studentsService.listNotes(student.id)).toEqual([])
  })

  it("preserves authorship for an author who is no longer active", async () => {
    const student = await findByCode("STD-2026-00001")
    const notes = await studentsService.listNotes(student.id)
    const byFormerEmployee = notes.find((note) => !note.author.active)
    expect(byFormerEmployee).toBeDefined()
    expect(byFormerEmployee!.author.name).toBe("خالد سمير")
  })

  it("withholds notes entirely without students.notes.view", async () => {
    const student = await findByCode("STD-2026-00001")
    studentScenarios.withoutPermissions(["students.notes.view"])
    await expect(studentsService.listNotes(student.id)).rejects.toMatchObject({
      code: "forbidden",
    })
  })

  it("separates reading notes from authoring them", async () => {
    const student = await findByCode("STD-2026-00001")
    studentScenarios.withoutPermissions(["students.notes.manage"])
    await expect(studentsService.listNotes(student.id)).resolves.toBeDefined()
    await expect(
      studentsService.addNote({ studentId: student.id, content: "محاولة" })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("never returns note content in the list projection or context summary", async () => {
    const student = await findByCode("STD-2026-00001")
    const page = await studentsService.list({ page: 1, pageSize: 10 })
    const summary = await studentsService.getContextSummary(student.id)

    expect(JSON.stringify(page)).not.toContain("فريق خدمة العملاء")
    expect(JSON.stringify(summary)).not.toContain("فريق خدمة العملاء")
  })

  it("refuses adding notes to an archived student", async () => {
    const student = await findByCode("STD-2026-00006")
    await expect(
      studentsService.addNote({ studentId: student.id, content: "ملاحظة" })
    ).rejects.toMatchObject({ code: "archived-read-only" })
  })
})

/**
 * Note revision and archival extend spec FR-020/FR-021. They are implemented
 * non-destructively so they stay consistent with FR-040 audit readiness: an edit
 * keeps the original author and creation time, and archival is a soft state, not
 * a delete.
 */
describe("note revision and archival", () => {
  beforeEach(() => resetStudentStore())

  it("keeps the original author and creation time on edit", async () => {
    const student = await findByCode("STD-2026-00001")
    const original = (await studentsService.listNotes(student.id))[0]!

    const edited = await studentsService.editNote({
      studentId: student.id,
      noteId: original.id,
      content: "نص محدّث",
    })

    expect(edited.content).toBe("نص محدّث")
    expect(edited.author).toEqual(original.author)
    expect(edited.createdAt).toBe(original.createdAt)
    expect(edited.editedAt).toBeTruthy()
    expect(edited.editedBy?.id).toBeTruthy()
  })

  it("refuses empty content on edit", async () => {
    const student = await findByCode("STD-2026-00001")
    const original = (await studentsService.listNotes(student.id))[0]!
    await expect(
      studentsService.editNote({
        studentId: student.id,
        noteId: original.id,
        content: "   ",
      })
    ).rejects.toMatchObject({ code: "note-content-empty" })
  })

  it("archives softly, removing the note from the active list without deleting it", async () => {
    const student = await findByCode("STD-2026-00001")
    const before = await studentsService.listNotes(student.id)
    const target = before[0]!

    const archived = await studentsService.archiveNote({
      studentId: student.id,
      noteId: target.id,
    })

    expect(archived.archivedAt).toBeTruthy()
    expect(archived.content).toBe(target.content)

    const after = await studentsService.listNotes(student.id)
    expect(after).toHaveLength(before.length - 1)
  })

  it("requires students.notes.manage for both edit and archive", async () => {
    const student = await findByCode("STD-2026-00001")
    const target = (await studentsService.listNotes(student.id))[0]!
    studentScenarios.withoutPermissions(["students.notes.manage"])

    await expect(
      studentsService.editNote({
        studentId: student.id,
        noteId: target.id,
        content: "محاولة",
      })
    ).rejects.toMatchObject({ code: "forbidden" })
    await expect(
      studentsService.archiveNote({ studentId: student.id, noteId: target.id })
    ).rejects.toMatchObject({ code: "forbidden" })
  })
})
