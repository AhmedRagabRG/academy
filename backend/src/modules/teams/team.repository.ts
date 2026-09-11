import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TeamRepository {
  constructor(readonly db: PrismaService) {}

  async organizationId() {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }

  async list(organizationId: string) {
    return this.db.ticketTeam.findMany({
      where: { organizationId },
      include: { memberships: true },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async byId(organizationId: string, id: string) {
    return this.db.ticketTeam.findFirst({
      where: { id, organizationId },
      include: { memberships: true },
    });
  }

  /**
   * Membership carries no foreign key to Account, so the display names every
   * team view needs have to be fetched separately rather than joined.
   */
  async accountsById(ids: string[]) {
    if (!ids.length) return new Map<string, { displayName: string }>();
    const rows = await this.db.account.findMany({
      where: { id: { in: ids } },
      select: { id: true, displayName: true },
    });
    return new Map(
      rows.map((row) => [row.id, { displayName: row.displayName }]),
    );
  }

  /** Tickets reference a team by a bare uuid, so this is the only safety net. */
  async ticketsReferencing(organizationId: string, teamId: string) {
    return this.db.ticket.count({ where: { organizationId, teamId } });
  }

  async conversationsReferencing(organizationId: string, teamId: string) {
    return this.db.inboxConversation.count({
      where: { organizationId, assignedTeamId: teamId, deletedAt: null },
    });
  }
}
