import type { Metadata } from "next"
import { KnowledgeBasesScreen } from "@/features/ai-knowledge"
export const metadata: Metadata = { title: "قواعد المعرفة" }
export default function KnowledgeBasesPage() {
  return <KnowledgeBasesScreen />
}
