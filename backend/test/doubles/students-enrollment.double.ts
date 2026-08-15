import type {
  FinanceEnrollmentRef,
  FinanceStudentRef,
  StudentsEnrollmentPort,
} from '../../src/modules/student-finance/types/students-enrollment.port';

/**
 * Deterministic stand-in for STUDENTS_ENROLLMENT_PORT.
 *
 * Sits behind the same interface as the production adapter, so a service under
 * test cannot tell them apart and no business logic changes when the real one
 * is used (constitution Principle XVI).
 */
export class StudentsEnrollmentDouble implements StudentsEnrollmentPort {
  private readonly students = new Map<string, FinanceStudentRef>();
  private readonly enrollments = new Map<string, FinanceEnrollmentRef[]>();

  withStudent(
    student: Partial<FinanceStudentRef> & { studentId: string },
  ): this {
    this.students.set(student.studentId, {
      studentCode: 'STD-2026-00001',
      fullName: 'محمد أحمد علي',
      branchId: '77777777-7777-7777-7777-777777777777',
      active: true,
      ...student,
    });
    return this;
  }

  withEnrollment(
    enrollment: Partial<FinanceEnrollmentRef> & {
      enrollmentId: string;
      studentId: string;
    },
  ): this {
    const full: FinanceEnrollmentRef = {
      offeringId: '88888888-8888-8888-8888-888888888888',
      offeringKind: 'professional-program',
      offeringLabel: 'برنامج تطوير الويب الاحترافي',
      batchId: null,
      batchLabel: null,
      branchId: '77777777-7777-7777-7777-777777777777',
      active: true,
      sourceAdmissionId: '99999999-9999-9999-9999-999999999999',
      sourceApprovalSnapshotId: 'aaaaaaaa-1111-1111-1111-111111111111',
      financialRevisionId: 'bbbbbbbb-1111-1111-1111-111111111111',
      tuitionMinor: '1800000',
      registrationFeesMinor: '50000',
      admissionDiscountMinor: '0',
      requiredAmountMinor: '1850000',
      currency: 'EGP',
      precision: 2,
      ...enrollment,
    };
    const existing = this.enrollments.get(full.studentId) ?? [];
    this.enrollments.set(full.studentId, [...existing, full]);
    return this;
  }

  getStudent(studentId: string): Promise<FinanceStudentRef | null> {
    return Promise.resolve(this.students.get(studentId) ?? null);
  }

  listEnrollments(studentId: string): Promise<FinanceEnrollmentRef[]> {
    return Promise.resolve(this.enrollments.get(studentId) ?? []);
  }
}
