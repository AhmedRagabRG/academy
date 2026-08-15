export type OrganizationSettingsErrorKind = "validation" | "duplicate" | "not-found" | "permission" | "dependency" | "state" | "version-conflict" | "unexpected"

export class OrganizationSettingsError extends Error {
  constructor(
    readonly code: string,
    readonly kind: OrganizationSettingsErrorKind,
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly retryable = false,
  ) {
    super(message)
    this.name = "OrganizationSettingsError"
  }
}
