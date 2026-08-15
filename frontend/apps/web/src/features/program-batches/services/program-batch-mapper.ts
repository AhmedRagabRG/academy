import type {
  BatchStatus,
  CapacityState,
  FinancialRevisionId,
  Money,
  Paginated,
  ProgramBatchId,
  ProgramId,
} from "../types/common"
import type { BatchInput } from "../types/commands"
import type {
  BatchCapacity,
  BatchDetail,
  BatchLookups,
  BatchOffer,
  BatchSummary,
  BranchAssignment,
  Eligibility,
  FinancialProfile,
  FinancialRevision,
  InstallmentPlan,
  LifecycleEvent,
  Readiness,
} from "../types/domain"
import type { Page } from "@/shared/api"

/**
 * Translation between the batches API and this module's domain types.
 *
 * The two agree on more than most — the API already emits statuses in
 * lower-kebab, so `registration-open` needs no conversion — but they differ on
 * names in a few places: the API calls a capacity `status` what the UI calls a
 * `state`, dates an offer with `startDate`/`endDate` where the UI says
 * `validFrom`/`validTo`, and keys an installment to a `milestone` the UI holds
 * as `milestoneId`. Those renames live here so the service body stays about
 * requests.
 */

const BATCH_STATUSES: BatchStatus[] = [
  "draft",
  "registration-open",
  "registration-closed",
  "studying",
  "graduated",
  "archived",
]

export const toBatchStatus = (value: string): BatchStatus =>
  BATCH_STATUSES.includes(value as BatchStatus) ? (value as BatchStatus) : "draft"

const CAPACITY_STATES: CapacityState[] = [
  "available",
  "nearly-full",
  "full",
  "over-capacity",
]

const toCapacityState = (value: string): CapacityState =>
  CAPACITY_STATES.includes(value as CapacityState)
    ? (value as CapacityState)
    : "available"

interface ApiOption {
  id: string
  code?: string
  label: string
  active?: boolean
}

interface ApiMoney {
  amount: string
  currency: string
  precision: number
}

interface ApiRevision {
  id: string
  revisionNumber: number
  programPrice: ApiMoney
  registrationFee: ApiMoney
  installmentsEnabled: boolean
  installmentPlans: Array<{
    id: string
    name: string
    basis: string
    coveredCharge: string
    status: string
    position: number
    installments: Array<{
      id: string
      label: string
      value: string
      milestone: string
      position: number
    }>
  }>
  offers: Array<{
    id: string
    kind: string
    name: string
    valueType: string
    value: string
    precision: number
    currency?: string | null
    startDate: string | null
    endDate: string | null
    status: string
    position: number
  }>
  sourceBatchVersion: number
  createdAt: string
  createdBy: string | null
}

export interface ApiBatch {
  id: string
  programId: string
  program?: ApiOption | null
  name: { ar: string; en?: string }
  code: string
  academicYearId: string
  academicYear?: ApiOption | null
  intakeId: string
  intake?: ApiOption | null
  description: string
  schedule: {
    registrationStartDate: string | null
    registrationEndDate: string | null
    studyStartDate: string | null
    studyEndDate: string | null
    graduationDate: string | null
  }
  capacity: {
    maximumStudents: number
    currentStudents: number
    availableSeats: number
    status: string
  }
  branchAssignments: Array<{ branchId: string; role: string }>
  financialProfile: ApiRevision | null
  status: string
  lifecycle?: ApiLifecycleEvent[]
  codeLockedAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
  version: number
}

const ordered = <T extends { position: number }>(items: T[]) =>
  [...items].sort((left, right) => left.position - right.position)

const toInstallmentPlans = (revision: ApiRevision): InstallmentPlan[] =>
  ordered(revision.installmentPlans ?? []).map((plan) => ({
    id: plan.id,
    name: plan.name,
    basis: plan.basis === "percentage" ? "percentage" : "amount",
    coveredCharge: plan.coveredCharge as InstallmentPlan["coveredCharge"],
    status: plan.status === "inactive" ? "inactive" : "active",
    installments: ordered(plan.installments ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      milestoneId: item.milestone,
      position: item.position,
    })),
  }))

const toOffers = (revision: ApiRevision): BatchOffer[] =>
  ordered(revision.offers ?? []).map((offer) => ({
    id: offer.id,
    kind: offer.kind === "scholarship" ? "scholarship" : "discount",
    name: offer.name,
    valueType: offer.valueType === "percentage" ? "percentage" : "amount",
    value: offer.value,
    validFrom: offer.startDate ?? undefined,
    validTo: offer.endDate ?? undefined,
    status: offer.status === "inactive" ? "inactive" : "active",
  }))

const blankMoney = (currency: string, precision: number): Money => ({
  amount: "0",
  currency,
  precision,
})

/**
 * The financial profile the UI edits.
 *
 * The API models it as the batch's *current revision*, so the revision's own
 * id becomes `currentRevisionId` — that identifier is what Admissions pins an
 * offer to, so it has to survive the mapping rather than be dropped as
 * transport detail.
 */
