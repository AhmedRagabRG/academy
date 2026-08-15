import type { Metadata } from "next"
import { AcademicYearDetailScreen } from "@/features/organization-settings"
export const metadata: Metadata = { title: "تفاصيل العام الأكاديمي" }
export default async function Page({ params }: { params: Promise<{ yearId: string }> }) { const { yearId } = await params; return <AcademicYearDetailScreen yearId={yearId} /> }
