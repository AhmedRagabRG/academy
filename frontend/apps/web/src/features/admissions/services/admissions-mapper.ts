import type {
  AdmissionDocumentId,
  AdmissionId,
  AdmissionStatus,
  ApplicantId,
  DocumentState,
  DocumentVersionId,
  LookupOption,
  Money,
  OfferingKind,
  Paginated,
} from "../types/common"
import type {
  AcademicSelectionRevision,
  AdmissionAssignment,
  AdmissionBatchOption,
  AdmissionDetail,
  AdmissionDocument,
  AdmissionLifecycleEvent,
  AdmissionLookups,
  AdmissionOffering,
  AdmissionReadiness,
  AdmissionSummary,
  Applicant,
  DocumentRequirement,
  DocumentVersion,
  EnrollmentReadinessSummary,
  FinancialPreparationRevision,
  ReadinessFinding,
} from "../types/domain"
import type { Page } from "@/shared/api"

/**
 * Translation between the admissions API and this module's domain types.
 *
 * The API is deliberately narrower than the UI model in places — it records no
 * per-revision eligibility, exposes no requirement labels, and answers
 * readiness without the tallies the panel shows. Where a value genuinely is
 * not on the wire this module leaves it absent or derives it from something
 * that *is*, rather than inventing a plausible-looking one.
 */

const EPOCH = "1970-01-01T00:00:00.000Z"

const STATUSES: AdmissionStatus[] = [
  "draft",
  "submitted",
  "under-review",
  "approved",
  "rejected",
  "enrolled",
  "archived",
]

/**
 * The API is not consistent about how it spells a status: the record routes
 * send `under-review`, while the lifecycle route sends the Prisma enum
 * `UNDER_REVIEW`. Matching the literal meant every history entry failed the
 * lookup and fell back to `draft`, so a fully approved admission read as four
 * identical "مسودة" rows. Normalizing first accepts both spellings.
 */
export const toAdmissionStatus = (value: string): AdmissionStatus => {
  const normalized = value.toLowerCase().replaceAll("_", "-")
  return STATUSES.includes(normalized as AdmissionStatus)
    ? (normalized as AdmissionStatus)
    : "draft"
}

/**
 * The statuses reachable from the current one.
 *
 * Mirrors the server's transition table. The readiness route reports whether
 * an action *would* succeed but not which actions exist, and the detail panel
 * needs the latter to render its buttons.
 */
const TRANSITIONS: Record<AdmissionStatus, AdmissionStatus[]> = {
  draft: ["submitted", "archived"],
  submitted: ["under-review", "archived"],
  "under-review": ["approved", "rejected", "draft", "archived"],
  approved: ["enrolled", "archived"],
  rejected: ["archived"],
  enrolled: [],
  archived: [],
}

export const availableActions = (status: AdmissionStatus): AdmissionStatus[] =>
  TRANSITIONS[status] ?? []

interface ApiActor {
  id?: string | null
  name?: string | null
}

const toActor = (actor: ApiActor | string | null | undefined) =>
  typeof actor === "string"
    ? { id: actor, name: "" }
    : { id: actor?.id ?? "", name: actor?.name ?? "" }

export interface ApiAdmissionListItem {
  id: string
  reference: string
  applicantName: string
  phoneHint: string
  offeringLabel: string | null
  offeringCode?: string | null
  batchLabel: string | null
  batchCode?: string | null
  registrationBranchLabel: string | null
  studyBranchLabel?: string | null
  assignedEmployeeName?: string | null
  status: string
  version: number
  updatedAt: string
}

export const toAdmissionSummary = (
  row: ApiAdmissionListItem
): AdmissionSummary => ({
  id: row.id as AdmissionId,
  reference: row.reference,
  applicantName: row.applicantName,
  phoneHint: row.phoneHint,
  offeringLabel: row.offeringLabel ?? "",
  offeringCode: row.offeringCode ?? "",
  batchLabel: row.batchLabel ?? undefined,
  batchCode: row.batchCode ?? undefined,
  registrationBranch: row.registrationBranchLabel ?? "",
  assignedEmployee: row.assignedEmployeeName ?? "",
  status: toAdmissionStatus(row.status),
  updatedAt: row.updatedAt,
  version: row.version,
})

