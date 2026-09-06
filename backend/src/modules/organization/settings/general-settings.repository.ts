import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class GeneralSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}
  get(tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).generalSettings.findFirst();
  }
  update(
    id: string,
    version: number,
    data: Prisma.GeneralSettingsUncheckedUpdateManyInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.generalSettings.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
  }
}
