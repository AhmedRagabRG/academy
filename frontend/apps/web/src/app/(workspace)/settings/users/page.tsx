import type { Metadata } from "next"
import { UsersScreen } from "@/features/organization-settings"
export const metadata: Metadata = { title: "المستخدمون" }
export default function Page() { return <UsersScreen /> }
