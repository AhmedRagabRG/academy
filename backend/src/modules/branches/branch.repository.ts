import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BranchRepository {
  constructor(readonly db: PrismaService) {}

  async organizationId() {
    return (
      await this.db.organization.findFirstOrThrow({ select: { id: true } })
    ).id;
  }

  async list(organizationId: string) {
    return this.db.branch.findMany({
      where: { organizationId },
      include: { _count: { select: { contacts: true } } },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async byId(organizationId: string, id: string) {
    return this.db.branch.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { contacts: true } } },
    });
  }

  /** Ticket.branchId has no foreign key, so this is the only referential check. */
  async ticketsReferencing(organizationId: string, branchId: string) {
    return this.db.ticket.count({ where: { organizationId, branchId } });
  }

  /** Account.branchIds is a plain array, so membership is a contains query. */
  async membersOf(branchId: string) {
    return this.db.account.count({ where: { branchIds: { has: branchId } } });
  }

  /** Every active employee with their branch confinement, for the assignment UI. */
  async accountsWithBranches() {
    return this.db.account.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        displayName: true,
        branchIds: true,
        organizationWide: true,
      },
      orderBy: { displayName: 'asc' },
    });
  }

  async accountsIn(branchId: string) {
    return this.db.account.findMany({
      where: { branchIds: { has: branchId } },
      select: { id: true, displayName: true, branchIds: true },
    });
  }
}
