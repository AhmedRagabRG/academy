/**
 * The single error type every backend call raises.
 *
 * The API answers failures with a stable envelope — `{ success: false, error:
 * { code, message, details? } }` — and each feature maps its own error class
 * from this one. Keeping the transport error separate from the feature errors
 * is what lets a feature translate a backend `code` into its own vocabulary
 * without the HTTP layer having to know that vocabulary exists.
 */
export interface ApiErrorDetail {
  field: string
  message: string
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
    /** Present on version conflicts so a caller can refresh without a re-read. */
    readonly currentVersion?: number
  ) {
    super(message)
    this.name = "ApiError"
  }

  /** Field errors keyed by field name, the shape every form layer expects. */
  get fieldErrors(): Record<string, string> | undefined {
    if (!this.details.length) return undefined
    return Object.fromEntries(
      this.details.map((detail) => [detail.field, detail.message])
    )
  }
}

/**
 * A transport failure — the request never reached the API.
 *
 * The originating error is kept as `cause`: the user-facing message is
 * deliberately generic, and without the cause a DNS failure, a refused
 * connection and a CORS rejection are indistinguishable in a bug report.
 */
export class NetworkError extends ApiError {
  constructor(
    cause?: unknown,
    message = "تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مجددًا."
  ) {
    super(0, "NETWORK_ERROR", message)
    this.name = "NetworkError"
    this.cause = cause
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError
