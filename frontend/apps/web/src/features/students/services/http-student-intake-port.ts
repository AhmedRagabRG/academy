import { httpClient } from "@/shared/api"
import type { StudentId } from "../types/common"
import type { StudentRef } from "../types/projections"
import { guard } from "./students-api-error"
import type { StudentIntakePort } from "./student-intake-port"
import type { ApiStudentDetail } from "./students-mapper"

/**
 * Intake against the API.
 *
 * The command carries only the admission and the version the caller read:
 * identity, pricing and academic target are resolved server-side from the
 * admission's approval snapshot, so nothing about the student can be injected
 * from here. Readiness is not pre-checked either — the API refuses an unready
 * admission with `admission-not-ready` and its reasons, and a second check
 * client-side would only add a race.
 */
export const httpStudentIntakePort: StudentIntakePort = {
  async enrollFromAdmission(command): Promise<StudentRef> {
    return guard(async () => {
      const student = await httpClient.post<ApiStudentDetail>(
        "/students/intake",
        {
          admissionId: command.admissionId,
          admissionVersion: command.expectedAdmissionVersion,
        }
      )
      return {
        studentId: student.id as StudentId,
        studentCode: student.studentCode,
      }
    })
  },
}
