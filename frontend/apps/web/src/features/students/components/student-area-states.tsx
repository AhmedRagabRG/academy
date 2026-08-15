"use client"

import { EmptyState } from "@/shared/components/states/empty-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { usePermission } from "@/shared/hooks/use-permission"
import { studentsCopy } from "../config/students-copy"
import { isStudentsError } from "../services/students-error"

/** Renders children only when the acting employee holds the permission. */
export function StudentPermission({
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
export function StudentForbiddenState({
  message = studentsCopy.forbidden,
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
 * One area's read state. Each workspace area renders its own instance, so a
 * failing or forbidden area never takes the rest of the workspace down
 * (spec US3-5, US3-6).
 */
export function StudentAreaState({
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
  if (permission && !allowed) return <StudentForbiddenState />
  if (loading) return <LoadingState label={loadingLabel} />
  if (error) {
    const message = isStudentsError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : undefined
    const retryable = isStudentsError(error) ? error.retryable : true
    return (
      <ErrorState message={message} onRetry={retryable ? onRetry : undefined} />
    )
  }
  if (isEmpty)
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  return children
}

/** Isolates mixed-direction values (codes, phones, identifiers, money, dates). */
export function StudentBidiValue({
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
