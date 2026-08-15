import { accountingErrorCopy } from "../config/accounting-error-copy"

/**
 * A closed union of stable codes, not messages.
 *
 * A backend can map its own failures onto these without the UI parsing prose,
 * and every code has its own Arabic message with no generic fallback.
 */
export type AccountingErrorCode =
  | "forbidden"
  | "out-of-scope"
  | "not-found"
  | "version-conflict"
  | "invalid-transition"
  | "note-required"
  | "not-editable"
  | "category-required"
  | "category-inactive"
  | "subcategory-mismatch"
  | "amount-not-positive"
  | "amount-invalid"
  | "attachment-type-rejected"
  | "attachment-too-large"
  | "duplicate-name"
  | "validation-failed"
  | "invalid-date-range"
  /**
   * The action is part of this module's model but the API serves no route for
   * it. Distinct from `forbidden`, which means the caller lacks authority for
   * something the API does implement — retrying with wider permissions would
   * not help here.
   */
  | "unsupported"

export interface AccountingErrorDetails {
  /** For `invalid-transition`: why the action is unavailable. */
  from?: string
  to?: string
  /** For `version-conflict`: what the record actually holds now. */
  currentVersion?: number
  /** For attachment refusals: the limit that was exceeded. */
  limit?: string
  acceptedTypes?: string
  /** For `duplicate-name`: the name already in use. */
  name?: string
  field?: string
}

export class AccountingError extends Error {
  readonly code: AccountingErrorCode
  readonly details: AccountingErrorDetails

  constructor(
    code: AccountingErrorCode,
    details: AccountingErrorDetails = {},
    message?: string
  ) {
    super(message ?? accountingErrorCopy[code])
    this.name = "AccountingError"
    this.code = code
    this.details = details
  }
}

export function isAccountingError(error: unknown): error is AccountingError {
  return error instanceof AccountingError
}
