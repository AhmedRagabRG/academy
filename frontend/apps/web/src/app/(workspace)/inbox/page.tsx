import type { Metadata } from "next"
import { InboxScreen } from "@/features/inbox"

export const metadata: Metadata = { title: "صندوق الوارد", description: "إدارة محادثات العملاء من مساحة موحدة" }
export default function InboxPage() { return <InboxScreen /> }
