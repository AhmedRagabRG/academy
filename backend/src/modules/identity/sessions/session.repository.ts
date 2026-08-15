import { Injectable } from '@nestjs/common';
import {
  RefreshTokenRepository,
  type SessionMetadata,
} from '../../../core/auth/refresh-token.repository';
import type { Prisma } from '../../../../prisma/generated/client';

@Injectable()
export class SessionRepository {
  constructor(private readonly sessions: RefreshTokenRepository) {}
  list(accountId: string) {
    return this.sessions.listForAccount(accountId);
  }
  create(
    id: string,
    accountId: string,
    tokenHash: string,
    expiresAt: Date,
    metadata: SessionMetadata,
  ) {
    return this.sessions.create(id, accountId, tokenHash, expiresAt, metadata);
  }
  compareAndRotate(
    id: string,
    oldHash: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    return this.sessions.rotate(id, oldHash, tokenHash, expiresAt);
  }
  findValid(id: string, accountId: string) {
    return this.sessions.findValidById(id, accountId);
  }
  revoke(id: string, accountId: string) {
    return this.sessions.revoke(id, accountId, 'self-revoked');
  }
  revokeOthers(accountId: string, currentId: string) {
    return this.sessions.revokeAllExcept(accountId, currentId);
  }
  async revokeOthersInTransaction(
    accountId: string,
    currentId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    return (
      await this.sessions.revokeAllExceptWithClient(accountId, currentId, tx)
    ).count;
  }
  revokeAll(accountId: string, reason: string) {
    return this.sessions.revokeForAccount(accountId, reason);
  }
  async revokeAllInTransaction(
    accountId: string,
    reason: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    return (
      await this.sessions.revokeForAccountWithClient(accountId, reason, tx)
    ).count;
  }
  updateActivity(id: string, accountId: string, throttleBefore: Date) {
    return this.sessions.touchActivity(id, accountId, throttleBefore);
  }
  prune() {
    return this.sessions.pruneExpired();
  }
}
