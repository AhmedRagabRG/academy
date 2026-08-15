import { registerStudentFinanceReader, studentIntakePort } from "@/features/students"
import { registerAdmissionEnrollmentHandler } from "@/features/admissions"
import { studentFinanceReaderAdapter } from "@/features/student-finance"

/**
 * Composition root for cross-module wiring.
 *
 * Modules never reach into each other: one side declares a port, the other
 * registers an adapter, and this file — which belongs to neither — is the only
 * place that knows about both. Keeping the wiring here is what stops
 * `students → student-finance → students` from becoming a cycle.
 *
 * Importing this module performs the registration once; it is idempotent, so a
 * second import in a test or a fast-refresh cycle is harmless.
 */
let wired = false

export function registerModules(): void {
  if (wired) return
  registerStudentFinanceReader(studentFinanceReaderAdapter)
  registerAdmissionEnrollmentHandler({
    enroll: (admissionId, expectedAdmissionVersion) =>
      studentIntakePort.enrollFromAdmission({
        admissionId,
        expectedAdmissionVersion,
      }),
  })
  wired = true
}

registerModules()
