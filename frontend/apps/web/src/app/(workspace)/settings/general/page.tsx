import type { Metadata } from "next"
import { GeneralSettingsScreen } from "@/features/organization-settings"
export const metadata: Metadata = { title: "الإعدادات العامة" }
export default function Page() { return <GeneralSettingsScreen /> }
