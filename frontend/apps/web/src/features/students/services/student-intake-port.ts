import type { EnrollFromAdmissionCommand } from "../types/commands"
import type { StudentRef } from "../types/projections"
import { studentsPermissions } from "../config/students-permissions"
import { hasStudentPermission } from "../utils/students-scope"
import { StudentsError } from "./students-error"
import { materializeFromAdmission } from "./mock-students-service"
import { scenarioContext } from "./mock-scenario-controller"
import { studentDependencyReaders } from "./students-dependency-adapters"
import type { AdmissionEnrollmentReader } from "./students-dependency-readers"

/**
 * The inbound boundary between Admissions and Student Management.
 *
 * Admissions never writes a student and Students never writes an admission: this
 * port pulls the approved enrollment outcome and materializes the record here.
 * It is idempotent on the admission's approval snapshot, so repeated or concurrent
 * confirmation always resolves to the same student (spec FR-002, FR-003).
 */
export interface StudentIntakePort {
  enrollFromAdmission(
    command: EnrollFromAdmissionCommand,
    signal?: AbortSignal
  ): Promise<StudentRef>
}

export function createStudentIntakePort(
  reader: AdmissionEnrollmentReader = studentDependencyReaders.admissions
): StudentIntakePort {
  return {
    async enrollFromAdmission(command, signal) {
      const context = scenarioContext()
      if (!hasStudentPermission(context, studentsPermissions.intake))
        throw new StudentsError("forbidden")

      const readiness = await reader.getEnrollmentReadiness(
        command.admissionId,
        signal
      )
      if (!readiness.ready)
        throw new StudentsError("admission-not-ready", {
          reasons: readiness.reasons,
        })

      if (readiness.input.admissionVersion !== command.expectedAdmissionVersion)
        throw new StudentsError("admission-version-stale", {
          currentVersion: readiness.input.admissionVersion,
        })

      const facts = await reader
        .getAdmissionTimelineFacts(command.admissionId, signal)
        .catch(() => ({}))

      return materializeFromAdmission(readiness.input, context, facts)
    },
  }
}

export const studentIntakePort: StudentIntakePort = createStudentIntakePort()
