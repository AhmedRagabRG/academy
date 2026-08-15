import { beforeEach, describe, expect, it } from "vitest"
import { createStudentIntakePort } from "@/features/students/services/student-intake-port"
import {
  resetStudentStore,
  studentsService,
} from "@/features/students/services/mock-students-service"
import type { AdmissionEnrollmentReader } from "@/features/students/services/students-dependency-readers"
import { readyInput } from "./intake-fixtures"

function readerFor(input = readyInput()): AdmissionEnrollmentReader {
  return {
    async getEnrollmentReadiness() {
      return { ready: true, input }
    },
    async getAdmissionTimelineFacts() {
      return {
        submittedAt: "2026-07-01T09:00:00.000Z",
        approvedAt: "2026-07-05T09:00:00.000Z",
      }
    },
  }
}

const command = { admissionId: "admission-new", expectedAdmissionVersion: 7 }

async function totals() {
  const page = await studentsService.list({ page: 1, pageSize: 500 })
  return page.total
}

describe("student intake idempotency", () => {
  beforeEach(() => resetStudentStore())

  it("creates exactly one student on first success", async () => {
    const before = await totals()
    const port = createStudentIntakePort(readerFor())

    const ref = await port.enrollFromAdmission(command)

    expect(await totals()).toBe(before + 1)
    expect(ref.studentCode).toMatch(/^STD-2026-\d{5}$/)
  })

  it("returns the same student when the same approval snapshot is resubmitted", async () => {
    const port = createStudentIntakePort(readerFor())

    const first = await port.enrollFromAdmission(command)
    const after = await totals()
    const second = await port.enrollFromAdmission(command)

    expect(second).toEqual(first)
    expect(await totals()).toBe(after)
  })

  it("resolves concurrent submissions of the same snapshot to one student", async () => {
    const port = createStudentIntakePort(readerFor())
    const before = await totals()

    const refs = await Promise.all([
      port.enrollFromAdmission(command),
      port.enrollFromAdmission(command),
      port.enrollFromAdmission(command),
    ])

    expect(new Set(refs.map((ref) => ref.studentId)).size).toBe(1)
    expect(await totals()).toBe(before + 1)
  })

  it("creates no duplicate timeline events on resubmission", async () => {
    const port = createStudentIntakePort(readerFor())
    const ref = await port.enrollFromAdmission(command)
    const first = await studentsService.listTimeline(ref.studentId, {
      limit: 100,
    })

    await port.enrollFromAdmission(command)
    const second = await studentsService.listTimeline(ref.studentId, {
      limit: 100,
    })

    expect(second.items).toHaveLength(first.items.length)
  })

  it("appends a second enrollment to the same student for a different admission", async () => {
    const port = createStudentIntakePort(readerFor())
    const ref = await port.enrollFromAdmission(command)
    const before = await totals()

    const secondAdmission = createStudentIntakePort(
      readerFor(
        readyInput({
          admissionId: "admission-second",
          approvalSnapshotId: "approval-new-002",
          academicTarget: {
            kind: "training-course",
            offeringId: "offering-course-excel",
            offeringVersion: 2,
          },
        })
      )
    )
    const secondRef = await secondAdmission.enrollFromAdmission({
      admissionId: "admission-second",
      expectedAdmissionVersion: 7,
    })

    expect(secondRef.studentId).toBe(ref.studentId)
    expect(await totals()).toBe(before)
    const enrollments = await studentsService.listEnrollments(ref.studentId)
    expect(enrollments).toHaveLength(2)
  })

  it("refuses a program without a batch and a course carrying one", async () => {
    const noBatch = createStudentIntakePort(
      readerFor(
        readyInput({
          approvalSnapshotId: "approval-bad-1",
          academicTarget: {
            kind: "professional-program",
            offeringId: "offering-program-fullstack",
            offeringVersion: 3,
          },
        })
      )
    )
    await expect(
      noBatch.enrollFromAdmission(command)
    ).rejects.toMatchObject({ code: "enrollment-batch-rule-violated" })

    const courseWithBatch = createStudentIntakePort(
      readerFor(
        readyInput({
          approvalSnapshotId: "approval-bad-2",
          academicTarget: {
            kind: "training-course",
            offeringId: "offering-course-excel",
            offeringVersion: 2,
            batchId: "batch-fs-2026-a",
          },
        })
      )
    )
    await expect(
      courseWithBatch.enrollFromAdmission(command)
    ).rejects.toMatchObject({ code: "enrollment-batch-rule-violated" })
  })
})
