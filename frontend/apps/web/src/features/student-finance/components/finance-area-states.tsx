"use client"

import { EmptyState } from "@/shared/components/states/empty-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { usePermission } from "@/shared/hooks/use-permission"
import { financeCopy } from "../config/finance-copy"
import { isFinanceError } from "../services/finance-error"

/** Renders children only when the acting user holds the permission. */
export function FinancePermission({
  permission,
  children,
  fallback = null,
}: {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return usePermission(permission) ? children : fallback
}

/** A withheld area states that it is forbidden rather than appearing empty. */
export function FinanceForbiddenState({
  message = financeCopy.forbidden,
}: {
  message?: string
}) {
  return (
    <section
      role="note"
      className="border-border bg-card text-muted-foreground flex min-h-32 items-center justify-center rounded-xl border p-8 text-center"
    >
      {message}
    </section>
  )
}

/**
 * One area's read state. Each finance area renders its own instance so a failing
 * or forbidden area never takes the rest of the workspace down.
 *
 * `isEmpty` is deliberately separate from "zero balance": an empty state means
 * there are no records, which is a fact worth stating, not missing data.
 */
export function FinanceAreaState({
  permission,
  loading,
  error,
  onRetry,
  isEmpty = false,
  emptyTitle,
  emptyDescription,
  loadingLabel,
  children,
}: {
  permission?: string
  loading: boolean
  error?: unknown
  onRetry?: () => void
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  loadingLabel?: string
  children: React.ReactNode
}) {
  const allowed = usePermission(permission ?? "")
  if (permission && !allowed) return <FinanceForbiddenState />
  if (loading) return <LoadingState label={loadingLabel} />
  if (error) {
    const message = isFinanceError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : undefined
    const retryable = isFinanceError(error) ? error.retryable : true
    return (
      <ErrorState message={message} onRetry={retryable ? onRetry : undefined} />
    )
  }
  if (isEmpty)
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  return children
}

/** Isolates mixed-direction values: invoice numbers, receipt numbers, dates. */
export function FinanceBidiValue({
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
