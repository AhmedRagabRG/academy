import type {
  AdmissionBatchOption,
  AdmissionOffering,
  DocumentRequirementSnapshot,
} from "../types/domain"
import type { LookupOption } from "../types/common"

export interface OrganizationAdmissionLookups {
  branches: LookupOption[]
  employees: LookupOption[]
  managers: LookupOption[]
  departments: LookupOption[]
  leadSources: LookupOption[]
  academicGrades: LookupOption[]
  qualifications: LookupOption[]
  documentPolicy: DocumentRequirementSnapshot
  currency: string
  precision: number
}

export interface OrganizationDirectoryReader {
  getAdmissionLookups(
    signal?: AbortSignal
  ): Promise<OrganizationAdmissionLookups>
}

export interface AcademicOfferingReader {
  listAdmissionOfferings(signal?: AbortSignal): Promise<AdmissionOffering[]>
  getAdmissionOffering(
    offeringId: string,
    signal?: AbortSignal
  ): Promise<AdmissionOffering | undefined>
}

export interface BatchEligibilityInput {
  programId: string
  batchId: string
  registrationBranchId: string
  studyBranchId: string
  evaluatedOn: string
}

export interface BatchAdmissionEligibility {
  eligible: boolean
  reasons: string[]
  batch?: AdmissionBatchOption
}

export interface BatchAdmissionEligibilityReader {
  listAdmissionBatches(
    programId?: string,
    signal?: AbortSignal
  ): Promise<AdmissionBatchOption[]>
  evaluateAdmissionBatch(
    input: BatchEligibilityInput,
    signal?: AbortSignal
  ): Promise<BatchAdmissionEligibility>
}