interface ApiApplicant {
  id: string
  fullName: string
  primaryPhone: string
  guardianPhone: string | null
  nationalId: string | null
  alternativeIdentityReason: string | null
  address: string
  dateOfBirth: string
  qualificationId: string
  qualificationLabel: string | null
  graduationYear: number
  notes?: string | null
  profileImageUrl?: string | null
  status?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
  version?: number | null
}

export const toApplicant = (
  row: ApiApplicant,
  organizationId = ""
): Applicant => ({
  id: row.id as ApplicantId,
  organizationId,
  fullName: row.fullName,
  primaryPhone: row.primaryPhone,
  guardianPhone: row.guardianPhone ?? undefined,
  nationalId: row.nationalId ?? undefined,
  alternativeIdentityReason: row.alternativeIdentityReason ?? undefined,
  address: row.address,
  dateOfBirth: row.dateOfBirth,
  qualificationId: row.qualificationId,
  qualificationLabel: row.qualificationLabel ?? "",
  graduationYear: row.graduationYear,
  notes: row.notes ?? "",
  profileImageUrl: row.profileImageUrl ?? undefined,
  status: row.status === "archived" ? "archived" : "active",
  createdAt: row.createdAt ?? EPOCH,
  updatedAt: row.updatedAt ?? row.createdAt ?? EPOCH,
  createdBy: row.createdBy ?? "",
  updatedBy: row.updatedBy ?? row.createdBy ?? "",
  version: row.version ?? 1,
})

interface ApiAssignment {
  registrationBranchId: string
  registrationBranchLabel: string | null
  studyBranchId: string
  studyBranchLabel: string | null
  admissionsEmployeeId: string
  admissionsEmployeeName: string | null
  customerServiceEmployeeId: string
  customerServiceEmployeeName: string | null
  customerServiceManagerId: string
  customerServiceManagerName: string | null
  departmentId: string
  departmentLabel: string | null
  leadSourceId: string
  leadSourceLabel: string | null
  academicGradeId: string | null
  academicGradeLabel: string | null
}

const toAssignment = (row: ApiAssignment): AdmissionAssignment => ({
  registrationBranchId: row.registrationBranchId,
  registrationBranchLabel: row.registrationBranchLabel ?? "",
  studyBranchId: row.studyBranchId,
  studyBranchLabel: row.studyBranchLabel ?? "",
  admissionsEmployeeId: row.admissionsEmployeeId,
  admissionsEmployeeName: row.admissionsEmployeeName ?? "",
  customerServiceEmployeeId: row.customerServiceEmployeeId,
  customerServiceEmployeeName: row.customerServiceEmployeeName ?? "",
  customerServiceManagerId: row.customerServiceManagerId,
  customerServiceManagerName: row.customerServiceManagerName ?? "",
  departmentId: row.departmentId,
  departmentLabel: row.departmentLabel ?? "",
  leadSourceId: row.leadSourceId,
  leadSourceLabel: row.leadSourceLabel ?? "",
  academicGradeId: row.academicGradeId ?? undefined,
  academicGradeLabel: row.academicGradeLabel ?? undefined,
})

interface ApiSelection {
  id: string
  revisionNumber: number
  offeringKind: string
  offeringId: string
  offeringVersion: number
  offeringLabel: string | null
  offeringCode: string | null
  batchId?: string | null
  batchVersion?: number | null
  batchLabel?: string | null
  batchCode?: string | null
  batchFinancialRevisionId?: string | null
  changeReason?: string | null
  createdAt: string
  createdBy: string | null
}

const toSelection = (row: ApiSelection): AcademicSelectionRevision => ({
  id: row.id as AcademicSelectionRevision["id"],
  revisionNumber: row.revisionNumber,
  offeringKind: row.offeringKind as OfferingKind,
  offeringId: row.offeringId,
  offeringVersion: row.offeringVersion,
  offeringLabel: row.offeringLabel ?? "",
  offeringCode: row.offeringCode ?? "",
  batchId: row.batchId ?? undefined,
  batchVersion: row.batchVersion ?? undefined,
  batchLabel: row.batchLabel ?? undefined,
  batchCode: row.batchCode ?? undefined,
  batchFinancialRevisionId: row.batchFinancialRevisionId ?? undefined,
  changeReason: row.changeReason ?? undefined,
  createdAt: row.createdAt,
  createdBy: row.createdBy ?? "",
})

