import type {
  StudentDocumentCompletion,
  StudentEnrollmentStatus,
  StudentOfferingKind,
  StudentStatus,
} from './students.types';

export const STUDENTS_CONTEXT_PORT = Symbol('STUDENTS_CONTEXT_PORT');

export interface StudentEnrollmentTarget {
  /**
   * Present because Student Finance raises invoices per enrollment and keys
   * their idempotency on it. Carrying only the offering would make two
   * enrollments on the same offering indistinguishable.
   */
  enrollmentId: string;
  kind: StudentOfferingKind;
  offeringId: string;
  offeringLabel: string;
  batchId: string | null;
  batchLabel: string | null;
  status: StudentEnrollmentStatus;
}

/**
 * The stable read surface other modules consume. Carries no note content,
 * document files, address or national identity — deliberately, so consumers
 * need no additional redaction.
 *
 * Operational eligibility is derived by the consumer as
 * `status === 'active' && documentCompletion.missing === 0`. Students stores no
 * eligibility flag (research.md R-006).
 */
export interface StudentContextSummary {
  studentId: string;
  studentCode: string;
  fullName: string;
  status: StudentStatus;
  assignment: {
    registrationBranchId: string;
    studyBranchId: string;
    departmentId: string;
    academicGradeId: string | null;
  };
  enrollmentTargets: StudentEnrollmentTarget[];
  documentCompletion: StudentDocumentCompletion;
  financialSummaryRef: { state: string; asOf: string | null };
  admissionRef: { admissionId: string; approvalSnapshotId: string };
  updatedAt: string;
  version: number;
}

/** Bounded so a batch read can never become an unbounded query. */
export const STUDENT_CONTEXT_BATCH_LIMIT = 100;

export interface StudentsContextPort {
  getContext(studentId: string): Promise<StudentContextSummary | null>;
  resolveMany(studentIds: readonly string[]): Promise<StudentContextSummary[]>;
}
