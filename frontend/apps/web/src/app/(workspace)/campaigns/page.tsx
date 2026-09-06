import type { Metadata } from "next"
import { CampaignsScreen } from "@/features/campaigns"

export const metadata: Metadata = {
  title: "حملات واتساب",
  description: "إنشاء ومتابعة حملات واتساب من قوالب Meta المعتمدة",
}

export default function CampaignsPage() {
  return <CampaignsScreen />
}
