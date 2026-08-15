import { Injectable } from '@nestjs/common';
import { EntityStatus, type Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  createPageResult,
  normalizePageQuery,
  pageOffset,
} from '../../../shared/pagination/pagination.helper';
import type { DepartmentListDto } from './dto/department.dto';
@Injectable()
export class DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}
  organization() {
    return this.prisma.organization.findUniqueOrThrow({
      where: { singletonKey: 'PRIMARY' },
    });
  }
  findById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).department.findUnique({ where: { id } });
  }
  async list(query: DepartmentListDto) {
    const page = normalizePageQuery(query);
    const status =
      query.status && query.status !== 'ALL'
        ? query.status
        : query.status === 'ALL'
          ? undefined
          : EntityStatus.ACTIVE;
    const search = query.search?.trim();
    const where: Prisma.DepartmentWhereInput = {
      ...(status ? { status } : {}),
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
      this.prisma.department.findMany({
        where,
        skip: pageOffset(page),
        take: page.pageSize,
        orderBy: { [query.sort ?? 'name']: query.sortOrder ?? 'asc' },
      }),
      this.prisma.department.count({ where }),
    ]);
    return createPageResult(items, total, page);
  }
  create(data: Prisma.DepartmentUncheckedCreateInput) {
    return this.prisma.department.create({ data });
  }
  updateVersioned(
    id: string,
    expectedVersion: number,
    data: Prisma.DepartmentUncheckedUpdateManyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).department.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }
  selectable() {
    return this.prisma.department.findMany({
      where: { status: EntityStatus.ACTIVE, archivedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: [{ normalizedName: 'asc' }, { id: 'asc' }],
      take: 100,
    });
  }
  resolve(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, status: true },
    });
  }
}