export function toFinancialProfile(
  revision: ApiRevision | null,
  defaults: { currency: string; precision: number }
): FinancialProfile {
  if (!revision)
    return {
      programPrice: blankMoney(defaults.currency, defaults.precision),
      registrationFee: blankMoney(defaults.currency, defaults.precision),
      installmentsEnabled: false,
      installmentPlans: [],
      offers: [],
      currentRevisionId: "" as FinancialRevisionId,
    }

  return {
    programPrice: revision.programPrice,
    registrationFee: revision.registrationFee,
    installmentsEnabled: revision.installmentsEnabled,
    installmentPlans: toInstallmentPlans(revision),
    offers: toOffers(revision),
    currentRevisionId: revision.id as FinancialRevisionId,
  }
}

export const toFinancialRevision = (
  revision: ApiRevision,
  defaults: { currency: string; precision: number }
): FinancialRevision => ({
  id: revision.id as FinancialRevisionId,
  revisionNumber: revision.revisionNumber,
  snapshot: toFinancialProfile(revision, defaults),
  createdAt: revision.createdAt,
  createdBy: revision.createdBy ?? "",
  sourceBatchVersion: revision.sourceBatchVersion,
})

export interface ApiLifecycleEvent {
  id: string
  fromStatus: string | null
  toStatus: string
  reason: string | null
  actorId: string | null
  occurredAt: string
  resultVersion: number
}

export const toLifecycleEvent = (event: ApiLifecycleEvent): LifecycleEvent => ({
  id: event.id,
  fromStatus: event.fromStatus ? toBatchStatus(event.fromStatus) : null,
  toStatus: toBatchStatus(event.toStatus),
  reason: event.reason ?? undefined,
  actorId: event.actorId ?? "",
  occurredAt: event.occurredAt,
  resultVersion: event.resultVersion,
})

const toCapacity = (row: ApiBatch): BatchCapacity => ({
  maximumStudents: row.capacity.maximumStudents,
  currentStudents: row.capacity.currentStudents,
  availableSeats: row.capacity.availableSeats,
  state: toCapacityState(row.capacity.status),
})

/**
 * Branch assignments, which the API returns as the batch's current set.
 *
 * The UI's `status` distinguishes a live assignment from one kept for history;
 * this route returns only live ones, so every mapped assignment is active
 * rather than guessed at from an absent field.
 */
const toBranchAssignments = (row: ApiBatch): BranchAssignment[] =>
  (row.branchAssignments ?? []).map((assignment) => ({
    branchId: assignment.branchId,
    role: assignment.role === "study" ? "study" : "registration",
    status: "active",
  }))

const optional = (value: string | null) => value ?? undefined

