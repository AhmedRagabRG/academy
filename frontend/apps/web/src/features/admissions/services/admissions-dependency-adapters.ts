import {
  admissionBatches,
  admissionLookups,
  admissionOfferings,
} from "../data/admissions-lookups"
import type {
  AcademicOfferingReader,
  BatchAdmissionEligibilityReader,
  OrganizationDirectoryReader,
} from "./admissions-dependency-readers"

const clone = <T>(value: T): T => structuredClone(value)

export const organizationDirectoryReader: OrganizationDirectoryReader = {
  async getAdmissionLookups(signal) {
    signal?.throwIfAborted()
    const {
      offerings: _offerings,
      batches: _batches,
      ...organization
    } = admissionLookups
    return clone(organization)
  },
}

export const academicOfferingReader: AcademicOfferingReader = {
  async listAdmissionOfferings(signal) {
    signal?.throwIfAborted()
    return clone(admissionOfferings)
  },
  async getAdmissionOffering(offeringId, signal) {
    signal?.throwIfAborted()
    return clone(admissionOfferings.find((item) => item.id === offeringId))
  },
}

export const batchAdmissionEligibilityReader: BatchAdmissionEligibilityReader =
  {
    async listAdmissionBatches(programId, signal) {
      signal?.throwIfAborted()
      return clone(
        admissionBatches.filter(
          (batch) => !programId || batch.programId === programId
        )
      )
    },
    async evaluateAdmissionBatch(input, signal) {
      signal?.throwIfAborted()
      const batch = admissionBatches.find((item) => item.id === input.batchId)
      const reasons: string[] = []
      if (!batch) reasons.push("batch-required")
      if (batch && batch.programId !== input.programId)
        reasons.push("batch-parent-mismatch")
      if (batch && batch.status !== "registration-open")
        reasons.push("registration-not-open")
      if (
        batch &&
        (input.evaluatedOn < batch.registrationStartDate ||
          input.evaluatedOn > batch.registrationEndDate)
      )
        reasons.push("outside-registration-window")
      if (batch && batch.availableSeats <= 0) reasons.push("no-seats")
      if (
        batch &&
        !batch.registrationBranchIds.includes(input.registrationBranchId)
      )
        reasons.push("registration-branch-unavailable")
      if (batch && !batch.studyBranchIds.includes(input.studyBranchId))
        reasons.push("study-branch-unavailable")
      return { eligible: reasons.length === 0, reasons, batch: clone(batch) }
    },
  }
