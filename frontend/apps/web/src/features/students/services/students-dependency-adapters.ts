import { admissionsService } from "@/features/admissions"
import type { LookupOption, OfferingKind } from "../types/common"
import type { EnrollmentIntakeInput } from "../types/projections"
import { studentLookupFixtures } from "../data/students-lookups"
import type {
  AcademicOfferingReader,
  AdmissionEnrollmentReader,
  AdmissionTimelineFacts,
  BatchDirectoryReader,
  BatchLabel,
  OfferingLabel,
  OrganizationDirectoryReader,
  OrganizationStudentLookups,
  StudentDependencyReaders,
} from "./students-dependency-readers"
import { resolveStudentFinanceReader } from "./student-finance-registry"

/**
 * Adapters over sibling modules' public exports only. Nothing here reaches into
 * another feature's fixtures, schemas, hooks, or components.
 */

export const admissionEnrollmentReader: AdmissionEnrollmentReader = {
  async getEnrollmentReadiness(admissionId, signal) {
    const summary = await admissionsService.enrollmentReadiness(
      admissionId as never,
      signal
    )
    if (
      !summary.ready ||
      !summary.approvalSnapshotId ||
      !summary.applicant ||
      !summary.academicTarget ||
      !summary.branches
    ) {
      return {
        ready: false,
        reasons: summary.reasons.length ? summary.reasons : ["not-approved"],
        admissionVersion: summary.admissionVersion,
      }
    }
    const input: EnrollmentIntakeInput = {
      admissionId: summary.admissionId,
      admissionReference: summary.admissionReference,
      admissionVersion: summary.admissionVersion,
      approvalSnapshotId: summary.approvalSnapshotId,
      applicant: {
        id: summary.applicant.id,
        name: summary.applicant.name,
        phone: summary.applicant.phone,
      },
      academicTarget: {
        kind: summary.academicTarget.kind as OfferingKind,
        offeringId: summary.academicTarget.offeringId,
        offeringVersion: summary.academicTarget.offeringVersion,
        batchId: summary.academicTarget.batchId,
        batchVersion: summary.academicTarget.batchVersion,
      },
      branches: {
        registrationBranchId: summary.branches.registrationBranchId,
        studyBranchId: summary.branches.studyBranchId,
      },
      financial: summary.financial
        ? {
            revisionId: summary.financial.revisionId,
            currency: summary.financial.currency,
            requiredAmount: summary.financial.requiredAmount,
          }
        : undefined,
    }
    return { ready: true, input }
  },

  async getAdmissionTimelineFacts(admissionId, signal) {
    const events = await admissionsService.lifecycle(
      admissionId as never,
      signal
    )
    const facts: AdmissionTimelineFacts = {}
    for (const event of events) {
      if (event.toStatus === "submitted" && !facts.submittedAt) {
        facts.submittedAt = event.occurredAt
        facts.actorName = event.actor.name
      }
      if (event.toStatus === "approved" && !facts.approvedAt) {
        facts.approvedAt = event.occurredAt
        facts.actorName = event.actor.name
      }
    }
    return facts
  },
}

/**
 * Organization, Catalog, and Batch facts are served from Students-owned configurable
 * lookup data during this frontend phase. Those modules do not currently publish a
 * student-shaped read, and importing their internals would break the module boundary.
 * This adapter is the single seam where an authoritative read plugs in later.
 */
export const organizationDirectoryReader: OrganizationDirectoryReader = {
  async getStudentLookups(): Promise<OrganizationStudentLookups> {
    const lookups = studentLookupFixtures()
    return {
      branches: lookups.branches,
      departments: lookups.departments,
      academicGrades: lookups.academicGrades,
      qualifications: lookups.qualifications,
      customerServiceEmployees: lookups.customerServiceEmployees,
      identityRules: lookups.identityRules,
      imagePolicy: lookups.imagePolicy,
      documentTypes: lookups.documentTypes,
      currency: lookups.currency,
      precision: lookups.precision,
    }
  },
}

export const academicOfferingReader: AcademicOfferingReader = {
  async getOfferingLabels(offeringIds): Promise<OfferingLabel[]> {
    const wanted = new Set(offeringIds)
    return studentLookupFixtures()
      .offeringCatalog.filter((offering) => wanted.has(offering.id))
      .map((offering) => ({
        id: offering.id,
        kind: offering.kind,
        label: offering.label,
        code: offering.code,
      }))
  },
  async listFilterOfferings(): Promise<LookupOption[]> {
    return studentLookupFixtures().offerings
  },
}

export const batchDirectoryReader: BatchDirectoryReader = {
  async getBatchLabels(batchIds): Promise<BatchLabel[]> {
    const wanted = new Set(batchIds)
    return studentLookupFixtures()
      .batchCatalog.filter((batch) => wanted.has(batch.id))
      .map((batch) => ({
        id: batch.id,
        programId: batch.programId,
        label: batch.label,
        code: batch.code,
      }))
  },
  async listFilterBatches(programId): Promise<LookupOption[]> {
    const catalog = studentLookupFixtures()
    if (!programId) return catalog.batches
    const allowed = new Set(
      catalog.batchCatalog
        .filter((batch) => batch.programId === programId)
        .map((batch) => batch.id)
    )
    return catalog.batches.filter((option) => allowed.has(option.value))
  },
}

export const studentDependencyReaders: StudentDependencyReaders = {
  admissions: admissionEnrollmentReader,
  organization: organizationDirectoryReader,
  offerings: academicOfferingReader,
  batches: batchDirectoryReader,
  // Resolved on every call so a reader registered after this module is imported
  // is still picked up — registration order stops being a correctness concern.
  get finance() {
    return resolveStudentFinanceReader()
  },
}
