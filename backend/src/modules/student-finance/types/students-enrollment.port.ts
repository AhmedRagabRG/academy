import type { OfferingKind } from './student-finance.types';

export const STUDENTS_ENROLLMENT_PORT = Symbol('STUDENTS_ENROLLMENT_PORT');

/**
 * Identity Finance needs to render a record. Deliberately excludes national
 * identity, address, contact details, documents and notes: Finance never
 * displays them, and the accounting projection must be able to prove it cannot
 * leak them.
 */
export interface FinanceStudentRef {
  studentId: string;
  studentCode: string;
  fullName: string;
  branchId: string;
  active: boolean;
}

/**
 * One enrollment plus the immutable pricing snapshot carried forward from the
 * Admissions approval snapshot. The snapshot is the ONLY pricing source for
 * raising an invoice — Finance never reads live catalog or batch pricing,
 * which is what makes later price changes structurally unable to affect an
 * existing invoice.
 */
export interface FinanceEnrollmentRef {
  enrollmentId: string;
  studentId: string;
  offeringId: string;
  offeringKind: OfferingKind;
  offeringLabel: string;
  batchId: string | null;
  batchLabel: string | null;
  branchId: string;
  active: boolean;
  sourceAdmissionId: string;
  sourceApprovalSnapshotId: string;
  financialRevisionId: string;
  tuitionMinor: string;
  registrationFeesMinor: string;
  admissionDiscountMinor: string;
  requiredAmountMinor: string;
  currency: string;
  precision: number;
}

/**
 * Consumed only while provisioning an account and reconciling new enrollments.
 * Once a snapshot exists, Finance reads its own immutable copy by enrollment
 * id — that is the whole point of copying it, and it means invoice raising has
 * no runtime dependency on another module.
 */
export interface StudentsEnrollmentPort {
  getStudent(studentId: string): Promise<FinanceStudentRef | null>;
  listEnrollments(studentId: string): Promise<FinanceEnrollmentRef[]>;
}
