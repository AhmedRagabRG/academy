import type { Metadata } from "next"
import { StudentTimelineScreen } from "@/features/students"

export const metadata: Metadata = { title: "السجل الزمني للطالب" }

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  return <StudentTimelineScreen studentId={studentId} />
}
