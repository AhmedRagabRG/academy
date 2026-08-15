import { beforeEach, describe, expect, it } from "vitest"
import {
  resetStudentStore,
  studentsService,
} from "@/features/students/services/mock-students-service"
import { studentScenarios } from "@/features/students/services/mock-scenario-controller"
import { StudentsError } from "@/features/students/services/students-error"
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
  return studentsService.get(
    page.items.find((item) => item.studentCode === code)!.id
  )
}

describe("status transitions", () => {
  beforeEach(() => resetStudentStore())

  it("applies a permitted transition and records the full history entry", async () => {
    const student = await findByCode("STD-2026-00001")
    const after = await studentsService.changeStatus({
      studentId: student.id,
      toStatus: "suspended",
      reason: "طلب الطالب إيقافًا مؤقتًا",
      expectedVersion: student.version,
    })

    expect(after.status).toBe("suspended")
    const latest = after.statusHistory.at(-1)!
    expect(latest.fromStatus).toBe("active")
    expect(latest.toStatus).toBe("suspended")
    expect(latest.reason).toBe("طلب الطالب إيقافًا مؤقتًا")
    expect(latest.actor.id).toBeTruthy()
    expect(latest.occurredAt).toBeTruthy()
    expect(latest.sourceVersion).toBe(student.version)
    expect(latest.resultVersion).toBe(after.version)
  })

  it("refuses a transition the policy disallows and changes nothing", async () => {
    const archived = await findByCode("STD-2026-00006")
    await expect(
      studentsService.changeStatus({
        studentId: archived.id,
        toStatus: "graduated",
        expectedVersion: archived.version,
      })
    ).rejects.toMatchObject({ code: "invalid-status-transition" })

    const reread = await studentsService.get(archived.id)
    expect(reread.status).toBe("archived")
    expect(reread.version).toBe(archived.version)
  })

  it("reports which transitions were allowed on refusal", async () => {
    const archived = await findByCode("STD-2026-00006")
    const error = await captureError(() =>
      studentsService.changeStatus({
        studentId: archived.id,
        toStatus: "graduated",
        expectedVersion: archived.version,
      })
    )
    expect(error.details.allowed).toEqual(["active"])
  })

  it("refuses a required-reason transition with no reason", async () => {
    const student = await findByCode("STD-2026-00001")
    await expect(
      studentsService.changeStatus({
        studentId: student.id,
        toStatus: "withdrawn",
        expectedVersion: student.version,
      })
    ).rejects.toMatchObject({ code: "reason-required" })
  })

  it("refuses every transition without the exact permission", async () => {
    const student = await findByCode("STD-2026-00001")
    studentScenarios.withoutPermissions([
      "students.status.manage",
      "students.archive",
    ])
    await expect(
      studentsService.changeStatus({
        studentId: student.id,
        toStatus: "suspended",
        reason: "سبب",
        expectedVersion: student.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })

  it("records no history and no timeline event when a transition fails", async () => {
    const student = await findByCode("STD-2026-00001")
    const timelineBefore = await studentsService.listTimeline(student.id, {
      limit: 200,
    })

    await studentsService
      .changeStatus({
        studentId: student.id,
        toStatus: "withdrawn",
        expectedVersion: student.version,
      })
      .catch(() => undefined)

    const after = await studentsService.get(student.id)
    const timelineAfter = await studentsService.listTimeline(student.id, {
      limit: 200,
    })
    expect(after.statusHistory).toHaveLength(student.statusHistory.length)
    expect(timelineAfter.items.length).toBe(timelineBefore.items.length)
  })

  it("records exactly one timeline event per successful transition", async () => {
    const student = await findByCode("STD-2026-00001")
    const before = await studentsService.listTimeline(student.id, { limit: 200 })

    await studentsService.changeStatus({
      studentId: student.id,
      toStatus: "graduated",
      expectedVersion: student.version,
    })

    const after = await studentsService.listTimeline(student.id, { limit: 200 })
    expect(after.items.length).toBe(before.items.length + 1)
    expect(after.items[0]?.category).toBe("status-changed")
  })

  it("keeps an archived student readable and restorable", async () => {
    const archived = await findByCode("STD-2026-00006")
    expect(archived.status).toBe("archived")
    expect(archived.identity.fullName).toBeTruthy()

    const activated = await studentsService.changeStatus({
      studentId: archived.id,
      toStatus: "active",
      expectedVersion: archived.version,
    })
    expect(activated.status).toBe("active")
    expect(activated.archivedAt).toBeUndefined()
    // History stays continuous across the round trip.
    expect(activated.statusHistory.length).toBeGreaterThan(
      archived.statusHistory.length
    )
  })

  it("keeps archived students in list results for historical review", async () => {
    const page = await studentsService.list({
      page: 1,
      pageSize: 50,
      statuses: ["archived"],
    })
    expect(page.total).toBeGreaterThan(0)
  })

  it("refuses a stale version", async () => {
    const student = await findByCode("STD-2026-00001")
    await expect(
      studentsService.changeStatus({
        studentId: student.id,
        toStatus: "graduated",
        expectedVersion: student.version - 1,
      })
    ).rejects.toMatchObject({ code: "version-conflict" })
  })

  it("allows a correction out of a terminal status only with the correct permission", async () => {
    const graduated = await findByCode("STD-2026-00004")
    studentScenarios.withoutPermissions(["students.status.correct"])
    await expect(
      studentsService.changeStatus({
        studentId: graduated.id,
        toStatus: "active",
        reason: "تصحيح إداري",
        expectedVersion: graduated.version,
      })
    ).rejects.toMatchObject({ code: "forbidden" })

    resetStudentStore()
    const again = await findByCode("STD-2026-00004")
    const corrected = await studentsService.changeStatus({
      studentId: again.id,
      toStatus: "active",
      reason: "تصحيح إداري",
      expectedVersion: again.version,
    })
    expect(corrected.status).toBe("active")
  })
})
