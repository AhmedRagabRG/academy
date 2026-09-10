import type { Metadata } from "next"
import { AiAgentSettingsScreen } from "@/features/ai-agent"
export const metadata: Metadata = { title: "المساعد الذكي" }
export default function AiAgentSettingsPage() {
  return <AiAgentSettingsScreen />
}
