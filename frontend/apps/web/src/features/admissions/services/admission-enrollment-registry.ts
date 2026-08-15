import type { AdmissionId } from "../types/common"

export interface AdmissionEnrollmentResult {
  studentId: string
  studentCode: string
}

export interface AdmissionEnrollmentHandler {
  enroll(
    admissionId: AdmissionId,
    expectedAdmissionVersion: number
  ): Promise<AdmissionEnrollmentResult>
}

/**
 * Registration point for "turn this approved admission into a student".
 *
 * Enrolling is deliberately not a status transition: the API's status route
 * refuses `enrolled` outright, because a student is created by
 * `POST /students/intake` and the admission's status follows from that. So the
 * action cannot be served from inside this module, and Admissions must not
 * import Student Management — that direction would close a cycle, since
 * Students already reads Admissions.
 *
 * Student Management registers its intake port here at the composition root
 * instead. With nothing registered the action is simply unavailable, which is
 * honest: the button is hidden rather than offered and then failing.
 */
let registered: AdmissionEnrollmentHandler | undefined

export function registerAdmissionEnrollmentHandler(
  handler: AdmissionEnrollmentHandler
): void {
  registered = handler
}

export function resolveAdmissionEnrollmentHandler():
  | AdmissionEnrollmentHandler
  | undefined {
  return registered
}

/** Restores the unregistered state. Used by tests between cases. */
export function resetAdmissionEnrollmentHandler(): void {
  registered = undefined
}
