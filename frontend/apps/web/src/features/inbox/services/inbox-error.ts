export class InboxError extends Error {
  constructor(
    readonly code:
      | "FORBIDDEN_SCOPE"
      | "FORBIDDEN_ACTION"
      | "NOT_FOUND"
      | "VALIDATION"
      | "CONFLICT"
      | "CURSOR"
      | "UNSUPPORTED_ATTACHMENT"
      | "INVALID_ATTACHMENT"
      | "INVALID_TEAM"
      | "INVALID_EMPLOYEE"
      | "INVALID_ASSIGNMENT"
      | "UNAVAILABLE"
      | "UNEXPECTED",
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly retryable = false
  ) {
    super(message)
    this.name = "InboxError"
  }
}
