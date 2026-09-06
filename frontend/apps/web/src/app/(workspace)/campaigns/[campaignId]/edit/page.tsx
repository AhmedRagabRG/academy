import type { Metadata } from "next"
import { CampaignBuilderScreen } from "@/features/campaigns"

export const metadata: Metadata = { title: "تعديل حملة واتساب" }

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  return <CampaignBuilderScreen campaignId={campaignId} />
}
