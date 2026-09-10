import type { Metadata } from "next"
import { KnowledgeBaseDetailScreen } from "@/features/ai-knowledge"
export const metadata: Metadata = { title: "قاعدة المعرفة" }
export default async function KnowledgeBaseDetailPage({
  params,
}: {
  params: Promise<{ knowledgeBaseId: string }>
}) {
  const { knowledgeBaseId } = await params
  return <KnowledgeBaseDetailScreen knowledgeBaseId={knowledgeBaseId} />
}
