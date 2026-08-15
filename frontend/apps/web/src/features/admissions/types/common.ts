export type Brand<T, Name extends string> = T & { readonly __brand: Name }

export type ApplicantId = Brand<string, "ApplicantId">
export type AdmissionId = Brand<string, "AdmissionId">
export type AcademicSelectionRevisionId = Brand<
  string,
  "AcademicSelectionRevisionId"
>
export type EligibilityAssessmentId = Brand<string, "EligibilityAssessmentId">
export type DocumentRequirementSnapshotId = Brand<
  string,
  "DocumentRequirementSnapshotId"
>
export type AdmissionDocumentId = Brand<string, "AdmissionDocumentId">
export type DocumentVersionId = Brand<string, "DocumentVersionId">
export type FinancialPreparationRevisionId = Brand<
  string,
  "FinancialPreparationRevisionId"
>
export type AdmissionApprovalSnapshotId = Brand<
  string,
  "AdmissionApprovalSnapshotId"
>

export type AdmissionStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "approved"
  | "rejected"
  | "enrolled"
  | "archived"

export type OfferingKind =
  "professional-program" | "professional-diploma" | "training-course"

export type DocumentState =
  "missing" | "uploading" | "pending" | "verified" | "rejected" | "withdrawn"

export interface LocalizedText {
  ar: string
  en?: string
}

export interface Money {
  amount: string
  currency: string
  precision: number
}

export interface AuditContext {
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  version: number
}

export interface LookupOption {
  value: string
  label: string
  status?: "active" | "inactive" | "archived"
  disabledReason?: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ActorRef {
  id: string
  name: string
}
