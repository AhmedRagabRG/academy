import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

const include = {
  contacts: {
    orderBy: [
      { type: 'asc' as const },
      { sortOrder: 'asc' as const },
      { id: 'asc' as const },
    ],
  },
  socialLinks: {
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
  },
};
@Injectable()
export class OrganizationProfileRepository {
  constructor(private readonly prisma: PrismaService) {}
  get(tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).organization.findUnique({
      where: { singletonKey: 'PRIMARY' },
      include,
    });
  }
  update(
    id: string,
    version: number,
    data: Prisma.OrganizationUncheckedUpdateManyInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.organization.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
  }
  async replaceContacts(
    organizationId: string,
    rows: Array<{
      type: 'EMAIL' | 'PHONE';
      label: string;
      value: string;
      isPrimary: boolean;
      sortOrder: number;
    }>,
    tx: Prisma.TransactionClient,
  ) {
    await tx.organizationContact.deleteMany({ where: { organizationId } });
    if (rows.length)
      await tx.organizationContact.createMany({
        data: rows.map((row) => ({ ...row, organizationId })),
      });
  }
  async replaceSocialLinks(
    organizationId: string,
    rows: Array<{ platform: string; url: string; sortOrder: number }>,
    tx: Prisma.TransactionClient,
  ) {
    await tx.organizationSocialLink.deleteMany({ where: { organizationId } });
    if (rows.length)
      await tx.organizationSocialLink.createMany({
        data: rows.map((row) => ({ ...row, organizationId })),
      });
  }
}
