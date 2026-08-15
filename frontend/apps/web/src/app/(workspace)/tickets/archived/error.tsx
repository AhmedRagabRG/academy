"use client"
import { ErrorState } from "@/shared/components/states/error-state"
export default function ArchivedError({ reset }: { error: Error; reset: () => void }) { return <ErrorState message="تعذر تحميل الأرشيف" onRetry={reset} /> }