interface ApiMoney {
  amount: string
  currency: string
  precision: number
}

const zero = (currency: string, precision: number): Money => ({
  amount: "0",
  currency,
  precision,
})

export interface ApiFinancialRevision {
  id: string
  revisionNumber: number
  sourceKind?: string | null
  sourceId?: string | null
  sourceVersion?: number | null
  sourceFinancialRevisionId?: string | null
  productPrice?: ApiMoney | null
  registrationFees?: ApiMoney | null
  discountMode?: string | null
  discountPercentage?: string | null
  discountAmount?: ApiMoney | null
  requiredAmount?: ApiMoney | null
  reason?: string | null
  createdAt: string
  createdBy?: string | null
}

export const toFinancialRevision = (
  row: ApiFinancialRevision,
  defaults: { currency: string; precision: number }
): FinancialPreparationRevision => {
  const blank = zero(defaults.currency, defaults.precision)
  return {
    id: row.id as FinancialPreparationRevision["id"],
    revisionNumber: row.revisionNumber,
    sourceKind: row.sourceKind === "program-batch" ? "program-batch" : "catalog-offering",
    sourceId: row.sourceId ?? "",
    sourceVersion: row.sourceVersion ?? 0,
    sourceFinancialRevisionId: row.sourceFinancialRevisionId ?? "",
    productPrice: row.productPrice ?? blank,
    registrationFees: row.registrationFees ?? blank,
    discountMode:
      row.discountMode === "percentage" || row.discountMode === "amount"
        ? row.discountMode
        : "none",
    discountPercentage: row.discountPercentage ?? "0",
    discountAmount: row.discountAmount ?? blank,
    requiredAmount: row.requiredAmount ?? blank,
    reason: row.reason ?? undefined,
    createdAt: row.createdAt,
    createdBy: row.createdBy ?? "",
  }
}

export interface ApiLifecycleEvent {
  id: string
  fromStatus: string | null
  toStatus: string
  reason?: string | null
  actor?: ApiActor | string | null
  actorId?: string | null
  occurredAt: string
  sourceVersion?: number | null
  resultVersion?: number | null
  resultingVersion?: number | null
}

export const toLifecycleEvent = (
  event: ApiLifecycleEvent
): AdmissionLifecycleEvent => ({
  id: event.id,
  fromStatus: event.fromStatus ? toAdmissionStatus(event.fromStatus) : null,
  toStatus: toAdmissionStatus(event.toStatus),
  reason: event.reason ?? undefined,
  actor: toActor(event.actor ?? event.actorId),
  occurredAt: event.occurredAt,
  sourceVersion: event.sourceVersion ?? 0,
  resultVersion: event.resultVersion ?? event.resultingVersion ?? 0,
})

interface ApiRequirement {
  id: string
  key?: string | null
  stableKey?: string | null
  label?: string | null
  required?: boolean | null
  requiredAt?: string | null
  allowedMimeTypes?: string[] | null
  maxBytes?: number | null
  maximumBytes?: number | null
}

/**
 * A document requirement.
 *
 * The API names the same things differently across routes (`stableKey` vs
 * `key`, `maximumBytes` vs `maxBytes`) and omits a human label entirely, so
 * the key stands in for one rather than showing an empty heading.
 */
const toRequirement = (row: ApiRequirement): DocumentRequirement => {
  const key = row.key ?? row.stableKey ?? row.id
  return {
    id: row.id,
    key,
    label: row.label ?? key,
    required: row.required ?? true,
    requiredAt: row.requiredAt === "approval" ? "approval" : "submission",
    allowedMimeTypes: row.allowedMimeTypes ?? [],
    maxBytes: row.maxBytes ?? row.maximumBytes ?? 0,
  }
}

interface ApiDocumentVersion {
  id: string
  versionNumber: number
  fileName?: string | null
  originalName?: string | null
  mimeType?: string | null
  size?: number | null
  byteSize?: number | null
  previewUrl?: string | null
  url?: string | null
  /** Where the API actually puts the link — the flat fields above never arrive. */
  storageFile?: { url?: string | null; originalName?: string | null } | null
  status?: string | null
  uploadedAt?: string | null
  uploadedBy?: string | null
}

