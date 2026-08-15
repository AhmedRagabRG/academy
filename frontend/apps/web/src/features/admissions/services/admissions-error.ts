export type AdmissionsErrorKind =
  | "validation"
  | "conflict"
  | "permission"
  | "not-found"
  | "dependency"
  | "upload"
  | "unavailable"
  | "unexpected"

export class AdmissionsError extends Error {
  constructor(
    readonly code: string,
    readonly kind: AdmissionsErrorKind,
    readonly messageKey: string,
    readonly retryable = false,
    readonly fieldErrors?: Record<string, string>,
    readonly currentVersion?: number
  ) {
    super(messageKey)
    this.name = "AdmissionsError"
  }
}

export function toAdmissionsError(error: unknown): AdmissionsError {
  if (error instanceof AdmissionsError) return error
  return new AdmissionsError(
    "unexpected",
    "unexpected",
    "حدث خطأ غير متوقع. حاول مرة أخرى.",
    true
  )
}
