"use client"
import { ErrorState } from "@/shared/components/states/error-state"
export default function TicketError({ reset }: { error: Error; reset: () => void }) { return <ErrorState message="تعذر تحميل التذكرة" onRetry={reset} /> }
