import { Injectable } from '@nestjs/common';
import { EntityStatus, type Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  createPageResult,
  normalizePageQuery,
  pageOffset,
} from '../../../shared/pagination/pagination.helper';
import type { BranchListDto } from './dto/branch.dto';
@Injectable()
export class BranchRepository {
  constructor(private readonly prisma: PrismaService) {}
  organization() {
    return this.prisma.organization.findUniqueOrThrow({
      where: { singletonKey: 'PRIMARY' },
    });
  }
  findById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).branch.findUnique({ where: { id } });
  }
  async list(query: BranchListDto, allowedIds?: string[]) {
    const page = normalizePageQuery(query);
    const status =
      query.status && query.status !== 'ALL'
        ? query.status
        : query.status === 'ALL'
          ? undefined
          : EntityStatus.ACTIVE;
    const search = query.search?.trim();
    const where: Prisma.BranchWhereInput = {
      ...(allowedIds ? { id: { in: allowedIds } } : {}),
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
      this.prisma.branch.findMany({
        where,
        skip: pageOffset(page),
        take: page.pageSize,
        orderBy: { [query.sort ?? 'name']: query.sortOrder ?? 'asc' },
      }),
      this.prisma.branch.count({ where }),
    ]);
    return createPageResult(items, total, page);
  }
  create(data: Prisma.BranchUncheckedCreateInput) {
    return this.prisma.branch.create({ data });
  }
  updateVersioned(
    id: string,
    expectedVersion: number,
    data: Prisma.BranchUncheckedUpdateManyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).branch.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }
  selectable() {
    return this.prisma.branch.findMany({
      where: { status: EntityStatus.ACTIVE, archivedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: [{ normalizedName: 'asc' }, { id: 'asc' }],
      take: 100,
    });
  }
  resolve(id: string) {
    return this.prisma.branch.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, status: true },
    });
  }
}
