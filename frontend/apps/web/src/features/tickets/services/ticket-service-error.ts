export class TicketServiceError extends Error {
  constructor(
    readonly code:
      | "forbidden"
      | "not-found"
      | "validation"
      | "version-conflict"
      | "invalid-transition"
      | "assignment-mismatch"
      | "unsupported-attachment"
      | "attachment-too-large"
      | "attachment-unreadable"
      | "cursor-invalid"
      | "cursor-query-mismatch"
      | "no-op"
      | "unexpected",
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly currentVersion?: number
  ) {
    super(message)
    this.name = "TicketServiceError"
  }
}
