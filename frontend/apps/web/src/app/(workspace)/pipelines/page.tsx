import type { Metadata } from "next"
import { PipelineManagementScreen } from "@/features/pipeline-management"

export const metadata: Metadata = {
  title: "إعدادات المسارات",
  description: "إدارة مسارات المبيعات ومراحلها والمسار الافتراضي للمؤسسة",
}

export default async function PipelinesPage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string }>
}) {
  const params = await searchParams
  return <PipelineManagementScreen initialPipelineId={params.pipeline} />
}
