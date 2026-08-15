import type {
  Audit,
  BatchStatus,
  BranchRole,
  CapacityState,
  FinancialRevisionId,
  LocalizedText,
  Money,
  ProgramBatchId,
  ProgramId,
} from "./common"
export interface BatchSchedule {
  registrationStartDate?: string
  registrationEndDate?: string
  studyStartDate?: string
  studyEndDate?: string
  graduationDate?: string
}
export interface BatchCapacity {
  maximumStudents: number
  currentStudents: number
  availableSeats: number
  state: CapacityState
}
export interface BranchAssignment {
  branchId: string
  role: BranchRole
  status: "active" | "historical"
}
export interface Installment {
  id: string
  label: string
  value: string
  milestoneId: string
  position: number
}
export interface InstallmentPlan {
  id: string
  name: string
  basis: "amount" | "percentage"
  coveredCharge: "program-price" | "registration-fee" | "combined"
  status: "active" | "inactive"
  installments: Installment[]
}
export interface BatchOffer {
  id: string
  kind: "discount" | "scholarship"
  name: string
  valueType: "amount" | "percentage"
  value: string
  validFrom?: string
  validTo?: string
  status: "active" | "inactive"
}
export interface FinancialProfile {
  programPrice: Money
  registrationFee: Money
  installmentsEnabled: boolean
  installmentPlans: InstallmentPlan[]
  offers: BatchOffer[]
  currentRevisionId: FinancialRevisionId
}
export interface LifecycleEvent {
  id: string
  fromStatus: BatchStatus | null
  toStatus: BatchStatus
  reason?: string
  actorId: string
  occurredAt: string
  resultVersion: number
}
export interface FinancialRevision {
  id: FinancialRevisionId
  revisionNumber: number
  snapshot: FinancialProfile
  createdAt: string
  createdBy: string
  sourceBatchVersion: number
}
export interface ProgramBatch extends Audit {
  id: ProgramBatchId
  programId: ProgramId
  name: LocalizedText
  code: string
  academicYearId: string
  intakeId: string
  description: string
  schedule: BatchSchedule
  capacity: BatchCapacity
  financialProfile: FinancialProfile
  branchAssignments: BranchAssignment[]
  status: BatchStatus
  codeLocked: boolean
  lifecycle: LifecycleEvent[]
  financialRevisions: FinancialRevision[]
}
export interface BatchSummary {
  id: ProgramBatchId
  programId: ProgramId
  name: string
  code: string
  academicYear: string
  intake: string
  registrationEndDate?: string
  studyStartDate?: string
  status: BatchStatus
  capacity: BatchCapacity
  price: Money
  branchCount: number
  updatedAt: string
  version: number
}
export interface BatchDetail extends ProgramBatch {
  programName: string
  academicYearName: string
  intakeName: string
}
export interface Finding {
  code: string
  section: string
  field?: string
  message: string
}
export interface Readiness {
  ready: boolean
  findings: Finding[]
  batchVersion: number
}
export interface Eligibility {
  eligible: boolean
  reasons: string[]
  availableSeats: number
  financialRevisionId: FinancialRevisionId
  batchVersion: number
}
export interface BatchLookups {
  program: {
    id: ProgramId
    name: string
    active: boolean
    batchingEligible: boolean
  }
  academicYears: { value: string; label: string }[]
  intakes: { value: string; label: string }[]
  branches: { value: string; label: string; status: "active" | "inactive" }[]
  milestones: { value: string; label: string }[]
  currency: string
  precision: number
}
