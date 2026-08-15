"use client"

import { usePermission } from "@/shared/hooks/use-permission"
import { EmptyState } from "@/shared/components/states/empty-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { accountingCopy } from "../config/accounting-copy"
import { isAccountingError } from "../services/accounting-error"

/**
 * Renders children only for a permitted user.
 *
 * An affordance only — the service performs the authoritative check on every
 * operation, so hiding a control never stands in for enforcement.
 */
export function AccountingPermission({
  permission,
  children,
  fallback,
}: {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const allowed = usePermission(permission)
  if (!allowed) return <>{fallback ?? <AccountingForbiddenState />}</>
  return <>{children}</>
}

/** A refusal is presented as a refusal, never as an empty result (FR-048). */
export function AccountingForbiddenState({
  message = accountingCopy.forbidden,
}: {
  message?: string
}) {
  return (
    <section
      role="status"
      className="border-border bg-card flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border p-8 text-center"
    >
      <p className="font-medium">{message}</p>
    </section>
  )
}

/**
 * The one place loading, error, forbidden, and content are distinguished, so no
 * screen can accidentally render an outage as an empty list.
 */
export function AccountingAreaState({
  permission,
  loading,
  error,
  onRetry,
  loadingLabel,
  children,
}: {
  permission?: string
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  loadingLabel: string
  children: React.ReactNode
}) {
  const content = (
    <>
      {loading && <LoadingState label={loadingLabel} />}
      {!loading && error && (
        <ErrorState
          message={
            isAccountingError(error)
              ? error.message
              : ((error as Error)?.message ?? accountingCopy.retry)
          }
          onRetry={onRetry}
        />
      )}
      {!loading && !error && children}
    </>
  )
  if (!permission) return content
  return <AccountingPermission permission={permission}>{content}</AccountingPermission>
}

/** Isolates mixed-direction values: amounts, request numbers, dates, file sizes. */
export function AccountingBidiValue({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <bdi dir="ltr" className={className}>
      {children}
    </bdi>
  )
}

/** Distinguishes "nothing matched these filters" from "nothing exists" (FR-042). */
export function AccountingEmptyState({
  filtered,
  emptyTitle,
  emptyDescription,
  filteredTitle,
  onClearFilters,
}: {
  filtered: boolean
  emptyTitle: string
  emptyDescription?: string
  filteredTitle: string
  onClearFilters?: () => void
}) {
  if (!filtered)
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  return (
    <EmptyState
      title={filteredTitle}
      action={
        onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="focus-visible:ring-ring rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
          >
            {accountingCopy.clearFilters}
          </button>
        )
      }
    />
  )
}
