import { beforeEach, describe, expect, it } from "vitest"
import { createStudentIntakePort } from "@/features/students/services/student-intake-port"
import { resetStudentStore } from "@/features/students/services/mock-students-service"
import { studentScenarios } from "@/features/students/services/mock-scenario-controller"
import { StudentsError } from "@/features/students/services/students-error"
import { studentsService } from "@/features/students/services/mock-students-service"
import type { AdmissionEnrollmentReader } from "@/features/students/services/students-dependency-readers"
import { readyInput } from "./intake-fixtures"

const notReadyReader: AdmissionEnrollmentReader = {
  async getEnrollmentReadiness() {
    return { ready: false, reasons: ["not-approved"], admissionVersion: 4 }
  },
  async getAdmissionTimelineFacts() {
    return {}
  },
}

const readyReader: AdmissionEnrollmentReader = {
  async getEnrollmentReadiness() {
    return { ready: true, input: readyInput() }
  },
  async getAdmissionTimelineFacts() {
    return { submittedAt: "2026-07-01T09:00:00.000Z", approvedAt: "2026-07-05T09:00:00.000Z" }
  },
}

async function countStudents() {
  const page = await studentsService.list({ page: 1, pageSize: 200 })
  return page.total
}

describe("student intake refusal", () => {
  beforeEach(() => resetStudentStore())

  it("refuses an admission that is not ready and creates nothing", async () => {
    const before = await countStudents()
    const port = createStudentIntakePort(notReadyReader)

    await expect(
      port.enrollFromAdmission({
        admissionId: "admission-x",
        expectedAdmissionVersion: 4,
      })
    ).rejects.toMatchObject({ code: "admission-not-ready" })

    expect(await countStudents()).toBe(before)
  })

  it("carries the refusal reasons through", async () => {
    const port = createStudentIntakePort(notReadyReader)
    const error = await port
      .enrollFromAdmission({
        admissionId: "admission-x",
        expectedAdmissionVersion: 4,
      })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(StudentsError)
    expect((error as StudentsError).details.reasons).toEqual(["not-approved"])
  })

  it("refuses a stale admission version and creates nothing", async () => {
    const before = await countStudents()
    const port = createStudentIntakePort(readyReader)

    await expect(
      port.enrollFromAdmission({
        admissionId: "admission-new",
        expectedAdmissionVersion: 99,
      })
    ).rejects.toMatchObject({ code: "admission-version-stale" })

    expect(await countStudents()).toBe(before)
  })

  it("refuses intake without the students.intake permission", async () => {
    studentScenarios.withoutPermissions(["students.intake"])
    const port = createStudentIntakePort(readyReader)

    await expect(
      port.enrollFromAdmission({
        admissionId: "admission-new",
        expectedAdmissionVersion: 7,
      })
    ).rejects.toMatchObject({ code: "forbidden" })
  })
})
