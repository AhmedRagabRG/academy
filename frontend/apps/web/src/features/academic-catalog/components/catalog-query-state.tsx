import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
import { getCatalogErrorMessage } from "../utils/service-error-mapping"
export function CatalogQueryState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean
  error?: unknown
  retry?: () => void
  children: React.ReactNode
}) {
  if (loading) return <LoadingState />
  if (error)
    return (
      <ErrorState message={getCatalogErrorMessage(error)} onRetry={retry} />
    )
  return children
}
