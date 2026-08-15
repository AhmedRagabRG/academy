export class ProgramBatchError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly kind:
      | "validation"
      | "conflict"
      | "forbidden"
      | "not-found"
      | "unavailable"
      | "unexpected" = "unexpected",
    readonly fieldErrors?: Record<string, string>,
    readonly retryable = false
  ) {
    super(message)
    this.name = "ProgramBatchError"
  }
}
