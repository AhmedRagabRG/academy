import { Injectable } from '@nestjs/common';
import { type Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../shared/repository/base.repository';

export const roleInclude = {
  permissions: { include: { permission: true } },
  _count: { select: { accounts: true } },
} satisfies Prisma.RoleInclude;

@Injectable()
export class RoleRepository extends BaseRepository<
  unknown,
  Prisma.RoleDelegate
> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.role);
  }
  findById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).role.findUnique({
      where: { id },
      include: roleInclude,
    });
  }
  findManyByIds(ids: string[], tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).role.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
    });
  }
  countAccountsLosingLastActiveRole(
    roleId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).accountRole.count({
      where: {
        roleId,
        account: {
          status: { not: 'ARCHIVED' },
          roles: {
            none: {
              roleId: { not: roleId },
              role: { status: 'ACTIVE' },
            },
          },
        },
      },
    });
  }
  async list(where: Prisma.RoleWhereInput, skip: number, take: number) {
    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip,
        take,
        orderBy: { displayName: 'asc' },
        include: roleInclude,
      }),
      this.delegate.count({ where }),
    ]);
    return { items, total };
  }
  create(data: Prisma.RoleUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).role.create({ data, include: roleInclude });
  }
  updateVersioned(
    id: string,
    expectedVersion: number,
    data: Prisma.RoleUncheckedUpdateManyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).role.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }
}
