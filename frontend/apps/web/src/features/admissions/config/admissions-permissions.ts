export const admissionPermissions = [
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
] as const

export type AdmissionPermission = (typeof admissionPermissions)[number]

export const admissionSectionPermission = {
  assignment: "admissions.assign",
  academic: "admissions.academic.manage",
  financeView: "admissions.finance.view",
  financeManage: "admissions.finance.manage",
  documentsView: "admissions.documents.view",
  documentsManage: "admissions.documents.manage",
  documentsVerify: "admissions.documents.verify",
} as const satisfies Record<string, AdmissionPermission>
