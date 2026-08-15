import type { Metadata } from "next"
import { UserProfileScreen } from "@/features/organization-settings"
export const metadata: Metadata = { title: "ملف المستخدم" }
export default async function Page({ params }: { params: Promise<{ userId: string }> }) { const { userId } = await params; return <UserProfileScreen userId={userId} /> }
