/** A failure the pipeline UI knows how to talk about. */
export class PipelineError extends Error {
  constructor(
    readonly code:
      | "FORBIDDEN_SCOPE"
      | "FORBIDDEN_ACTION"
      | "NOT_FOUND"
      | "VALIDATION"
      | "CONFLICT"
      | "NOT_CONFIGURED"
      | "UNAVAILABLE"
      | "UNEXPECTED",
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly retryable = false
  ) {
    super(message)
    this.name = "PipelineError"
  }
}
