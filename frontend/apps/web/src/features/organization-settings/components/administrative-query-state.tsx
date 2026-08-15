import { ErrorState } from "@/shared/components/states/error-state"
import { LoadingState } from "@/shared/components/states/loading-state"
export function AdministrativeQueryState({ loading, error, onRetry, children }: { loading: boolean; error?: Error | null; onRetry?: () => void; children: React.ReactNode }) { if (loading) return <LoadingState />; if (error) return <ErrorState message={error.message} onRetry={onRetry} />; return children }
