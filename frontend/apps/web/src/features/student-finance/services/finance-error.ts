import { financeErrorCopy } from "../config/finance-error-copy"

/** Every failure mode this module can produce. No generic fallback code exists. */
export type FinanceErrorCode =
  | "not-found"
  | "forbidden"
  | "out-of-scope"
  | "version-conflict"
  | "validation-failed"
  | "invoice-immutable"
  | "invoice-not-payable"
  | "invoice-has-payments"
  | "payment-exceeds-balance"
  | "installment-exceeds-remaining"
  | "payment-method-inactive"
  | "payment-immutable"
  | "installments-not-permitted"
  | "plan-has-payments"
  | "reduction-exceeds-limit"
  | "reduction-below-collected"
  | "negative-amount"
  | "invalid-currency"
  | "invalid-date-range"
  | "refund-exceeds-payment"
  | "refund-requires-payment"
  | "duplicate-number"
  | "service-unavailable"

export interface FinanceErrorDetails {
  currentVersion?: number
  fieldErrors?: Record<string, string>
  /** Present on balance refusals so the UI can show what was actually available. */
  remaining?: string
  refundable?: string
  collected?: string
  limit?: string
  fromStatus?: string
  toStatus?: string
  allowed?: string[]
}

const retryableCodes: ReadonlySet<FinanceErrorCode> = new Set([
  "service-unavailable",
])

export class FinanceError extends Error {
  readonly retryable: boolean

  constructor(
    readonly code: FinanceErrorCode,
    readonly details: FinanceErrorDetails = {},
    message?: string
  ) {
    super(message ?? financeErrorCopy[code])
    this.name = "FinanceError"
    this.retryable = retryableCodes.has(code)
  }
}

export function isFinanceError(error: unknown): error is FinanceError {
  return error instanceof FinanceError
}

export function toFinanceError(error: unknown): FinanceError {
  if (isFinanceError(error)) return error
  return new FinanceError("service-unavailable")
}

export function financeErrorMessage(code: FinanceErrorCode): string {
  return financeErrorCopy[code]
}
