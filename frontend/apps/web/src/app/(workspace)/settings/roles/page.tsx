import type { Metadata } from "next"
import { RolesScreen } from "@/features/organization-settings"
export const metadata: Metadata = { title: "الأدوار" }
export default function Page() { return <RolesScreen /> }
