import { EditAdmissionScreen } from "@/features/admissions"

export default async function EditAdmissionPage({
  params,
}: {
  params: Promise<{ admissionId: string }>
}) {
  const { admissionId } = await params
  return <EditAdmissionScreen admissionId={admissionId} />
}
