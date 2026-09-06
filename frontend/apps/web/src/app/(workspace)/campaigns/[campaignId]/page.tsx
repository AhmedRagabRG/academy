import type { Metadata } from "next"
import { CampaignDetailScreen } from "@/features/campaigns"

export const metadata: Metadata = { title: "تفاصيل حملة واتساب" }

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  return <CampaignDetailScreen campaignId={campaignId} />
}
