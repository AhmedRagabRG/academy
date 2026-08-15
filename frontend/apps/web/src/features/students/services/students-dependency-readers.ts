import type { LookupOption, OfferingKind, StudentId } from "../types/common"
import type {
  StudentDocumentType,
  StudentFinancialSummaryResult,
  StudentIdentityRules,
  StudentImagePolicy,
} from "../types/domain"
import type { EnrollmentIntakeInput } from "../types/projections"

/**
 * Student-owned reader ports. Each is a narrow interface satisfied by an adapter
 * over another module's public exports. Students never imports another feature's
 * fixtures, schemas, hooks, or components.
 */

export interface AdmissionTimelineFacts {
  submittedAt?: string
  approvedAt?: string
  actorName?: string
}

export interface AdmissionEnrollmentReader {
  /**
   * Returns the intake payload when the admission is Approved and its enrollment
   * outcome is confirmed, or a refusal carrying stable reason codes.
   */
  getEnrollmentReadiness(
    admissionId: string,
    signal?: AbortSignal
  ): Promise<
    | { ready: true; input: EnrollmentIntakeInput }
    | { ready: false; reasons: string[]; admissionVersion?: number }
  >
  getAdmissionTimelineFacts(
    admissionId: string,
    signal?: AbortSignal
  ): Promise<AdmissionTimelineFacts>
}

export interface OrganizationStudentLookups {
  branches: LookupOption[]
  departments: LookupOption[]
  academicGrades: LookupOption[]
  qualifications: LookupOption[]
  customerServiceEmployees: LookupOption[]
  identityRules: StudentIdentityRules
  imagePolicy: StudentImagePolicy
  documentTypes: StudentDocumentType[]
  currency: string
  precision: number
}

export interface OrganizationDirectoryReader {
  getStudentLookups(signal?: AbortSignal): Promise<OrganizationStudentLookups>
}

export interface OfferingLabel {
  id: string
  kind: OfferingKind
  label: string
  code: string
}

export interface AcademicOfferingReader {
  getOfferingLabels(
    offeringIds: string[],
    signal?: AbortSignal
  ): Promise<OfferingLabel[]>
  listFilterOfferings(signal?: AbortSignal): Promise<LookupOption[]>
}

export interface BatchLabel {
  id: string
  programId: string
  label: string
  code: string
}

export interface BatchDirectoryReader {
  getBatchLabels(
    batchIds: string[],
    signal?: AbortSignal
  ): Promise<BatchLabel[]>
  listFilterBatches(
    programId?: string,
    signal?: AbortSignal
  ): Promise<LookupOption[]>
}

export interface StudentFinanceReader {
  getFinancialSummary(
    studentId: StudentId,
    signal?: AbortSignal
  ): Promise<StudentFinancialSummaryResult>
}

export interface StudentDependencyReaders {
  admissions: AdmissionEnrollmentReader
  organization: OrganizationDirectoryReader
  offerings: AcademicOfferingReader
  batches: BatchDirectoryReader
  finance: StudentFinanceReader
}
