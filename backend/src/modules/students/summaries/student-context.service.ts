import { Inject, Injectable } from '@nestjs/common';
import { StudentNotFoundException } from '../../../core/exceptions/students.exceptions';
import { PrismaService } from '../../../database/prisma.service';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { StudentDocumentPolicy } from '../documents/student-document.policy';
import { StudentMapper } from '../mappers/student.mapper';
import {
  STUDENT_CONTEXT_BATCH_LIMIT,
  type StudentContextSummary,
  type StudentsContextPort,
} from '../types/students-context.port';
import {
  STUDENT_FINANCE_READER_PORT,
  type StudentFinanceReaderPort,
} from '../types/student-finance-reader.port';

/**
 * Implements STUDENTS_CONTEXT_PORT — the stable read surface Student Finance,
 * reporting and future academic modules consume.
 *
 * Deliberately carries no note content, document files, address or national
 * identity, so a consumer needs no additional redaction. Operational
 * eligibility is derived by the consumer from `status` + `documentCompletion`;
 * no eligibility flag is stored (research.md R-006).
 */
@Injectable()
export class StudentContextService implements StudentsContextPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: StudentDocumentPolicy,
    private readonly mapper: StudentMapper,
    private readonly profile: OrganizationProfileService,
    @Inject(STUDENT_FINANCE_READER_PORT)
    private readonly finance: StudentFinanceReaderPort,
  ) {}

  async getContext(studentId: string): Promise<StudentContextSummary | null> {
    const [summary] = await this.resolveMany([studentId]);
    return summary ?? null;
  }

  async resolveMany(
    studentIds: readonly string[],
  ): Promise<StudentContextSummary[]> {
    const ids = [...new Set(studentIds)].slice(0, STUDENT_CONTEXT_BATCH_LIMIT);
    if (!ids.length) return [];

    const organizationId = (await this.profile.get()).organizationId;
    const rows = await this.prisma.student.findMany({
      where: { id: { in: ids }, organizationId },
      include: {
        enrollments: true,
        documents: { select: { typeKey: true, state: true } },
      },
    });

    return Promise.all(
      rows.map(async (row) => {
        const financial = await this.finance.getSummary(row.id);
        return {
          studentId: row.id,
          studentCode: row.studentCode,
          fullName: row.fullName,
          status: this.mapper.status(row.status),
          assignment: {
            registrationBranchId: row.registrationBranchId,
            studyBranchId: row.studyBranchId,
            departmentId: row.departmentId,
            academicGradeId: row.academicGradeId,
          },
          enrollmentTargets: row.enrollments.map((enrollment) => ({
            enrollmentId: enrollment.id,
            kind: this.mapper.offeringKind(enrollment.offeringKind),
            offeringId: enrollment.offeringId,
            offeringLabel: enrollment.offeringLabel,
            batchId: enrollment.batchId,
            batchLabel: enrollment.batchLabel,
            status: this.mapper.enrollmentStatus(enrollment.status),
          })),
          documentCompletion: this.documents.completion(row.documents),
          financialSummaryRef: {
            state: financial.state,
            asOf:
              financial.state === 'available' ? financial.summary.asOf : null,
          },
          admissionRef: {
            admissionId: row.admissionId,
            approvalSnapshotId: row.approvalSnapshotId,
          },
          updatedAt: row.updatedAt.toISOString(),
          version: row.version,
        };
      }),
    );
  }

  async requireContext(studentId: string): Promise<StudentContextSummary> {
    const summary = await this.getContext(studentId);
    if (!summary) throw new StudentNotFoundException();
    return summary;
  }
}
