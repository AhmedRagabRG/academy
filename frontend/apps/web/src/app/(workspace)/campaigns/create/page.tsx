import type { Metadata } from "next"
import { CampaignBuilderScreen } from "@/features/campaigns"

export const metadata: Metadata = { title: "حملة واتساب جديدة" }

export default function CreateCampaignPage() {
  return <CampaignBuilderScreen />
}
