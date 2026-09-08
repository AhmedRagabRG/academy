/** A failure the pipeline admin UI knows how to talk about. */
export class PipelineAdminError extends Error {
  constructor(
    readonly code:
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION"
      | "CONFLICT"
      | "DEPENDENCY_IN_USE"
      | "UNAVAILABLE"
      | "UNEXPECTED",
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly currentVersion?: number,
    readonly retryable = false
  ) {
    super(message)
    this.name = "PipelineAdminError"
  }
}