const VERSION_STATES = ["available", "failed", "withdrawn"] as const

const toVersion = (row: ApiDocumentVersion): DocumentVersion => ({
  id: row.id as DocumentVersionId,
  versionNumber: row.versionNumber,
  fileName: row.fileName ?? row.originalName ?? row.storageFile?.originalName ?? "",
  mimeType: row.mimeType ?? "",
  size: row.size ?? row.byteSize ?? 0,
  previewUrl:
    row.previewUrl ?? row.url ?? row.storageFile?.url ?? undefined,
  status: VERSION_STATES.includes(row.status as never)
    ? (row.status as DocumentVersion["status"])
    : "available",
  uploadedAt: row.uploadedAt ?? EPOCH,
  uploadedBy: row.uploadedBy ?? "",
})

const DOCUMENT_STATES: DocumentState[] = [
  "missing",
  "uploading",
  "pending",
  "verified",
  "rejected",
  "withdrawn",
]

export interface ApiDocument {
  id: string
  requirementId: string
  requirementKey?: string | null
  requirement?: ApiRequirement | null
  state: string
  currentVersion?: (ApiDocumentVersion & {
    decisions?: Array<{
      id?: string
      decision: string
      reason?: string | null
      reviewer?: ApiActor | null
      reviewerId?: string | null
      reviewerName?: string | null
      decidedAt: string
    }>
  }) | null
  versions?: ApiDocumentVersion[] | null
  version?: number
}

export const toDocument = (row: ApiDocument): AdmissionDocument => {
  const current = row.currentVersion ? toVersion(row.currentVersion) : undefined
  const versions = row.versions?.length
    ? row.versions.map(toVersion)
    : current
      ? [current]
      : []
  return {
    id: row.id as AdmissionDocumentId,
    requirement: toRequirement(
      row.requirement ?? {
        id: row.requirementId,
        key: row.requirementKey,
      }
    ),
    state: DOCUMENT_STATES.includes(row.state as DocumentState)
      ? (row.state as DocumentState)
      : "missing",
    currentVersion: current,
    versions,
    // Decisions ride on the version the API returns them with; the reviewer's
    // name is not on that payload, so only the id is carried.
    decisions: (row.currentVersion?.decisions ?? []).map((decision, index) => ({
      id: decision.id ?? `${row.id}-decision-${index}`,
      documentVersionId: (row.currentVersion?.id ?? "") as DocumentVersionId,
      decision: decision.decision === "rejected" ? "rejected" : "verified",
      reason: decision.reason ?? undefined,
      reviewer: toActor(
        decision.reviewer ?? {
          id: decision.reviewerId,
          name: decision.reviewerName,
        }
      ),
      decidedAt: decision.decidedAt,
    })),
  }
}

interface ApiFinding {
  code: string
  section: string
  field?: string | null
  message: string
  severity?: string | null
}

const toFinding = (finding: ApiFinding): ReadinessFinding => ({
  code: finding.code,
  section: finding.section,
  field: finding.field ?? undefined,
  message: finding.message,
  severity: finding.severity === "warning" ? "warning" : "error",
})

/** Tallies the document states the readiness panel reports. */
export function documentCounts(documents: AdmissionDocument[]) {
  const counts = {
    required: 0,
    missing: 0,
    pending: 0,
    rejected: 0,
    verified: 0,
  }
  for (const document of documents) {
    if (document.requirement.required) counts.required += 1
    if (document.state === "missing" || document.state === "withdrawn")
      counts.missing += 1
    if (document.state === "pending" || document.state === "uploading")
      counts.pending += 1
    if (document.state === "rejected") counts.rejected += 1
    if (document.state === "verified") counts.verified += 1
  }
  return counts
}

export const toReadiness = (
  row: {
    ready: boolean
    action?: string | null
    admissionVersion?: number | null
    findings?: ApiFinding[] | null
  },
  context: { action: "submit" | "approve"; status: AdmissionStatus; version: number },
  documents: AdmissionDocument[]
): AdmissionReadiness => ({
  ready: row.ready,
  action: row.action === "approve" ? "approve" : context.action,
  admissionVersion: row.admissionVersion ?? context.version,
  findings: (row.findings ?? []).map(toFinding),
  documentCounts: documentCounts(documents),
  availableActions: availableActions(context.status),
})

