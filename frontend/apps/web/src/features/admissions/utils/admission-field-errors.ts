import type { FieldValues, Path, UseFormSetError } from "react-hook-form"
import { AdmissionsError } from "../services/admissions-error"

/**
 * Field names as the admission form knows them, keyed by the API's path.
 *
 * The API answers a refused save with the path it validated, and those paths
 * do not always match the form. `input.` is a wrapper the request body adds
 * and the form never had; `applicant.notes` is rendered as `applicant.notes`
 * but arrives unprefixed on some routes. Anything already matching a form
 * field passes through untouched.
 */
const PREFIXES = ["input.", "body."]

const ALIASES: Record<string, string> = {
  // The offering-level refusals name the branch the *product* rejected; the
  // form's control for that is the assignment branch the user picked.
  registrationBranchId: "assignment.registrationBranchId",
  studyBranchId: "assignment.studyBranchId",
  offeringId: "selection.offeringId",
  batchId: "selection.batchId",
  qualificationId: "applicant.qualificationId",
}

export function toFormFieldPath(field: string): string {
  let path = field
  for (const prefix of PREFIXES)
    if (path.startsWith(prefix)) path = path.slice(prefix.length)
  return ALIASES[path] ?? path
}

/**
 * Applies a refused save onto the form.
 *
 * Returns whether anything was marked, so a caller can fall back to a toast
 * when the failure names no field at all.
 */
export function applyAdmissionFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>
): boolean {
  if (!(error instanceof AdmissionsError) || !error.fieldErrors) return false
  const entries = Object.entries(error.fieldErrors)
  if (!entries.length) return false
  for (const [field, message] of entries)
    setError(toFormFieldPath(field) as Path<T>, { type: "server", message })
  return true
}
