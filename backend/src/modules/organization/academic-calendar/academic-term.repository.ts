import { Injectable } from '@nestjs/common';
import { EntityStatus, type Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  createPageResult,
  normalizePageQuery,
  pageOffset,
} from '../../../shared/pagination/pagination.helper';
import type { AcademicTermListDto } from './dto/academic-term.dto';
export const termInclude = {
  academicYear: { select: { name: true } },
} satisfies Prisma.AcademicTermInclude;
@Injectable()
export class AcademicTermRepository {
  constructor(private readonly prisma: PrismaService) {}
  findById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).academicTerm.findUnique({
      where: { id },
      include: termInclude,
    });
  }
  findYear(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).academicYear.findUnique({ where: { id } });
  }
  async list(q: AcademicTermListDto) {
    const p = normalizePageQuery(q);
    const s =
      q.status && q.status !== 'ALL'
        ? q.status
        : q.status === 'ALL'
          ? undefined
          : EntityStatus.ACTIVE;
    const where: Prisma.AcademicTermWhereInput = {
      ...(s ? { status: s } : {}),
      ...(q.academicYearId ? { academicYearId: q.academicYearId } : {}),
      ...(q.search
        ? { normalizedName: { contains: q.search.toLowerCase() } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.academicTerm.findMany({
        where,
        include: termInclude,
        skip: pageOffset(p),
        take: p.pageSize,
        orderBy:
          (q.sort ?? 'order') === 'order'
            ? [
                { order: q.sortOrder ?? 'asc' },
                { startDate: 'asc' },
                { id: 'asc' },
              ]
            : [{ [q.sort ?? 'order']: q.sortOrder ?? 'asc' }, { id: 'asc' }],
      }),
      this.prisma.academicTerm.count({ where }),
    ]);
    return createPageResult(items, total, p);
  }
  findOverlap(
    yearId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).academicTerm.findFirst({
      where: {
        academicYearId: yearId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
  }
  create(
    data: Prisma.AcademicTermUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).academicTerm.create({
      data,
      include: termInclude,
    });
  }
  updateVersioned(
    id: string,
    v: number,
    data: Prisma.AcademicTermUncheckedUpdateManyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).academicTerm.updateMany({
      where: { id, version: v },
      data: { ...data, version: { increment: 1 } },
    });
  }

  async lockYears(ids: string[], tx: Prisma.TransactionClient) {
    const ordered = [...new Set(ids)].sort();
    const rows: Array<{ id: string; version: number }> = [];
    for (const id of ordered) {
      const locked = await tx.$queryRaw<Array<{ id: string; version: number }>>`
        SELECT "id", "version" FROM "AcademicYear" WHERE "id" = ${id}::uuid FOR UPDATE
      `;
      if (locked[0]) rows.push(locked[0]);
    }
    return rows;
  }

  countByYear(yearId: string, tx: Prisma.TransactionClient) {
    return tx.academicTerm.count({ where: { academicYearId: yearId } });
  }

  shiftForInsert(yearId: string, from: number, tx: Prisma.TransactionClient) {
    return tx.academicTerm.updateMany({
      where: { academicYearId: yearId, order: { gte: from } },
      data: { order: { increment: 1 }, version: { increment: 1 } },
    });
  }

  compactAfterRemoval(
    yearId: string,
    removedOrder: number,
    tx: Prisma.TransactionClient,
  ) {
    return tx.academicTerm.updateMany({
      where: { academicYearId: yearId, order: { gt: removedOrder } },
      data: { order: { decrement: 1 }, version: { increment: 1 } },
    });
  }

  shiftForMove(
    yearId: string,
    oldOrder: number,
    newOrder: number,
    tx: Prisma.TransactionClient,
  ) {
    if (newOrder < oldOrder)
      return tx.academicTerm.updateMany({
        where: {
          academicYearId: yearId,
          order: { gte: newOrder, lt: oldOrder },
        },
        data: { order: { increment: 1 }, version: { increment: 1 } },
      });
    return tx.academicTerm.updateMany({
      where: { academicYearId: yearId, order: { gt: oldOrder, lte: newOrder } },
      data: { order: { decrement: 1 }, version: { increment: 1 } },
    });
  }

  bumpYearVersion(id: string, version: number, tx: Prisma.TransactionClient) {
    return tx.academicYear.updateMany({
      where: { id, version },
      data: { version: { increment: 1 } },
    });
  }
  selectable() {
    return this.prisma.academicTerm.findMany({
      where: { status: EntityStatus.ACTIVE, archivedAt: null },
      select: { id: true, name: true, academicYearId: true, order: true },
      orderBy: [{ academicYearId: 'asc' }, { order: 'asc' }, { id: 'asc' }],
      take: 100,
    });
  }
  resolve(id: string) {
    return this.prisma.academicTerm.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        academicYearId: true,
        order: true,
        status: true,
      },
    });
  }
}
