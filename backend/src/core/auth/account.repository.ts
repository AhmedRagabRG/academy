import { Injectable } from '@nestjs/common';
import { EntityStatus, type Prisma } from '../../../prisma/generated/client';
import { PrismaService } from '../../database/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';
@Injectable()
export class AccountRepository extends BaseRepository<
  unknown,
  Prisma.AccountDelegate
> {
  private readonly identityInclude = {
    roles: {
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    },
  } satisfies Prisma.AccountInclude;

  constructor(prisma: PrismaService) {
    super(prisma, prisma.account);
  }
  findActiveByEmail(email: string) {
    return this.delegate.findFirst({
      where: { email: email.toLowerCase(), status: EntityStatus.ACTIVE },
      include: this.identityInclude,
    });
  }
  findByEmail(email: string) {
    return this.delegate.findUnique({
      where: { email: email.toLowerCase() },
      include: this.identityInclude,
    });
  }
  findActiveById(id: string) {
    return this.delegate.findFirst({
      where: { id, status: EntityStatus.ACTIVE },
      include: this.identityInclude,
    });
  }
}
