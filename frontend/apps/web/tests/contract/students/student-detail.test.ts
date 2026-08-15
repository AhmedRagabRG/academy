import { beforeEach, describe, expect, it } from "vitest"
import {
  resetStudentStore,
  studentsService,
} from "@/features/students/services/mock-students-service"
import { studentScenarios } from "@/features/students/services/mock-scenario-controller"
import type { StudentId } from "@/features/students/types/common"

async function firstStudentId(): Promise<StudentId> {
  const page = await studentsService.list({ page: 1, pageSize: 10 })
  return page.items[0]!.id
}

async function findByCode(code: string): Promise<StudentId> {
  const page = await studentsService.list({ page: 1, pageSize: 50 })
  return page.items.find((item) => item.studentCode === code)!.id
}

describe("student detail composition", () => {
  beforeEach(() => resetStudentStore())

  it("carries personal, academic, and system information", async () => {
    const detail = await studentsService.get(
      await findByCode("STD-2026-00001")
    )

    expect(detail.identity.fullName).toBe("يوسف عبد الرحمن")
    expect(detail.identity.nationalId).toBeTruthy()
    expect(detail.assignment.registrationBranchLabel).toBeTruthy()
    expect(detail.assignment.departmentLabel).toBeTruthy()
    expect(detail.studentCode).toBe("STD-2026-00001")
    expect(detail.system.admissionReference).toBeTruthy()
    expect(detail.system.admissionDate).toBeTruthy()
    expect(detail.system.enrollmentDate).toBeTruthy()
    expect(detail.status).toBe("active")
  })

  it("reports document completion counts", async () => {
    const detail = await studentsService.get(
      await findByCode("STD-2026-00001")
    )
    expect(detail.documentCompletion.requiredTypes).toBeGreaterThan(0)
    expect(detail.documentCompletion.present).toBeGreaterThan(0)
  })

  it("exposes only the status actions the policy and permissions allow", async () => {
    const active = await studentsService.get(await findByCode("STD-2026-00001"))
    expect(active.availableStatusActions.sort()).toEqual([
      "archived",
      "graduated",
      "suspended",
      "withdrawn",
    ])

    const archived = await studentsService.get(
      await findByCode("STD-2026-00006")
    )
    expect(archived.availableStatusActions).toEqual(["active"])
  })

  it("drops status actions the employee lacks permission for", async () => {
    studentScenarios.withoutPermissions([
      "students.status.manage",
      "students.archive",
    ])
    const detail = await studentsService.get(await firstStudentId())
    expect(detail.availableStatusActions).toEqual([])
  })

  it("reports which areas the employee may open", async () => {
    const full = await studentsService.get(await firstStudentId())
    expect(full.permissions.notes).toBe(true)
    expect(full.permissions.financial).toBe(true)

    studentScenarios.withoutPermissions([
      "students.notes.view",
      "students.finance.view",
    ])
    const reduced = await studentsService.get(await firstStudentId())
    expect(reduced.permissions.notes).toBe(false)
    expect(reduced.permissions.financial).toBe(false)
    expect(reduced.permissions.overview).toBe(true)
  })

  it("withholds enrollments from the detail when the area is forbidden", async () => {
    studentScenarios.withoutPermissions(["students.enrollments.view"])
    const detail = await studentsService.get(
      await findByCode("STD-2026-00001")
    )
    expect(detail.enrollments).toEqual([])
    await expect(
      studentsService.listEnrollments(detail.id)
    ).rejects.toMatchObject({ code: "forbidden" })
  })
})

describe("enrollment read surface", () => {
  beforeEach(() => resetStudentStore())

  it("returns multiple enrollments with program batch and course without", async () => {
    const enrollments = await studentsService.listEnrollments(
      await findByCode("STD-2026-00001")
    )

    expect(enrollments).toHaveLength(2)
    const program = enrollments.find(
      (item) => item.offeringKind === "professional-program"
    )
    const course = enrollments.find(
      (item) => item.offeringKind === "training-course"
    )
    expect(program?.batchId).toBeTruthy()
    expect(course?.batchId).toBeUndefined()
  })

  it("returns an empty list for a student with no enrollments", async () => {
    const enrollments = await studentsService.listEnrollments(
      await findByCode("STD-2026-00007")
    )
    expect(enrollments).toEqual([])
  })

  it("keeps historical labels for an archived offering", async () => {
    const enrollments = await studentsService.listEnrollments(
      await findByCode("STD-2026-00004")
    )
    const archivedOffering = enrollments.find(
      (item) => item.offeringId === "offering-archived-legacy"
    )
    expect(archivedOffering?.offeringLabel).toBe(
      "دورة مؤرشفة (بيانات تاريخية)"
    )
  })
})

describe("workspace area independence", () => {
  beforeEach(() => resetStudentStore())

  it("keeps other areas usable when one read fails", async () => {
    const studentId = await findByCode("STD-2026-00001")
    studentScenarios.failNext("documents")

    await expect(
      studentsService.listDocuments(studentId)
    ).rejects.toMatchObject({ code: "service-unavailable" })

    await expect(studentsService.get(studentId)).resolves.toBeDefined()
    await expect(
      studentsService.listEnrollments(studentId)
    ).resolves.toBeDefined()
    await expect(
      studentsService.listTimeline(studentId, { limit: 10 })
    ).resolves.toBeDefined()
  })

  it("returns not-found for an unknown identifier without disclosing anything", async () => {
    await expect(
      studentsService.get("student-does-not-exist" as StudentId)
    ).rejects.toMatchObject({ code: "not-found" })
  })
})
