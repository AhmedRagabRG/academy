import type { Admission, AdmissionSummary } from "../types/domain"

export interface AdmissionServiceContext {
  employeeId: string
  employeeName: string
  organizationId: string
  permissions: readonly string[]
  authorizedBranchIds: readonly string[]
  organizationWide: boolean
  scopeFingerprint: string
}

export const defaultAdmissionContext: AdmissionServiceContext = {
  employeeId: "employee-demo",
  employeeName: "أحمد محمد",
  organizationId: "organization-alsalam",
  permissions: [
    "admissions.view",
    "admissions.create",
    "admissions.update",
    "admissions.archive",
    "admissions.export",
    "admissions.assign",
    "admissions.academic.manage",
    "admissions.finance.view",
    "admissions.finance.manage",
    "admissions.documents.view",
    "admissions.documents.manage",
    "admissions.documents.verify",
    "admissions.submit",
    "admissions.review",
    "admissions.approve",
    "admissions.reject",
    "admissions.return",
    "admissions.enrollment-readiness",
  ],
  authorizedBranchIds: ["branch-main", "branch-cairo", "branch-giza"],
  organizationWide: true,
  scopeFingerprint: "organization-alsalam:all",
}

export function hasAdmissionPermission(
  context: AdmissionServiceContext,
  permission: string
) {
  return context.permissions.includes(permission)
}

export function isAdmissionInScope(
  admission: Admission,
  context: AdmissionServiceContext
) {
  if (admission.organizationId !== context.organizationId) return false
  if (context.organizationWide) return true
  return [
    admission.assignment.registrationBranchId,
    admission.assignment.studyBranchId,
  ].some((id) => context.authorizedBranchIds.includes(id))
}

export function redactSummary(summary: AdmissionSummary): AdmissionSummary {
  return { ...summary, phoneHint: summary.phoneHint.replace(/.(?=.{4})/g, "•") }
}
