import { AdmissionDetailScreen } from "@/features/admissions"

export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ admissionId: string }>
}) {
  const { admissionId } = await params
  return <AdmissionDetailScreen admissionId={admissionId} />
}