export interface ApiAdmissionDetail extends ApiAdmissionListItem {
  organizationId?: string | null
  applicantId?: string | null
  applicant: ApiApplicant
  assignment: ApiAssignment
  selection?: ApiSelection | null
  financial?: ApiFinancialRevision | null
  requirementSnapshot?: {
    id: string
    policyId?: string | null
    policyVersion?: number | null
    selectionRevisionId?: string | null
    requirements?: ApiRequirement[] | null
    createdAt?: string | null
  } | null
  documents?: ApiDocument[] | null
  approvalSnapshot?: { id: string } | null
  externalEnrollmentReference?: string | null
  notes?: string | null
  activeReviewer?: ApiActor | null
  createdAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
}

/**
 * Assembles the detail the screen renders.
 *
 * The API splits what the UI shows across several routes — readiness,
 * lifecycle and financial history each have their own — so the caller fetches
 * them alongside the record and hands them in here rather than this module
 * issuing requests of its own.
 */
export function toAdmissionDetail(
  row: ApiAdmissionDetail,
  parts: {
    documents: AdmissionDocument[]
    readiness: AdmissionReadiness
    lifecycle: AdmissionLifecycleEvent[]
    financialHistory: FinancialPreparationRevision[]
    defaults: { currency: string; precision: number }
  }
): AdmissionDetail {
  const status = toAdmissionStatus(row.status)
  const selection = row.selection ? toSelection(row.selection) : undefined
  const snapshot = row.requirementSnapshot
  return {
    id: row.id as AdmissionId,
    reference: row.reference,
    organizationId: row.organizationId ?? "",
    applicantId: (row.applicantId ?? row.applicant?.id ?? "") as ApplicantId,
    status,
    assignment: toAssignment(row.assignment),
    selection,
    financial: row.financial
      ? toFinancialRevision(row.financial, parts.defaults)
      : parts.financialHistory[0],
    requirementSnapshot: {
      id: (snapshot?.id ?? "") as never,
      policyId: snapshot?.policyId ?? "",
      policyVersion: snapshot?.policyVersion ?? 0,
      selectionRevisionId: (snapshot?.selectionRevisionId ?? undefined) as never,
      requirements: (snapshot?.requirements ?? []).map(toRequirement),
      createdAt: snapshot?.createdAt ?? EPOCH,
    },
    documents: parts.documents,
    approvalSnapshot: undefined,
    externalEnrollmentReference: row.externalEnrollmentReference ?? undefined,
    notes: row.notes ?? "",
    activeReviewer: row.activeReviewer ? toActor(row.activeReviewer) : undefined,
    lifecycle: parts.lifecycle,
    financialHistory: parts.financialHistory,
    // Only the current selection is returned; earlier revisions have no route.
    selectionHistory: selection ? [selection] : [],
    applicant: toApplicant(row.applicant, row.organizationId ?? ""),
    readiness: parts.readiness,
    createdAt: row.createdAt ?? EPOCH,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy ?? "",
    updatedBy: row.updatedBy ?? row.createdBy ?? "",
    version: row.version,
  }
}

export const toEnrollmentReadiness = (
  row: { ready: boolean; findings?: ApiFinding[] | null; reasons?: string[] | null },
  context: { id: AdmissionId; reference: string; status: AdmissionStatus; version: number }
): EnrollmentReadinessSummary => ({
  ready: row.ready,
  // The API reports structured findings; the UI shows a flat reason list.
  reasons: row.reasons ?? (row.findings ?? []).map((finding) => finding.code),
  admissionId: context.id,
  admissionReference: context.reference,
  admissionVersion: context.version,
  status: context.status,
})

interface ApiLookupOption {
  value: string
  label: string
  status?: string | null
}

const toOption = (option: ApiLookupOption): LookupOption => ({
  value: option.value,
  label: option.label,
  status:
    option.status === "inactive" || option.status === "archived"
      ? option.status
      : "active",
})

