/** A failure the contacts UI knows how to talk about. */
export class ContactsError extends Error {
  constructor(
    readonly code:
      | "FORBIDDEN_SCOPE"
      | "FORBIDDEN_ACTION"
      | "NOT_FOUND"
      | "VALIDATION"
      | "DUPLICATE"
      | "CONFLICT"
      | "CURSOR"
      | "IN_USE"
      | "UNAVAILABLE"
      | "UNEXPECTED",
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly retryable = false
  ) {
    super(message)
    this.name = "ContactsError"
  }
}
