import { StudentWorkspaceLayout } from "@/features/students"

export default async function StudentLayout({
  params,
  children,
}: {
  params: Promise<{ studentId: string }>
  children: React.ReactNode
}) {
  const { studentId } = await params
  return (
    <StudentWorkspaceLayout studentId={studentId}>
      {children}
    </StudentWorkspaceLayout>
  )
}
