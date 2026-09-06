import { Injectable } from '@nestjs/common';
import { EntityStatus, type Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../shared/repository/base.repository';

export const employeeInclude = {
  roles: {
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
} satisfies Prisma.AccountInclude;

@Injectable()
export class EmployeeRepository extends BaseRepository<
  unknown,
  Prisma.AccountDelegate
> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.account);
  }
  findById(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).account.findUnique({
      where: { id },
      include: employeeInclude,
    });
  }
  findByEmail(email: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).account.findUnique({
      where: { email: email.toLowerCase() },
    });
  }
  async list(
    where: Prisma.AccountWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.AccountOrderByWithRelationInput,
  ) {
    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip,
        take,
        orderBy,
        include: employeeInclude,
      }),
      this.delegate.count({ where }),
    ]);
    return { items, total };
  }
  create(
    data: Prisma.AccountUncheckedCreateInput,
    roleIds: string[],
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).account.create({
      data: {
        ...data,
        roles: { create: roleIds.map((roleId) => ({ roleId })) },
      },
      include: employeeInclude,
    });
  }
  updateVersioned(
    id: string,
    expectedVersion: number,
    data: Prisma.AccountUncheckedUpdateManyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).account.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }
  replaceRoles(
    id: string,
    roleIds: string[],
    assignedBy?: string,
    tx?: Prisma.TransactionClient,
  ) {
    return (tx ?? this.prisma).account.update({
      where: { id },
      data: {
        roles: {
          deleteMany: {},
          create: roleIds.map((roleId) => ({ roleId, assignedBy })),
        },
      },
      include: employeeInclude,
    });
  }
  updateProfile(
    id: string,
    expectedVersion: number,
    data: Prisma.AccountUncheckedUpdateManyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.updateVersioned(id, expectedVersion, data, tx);
  }
  async setStatus(
    id: string,
    expectedVersion: number,
    status: EntityStatus,
    updatedBy?: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.updateVersioned(
      id,
      expectedVersion,
      {
        status,
        archivedAt: status === EntityStatus.ARCHIVED ? new Date() : null,
        updatedBy,
      },
      tx,
    );
  }
}
