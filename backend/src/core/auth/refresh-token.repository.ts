import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../prisma/generated/client';
import { PrismaService } from '../../database/prisma.service';
import { BaseRepository } from '../../shared/repository/base.repository';

export interface SessionMetadata {
  device: string;
  browser: string;
  ipAddress: string;
  userAgent?: string;
}

@Injectable()
export class RefreshTokenRepository extends BaseRepository<
  unknown,
  Prisma.RefreshTokenDelegate
> {
  constructor(prisma: PrismaService) {
    super(prisma, prisma.refreshToken);
  }

  create(
    id: string,
    accountId: string,
    tokenHash: string,
    expiresAt: Date,
    metadata: SessionMetadata,
  ) {
    return this.delegate.create({
      data: { id, accountId, tokenHash, expiresAt, ...metadata },
    });
  }

  findValidById(id: string, accountId?: string) {
    return this.delegate.findFirst({
      where: {
        id,
        ...(accountId ? { accountId } : {}),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async rotate(
    id: string,
    oldHash: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    const result = await this.delegate.updateMany({
      where: {
        id,
        tokenHash: oldHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { tokenHash, expiresAt, lastActivityAt: new Date() },
    });
    return result.count === 1;
  }

  listForAccount(accountId: string) {
    return this.delegate.findMany({
      where: { accountId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async revoke(
    id: string,
    accountId?: string,
    reason = 'logout',
  ): Promise<boolean> {
    const result = await this.delegate.updateMany({
      where: { id, ...(accountId ? { accountId } : {}), revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
    return result.count > 0;
  }

  async revokeAllExcept(accountId: string, currentId: string): Promise<number> {
    return (
      await this.delegate.updateMany({
        where: { accountId, id: { not: currentId }, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'revoke-all-others' },
      })
    ).count;
  }

  revokeAllExceptWithClient(
    accountId: string,
    currentId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.refreshToken.updateMany({
      where: { accountId, id: { not: currentId }, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: 'revoke-all-others' },
    });
  }

  async revokeForAccount(accountId: string, reason: string): Promise<number> {
    return (
      await this.delegate.updateMany({
        where: { accountId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: reason },
      })
    ).count;
  }

  revokeForAccountWithClient(
    accountId: string,
    reason: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.refreshToken.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async touchActivity(
    id: string,
    accountId: string,
    throttleBefore: Date,
  ): Promise<boolean> {
    const result = await this.delegate.updateMany({
      where: {
        id,
        accountId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        lastActivityAt: { lt: throttleBefore },
      },
      data: { lastActivityAt: new Date() },
    });
    return result.count === 1;
  }

  async pruneExpired(): Promise<number> {
    return (
      await this.delegate.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      })
    ).count;
  }
}
