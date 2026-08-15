import type { Metadata } from "next"
import { DepartmentsScreen } from "@/features/organization-settings"
export const metadata: Metadata = { title: "الأقسام" }
export default function Page() { return <DepartmentsScreen /> }
