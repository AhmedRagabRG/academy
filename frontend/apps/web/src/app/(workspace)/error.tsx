"use client"
import { ErrorState } from "@/shared/components/states/error-state"
export default function WorkspaceError({ unstable_retry }: { unstable_retry: () => void }) { return <ErrorState onRetry={unstable_retry} /> }
