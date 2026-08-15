import { Injectable } from '@nestjs/common';
import type {
  ApplicantStatus,
  Prisma,
} from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class ApplicantRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, organizationId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).applicant.findFirst({
      where: { id, organizationId },
    });
  }

  findDuplicateCandidates(
    organizationId: string,
    values: {
      normalizedNationalId?: string;
      normalizedPrimaryPhone?: string;
      normalizedFullName?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const candidates: Prisma.ApplicantWhereInput[] = [];
    if (values.normalizedNationalId) {
      candidates.push({ normalizedNationalId: values.normalizedNationalId });
    }
    if (values.normalizedPrimaryPhone) {
      candidates.push({
        normalizedPrimaryPhone: values.normalizedPrimaryPhone,
      });
    }
    if (values.normalizedFullName) {
      candidates.push({ normalizedFullName: values.normalizedFullName });
    }
    if (!candidates.length) return Promise.resolve([]);
    return (tx ?? this.prisma).applicant.findMany({
      where: { organizationId, OR: candidates },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    });
  }

  create(
    data: Prisma.ApplicantUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.applicant.create({ data });
  }

  updateCompareAndSwap(
    id: string,
    organizationId: string,
    expectedVersion: number,
    data: Omit<Prisma.ApplicantUncheckedUpdateManyInput, 'version'>,
    tx: Prisma.TransactionClient,
  ) {
    return tx.applicant.updateMany({
      where: { id, organizationId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }

  archiveCompareAndSwap(
    id: string,
    organizationId: string,
    expectedVersion: number,
    reason: string,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    const status: ApplicantStatus = 'ARCHIVED';
    return tx.applicant.updateMany({
      where: { id, organizationId, version: expectedVersion, status: 'ACTIVE' },
      data: {
        status,
        archiveReason: reason.trim(),
        archivedAt: new Date(),
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });
  }
}
