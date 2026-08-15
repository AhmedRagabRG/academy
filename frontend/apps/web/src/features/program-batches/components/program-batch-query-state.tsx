"use client"
import { LoadingState } from "@/shared/components/states/loading-state"
import { ErrorState } from "@/shared/components/states/error-state"
export function BatchQueryState({
  loading,
  error,
  children,
}: {
  loading: boolean
  error?: Error | null
  children: React.ReactNode
}) {
  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error.message} />
  return children
}
