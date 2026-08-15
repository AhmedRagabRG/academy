import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../prisma/generated/client';
import { ForbiddenException, NotFoundException } from '../../core/exceptions';
import type { CallerContext } from '../../shared/types/caller-context';

@Injectable()
export class InboxPolicy {
  has(c: CallerContext, permission: string) {
    return c.permissionKeys.includes(permission);
  }
  assert(c: CallerContext, permission: string) {
    if (!this.has(c, permission)) throw new ForbiddenException();
  }
  assertAnyView(c: CallerContext) {
    if (
      !['inbox.view.all', 'inbox.view.team', 'inbox.view.assigned'].some((x) =>
        this.has(c, x),
      )
    )
      throw new ForbiddenException();
  }
  scope(
    c: CallerContext,
    teamIds: string[],
  ): Prisma.InboxConversationWhereInput {
    this.assertAnyView(c);
    const visibility: Prisma.InboxConversationWhereInput = this.has(
      c,
      'inbox.view.all',
    )
      ? {}
      : this.has(c, 'inbox.view.team')
        ? { assignedTeamId: { in: teamIds } }
        : { assignedEmployeeId: c.accountId };
    const branch: Prisma.InboxConversationWhereInput = c.organizationWide
      ? {}
      : { customer: { branchId: { in: c.authorizedBranchIds } } };
    return { AND: [visibility, branch] };
  }
  assertVisible(value: unknown): asserts value {
    if (!value) throw new NotFoundException();
  }
}
