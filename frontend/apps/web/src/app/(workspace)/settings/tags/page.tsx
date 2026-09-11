import type { Metadata } from "next"
import { TagsScreen } from "@/features/tags"
export const metadata: Metadata = { title: "الوسوم" }
export default function TagsPage() {
  return <TagsScreen />
}
