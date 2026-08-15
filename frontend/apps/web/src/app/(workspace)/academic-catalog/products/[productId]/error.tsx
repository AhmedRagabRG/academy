"use client"
import { ErrorState } from "@/shared/components/states/error-state"
export default function Error({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) { return <ErrorState message="تعذر فتح المنتج." onRetry={unstable_retry} /> }
