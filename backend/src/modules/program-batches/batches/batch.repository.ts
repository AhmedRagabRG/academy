import { Injectable } from '@nestjs/common';
import type { BatchStatus, Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import { toMinorUnits } from '../../../shared/utils/money.util';
import {
  normalizeBatchCode,
  normalizeBatchSearch,
} from '../types/batch-normalization';
import type { BatchFinancialProfileDto } from './dto/batch-financial.dto';
import type { ListProgramBatchesDto } from './dto/list-batches.dto';
import type { CreateProgramBatchDto } from './dto/upsert-batch.dto';

export const batchInclude = {
  branches: {
    orderBy: [{ role: 'asc' as const }, { branchId: 'asc' as const }],
  },
  currentFinancialRevision: {
    include: {
      installmentPlans: {
        include: { installments: { orderBy: { position: 'asc' as const } } },
        orderBy: { position: 'asc' as const },
      },
      offers: { orderBy: { position: 'asc' as const } },
    },
  },
  lifecycle: {
    orderBy: [{ occurredAt: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.ProgramBatchInclude;

@Injectable()
export class BatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  find(batchId: string, programId?: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).programBatch.findFirst({
      where: { id: batchId, ...(programId ? { programId } : {}) },
      include: batchInclude,
    });
  }

  async list(
    programId: string,
    query: ListProgramBatchesDto,
    scopeBranchIds?: string[],
  ) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const search = query.search
      ? normalizeBatchSearch(query.search)
      : undefined;
    const where: Prisma.ProgramBatchWhereInput = {
      programId,
      ...(query.status && query.status !== 'ALL'
        ? { status: query.status }
        : query.status === 'ALL'
          ? {}
          : { status: { not: 'ARCHIVED' } }),
      ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
      ...(query.intakeId ? { intakeId: query.intakeId } : {}),
      ...(query.branchId
        ? { branches: { some: { branchId: query.branchId } } }
        : scopeBranchIds
          ? { branches: { some: { branchId: { in: scopeBranchIds } } } }
          : {}),
      ...(search
        ? {
            OR: [
              {
                code: {
                  contains: normalizeBatchCode(query.search ?? ''),
                  mode: 'insensitive',
                },
              },
              { normalizedNameAr: { contains: search } },
              { normalizedNameEn: { contains: search } },
            ],
          }
        : {}),
    };
    const direction = query.sortOrder ?? 'desc';
    const primary: Prisma.ProgramBatchOrderByWithRelationInput =
      query.sortBy === 'name'
        ? { normalizedNameAr: direction }
        : query.sortBy === 'code'
          ? { code: direction }
          : query.sortBy === 'status'
            ? { status: direction }
            : { updatedAt: direction };
    const [items, total] = await Promise.all([
      this.prisma.programBatch.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [primary, { id: 'asc' }],
        include: batchInclude,
      }),
      this.prisma.programBatch.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async create(
    organizationId: string,
    programId: string,
    dto: CreateProgramBatchDto,
    actorId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const batch = await tx.programBatch.create({
      data: {
        organizationId,
        programId,
        nameAr: dto.name.ar.trim(),
        nameEn: dto.name.en?.trim(),
        normalizedNameAr: normalizeBatchSearch(dto.name.ar),
        normalizedNameEn: dto.name.en
          ? normalizeBatchSearch(dto.name.en)
          : null,
        code: normalizeBatchCode(dto.code),
        academicYearId: dto.academicYearId,
        intakeId: dto.intakeId,
        description: dto.description.trim(),
        registrationStartDate: this.date(dto.schedule.registrationStartDate),
        registrationEndDate: this.date(dto.schedule.registrationEndDate),
        studyStartDate: this.date(dto.schedule.studyStartDate),
        studyEndDate: this.date(dto.schedule.studyEndDate),
        graduationDate: this.date(dto.schedule.graduationDate),
        maximumStudents: dto.maximumStudents,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    await this.replaceBranches(batch.id, dto, actorId, tx);
    const revisionId = await this.appendFinancial(
      batch.id,
      1,
      1,
      dto.financialProfile,
      actorId,
      tx,
    );
    await tx.programBatch.update({
      where: { id: batch.id },
      data: { currentFinancialRevisionId: revisionId },
    });
    await tx.batchLifecycleEvent.create({
      data: {
        batchId: batch.id,
        toStatus: 'DRAFT',
        actorId,
        resultingVersion: 1,
      },
    });
    return batch.id;
  }

  updateRoot(
    batchId: string,
    programId: string,
    expectedVersion: number,
    dto: CreateProgramBatchDto,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.programBatch.updateMany({
      where: {
        id: batchId,
        programId,
        version: expectedVersion,
        status: { not: 'ARCHIVED' },
      },
      data: {
        nameAr: dto.name.ar.trim(),
        nameEn: dto.name.en?.trim(),
        normalizedNameAr: normalizeBatchSearch(dto.name.ar),
        normalizedNameEn: dto.name.en
          ? normalizeBatchSearch(dto.name.en)
          : null,
        code: normalizeBatchCode(dto.code),
        academicYearId: dto.academicYearId,
        intakeId: dto.intakeId,
        description: dto.description.trim(),
        registrationStartDate: this.date(dto.schedule.registrationStartDate),
        registrationEndDate: this.date(dto.schedule.registrationEndDate),
        studyStartDate: this.date(dto.schedule.studyStartDate),
        studyEndDate: this.date(dto.schedule.studyEndDate),
        graduationDate: this.date(dto.schedule.graduationDate),
        maximumStudents: dto.maximumStudents,
        updatedBy: actorId,
        version: { increment: 1 },
      },
    });
  }

  async replaceBranches(
    batchId: string,
    dto: CreateProgramBatchDto,
    actorId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.batchBranchAssignment.deleteMany({ where: { batchId } });
    await tx.batchBranchAssignment.createMany({
      data: dto.branchAssignments.map((assignment) => ({
        batchId,
        branchId: assignment.branchId,
        role: assignment.role === 'registration' ? 'REGISTRATION' : 'STUDY',
        createdBy: actorId,
      })),
    });
  }

  async appendFinancial(
    batchId: string,
    revisionNumber: number,
    sourceBatchVersion: number,
    profile: BatchFinancialProfileDto,
    actorId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const revision = await tx.batchFinancialRevision.create({
      data: {
        batchId,
        revisionNumber,
        programPriceMinor: toMinorUnits(profile.programPrice),
        programPriceCurrency: profile.programPrice.currency,
        programPricePrecision: profile.programPrice.precision,
        registrationFeeMinor: toMinorUnits(profile.registrationFee),
        registrationFeeCurrency: profile.registrationFee.currency,
        registrationFeePrecision: profile.registrationFee.precision,
        installmentsEnabled: profile.installmentsEnabled,
        sourceBatchVersion,
        createdBy: actorId,
        installmentPlans: {
          create: profile.installmentPlans.map((plan) => ({
            id: crypto.randomUUID(),
            externalId: plan.id,
            name: plan.name.trim(),
            basis: plan.basis === 'amount' ? 'AMOUNT' : 'PERCENTAGE',
            coveredCharge: plan.coveredCharge
              .toUpperCase()
              .replaceAll('-', '_') as
              'PROGRAM_PRICE' | 'REGISTRATION_FEE' | 'COMBINED',
            status: plan.status === 'active' ? 'ACTIVE' : 'INACTIVE',
            position: plan.position,
            installments: {
              create: plan.installments.map((installment) => ({
                id: crypto.randomUUID(),
                externalId: installment.id,
                label: installment.label.trim(),
                valueMinor: toMinorUnits({
                  amount: installment.value,
                  currency: '',
                  precision: profile.programPrice.precision,
                }),
                valuePrecision: profile.programPrice.precision,
                milestone: installment.milestone,
                position: installment.position,
              })),
            },
          })),
        },
        offers: {
          create: profile.offers.map((offer) => ({
            id: crypto.randomUUID(),
            externalId: offer.id,
            kind: offer.kind === 'discount' ? 'DISCOUNT' : 'SCHOLARSHIP',
            name: offer.name.trim(),
            valueType: offer.valueType === 'amount' ? 'AMOUNT' : 'PERCENTAGE',
            valueMinor: toMinorUnits({
              amount: offer.value,
              currency: offer.currency ?? '',
              precision: offer.precision,
            }),
            valuePrecision: offer.precision,
            currency: offer.currency,
            startDate: this.date(offer.startDate),
            endDate: this.date(offer.endDate),
            status: offer.status === 'active' ? 'ACTIVE' : 'INACTIVE',
            position: offer.position,
          })),
        },
      },
    });
    return revision.id;
  }

  async setCurrentFinancialRevision(
    batchId: string,
    revisionId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.programBatch.update({
      where: { id: batchId },
      data: { currentFinancialRevisionId: revisionId },
    });
  }

  revisions(batchId: string) {
    return this.prisma.batchFinancialRevision.findMany({
      where: { batchId },
      orderBy: { revisionNumber: 'asc' },
      include: {
        installmentPlans: {
          include: { installments: { orderBy: { position: 'asc' } } },
          orderBy: { position: 'asc' },
        },
        offers: { orderBy: { position: 'asc' } },
      },
    });
  }

  lifecycle(batchId: string) {
    return this.prisma.batchLifecycleEvent.findMany({
      where: { batchId },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
  }

  transition(
    batchId: string,
    programId: string,
    expectedVersion: number,
    fromStatus: BatchStatus,
    toStatus: BatchStatus,
    reason: string | undefined,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.programBatch
      .updateMany({
        where: {
          id: batchId,
          programId,
          version: expectedVersion,
          status: fromStatus,
        },
        data: {
          status: toStatus,
          version: { increment: 1 },
          codeLockedAt:
            toStatus === 'REGISTRATION_OPEN' ? new Date() : undefined,
          archivedAt: toStatus === 'ARCHIVED' ? new Date() : undefined,
          updatedBy: actorId,
        },
      })
      .then(async (result) => {
        if (result.count === 1)
          await tx.batchLifecycleEvent.create({
            data: {
              batchId,
              fromStatus,
              toStatus,
              reason,
              actorId,
              resultingVersion: expectedVersion + 1,
            },
          });
        return result;
      });
  }

  private date(value?: string): Date | null {
    return value ? new Date(`${value}T00:00:00.000Z`) : null;
  }
}
