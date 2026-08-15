import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { Prisma } from '../../../../prisma/generated/client';

@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}
  listActive() {
    return this.prisma.permission.findMany({
      where: { active: true },
      orderBy: [{ moduleKey: 'asc' }, { displayOrder: 'asc' }, { key: 'asc' }],
    });
  }
  findActiveByIds(ids: string[], tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).permission.findMany({
      where: { id: { in: ids }, active: true },
    });
  }
  async replaceForRole(
    roleId: string,
    permissionIds: string[],
    assignedBy?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const replace = async (client: Prisma.TransactionClient) => {
      await client.rolePermission.deleteMany({ where: { roleId } });
      if (permissionIds.length)
        await client.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
            assignedBy,
          })),
        });
      return client.role.findUniqueOrThrow({
        where: { id: roleId },
        include: roleInclude,
      });
    };
    return tx ? replace(tx) : this.prisma.$transaction(replace);
  }
}

import { roleInclude } from './role.repository';
