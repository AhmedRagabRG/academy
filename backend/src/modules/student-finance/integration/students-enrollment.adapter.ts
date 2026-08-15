import { Inject, Injectable } from '@nestjs/common';
import {
  ADMISSIONS_ENROLLMENT_PORT,
  type AdmissionsEnrollmentPort,
} from '../../admissions/types/admissions-enrollment.port';
import {
  STUDENTS_CONTEXT_PORT,
  type StudentContextSummary,
  type StudentsContextPort,
} from '../../students/types/students-context.port';
import type {
  FinanceEnrollmentRef,
  FinanceStudentRef,
  StudentsEnrollmentPort,
} from '../types/students-enrollment.port';

/**
 * Composes the two public ports Finance depends on:
 *
 *   Students   → who the student is and which enrollments exist
 *   Admissions → the settled financial figures those enrollments were approved on
 *
 * Students deliberately stores no money, and Admissions deliberately stores no
 * enrollment, so neither port alone can answer "what does this enrollment
 * cost?". Joining them here keeps that knowledge in the module that needs it
 * and leaves both owners free of a Finance-shaped read.
 */
@Injectable()
export class StudentsEnrollmentAdapter implements StudentsEnrollmentPort {
  constructor(
    @Inject(STUDENTS_CONTEXT_PORT)
    private readonly students: StudentsContextPort,
    @Inject(ADMISSIONS_ENROLLMENT_PORT)
    private readonly admissions: AdmissionsEnrollmentPort,
  ) {}

  async getStudent(studentId: string): Promise<FinanceStudentRef | null> {
    const context = await this.students.getContext(studentId);
    return context ? this.toStudentRef(context) : null;
  }

  async listEnrollments(studentId: string): Promise<FinanceEnrollmentRef[]> {
    const context = await this.students.getContext(studentId);
    if (!context) return [];
    const snapshot = await this.admissions.getApprovalFinancialSnapshot(
      context.admissionRef.approvalSnapshotId,
    );
    if (!snapshot) return [];
    return context.enrollmentTargets.map((target) =>
      this.toEnrollmentRef(context, target, snapshot),
    );
  }

  private toStudentRef(context: StudentContextSummary): FinanceStudentRef {
    return {
      studentId: context.studentId,
      studentCode: context.studentCode,
      fullName: context.fullName,
      branchId: context.assignment.studyBranchId,
      active: context.status === 'active',
    };
  }

  private toEnrollmentRef(
    context: StudentContextSummary,
    target: StudentContextSummary['enrollmentTargets'][number],
    snapshot: NonNullable<
      Awaited<
        ReturnType<AdmissionsEnrollmentPort['getApprovalFinancialSnapshot']>
      >
    >,
  ): FinanceEnrollmentRef {
    return {
      enrollmentId: target.enrollmentId,
      studentId: context.studentId,
      offeringId: target.offeringId,
      offeringKind: target.kind,
      offeringLabel: target.offeringLabel,
      batchId: target.batchId,
      batchLabel: target.batchLabel,
      branchId: context.assignment.studyBranchId,
      active: target.status === 'active',
      sourceAdmissionId: context.admissionRef.admissionId,
      sourceApprovalSnapshotId: context.admissionRef.approvalSnapshotId,
      financialRevisionId: snapshot.financialRevisionId,
      tuitionMinor: snapshot.productPriceMinor,
      registrationFeesMinor: snapshot.registrationFeesMinor,
      admissionDiscountMinor: snapshot.discountAmountMinor,
      requiredAmountMinor: snapshot.requiredAmountMinor,
      currency: snapshot.currency,
      precision: snapshot.precision,
    };
  }
}
