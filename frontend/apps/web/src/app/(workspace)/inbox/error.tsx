"use client"
import { ErrorState } from "@/shared/components/states/error-state"
export default function InboxError({ reset }: { error: Error; reset: () => void }) { return <ErrorState message="تعذر فتح صندوق الوارد" onRetry={reset} /> }
