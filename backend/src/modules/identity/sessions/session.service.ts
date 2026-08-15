import { Injectable } from '@nestjs/common';
import {
  CurrentSessionException,
  NotFoundException,
} from '../../../core/exceptions';
import { SessionRepository } from './session.repository';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import { IdentityEventName } from '../events/identity.events';

@Injectable()
export class SessionService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly events?: DomainEventBus,
  ) {}
  private emit(accountId: string, sessionId: string, reason: string): void {
    this.events?.emit({
      name: IdentityEventName.SessionRevoked,
      occurredAt: new Date().toISOString(),
      actor: { accountId },
      target: { type: 'session', id: sessionId },
      operation: IdentityEventName.SessionRevoked,
      payload: { sessionId, reason },
    });
  }
  async list(accountId: string, currentId: string) {
    const sessions = await this.sessions.list(accountId);
    return sessions
      .map(
        ({
          id,
          device,
          browser,
          ipAddress,
          createdAt,
          lastActivityAt,
          expiresAt,
        }) => ({
          id,
          device,
          browser,
          ipAddress,
          createdAt,
          lastActivityAt,
          expiresAt,
          current: id === currentId,
        }),
      )
      .sort(
        (a, b) =>
          Number(b.current) - Number(a.current) ||
          b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
      )
      .slice(0, 100);
  }
  async revoke(
    accountId: string,
    currentId: string,
    id: string,
  ): Promise<null> {
    if (id === currentId) throw new CurrentSessionException();
    if (!(await this.sessions.findValid(id, accountId)))
      throw new NotFoundException();
    if (!(await this.sessions.revoke(id, accountId)))
      throw new NotFoundException();
    this.emit(accountId, id, 'self-revoked');
    return null;
  }
  async revokeOthers(accountId: string, currentId: string) {
    const revokedCount = await this.sessions.revokeOthers(accountId, currentId);
    if (revokedCount > 0)
      this.emit(accountId, currentId, `revoke-all-others:${revokedCount}`);
    return { revokedCount };
  }

  recordActivity(accountId: string, sessionId: string): Promise<boolean> {
    const throttleBefore = new Date(Date.now() - 60_000);
    return this.sessions.updateActivity(sessionId, accountId, throttleBefore);
  }
}