export function toBatchDetail(
  row: ApiBatch,
  defaults: { currency: string; precision: number }
): BatchDetail {
  return {
    id: row.id as ProgramBatchId,
    programId: row.programId as ProgramId,
    name: { ar: row.name.ar, ...(row.name.en ? { en: row.name.en } : {}) },
    code: row.code,
    academicYearId: row.academicYearId,
    intakeId: row.intakeId,
    description: row.description,
    schedule: {
      registrationStartDate: optional(row.schedule.registrationStartDate),
      registrationEndDate: optional(row.schedule.registrationEndDate),
      studyStartDate: optional(row.schedule.studyStartDate),
      studyEndDate: optional(row.schedule.studyEndDate),
      graduationDate: optional(row.schedule.graduationDate),
    },
    capacity: toCapacity(row),
    financialProfile: toFinancialProfile(row.financialProfile, defaults),
    branchAssignments: toBranchAssignments(row),
    status: toBatchStatus(row.status),
    codeLocked: Boolean(row.codeLockedAt),
    lifecycle: (row.lifecycle ?? []).map(toLifecycleEvent),
    // Revisions are a separate read; the detail payload carries only the
    // current one, and inventing a single-entry history here would misreport
    // a batch that has been repriced.
    financialRevisions: [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy ?? "",
    updatedBy: row.updatedBy ?? row.createdBy ?? "",
    version: row.version,
    programName: row.program?.label ?? "",
    academicYearName: row.academicYear?.label ?? "",
    intakeName: row.intake?.label ?? "",
  }
}

export const toBatchSummary = (
  row: ApiBatch,
  defaults: { currency: string; precision: number }
): BatchSummary => ({
  id: row.id as ProgramBatchId,
  programId: row.programId as ProgramId,
  name: row.name.ar,
  code: row.code,
  academicYear: row.academicYear?.label ?? "",
  intake: row.intake?.label ?? "",
  registrationEndDate: optional(row.schedule.registrationEndDate),
  studyStartDate: optional(row.schedule.studyStartDate),
  status: toBatchStatus(row.status),
  capacity: toCapacity(row),
  price:
    row.financialProfile?.programPrice ??
    blankMoney(defaults.currency, defaults.precision),
  branchCount: new Set((row.branchAssignments ?? []).map((a) => a.branchId)).size,
  updatedAt: row.updatedAt,
  version: row.version,
})

export interface ApiLookups {
  program: { id: string; code: string; label: string; active: boolean; batchingEligible: boolean }
  academicYears: ApiOption[]
  intakes: ApiOption[]
  branches: ApiOption[]
  scheduleMilestones: string[]
  financialDefaults: { currency: string; precision: number }
}

/** Arabic labels for the milestones an installment can be keyed to. */
const MILESTONE_LABELS: Record<string, string> = {
  "registration-start": "بداية التسجيل",
  "registration-end": "نهاية التسجيل",
  "study-start": "بداية الدراسة",
  "study-end": "نهاية الدراسة",
  graduation: "التخرج",
}

export const toLookups = (row: ApiLookups): BatchLookups => ({
  program: {
    id: row.program.id as ProgramId,
    name: row.program.label,
    active: row.program.active,
    batchingEligible: row.program.batchingEligible,
  },
  academicYears: (row.academicYears ?? []).map((item) => ({
    value: item.id,
    label: item.label,
  })),
  intakes: (row.intakes ?? []).map((item) => ({
    value: item.id,
    label: item.label,
  })),
  branches: (row.branches ?? []).map((item) => ({
    value: item.id,
    label: item.label,
    status: item.active ? ("active" as const) : ("inactive" as const),
  })),
  milestones: (row.scheduleMilestones ?? []).map((milestone) => ({
    value: milestone,
    label: MILESTONE_LABELS[milestone] ?? milestone,
  })),
  currency: row.financialDefaults?.currency ?? "EGP",
  precision: row.financialDefaults?.precision ?? 2,
})

export const toReadiness = (row: {
  ready: boolean
  batchVersion: number
  findings?: Array<{ code: string; section: string; field?: string; message: string }>
}): Readiness => ({
  ready: row.ready,
  batchVersion: row.batchVersion,
  findings: (row.findings ?? []).map((finding) => ({
    code: finding.code,
    section: finding.section,
    field: finding.field,
    message: finding.message,
  })),
})

export const toEligibility = (row: {
  eligible: boolean
  reasons?: string[]
  availableSeats: number
  financialRevisionId: string
  batchVersion: number
}): Eligibility => ({
  eligible: row.eligible,
  reasons: row.reasons ?? [],
  availableSeats: row.availableSeats,
  financialRevisionId: row.financialRevisionId as FinancialRevisionId,
  batchVersion: row.batchVersion,
})

/**
 * Flattens the batch form back into the API's write shape.
 *
 * Plans, installments and offers carry an explicit `position` on the wire; the
 * UI keeps them in array order, so the index supplies it. Offers also need the
 * currency and precision the amount is denominated in, which the UI holds once
 * on the profile rather than on each offer.
 */
export function toBatchBody(input: BatchInput): Record<string, unknown> {
  const { financialProfile: profile } = input
  const { currency, precision } = profile.programPrice

  return {
    name: { ar: input.name.ar, ...(input.name.en ? { en: input.name.en } : {}) },
    code: input.code,
    academicYearId: input.academicYearId,
    intakeId: input.intakeId,
    description: input.description,
    maximumStudents: input.maximumStudents,
    schedule: {
      ...(input.schedule.registrationStartDate
        ? { registrationStartDate: input.schedule.registrationStartDate }
        : {}),
      ...(input.schedule.registrationEndDate
        ? { registrationEndDate: input.schedule.registrationEndDate }
        : {}),
      ...(input.schedule.studyStartDate
        ? { studyStartDate: input.schedule.studyStartDate }
        : {}),
      ...(input.schedule.studyEndDate
        ? { studyEndDate: input.schedule.studyEndDate }
        : {}),
      ...(input.schedule.graduationDate
        ? { graduationDate: input.schedule.graduationDate }
        : {}),
    },
    financialProfile: {
      programPrice: profile.programPrice,
      registrationFee: profile.registrationFee,
      installmentsEnabled: profile.installmentsEnabled,
      installmentPlans: profile.installmentPlans.map((plan, planIndex) => ({
        id: plan.id,
        name: plan.name,
        basis: plan.basis,
        coveredCharge: plan.coveredCharge,
        status: plan.status,
        position: planIndex + 1,
        installments: plan.installments.map((item, index) => ({
          id: item.id,
          label: item.label,
          value: item.value,
          milestone: item.milestoneId,
          position: item.position || index + 1,
        })),
      })),
      offers: profile.offers.map((offer, index) => ({
        id: offer.id,
        kind: offer.kind,
        name: offer.name,
        valueType: offer.valueType,
        value: offer.value,
        precision,
        ...(offer.valueType === "amount" ? { currency } : {}),
        ...(offer.validFrom ? { startDate: offer.validFrom } : {}),
        ...(offer.validTo ? { endDate: offer.validTo } : {}),
        status: offer.status,
        position: index + 1,
      })),
    },
    branchAssignments: input.branchAssignments.map((assignment) => ({
      branchId: assignment.branchId,
      role: assignment.role,
    })),
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
