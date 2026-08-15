import { ApiError } from "@/shared/api"
import {
  StudentsError,
  type StudentsErrorCode,
  type StudentsErrorDetails,
} from "./students-error"

/**
 * The backend raises exactly this module's vocabulary — `students.exceptions.ts`
 * fixes the same closed code set the UI switches on. So a recognized code is
 * carried across verbatim, and only an unrecognized one is inferred from the
 * HTTP status.
 */
const KNOWN_CODES: ReadonlySet<string> = new Set<StudentsErrorCode>([
  "not-found",
  "forbidden",
  "out-of-scope",
  "version-conflict",
  "validation-failed",
  "invalid-status-transition",
  "reason-required",
  "archived-read-only",
  "duplicate-student-code",
  "admission-not-ready",
  "admission-version-stale",
  "enrollment-batch-rule-violated",
  "unsupported-file-type",
  "file-too-large",
  "file-unreadable",
  "document-archived",
  "note-content-empty",
  "finance-unavailable",
  "service-unavailable",
])

function codeFromStatus(status: number): StudentsErrorCode {
  if (status === 404) return "not-found"
  if (status === 401 || status === 403) return "forbidden"
  if (status === 409) return "version-conflict"
  if (status === 413) return "file-too-large"
  if (status === 422) return "validation-failed"
  return "service-unavailable"
}

/**
 * Lifts the structured extras the UI needs out of the flat `details` list.
 *
 * `invalid-status-transition` carries its permitted targets as the literal
 * `allowed=a,b` on the `toStatus` detail, and the status dialog offers those as
 * choices — leaving them in the field-error map would render the raw string as
 * a validation message under the field instead.
 */
function toDetails(error: ApiError): StudentsErrorDetails {
  const details: StudentsErrorDetails = {}
  if (error.currentVersion !== undefined)
    details.currentVersion = error.currentVersion

  const allowed = error.details.find(
    (detail) =>
      detail.field === "toStatus" && detail.message.startsWith("allowed=")
  )
  if (allowed) {
    const list = allowed.message
      .slice("allowed=".length)
      .split(",")
      .filter(Boolean)
    if (list.length) details.allowed = list
  }

  if (error.code === "admission-not-ready") {
    const reasons = error.details
      .filter((detail) => detail.field === "admissionId")
      .map((detail) => detail.message)
    if (reasons.length) details.reasons = reasons
  }

  const fieldErrors = error.details.filter((detail) => detail !== allowed)
  if (fieldErrors.length)
    details.fieldErrors = Object.fromEntries(
      fieldErrors.map((detail) => [detail.field, detail.message])
    )

  return details
}

export function fromApiError(error: unknown): StudentsError {
  if (error instanceof StudentsError) return error
  if (!(error instanceof ApiError))
    return new StudentsError("service-unavailable")

  const code = KNOWN_CODES.has(error.code)
    ? (error.code as StudentsErrorCode)
    : codeFromStatus(error.status)
  // The API's Arabic prose is already the user-facing wording for these codes;
  // passing it through keeps a server-side refinement from being overwritten by
  // the generic local copy.
  return new StudentsError(code, toDetails(error), error.message)
}

/** An aborted request is the caller cancelling, not a module failure. */
export const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError"

export async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isAbort(error)) throw error
    throw fromApiError(error)
  }
}
