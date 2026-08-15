import type { AdmissionStatus } from "../types/common"
import type { Admission, AdmissionReadiness } from "../types/domain"
import { documentCompletion } from "./admission-documents"
import { admissionTransitionPolicy } from "./admission-lifecycle"

export function getAdmissionReadiness(
  admission: Admission,
  action: "submit" | "approve"
): AdmissionReadiness {
  const findings: AdmissionReadiness["findings"] = []
  if (!admission.assignment.registrationBranchId)
    findings.push({
      code: "registration-branch",
      section: "assignment",
      field: "assignment.registrationBranchId",
      message: "فرع التسجيل مطلوب",
      severity: "error",
    })
  if (!admission.assignment.studyBranchId)
    findings.push({
      code: "study-branch",
      section: "assignment",
      field: "assignment.studyBranchId",
      message: "فرع الدراسة مطلوب",
      severity: "error",
    })
  if (!admission.selection)
    findings.push({
      code: "selection",
      section: "academic",
      field: "selection.offeringId",
      message: "الاختيار الأكاديمي مطلوب",
      severity: "error",
    })
  else if (admission.selection.eligibility && !admission.selection.eligibility.eligible)
    findings.push({
      code: "eligibility",
      section: "academic",
      message: "الاختيار الأكاديمي غير مؤهل حاليًا",
      severity: "error",
    })
  if (!admission.financial)
    findings.push({
      code: "financial",
      section: "finance",
      message: "التجهيز المالي مطلوب",
      severity: "error",
    })
  const counts = documentCompletion(admission.documents)
  if (action === "approve" && counts.verified < counts.required)
    findings.push({
      code: "documents",
      section: "documents",
      message: "يجب اعتماد جميع المستندات المطلوبة",
      severity: "error",
    })
  return {
    ready: findings.length === 0,
    action,
    admissionVersion: admission.version,
    findings,
    documentCounts: counts,
    availableActions: Object.keys(
      admissionTransitionPolicy[admission.status] ?? {}
    ) as AdmissionStatus[],
  }
}
