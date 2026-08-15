import type {
  Admission,
  AdmissionApprovalSnapshot,
  Applicant,
  EnrollmentReadinessSummary,
} from "../types/domain"
import type { AdmissionApprovalSnapshotId } from "../types/common"

export function buildApprovalSnapshot(
  admission: Admission,
  applicant: Applicant,
  actor: { id: string; name: string },
  now: string
): AdmissionApprovalSnapshot {
  if (!admission.selection || !admission.financial)
    throw new Error("readiness-incomplete")
  return {
    id: `approval-${admission.id}-${admission.version + 1}` as AdmissionApprovalSnapshotId,
    admissionId: admission.id,
    applicantId: applicant.id,
    selection: structuredClone(admission.selection),
    assignment: structuredClone(admission.assignment),
    verifiedDocumentVersionIds: admission.documents.flatMap((document) =>
      document.state === "verified" && document.currentVersion
        ? [document.currentVersion.id]
        : []
    ),
    requirementSnapshotId: admission.requirementSnapshot.id,
    financial: structuredClone(admission.financial),
    approvedAt: now,
    approvedBy: actor,
  }
}

export function buildEnrollmentReadiness(
  admission: Admission,
  applicant: Applicant
): EnrollmentReadinessSummary {
  const ready =
    admission.status === "approved" && Boolean(admission.approvalSnapshot)
  const snapshot = admission.approvalSnapshot
  return {
    ready,
    reasons: ready ? [] : ["admission-not-approved"],
    admissionId: admission.id,
    admissionReference: admission.reference,
    admissionVersion: admission.version,
    status: admission.status,
    approvalSnapshotId: snapshot?.id,
    applicant: ready
      ? {
          id: applicant.id,
          name: applicant.fullName,
          phone: applicant.primaryPhone,
        }
      : undefined,
    academicTarget: snapshot
      ? {
          kind: snapshot.selection.offeringKind,
          offeringId: snapshot.selection.offeringId,
          offeringVersion: snapshot.selection.offeringVersion,
          batchId: snapshot.selection.batchId,
          batchVersion: snapshot.selection.batchVersion,
        }
      : undefined,
    branches: snapshot
      ? {
          registrationBranchId: snapshot.assignment.registrationBranchId,
          studyBranchId: snapshot.assignment.studyBranchId,
        }
      : undefined,
    financial: snapshot
      ? {
          revisionId: snapshot.financial.id,
          currency: snapshot.financial.requiredAmount.currency,
          requiredAmount: snapshot.financial.requiredAmount.amount,
        }
      : undefined,
  }
}
