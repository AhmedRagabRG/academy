import type { Metadata } from "next"
import { BranchesScreen } from "@/features/organization-settings"
export const metadata: Metadata = { title: "الفروع" }
export default function Page() { return <BranchesScreen /> }
