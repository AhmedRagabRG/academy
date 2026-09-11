import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../prisma/generated/client';
import { ForbiddenException, NotFoundException } from '../../core/exceptions';
import type { CallerContext } from '../../shared/types/caller-context';
import { branchFilter } from '../../core/authorization/branch-scope';

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
    // A conversation has no branch of its own — it arrives on a channel, not at
    // a location — so it inherits one from the contact behind it. A
    // conversation with no contact yet, or a contact with no branch, stays
    // visible to everyone rather than disappearing until someone files it.
    const branches = branchFilter(c);
    if (!branches) return visibility;
    return {
      AND: [
        visibility,
        {
          OR: [
            { customer: { contact: { branchId: branches } } },
            { customer: { contact: { branchId: null } } },
            { customer: { contactId: null } },
          ],
        },
      ],
    };
  }
  assertVisible(value: unknown): asserts value {
    if (!value) throw new NotFoundException();
  }
}
