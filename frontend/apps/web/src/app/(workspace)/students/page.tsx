import type { Metadata } from "next"
import { StudentsScreen } from "@/features/students"

export const metadata: Metadata = {
  title: "الطلاب",
  description: "إدارة الطلاب المسجلين رسميًا بعد اكتمال إجراءات القبول.",
}

export default function StudentsPage() {
  return <StudentsScreen />
}
