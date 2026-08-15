import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import type { EnrollmentFinancialSnapshotInput } from '../types/student-finance.types';

export interface AccountCreateInput {
  organizationId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  searchName: string;
  currency: string;
  precision: number;
  actorId: string;
}

@Injectable()
export class StudentFinancialAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByStudent(studentId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).studentFinancialAccount.findUnique({
      where: { studentId },
      include: { snapshots: true },
    });
  }

  findById(accountId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).studentFinancialAccount.findUnique({
      where: { id: accountId },
    });
  }

  /**
   * Idempotent on `studentId` at the database level. A replayed
   * `student.created` event resolves to the existing account rather than
   * racing a read-then-write check that two concurrent deliveries could both
   * pass.
   */
  async provision(
    input: AccountCreateInput,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string; created: boolean }> {
    const existing = await tx.studentFinancialAccount.findUnique({
      where: { studentId: input.studentId },
      select: { id: true },
    });
    if (existing) return { id: existing.id, created: false };

    const account = await tx.studentFinancialAccount.create({
      data: {
        organizationId: input.organizationId,
        studentId: input.studentId,
        studentCode: input.studentCode,
        studentName: input.studentName,
        searchName: input.searchName,
        currency: input.currency,
        precision: input.precision,
        createdById: input.actorId,
        updatedById: input.actorId,
      },
      select: { id: true },
    });
    return { id: account.id, created: true };
  }

  /**
   * Written once per enrollment and never updated — the table has no update
   * path here and a trigger rejects one at the database. This is what makes
   * "future pricing changes never modify existing student accounts"
   * structural rather than procedural.
   */
  async addSnapshots(
    accountId: string,
    snapshots: readonly EnrollmentFinancialSnapshotInput[],
    actorId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    if (!snapshots.length) return 0;
    const result = await tx.studentEnrollmentFinancialSnapshot.createMany({
      data: snapshots.map((snapshot) => ({
        accountId,
        enrollmentId: snapshot.enrollmentId,
        offeringId: snapshot.offeringId,
        offeringKind: this.toStoredKind(snapshot.offeringKind),
        offeringLabel: snapshot.offeringLabel,
        batchId: snapshot.batchId,
        batchLabel: snapshot.batchLabel,
        branchId: snapshot.branchId,
        sourceAdmissionId: snapshot.sourceAdmissionId,
        sourceApprovalSnapshotId: snapshot.sourceApprovalSnapshotId,
        sourceFinancialRevisionId: snapshot.sourceFinancialRevisionId,
        tuitionMinor: snapshot.tuitionMinor,
        registrationFeesMinor: snapshot.registrationFeesMinor,
        admissionDiscountMinor: snapshot.admissionDiscountMinor,
        requiredAmountMinor: snapshot.requiredAmountMinor,
        currency: snapshot.currency,
        precision: snapshot.precision,
        snapshotById: actorId,
      })),
      // A re-run reconciling new enrollments must not fail on the ones it
      // already captured.
      skipDuplicates: true,
    });
    return result.count;
  }

  findSnapshot(enrollmentId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).studentEnrollmentFinancialSnapshot.findUnique({
      where: { enrollmentId },
    });
  }

  private toStoredKind(
    kind: EnrollmentFinancialSnapshotInput['offeringKind'],
  ): 'PROFESSIONAL_PROGRAM' | 'PROFESSIONAL_DIPLOMA' | 'TRAINING_COURSE' {
    if (kind === 'professional-program') return 'PROFESSIONAL_PROGRAM';
    if (kind === 'professional-diploma') return 'PROFESSIONAL_DIPLOMA';
    return 'TRAINING_COURSE';
  }
}
