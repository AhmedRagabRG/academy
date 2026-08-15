import { beforeEach, describe, expect, it } from "vitest"
import {
  resetStudentStore,
  studentsService,
} from "@/features/students/services/mock-students-service"
import { studentScenarios } from "@/features/students/services/mock-scenario-controller"
import { StudentsError } from "@/features/students/services/students-error"
import type { StudentId } from "@/features/students/types/common"
import type { StudentDetail } from "@/features/students/types/projections"

/** Runs an operation expected to reject and returns the typed error. */
async function captureError(run: () => Promise<unknown>): Promise<StudentsError> {
  try {
    await run()
  } catch (error) {
    if (error instanceof StudentsError) return error
    throw error
  }
  throw new Error("expected the operation to be refused")
}

async function findByCode(code: string): Promise<StudentDetail> {
  const page = await studentsService.list({ page: 1, pageSize: 50 })
  const row = page.items.find((item) => item.studentCode === code)!
  return studentsService.get(row.id)
}

const inputFrom = (detail: StudentDetail) => ({
  identity: detail.identity,
  assignment: detail.assignment,
})

describe("update profile", () => {
  beforeEach(() => resetStudentStore())

  it("persists maintainable values and bumps the version", async () => {
    const before = await findByCode("STD-2026-00001")
    const after = await studentsService.updateProfile({
      studentId: before.id,
      input: {
        ...inputFrom(before),
        identity: { ...before.identity, address: "الإسكندرية" },
      },
      expectedVersion: before.version,
    })

    expect(after.identity.address).toBe("الإسكندرية")
    expect(after.version).toBe(before.version + 1)
  })

  it("never alters protected system information", async () => {
    const before = await findByCode("STD-2026-00001")
    const after = await studentsService.updateProfile({
      studentId: before.id,
      input: inputFrom(before),
      expectedVersion: before.version,
    })

    expect(after.studentCode).toBe(before.studentCode)
    expect(after.system).toEqual(before.system)
  })

  it("records exactly one timeline event per successful update", async () => {
    const before = await findByCode("STD-2026-00001")
    const timelineBefore = await studentsService.listTimeline(before.id, {
      limit: 200,
    })

    await studentsService.updateProfile({
      studentId: before.id,
      input: inputFrom(before),
      expectedVersion: before.version,
    })

    const timelineAfter = await studentsService.listTimeline(before.id, {
      limit: 200,
    })
    expect(timelineAfter.items.length).toBe(timelineBefore.items.length + 1)
    expect(timelineAfter.items[0]?.category).toBe("profile-updated")
  })

  it("refuses a stale version and leaves the record untouched", async () => {
    const student = await findByCode("STD-2026-00001")
    await expect(
      studentsService.updateProfile({
        studentId: student.id,
        input: {
          ...inputFrom(student),
          identity: { ...student.identity, address: "لن تُحفظ" },
        },
        expectedVersion: student.version - 1,
      })
    ).rejects.toMatchObject({ code: "version-conflict" })

    const reread = await studentsService.get(student.id)
    expect(reread.identity.address).toBe(student.identity.address)
    expect(reread.version).toBe(student.version)
  })

  it("reports the current version so the UI can offer a refresh", async () => {
    const student = await findByCode("STD-2026-00001")
    const error = await captureError(() =>
      studentsService.updateProfile({
        studentId: student.id,
        input: inputFrom(student),
        expectedVersion: 999,
      })
    )

    expect(error.details.currentVersion).toBe(student.version)
  })

  it("adds no timeline event when the update fails", async () => {
    const student = await findByCode("STD-2026-00001")
    const before = await studentsService.listTimeline(student.id, { limit: 200 })

    await studentsService
      .updateProfile({
        studentId: student.id,
        input: inputFrom(student),
        expectedVersion: 999,
      })
      .catch(() => undefined)

    const after = await studentsService.listTimeline(student.id, { limit: 200 })
    expect(after.items.length).toBe(before.items.length)
  })

  it("refuses editing an archived student until it is activated", async () => {
    const archived = await findByCode("STD-2026-00006")
    await expect(
      studentsService.updateProfile({
        studentId: archived.id,
        input: inputFrom(archived),
        expectedVersion: archived.version,
      })
    ).rejects.toMatchObject({ code: "archived-read-only" })
  })

  it("refuses editing without students.update", async () => {
    const student = await findByCode("STD-2026-00001")
    studentScenarios.withoutPermissions(["students.update"])
    await expect(
      studentsService.updateProfile({
        studentId: student.id,
        input: inputFrom(student),
        expectedVersion: student.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("refuses editing an out-of-scope student", async () => {
    const student = await findByCode("STD-2026-00005")
    studentScenarios.scopeToBranches(["branch-cairo"])
    await expect(
      studentsService.updateProfile({
        studentId: student.id,
        input: inputFrom(student),
        expectedVersion: student.version,
      })
    ).rejects.toMatchObject({ code: "out-of-scope" })
  })

  it("refuses updating a student that does not exist", async () => {
    await expect(
      studentsService.updateProfile({
        studentId: "student-missing" as StudentId,
        input: (await findByCode("STD-2026-00001")) as never,
        expectedVersion: 1,
      })
    ).rejects.toMatchObject({ code: "not-found" })
  })
})
