import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import type { CallerContext } from '../../shared/types/caller-context';
import { TicketPolicy } from './ticket.policy';
import type { TicketListDto } from './dto/ticket.dto';
import { DomainException } from '../../core/exceptions';

export interface TicketCursor {
  v: 1;
  fingerprint: string;
  sort: string;
  id: string;
  snapshotAt: string;
  createdAt?: string;
  updatedAt?: string;
  number?: string;
  priorityRank?: number;
}

@Injectable()
export class TicketRepository {
  constructor(
    readonly db: PrismaService,
    private readonly policy: TicketPolicy,
  ) {}
  async organizationId() {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }
  async teamIds(c: CallerContext) {
    return (
      await this.db.ticketTeamMembership.findMany({
        where: {
          employeeId: c.accountId,
          active: true,
          team: { active: true },
        },
        select: { teamId: true },
      })
    ).map((x) => x.teamId);
  }
  async scopedWhere(c: CallerContext) {
    this.policy.assertAnyView(c);
    return this.policy.scope(c, await this.teamIds(c));
  }
  async visible(c: CallerContext, id: string) {
    const organizationId = await this.organizationId();
    return this.db.ticket.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
        ...(await this.scopedWhere(c)),
      },
    });
  }
  encode(value: TicketCursor) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }
  decode(value: string | undefined, fingerprint: string, sort: string) {
    if (!value) return;
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as Partial<TicketCursor>;
      if (
        parsed.v !== 1 ||
        typeof parsed.id !== 'string' ||
        typeof parsed.fingerprint !== 'string' ||
        typeof parsed.sort !== 'string' ||
        typeof parsed.snapshotAt !== 'string' ||
        Number.isNaN(Date.parse(parsed.snapshotAt))
      )
        throw new Error('shape');
      if (parsed.fingerprint !== fingerprint || parsed.sort !== sort)
        throw new DomainException(
          'cursor-query-mismatch',
          'مؤشر الصفحة لا يخص هذا الاستعلام',
          409,
        );
      const validDate = (value: unknown) =>
        typeof value === 'string' && !Number.isNaN(Date.parse(value));
      if (
        ((sort === 'newest' || sort === 'oldest') &&
          !validDate(parsed.createdAt)) ||
        (sort === 'updated' &&
          (!validDate(parsed.updatedAt) ||
            typeof parsed.number !== 'string')) ||
        (sort === 'priority' &&
          (!validDate(parsed.updatedAt) ||
            typeof parsed.priorityRank !== 'number'))
      )
        throw new Error('sort tuple');
      return parsed as TicketCursor;
    } catch (error) {
      if (error instanceof DomainException) throw error;
      throw new DomainException('cursor-invalid', 'مؤشر الصفحة غير صالح', 400);
    }
  }
  fingerprint(q: TicketListDto) {
    const normalized = {
      mode: q.mode,
      status: [...(q.status ?? [])].sort(),
      priority: [...(q.priority ?? [])].sort(),
      teamId: [...(q.teamId ?? [])].sort(),
      employeeId: [...(q.employeeId ?? [])].sort(),
      tag: [...(q.tag ?? [])].sort(),
      createdBy: [...(q.createdBy ?? [])].sort(),
      search: q.search?.trim().toLocaleLowerCase() ?? '',
      sort: q.sort,
      pageSize: q.pageSize,
    };
    return createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('base64url')
      .slice(0, 16);
  }
}
