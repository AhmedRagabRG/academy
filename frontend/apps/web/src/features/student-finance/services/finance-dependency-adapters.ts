import { organizationSettingsService } from "@/features/organization-settings"
import { studentsService } from "@/features/students"
import type { StudentId } from "@/features/students"
import { makeMoney } from "@/shared/utils/money"
import type { LookupOption } from "../types/common"
import {
  batchOptions,
  CURRENCY,
  financeBatches,
  financeConfiguration,
  financeOfferings,
  offeringOptions,
  PRECISION,
} from "../data/finance-lookups"
import type {
  AdmissionTermsReader,
  AgreedTerms,
  BatchPricingReader,
  EnrollmentRef,
  FinanceDependencyReaders,
  OfferingPricingReader,
  OrganizationFinanceReader,
  OrganizationIdentityReader,
  OrganizationLetterhead,
  StudentDirectoryReader,
  StudentRef,
} from "./finance-dependency-readers"

/**
 * Adapters over sibling modules' **public** exports only.
 *
 * The single cross-feature import is `@/features/students`, and it is one-way:
 * Student Management receives this module's finance reader through a registration
 * point rather than importing it (research R6).
 *
 * Both modules now resolve through the same mock/API switch, so this reads
 * whichever side Student Finance itself is running on — fixture students for
 * fixture invoices, live students for live invoices.
 */

export const studentDirectoryReader: StudentDirectoryReader = {
  async getStudent(studentId, signal): Promise<StudentRef | undefined> {
    try {
      const detail = await studentsService.get(studentId as StudentId, signal)
      return {
        id: detail.id,
        code: detail.studentCode,
        name: detail.identity.fullName,
        branchIds: [
          detail.assignment.registrationBranchId,
          detail.assignment.studyBranchId,
        ],
        status: detail.status,
      }
    } catch {
      return undefined
    }
  },

  async listEnrollments(studentId, signal): Promise<EnrollmentRef[]> {
    const detail = await studentsService.get(studentId as StudentId, signal)
    const enrollments = await studentsService.listEnrollments(
      studentId as StudentId,
      signal
    )
    return enrollments.map((enrollment) => ({
      id: enrollment.id,
      studentId,
      offeringId: enrollment.offeringId,
      offeringKind: enrollment.offeringKind,
      offeringLabel: enrollment.offeringLabel,
      batchId: enrollment.batchId,
      batchLabel: enrollment.batchLabel,
      branchId: detail.assignment.studyBranchId,
      status: enrollment.status,
    }))
  },

  async getEnrollment(enrollmentId, signal): Promise<EnrollmentRef | undefined> {
    // Enrollments are addressed through their student in the public contract, so
    // the adapter scans the permitted set rather than reaching into internals.
    const page = await studentsService.list({ page: 1, pageSize: 200 }, signal)
    for (const row of page.items) {
      const enrollments = await this.listEnrollments(row.id, signal)
      const match = enrollments.find((entry) => entry.id === enrollmentId)
      if (match) return match
    }
    return undefined
  },

  async searchStudents(term, signal): Promise<LookupOption[]> {
    const page = await studentsService.list(
      { page: 1, pageSize: 20, search: term },
      signal
    )
    return page.items.map((row) => ({
      value: row.id,
      label: `${row.fullName} — ${row.studentCode}`,
      active: row.status === "active",
    }))
  },
}

/**
 * Admission-agreed commercial terms. Admissions does not publish a per-enrollment
 * terms read today, so this adapter derives the starting figures from the
 * configured offering price. It is the single seam where an authoritative
 * admission-terms read plugs in later; once an invoice exists it keeps its own
 * recorded figures regardless.
 */
export const admissionTermsReader: AdmissionTermsReader = {
  async getAgreedTerms(enrollmentId): Promise<AgreedTerms | undefined> {
    const enrollment = await studentDirectoryReader.getEnrollment(enrollmentId)
    if (!enrollment) return undefined
    const offering = financeOfferings.find(
      (entry) => entry.id === enrollment.offeringId
    )
    if (!offering) return undefined

    const productPrice = makeMoney(offering.price, CURRENCY, PRECISION)
    const registrationFees = makeMoney("500.00", CURRENCY, PRECISION)
    return {
      productPrice,
      registrationFees,
      requiredAmount: productPrice,
    }
  },
}

export const organizationFinanceReader: OrganizationFinanceReader = {
  async getFinanceConfiguration() {
    return financeConfiguration()
  },
}

export const offeringPricingReader: OfferingPricingReader = {
  async getOfferingLabels(ids) {
    const wanted = new Set(ids)
    return financeOfferings
      .filter((entry) => wanted.has(entry.id))
      .map((entry) => ({ id: entry.id, kind: entry.kind, label: entry.label }))
  },
  async listFilterOfferings() {
    return offeringOptions()
  },
}

export const batchPricingReader: BatchPricingReader = {
  async getBatchLabels(ids) {
    const wanted = new Set(ids)
    return financeBatches
      .filter((entry) => wanted.has(entry.id))
      .map((entry) => ({
        id: entry.id,
        programId: entry.programId,
        label: entry.label,
      }))
  },
  async listFilterBatches() {
    return batchOptions()
  },
}

/**
 * The letterhead, read from Organization & Settings.
 *
 * The contact points are a typed list rather than named fields, so the primary
 * of each kind is picked here — falling back to the first of that kind, since
 * an organization with exactly one phone often never marks it primary.
 */
export const organizationIdentityReader: OrganizationIdentityReader = {
  async getLetterhead(): Promise<OrganizationLetterhead> {
    const profile = await organizationSettingsService.getProfile()
    const contact = (type: "phone" | "email") => {
      const matching = profile.contacts.filter((entry) => entry.type === type)
      return (matching.find((entry) => entry.isPrimary) ?? matching[0])?.value
    }
    return {
      name: profile.nameAr || profile.name,
      address: profile.address,
      website: profile.website,
      logoUrl: profile.logo?.url,
      email: contact("email"),
      phone: contact("phone"),
    }
  },
}

export const financeDependencyReaders: FinanceDependencyReaders = {
  students: studentDirectoryReader,
  admissions: admissionTermsReader,
  organization: organizationFinanceReader,
  identity: organizationIdentityReader,
  offerings: offeringPricingReader,
  batches: batchPricingReader,
}
