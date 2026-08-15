import type { Metadata } from "next"
import { RoleDetailScreen } from "@/features/organization-settings"
export const metadata: Metadata = { title: "تفاصيل الدور" }
export default async function Page({ params }: { params: Promise<{ roleId: string }> }) { const { roleId } = await params; return <RoleDetailScreen roleId={roleId} /> }
