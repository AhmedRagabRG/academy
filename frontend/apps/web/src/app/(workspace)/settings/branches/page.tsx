import type { Metadata } from "next"
import { BranchesScreen } from "@/features/branches"
export const metadata: Metadata = { title: "الفروع" }
export default function BranchesPage() {
  return <BranchesScreen />
}
