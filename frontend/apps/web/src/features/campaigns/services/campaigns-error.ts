/** A failure the campaigns UI knows how to talk about. */
export class CampaignsError extends Error {
  constructor(
    readonly code:
      | "FORBIDDEN_SCOPE"
      | "FORBIDDEN_ACTION"
      | "NOT_FOUND"
      | "VALIDATION"
      | "DUPLICATE"
      | "CONFLICT"
      | "CURSOR"
      | "CHANNEL_MISSING"
      | "META_AUTH"
      | "META_REJECTED"
      | "RATE_LIMITED"
      | "TEMPLATE_INVALID"
      | "AUDIENCE_EMPTY"
      | "UNAVAILABLE"
      | "UNEXPECTED",
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly currentVersion?: number,
    readonly retryable = false
  ) {
    super(message)
    this.name = "CampaignsError"
  }
}
