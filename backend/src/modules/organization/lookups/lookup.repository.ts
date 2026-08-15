import { Injectable } from '@nestjs/common';
import { EntityStatus, type Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  createPageResult,
  normalizePageQuery,
  pageOffset,
} from '../../../shared/pagination/pagination.helper';
import type { LookupGroupListDto } from './dto/lookup-group.dto';
import type { LookupValueListDto } from './dto/lookup-value.dto';

const groupInclude = {
  _count: { select: { values: true, childGroups: true } },
} as const;
const valueInclude = { lookupGroup: { select: { code: true } } } as const;

@Injectable()
export class LookupRepository {
  constructor(private readonly prisma: PrismaService) {}
  organization(tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).organization.findUniqueOrThrow({
      where: { singletonKey: 'PRIMARY' },
    });
  }
  findGroupById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).lookupGroup.findUnique({
      where: { id },
      include: groupInclude,
    });
  }
  findGroupByCode(code: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).lookupGroup.findFirst({
      where: { code },
      include: groupInclude,
    });
  }
  async listGroups(query: LookupGroupListDto) {
    const page = normalizePageQuery(query);
    const status =
      query.status === 'ALL'
        ? undefined
        : (query.status ?? EntityStatus.ACTIVE);
    const search = query.search?.trim();
    const where: Prisma.LookupGroupWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search.toLowerCase() } },
              { normalizedName: { contains: search.toLowerCase() } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.lookupGroup.findMany({
        where,
        include: groupInclude,
        skip: pageOffset(page),
        take: page.pageSize,
        orderBy: { [query.sort ?? 'code']: query.sortOrder ?? 'asc' },
      }),
      this.prisma.lookupGroup.count({ where }),
    ]);
    return createPageResult(items, total, page);
  }
  createGroup(data: Prisma.LookupGroupUncheckedCreateInput) {
    return this.prisma.lookupGroup.create({ data, include: groupInclude });
  }
  updateGroup(
    id: string,
    version: number,
    data: Prisma.LookupGroupUncheckedUpdateManyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).lookupGroup.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
  }
  findValue(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).lookupValue.findUnique({
      where: { id },
      include: valueInclude,
    });
  }
  async listValues(groupId: string, query: LookupValueListDto) {
    const page = normalizePageQuery(query);
    const status =
      query.status === 'ALL'
        ? undefined
        : (query.status ?? EntityStatus.ACTIVE);
    const search = query.search?.trim();
    const where: Prisma.LookupValueWhereInput = {
      lookupGroupId: groupId,
      ...(status ? { status } : {}),
      ...(query.parentValueId ? { parentValueId: query.parentValueId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search.toLowerCase() } },
              { normalizedName: { contains: search.toLowerCase() } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.lookupValue.findMany({
        where,
        include: valueInclude,
        skip: pageOffset(page),
        take: page.pageSize,
        orderBy: [
          { [query.sort ?? 'sortOrder']: query.sortOrder ?? 'asc' },
          { normalizedName: 'asc' },
          { id: 'asc' },
        ],
      }),
      this.prisma.lookupValue.count({ where }),
    ]);
    return createPageResult(items, total, page);
  }
  createValue(data: Prisma.LookupValueUncheckedCreateInput) {
    return this.prisma.lookupValue.create({ data, include: valueInclude });
  }
  updateValue(
    id: string,
    version: number,
    data: Prisma.LookupValueUncheckedUpdateManyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).lookupValue.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
  }
  nonArchivedValueCount(groupId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).lookupValue.count({
      where: { lookupGroupId: groupId, status: { not: EntityStatus.ARCHIVED } },
    });
  }
  nonArchivedChildGroupCount(groupId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).lookupGroup.count({
      where: { parentGroupId: groupId, status: { not: EntityStatus.ARCHIVED } },
    });
  }
  nonArchivedChildValueCount(valueId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).lookupValue.count({
      where: { parentValueId: valueId, status: { not: EntityStatus.ARCHIVED } },
    });
  }
  selectable(groupCode: string) {
    return this.prisma.lookupValue.findMany({
      where: {
        lookupGroup: { code: groupCode, status: EntityStatus.ACTIVE },
        status: EntityStatus.ACTIVE,
      },
      include: valueInclude,
      orderBy: [{ sortOrder: 'asc' }, { normalizedName: 'asc' }, { id: 'asc' }],
    });
  }
  groupValues(groupId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).lookupValue.findMany({
      where: { lookupGroupId: groupId },
      select: { id: true, version: true },
      orderBy: { id: 'asc' },
    });
  }
}
