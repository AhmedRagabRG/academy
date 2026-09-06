import type { Metadata } from "next"
import { PipelineScreen } from "@/features/lead-pipeline"

export const metadata: Metadata = {
  title: "مسار المبيعات",
  description: "متابعة فرص العملاء وتحريكها بين مراحل مسار القبول والمبيعات",
}

export default async function LeadPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>
}) {
  const params = await searchParams
  return <PipelineScreen initialLeadId={params.lead} />
}