export interface ApiAdmissionLookups {
  branches: ApiLookupOption[]
  employees: ApiLookupOption[]
  managers: ApiLookupOption[]
  departments: ApiLookupOption[]
  leadSources: ApiLookupOption[]
  academicGrades: ApiLookupOption[]
  qualifications: ApiLookupOption[]
  offerings: Array<{
    id: string
    label: string
    code: string
    kind: string
    status: string
    version: number
    price?: ApiMoney | null
    registrationFees?: ApiMoney | null
    branchIds?: string[] | null
    registrationBranchIds?: string[] | null
    studyBranchIds?: string[] | null
    pricingRevisionId?: string | null
    documentPolicyId?: string | null
  }>
  batches: Array<{
    id: string
    programId?: string | null
    label?: string | null
    name?: string | null
    code?: string | null
    status?: string | null
    version?: number | null
    availableSeats?: number | null
    registrationBranchIds?: string[] | null
    studyBranchIds?: string[] | null
    registrationStartDate?: string | null
    registrationEndDate?: string | null
    financialRevisionId?: string | null
    price?: ApiMoney | null
    registrationFees?: ApiMoney | null
  }>
  documentPolicy?: {
    id?: string | null
    policyVersion?: number | null
    requirements?: ApiRequirement[] | null
  } | null
  currency: string
  precision: number
}

export function toLookups(row: ApiAdmissionLookups): AdmissionLookups {
  const currency = row.currency ?? "EGP"
  const precision = row.precision ?? 2
  const blank = zero(currency, precision)

  const offerings: AdmissionOffering[] = (row.offerings ?? []).map((offering) => ({
    id: offering.id,
    version: offering.version,
    kind: offering.kind as OfferingKind,
    name: { ar: offering.label },
    code: offering.code,
    status:
      offering.status === "inactive" || offering.status === "archived"
        ? offering.status
        : "active",
    branchIds: offering.branchIds ?? [],
    // Left absent when the API publishes none, so the form reads it as
    // "unrestricted" rather than "no branch is allowed".
    ...(offering.registrationBranchIds?.length
      ? { registrationBranchIds: offering.registrationBranchIds }
      : {}),
    ...(offering.studyBranchIds?.length
      ? { studyBranchIds: offering.studyBranchIds }
      : {}),
    price: offering.price ?? blank,
    registrationFees: offering.registrationFees ?? blank,
    pricingRevisionId: offering.pricingRevisionId ?? "",
    documentPolicyId: offering.documentPolicyId ?? row.documentPolicy?.id ?? "",
  }))

  const batches: AdmissionBatchOption[] = (row.batches ?? []).map((batch) => ({
    id: batch.id,
    programId: batch.programId ?? "",
    version: batch.version ?? 1,
    name: batch.label ?? batch.name ?? "",
    code: batch.code ?? "",
    status:
      batch.status === "registration-open" || batch.status === "registration-closed"
        ? batch.status
        : "draft",
    registrationBranchIds: batch.registrationBranchIds ?? [],
    studyBranchIds: batch.studyBranchIds ?? [],
    availableSeats: batch.availableSeats ?? 0,
    registrationStartDate: batch.registrationStartDate ?? "",
    registrationEndDate: batch.registrationEndDate ?? "",
    financialRevisionId: batch.financialRevisionId ?? "",
    price: batch.price ?? blank,
    registrationFees: batch.registrationFees ?? blank,
  }))

  return {
    branches: (row.branches ?? []).map(toOption),
    employees: (row.employees ?? []).map(toOption),
    managers: (row.managers ?? []).map(toOption),
    departments: (row.departments ?? []).map(toOption),
    leadSources: (row.leadSources ?? []).map(toOption),
    academicGrades: (row.academicGrades ?? []).map(toOption),
    qualifications: (row.qualifications ?? []).map(toOption),
    offerings,
    batches,
    documentPolicy: {
      id: (row.documentPolicy?.id ?? "") as never,
      policyId: row.documentPolicy?.id ?? "",
      policyVersion: row.documentPolicy?.policyVersion ?? 0,
      requirements: (row.documentPolicy?.requirements ?? []).map(toRequirement),
      createdAt: EPOCH,
    },
    currency,
    precision,
  }
}

export const toPaginated = <Row, Mapped>(
  page: Page<Row>,
  map: (row: Row) => Mapped
): Paginated<Mapped> => ({
  items: page.items.map(map),
  total: page.meta.total,
  page: page.meta.page,
  pageSize: page.meta.limit,
  totalPages: page.meta.totalPages,
})
