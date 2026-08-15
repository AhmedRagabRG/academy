import { beforeEach, describe, expect, it } from "vitest"
import { createStudentIntakePort } from "@/features/students/services/student-intake-port"
import {
  resetStudentStore,
  studentsService,
} from "@/features/students/services/mock-students-service"
import type { AdmissionEnrollmentReader } from "@/features/students/services/students-dependency-readers"
import { readyInput } from "./intake-fixtures"

/**
 * The student code is never editable, so uniqueness cannot be a form rule. It is an
 * intake-time service invariant and is covered here instead (research R11).
 */
function readerForSnapshot(
  snapshot: string,
  phone: string
): AdmissionEnrollmentReader {
  return {
    async getEnrollmentReadiness() {
      return {
        ready: true,
        input: readyInput({
          approvalSnapshotId: snapshot,
          admissionId: `admission-${snapshot}`,
          applicant: {
            id: `applicant-${snapshot}`,
            name: `طالب ${snapshot}`,
            phone,
          },
        }),
      }
    },
    async getAdmissionTimelineFacts() {
      return {}
    },
  }
}

async function allCodes(): Promise<string[]> {
  const page = await studentsService.list({ page: 1, pageSize: 500 })
  return page.items.map((item) => item.studentCode)
}

describe("student code uniqueness", () => {
  beforeEach(() => resetStudentStore())

  it("allocates a unique code for every new student", async () => {
    for (let index = 0; index < 5; index += 1) {
      const port = createStudentIntakePort(
        readerForSnapshot(`snapshot-${index}`, `0101122${3340 + index}`)
      )
      await port.enrollFromAdmission({
        admissionId: `admission-snapshot-${index}`,
        expectedAdmissionVersion: 7,
      })
    }

    const codes = await allCodes()
    expect(new Set(codes).size).toBe(codes.length)
  })

  it("keeps codes unique under concurrent intake of distinct admissions", async () => {
    const ports = Array.from({ length: 6 }, (_, index) =>
      createStudentIntakePort(
        readerForSnapshot(`parallel-${index}`, `0102233${4450 + index}`)
      )
    )

    await Promise.all(
      ports.map((port, index) =>
        port.enrollFromAdmission({
          admissionId: `admission-parallel-${index}`,
          expectedAdmissionVersion: 7,
        })
      )
    )

    const codes = await allCodes()
    expect(new Set(codes).size).toBe(codes.length)
  })

  it("never reuses a code already present in the seeded store", async () => {
    const seeded = await allCodes()
    const port = createStudentIntakePort(
      readerForSnapshot("fresh", "01099887766")
    )
    const ref = await port.enrollFromAdmission({
      admissionId: "admission-fresh",
      expectedAdmissionVersion: 7,
    })

    expect(seeded).not.toContain(ref.studentCode)
  })
})
