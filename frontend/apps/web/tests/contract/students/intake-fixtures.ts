import type { EnrollmentIntakeInput } from "@/features/students/types/projections"

/** A ready, approved admission payload shared by the intake contract tests. */
export function readyInput(
  overrides: Partial<EnrollmentIntakeInput> = {}
): EnrollmentIntakeInput {
  return {
    admissionId: "admission-new",
    admissionReference: "ADM-90001",
    admissionVersion: 7,
    approvalSnapshotId: "approval-new-001",
    applicant: {
      id: "applicant-new",
      name: "ندى حسام",
      phone: "01011223344",
    },
    academicTarget: {
      kind: "professional-program",
      offeringId: "offering-program-fullstack",
      offeringVersion: 3,
      batchId: "batch-fs-2026-a",
      batchVersion: 2,
    },
    branches: {
      registrationBranchId: "branch-main",
      studyBranchId: "branch-main",
    },
    financial: {
      revisionId: "finrev-1",
      currency: "EGP",
      requiredAmount: "18000.00",
    },
    ...overrides,
  }
}
