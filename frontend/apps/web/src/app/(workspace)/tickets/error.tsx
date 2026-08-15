"use client"
import { ErrorState } from "@/shared/components/states/error-state"
export default function TicketsError({ reset }: { error: Error; reset: () => void }) { return <ErrorState message="تعذر فتح إدارة التذاكر" onRetry={reset} /> }
