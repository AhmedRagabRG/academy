import { EmptyState } from "@/shared/components/states/empty-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"

export function InboxForbiddenState() {
  return (
    <EmptyState
      title="لا يمكنك الوصول إلى صندوق الوارد"
      description="اطلب من مسؤول النظام منحك نطاق عرض مناسبًا."
    />
  )
}

export function InboxAreaState({
  loading,
  error,
  empty,
  children,
  onRetry,
}: {
  loading: boolean
  error?: Error | null
  empty: boolean
  children: React.ReactNode
  onRetry?: () => void
}) {
  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />
  if (empty) return <EmptyState />
  return children
}
