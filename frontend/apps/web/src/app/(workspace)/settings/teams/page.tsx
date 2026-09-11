import type { Metadata } from "next"
import { TeamsScreen } from "@/features/teams"
export const metadata: Metadata = { title: "الفرق" }
export default function TeamsPage() {
  return <TeamsScreen />
}
