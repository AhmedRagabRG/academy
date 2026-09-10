import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '../../../prisma/generated/client';
import { DomainException } from '../../core/exceptions';
import { PrismaService } from '../../database/prisma.service';
import type { CallerContext } from '../../shared/types/caller-context';
import type { InboxListDto } from './dto/inbox.dto';
import { InboxPolicy } from './inbox.policy';

interface InboxCursor {
  v: 1;
  fingerprint: string;
  id: string;
  snapshotAt: string;
  lastActivityAt: string;
  unreadCount: number;
}

@Injectable()
export class InboxRepository {
  constructor(
    readonly db: PrismaService,
    private readonly policy: InboxPolicy,
  ) {}
  async organizationId() {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }
  async teamIds(c: CallerContext) {
    const organizationId = await this.organizationId();
    return (
      await this.db.ticketTeamMembership.findMany({
        where: {
          employeeId: c.accountId,
          active: true,
          team: { active: true, organizationId },
        },
        select: { teamId: true },
      })
    ).map((x) => x.teamId);
  }
  async scope(c: CallerContext) {
    return this.policy.scope(c, await this.teamIds(c));
  }
  async visible(c: CallerContext, id: string, includeDeleted = false) {
    return this.db.inboxConversation.findFirst({
      where: {
        id,
        organizationId: await this.organizationId(),
        ...(includeDeleted ? {} : { deletedAt: null }),
        ...(await this.scope(c)),
      },
    });
  }
  /**
   * Deliberately unscoped: the AI worker has no CallerContext, so policy.scope
   * cannot apply. Named so that any use outside the AI pipeline is obvious in
   * review. Still organization-bound.
   */
  async forSystem(id: string) {
    return this.db.inboxConversation.findFirst({
      where: {
        id,
        organizationId: await this.organizationId(),
        deletedAt: null,
      },
      include: { platform: true, customer: true },
    });
  }
  fingerprint(q: InboxListDto) {
    const normalized = {
      search: q.search.trim().toLocaleLowerCase(),
      view: q.view,
      platforms: [...q.platforms].sort(),
      statuses: [...q.statuses].sort(),
      employeeIds: [...q.employeeIds].sort(),
      teamIds: [...q.teamIds].sort(),
      tagIds: [...q.tagIds].sort(),
      unreadOnly: q.unreadOnly,
      sort: q.sort,
      limit: q.limit,
    };
    return createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('base64url')
      .slice(0, 20);
  }
  encode(value: InboxCursor) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }
  decode(value: string | undefined, fingerprint: string) {
    if (!value) return undefined;
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as InboxCursor;
      if (
        parsed.v !== 1 ||
        parsed.fingerprint !== fingerprint ||
        !parsed.id ||
        Number.isNaN(Date.parse(parsed.snapshotAt)) ||
        Number.isNaN(Date.parse(parsed.lastActivityAt)) ||
        !Number.isInteger(parsed.unreadCount)
      ) {
        if (parsed.fingerprint && parsed.fingerprint !== fingerprint)
          throw new DomainException(
            'cursor-query-mismatch',
            'مؤشر الصفحة لا يخص هذا الاستعلام',
            409,
          );
        throw new Error('invalid');
      }
      return parsed;
    } catch (error) {
      if (error instanceof DomainException) throw error;
      throw new DomainException('cursor-invalid', 'مؤشر الصفحة غير صالح', 400);
    }
  }
  cursorWhere(
    q: InboxListDto,
    cursor?: InboxCursor,
  ): Prisma.InboxConversationWhereInput {
    if (!cursor) return {};
    const at = new Date(cursor.lastActivityAt);
    if (q.sort === 'oldest')
      return {
        OR: [
          { lastActivityAt: { gt: at } },
          { lastActivityAt: at, id: { gt: cursor.id } },
        ],
      };
    if (q.sort === 'unread')
      return {
        OR: [
          { unreadCount: { lt: cursor.unreadCount } },
          { unreadCount: cursor.unreadCount, lastActivityAt: { lt: at } },
          {
            unreadCount: cursor.unreadCount,
            lastActivityAt: at,
            id: { lt: cursor.id },
          },
        ],
      };
    return {
      OR: [
        { lastActivityAt: { lt: at } },
        { lastActivityAt: at, id: { lt: cursor.id } },
      ],
    };
  }
}
