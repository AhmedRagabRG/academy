import type { Money } from "@/shared/utils/money"
import type { LookupOption, OfferingKind } from "../types/common"
import type {
  DiscountPolicy,
  DuePolicy,
  InstallmentEligibility,
  NumberingPolicy,
  PaymentMethod,
  ScholarshipPolicy,
} from "../types/domain"

/**
 * Finance-owned reader ports. Each is a narrow interface satisfied by an adapter
 * over another module's **public** exports. Student Finance never imports another
 * feature's fixtures, schemas, hooks, or components.
 *
 * The dependency runs finance → students, and never the reverse: Student
 * Management receives this module's finance reader through a registration point
 * instead of importing it (research R6).
 */

export interface StudentRef {
  id: string
  code: string
  name: string
  branchIds: string[]
  status: string
}

export interface EnrollmentRef {
  id: string
  studentId: string
  offeringId: string
  offeringKind: OfferingKind
  offeringLabel: string
  batchId?: string
  batchLabel?: string
  branchId: string
  status: string
}

export interface StudentDirectoryReader {
  getStudent(studentId: string, signal?: AbortSignal): Promise<StudentRef | undefined>
  listEnrollments(
    studentId: string,
    signal?: AbortSignal
  ): Promise<EnrollmentRef[]>
  getEnrollment(
    enrollmentId: string,
    signal?: AbortSignal
  ): Promise<EnrollmentRef | undefined>
  searchStudents(term: string, signal?: AbortSignal): Promise<LookupOption[]>
}

/** The commercial terms agreed at admission — the starting figures for invoice one. */
export interface AgreedTerms {
  productPrice: Money
  registrationFees: Money
  agreedDiscount?: Money
  requiredAmount: Money
}

export interface AdmissionTermsReader {
  getAgreedTerms(
    enrollmentId: string,
    signal?: AbortSignal
  ): Promise<AgreedTerms | undefined>
}

export interface OrganizationFinanceConfiguration {
  branches: LookupOption[]
  paymentMethods: PaymentMethod[]
  discountPolicy: DiscountPolicy
  scholarshipPolicy: ScholarshipPolicy
  numbering: NumberingPolicy
  duePolicy: DuePolicy
  installmentEligibility: InstallmentEligibility[]
  currency: string
  precision: number
}

export interface OrganizationFinanceReader {
  getFinanceConfiguration(
    signal?: AbortSignal
  ): Promise<OrganizationFinanceConfiguration>
}

/**
 * The organization's identity as it appears on a printed document.
 *
 * A printed invoice is issued *by* the organization, so it carries the
 * letterhead — logo, legal name, address and how to reach them. Finance owns
 * none of that, hence a reader rather than a copy.
 */
export interface OrganizationLetterhead {
  name: string
  address: string
  website: string
  /** The uploaded mark. Absent until one is set in Settings. */
  logoUrl?: string
  email?: string
  phone?: string
}

export interface OrganizationIdentityReader {
  getLetterhead(signal?: AbortSignal): Promise<OrganizationLetterhead>
}

export interface OfferingLabel {
  id: string
  kind: OfferingKind
  label: string
}

export interface OfferingPricingReader {
  getOfferingLabels(ids: string[], signal?: AbortSignal): Promise<OfferingLabel[]>
  listFilterOfferings(signal?: AbortSignal): Promise<LookupOption[]>
}

export interface BatchLabel {
  id: string
  programId: string
  label: string
}

export interface BatchPricingReader {
  getBatchLabels(ids: string[], signal?: AbortSignal): Promise<BatchLabel[]>
  listFilterBatches(signal?: AbortSignal): Promise<LookupOption[]>
}

export interface FinanceDependencyReaders {
  students: StudentDirectoryReader
  admissions: AdmissionTermsReader
  organization: OrganizationFinanceReader
  identity: OrganizationIdentityReader
  offerings: OfferingPricingReader
  batches: BatchPricingReader
}
