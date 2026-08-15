"use client"

import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
export function AdmissionDocumentState({
  loading,
  error,
  children,
}: {
  loading: boolean
  error?: Error | null
  children: React.ReactNode
}) {
  if (loading) return <LoadingState label="جارٍ تحميل المستندات" />
  if (error) return <ErrorState message={error.message} />
  return children
}
