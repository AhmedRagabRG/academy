import type { Metadata } from "next"
import { ExpenseRequestDetailScreen } from "@/features/accounting"

export const metadata: Metadata = { title: "تفاصيل الطلب" }

export default async function Page({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params
  return <ExpenseRequestDetailScreen requestId={requestId} />
}
