import type {
  OfferingKind,
  StudentId,
  StudentStatus,
} from "./common"
import type {
  Student,
  StudentEnrollment,
  StudentFinancialSummaryResult,
} from "./domain"

/**
 * Narrow list row. Deliberately excludes national identifier, address, documents,
 * notes, timeline, and finance so the 20,000-record list stays cheap and safe.
 */
export interface StudentSummary {
  id: StudentId
  studentCode: string
  fullName: string
  /** Redacted for branch-scoped contexts. */
  phoneHint: string
  registrationBranchLabel: string
  studyBranchLabel: string
  departmentLabel: string
  primaryOfferingLabel: string
  primaryBatchLabel?: string
  customerServiceEmployeeName: string
  status: StudentStatus
  enrollmentCount: number
  updatedAt: string
  version: number
}

export interface StudentDocumentCompletion {
  requiredTypes: number
  present: number
  missing: number
  archived: number
}

/** Which workspace areas the acting employee may open. */
export interface StudentAreaPermissions {
  overview: boolean
  enrollments: boolean
  documents: boolean
  documentsManage: boolean
  notes: boolean
  notesManage: boolean
  timeline: boolean
  financial: boolean
  update: boolean
  archive: boolean
  activate: boolean
  statusManage: boolean
  statusCorrect: boolean
  export: boolean
}

export interface StudentDetail extends Student {
  enrollments: StudentEnrollment[]
  documentCompletion: StudentDocumentCompletion
  /** Derived from the transition policy, then filtered by permissions. */
  availableStatusActions: StudentStatus[]
  permissions: StudentAreaPermissions
}

export interface StudentRef {
  studentId: StudentId
  studentCode: string
}

/**
 * The stable read surface for future Finance, CRM, AI, and Reporting consumers.
 * Never carries note content, document files, addresses, or national identifiers.
 */
export interface StudentContextSummary {
  studentId: StudentId
  studentCode: string
  fullName: string
  status: StudentStatus
  assignment: {
    registrationBranchId: string
    studyBranchId: string
    departmentId: string
    academicGradeId?: string
  }
  enrollmentTargets: {
    kind: OfferingKind
    offeringId: string
    batchId?: string
    status: string
  }[]
  documentCompletion: {
    requiredTypes: number
    present: number
    missing: number
  }
  financialSummaryRef?: {
    state: StudentFinancialSummaryResult["state"]
    asOf?: string
  }
  admissionRef: {
    admissionId: string
    approvalSnapshotId: string
  }
  updatedAt: string
  version: number
}

/** Inbound payload mapped from the Admissions `EnrollmentReadinessSummary`. */
export interface EnrollmentIntakeInput {
  admissionId: string
  admissionReference: string
  admissionVersion: number
  approvalSnapshotId: string
  applicant: { id: string; name: string; phone: string }
  academicTarget: {
    kind: OfferingKind
    offeringId: string
    offeringVersion: number
    batchId?: string
    batchVersion?: number
  }
  branches: { registrationBranchId: string; studyBranchId: string }
  financial?: {
    revisionId: string
    currency: string
    requiredAmount: string
  }
}

export interface BulkStatusOutcome {
  studentId: StudentId
  studentCode: string
  outcome: "applied" | "refused"
  refusalCode?: string
  message?: string
}
