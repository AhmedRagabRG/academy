"use client"

import { ErrorState } from "@/shared/components/states/error-state"

export default function Error({
  unstable_retry,
}: {
  error: Error
  unstable_retry: () => void
}) {
  return <ErrorState message="تعذر تحميل مستندات الطالب." onRetry={unstable_retry} />
}
