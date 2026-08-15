import { Injectable } from '@nestjs/common';
import { EntityStatus, type Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  createPageResult,
  normalizePageQuery,
  pageOffset,
} from '../../../shared/pagination/pagination.helper';
import type { AcademicYearListDto } from './dto/academic-year.dto';
@Injectable()
export class AcademicYearRepository {
  constructor(private readonly prisma: PrismaService) {}
  organization() {
    return this.prisma.organization.findUniqueOrThrow({
      where: { singletonKey: 'PRIMARY' },
    });
  }
  findById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).academicYear.findUnique({ where: { id } });
  }
  findActive(organizationId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).academicYear.findFirst({
      where: { organizationId, status: EntityStatus.ACTIVE, archivedAt: null },
    });
  }
  async list(q: AcademicYearListDto) {
    const p = normalizePageQuery(q);
    const s =
      q.status && q.status !== 'ALL'
        ? q.status
        : q.status === 'ALL'
          ? undefined
          : EntityStatus.ACTIVE;
    const search = q.search?.trim();
    const where: Prisma.AcademicYearWhereInput = {
      ...(s ? { status: s } : {}),
      ...(search
        ? {
            OR: [
              { normalizedName: { contains: search.toLowerCase() } },
              { code: { contains: search.toUpperCase() } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.academicYear.findMany({
        where,
        skip: pageOffset(p),
        take: p.pageSize,
        orderBy: { [q.sort ?? 'startDate']: q.sortOrder ?? 'desc' },
      }),
      this.prisma.academicYear.count({ where }),
    ]);
    return createPageResult(items, total, p);
  }
  create(data: Prisma.AcademicYearUncheckedCreateInput) {
    return this.prisma.academicYear.create({ data });
  }
  updateVersioned(
    id: string,
    v: number,
    data: Prisma.AcademicYearUncheckedUpdateManyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).academicYear.updateMany({
      where: { id, version: v },
      data: { ...data, version: { increment: 1 } },
    });
  }
  inactivate(id: string, tx: Prisma.TransactionClient) {
    return tx.academicYear.update({
      where: { id },
      data: { status: EntityStatus.INACTIVE, version: { increment: 1 } },
    });
  }
  updateDefault(
    organizationId: string,
    yearId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.generalSettings.update({
      where: { organizationId },
      data: { defaultAcademicYearId: yearId, version: { increment: 1 } },
    });
  }
  selectable() {
    return this.prisma.academicYear.findMany({
      where: { status: EntityStatus.ACTIVE, archivedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
      take: 100,
    });
  }
  resolve(id: string) {
    return this.prisma.academicYear.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, status: true },
    });
  }
}
