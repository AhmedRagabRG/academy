import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

export type StudentSortField =
  'fullName' | 'studentCode' | 'enrollmentDate' | 'updatedAt' | 'status';

export interface StudentListFilters {
  organizationId: string;
  search?: string;
  branchIds?: string[];
  departmentIds?: string[];
  offeringIds?: string[];
  batchIds?: string[];
  statuses?: Prisma.StudentWhereInput['status'][];
  customerServiceEmployeeIds?: string[];
  scope: Record<string, unknown> | null;
  includeArchived: boolean;
}

const DETAIL_INCLUDE = {
  enrollments: { orderBy: { createdAt: 'asc' } },
  documents: { include: { currentVersion: true } },
  statusHistory: { orderBy: { occurredAt: 'asc' } },
} as const;

/**
 * The only layer permitted to import Prisma (constitution Principle V). Every
 * write method accepts an ambient transaction client so a service can compose
 * several repository calls atomically (Principle XI).
 */
@Injectable()
export class StudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, organizationId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).student.findFirst({
      where: { id, organizationId },
    });
  }

  findDetail(id: string, organizationId: string) {
    return this.prisma.student.findFirst({
      where: { id, organizationId },
      include: DETAIL_INCLUDE,
    });
  }

  findByApprovalSnapshot(
    organizationId: string,
    approvalSnapshotId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).student.findFirst({
      where: { organizationId, approvalSnapshotId },
    });
  }

  findDetailById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).student.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
  }

  create(
    data: Prisma.StudentUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.student.create({ data });
  }

  /**
   * Compare-and-swap on `version`. Returns the affected row count so the
   * service can distinguish "not found" from "stale version" and surface
   * `currentVersion` as a first-class field.
   */
  updateCompareAndSwap(
    id: string,
    organizationId: string,
    expectedVersion: number,
    data: Omit<Prisma.StudentUncheckedUpdateManyInput, 'version'>,
    tx: Prisma.TransactionClient,
  ) {
    return tx.student.updateMany({
      where: { id, organizationId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }

  /** Allocates the next timeline sequence for a student inside a transaction. */
  async nextTimelineSequence(
    studentId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const updated = await tx.student.update({
      where: { id: studentId },
      data: { timelineSequence: { increment: 1 } },
      select: { timelineSequence: true },
    });
    return updated.timelineSequence;
  }

  async list(
    filters: StudentListFilters,
    sort: { field: StudentSortField; direction: 'asc' | 'desc' },
    page: { skip: number; take: number },
  ) {
    const where = this.buildWhere(filters);
    const [rows, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        orderBy: this.buildOrderBy(sort),
        skip: page.skip,
        take: page.take,
        include: {
          enrollments: {
            orderBy: { createdAt: 'asc' },
            select: {
              offeringLabel: true,
              batchLabel: true,
              enrollmentDate: true,
              status: true,
            },
          },
          _count: { select: { enrollments: true } },
        },
      }),
      this.prisma.student.count({ where }),
    ]);
    return { rows, total };
  }

  /** Same predicate as `list`, unpaged, for export. */
  listAll(
    filters: StudentListFilters,
    sort: { field: StudentSortField; direction: 'asc' | 'desc' },
    limit: number,
  ) {
    return this.prisma.student.findMany({
      where: this.buildWhere(filters),
      orderBy: this.buildOrderBy(sort),
      take: limit,
      include: {
        enrollments: {
          orderBy: { createdAt: 'asc' },
          select: { offeringLabel: true, batchLabel: true },
        },
        _count: { select: { enrollments: true } },
      },
    });
  }

  private buildWhere(filters: StudentListFilters): Prisma.StudentWhereInput {
    const and: Prisma.StudentWhereInput[] = [
      { organizationId: filters.organizationId },
    ];

    if (filters.scope) and.push(filters.scope);

    if (filters.statuses?.length) {
      and.push({ status: { in: filters.statuses as never } });
    } else if (!filters.includeArchived) {
      // Archived students stay queryable but leave default results
      // (constitution Principle XV).
      and.push({ status: { not: 'ARCHIVED' } });
    }

    if (filters.branchIds?.length)
      and.push({
        OR: [
          { registrationBranchId: { in: filters.branchIds } },
          { studyBranchId: { in: filters.branchIds } },
        ],
      });

    if (filters.departmentIds?.length)
      and.push({ departmentId: { in: filters.departmentIds } });

    if (filters.customerServiceEmployeeIds?.length)
      and.push({
        customerServiceEmployeeId: {
          in: filters.customerServiceEmployeeIds,
        },
      });

    if (filters.offeringIds?.length)
      and.push({
        enrollments: { some: { offeringId: { in: filters.offeringIds } } },
      });

    if (filters.batchIds?.length)
      and.push({
        enrollments: { some: { batchId: { in: filters.batchIds } } },
      });

    if (filters.search) {
      // `searchName` holds the folded copy; phones and ids are digit-folded on
      // write, so the same normalization applies on both sides (research R-008).
      and.push({
        OR: [
          { searchName: { contains: filters.search } },
          { studentCode: { contains: filters.search, mode: 'insensitive' } },
          { primaryPhone: { contains: filters.search } },
          { guardianPhone: { contains: filters.search } },
          { normalizedNationalId: { contains: filters.search } },
        ],
      });
    }

    return { AND: and };
  }

  private buildOrderBy(sort: {
    field: StudentSortField;
    direction: 'asc' | 'desc';
  }): Prisma.StudentOrderByWithRelationInput[] {
    const dir = sort.direction;
    switch (sort.field) {
      case 'fullName':
        return [{ searchName: dir }, { id: 'asc' }];
      case 'studentCode':
        return [{ studentCode: dir }, { id: 'asc' }];
      case 'enrollmentDate':
        return [{ enrollmentDate: dir }, { id: 'asc' }];
      case 'status':
        return [{ status: dir }, { id: 'asc' }];
      default:
        return [{ updatedAt: dir }, { id: 'asc' }];
    }
  }
}
