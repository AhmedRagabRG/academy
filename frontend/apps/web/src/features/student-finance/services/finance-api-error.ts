import { ApiError } from "@/shared/api"
import {
  FinanceError,
  type FinanceErrorCode,
  type FinanceErrorDetails,
} from "./finance-error"

/**
 * The API raises this module's own vocabulary — `student-finance.exceptions.ts`
 * uses the same kebab-case codes the UI switches on — so a recognized code is
 * carried across verbatim and only an unknown one is inferred from the status.
 */
const KNOWN_CODES: ReadonlySet<string> = new Set<FinanceErrorCode>([
  "not-found",
  "forbidden",
  "out-of-scope",
  "version-conflict",
  "validation-failed",
  "invoice-immutable",
  "invoice-not-payable",
  "invoice-has-payments",
  "payment-exceeds-balance",
  "installment-exceeds-remaining",
  "payment-method-inactive",
  "payment-immutable",
  "installments-not-permitted",
  "plan-has-payments",
  "reduction-exceeds-limit",
  "reduction-below-collected",
  "negative-amount",
  "invalid-currency",
  "invalid-date-range",
  "refund-exceeds-payment",
  "refund-requires-payment",
  "duplicate-number",
  "service-unavailable",
])

function codeFromStatus(status: number): FinanceErrorCode {
  if (status === 404) return "not-found"
  if (status === 401 || status === 403) return "forbidden"
  if (status === 409) return "version-conflict"
  if (status === 422) return "validation-failed"
  return "service-unavailable"
}

/**
 * Lifts the balance figures out of the flat detail list.
 *
 * A refusal like `payment-exceeds-balance` is only actionable if the user is
 * told what was actually available, and the API reports that as a detail keyed
 * by the figure's name rather than by a form field.
 */
function toDetails(error: ApiError): FinanceErrorDetails {
  const details: FinanceErrorDetails = {}
  if (error.currentVersion !== undefined)
    details.currentVersion = error.currentVersion

  const named = new Map(error.details.map((d) => [d.field, d.message]))
  for (const key of ["remaining", "refundable", "collected", "limit"] as const) {
    const value = named.get(key)
    if (value) details[key] = value
  }

  const fieldErrors = error.details.filter(
    (d) => !["remaining", "refundable", "collected", "limit"].includes(d.field)
  )
  if (fieldErrors.length)
    details.fieldErrors = Object.fromEntries(
      fieldErrors.map((d) => [d.field, d.message])
    )

  return details
}

export function fromApiError(error: unknown): FinanceError {
  if (error instanceof FinanceError) return error
  if (!(error instanceof ApiError)) return new FinanceError("service-unavailable")

  const code = KNOWN_CODES.has(error.code)
    ? (error.code as FinanceErrorCode)
    : codeFromStatus(error.status)
  // The API's Arabic wording is already the user-facing copy for these codes;
  // passing it through keeps a server-side refinement from being replaced by
  // the generic local string.
  return new FinanceError(code, toDetails(error), error.message)
}

/** An aborted request is the caller cancelling, not a module failure. */
export const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError"

export async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isAbort(error)) throw error
    throw fromApiError(error)
  }
}
