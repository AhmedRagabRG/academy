import type { Metadata } from "next"
import { AccountBranchesScreen } from "@/features/branches"
export const metadata: Metadata = { title: "تعيين الفروع" }
export default function AccountBranchesPage() {
  return <AccountBranchesScreen />
}
