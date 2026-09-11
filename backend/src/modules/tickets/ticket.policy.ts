import { Injectable } from '@nestjs/common';
import { ForbiddenException, NotFoundException } from '../../core/exceptions';
import type { CallerContext } from '../../shared/types/caller-context';
import type { Prisma } from '../../../prisma/generated/client';
import { branchWhere } from '../../core/authorization/branch-scope';

@Injectable()
export class TicketPolicy {
  has(c: CallerContext, key: string) {
    return c.permissionKeys.includes(key);
  }
  assert(c: CallerContext, key: string) {
    if (!this.has(c, key)) throw new ForbiddenException();
  }
  assertAnyView(c: CallerContext) {
    if (
      !['tickets.view.all', 'tickets.view.team', 'tickets.view.assigned'].some(
        (p) => this.has(c, p),
      )
    )
      throw new ForbiddenException();
  }
  scope(c: CallerContext, teamIds: string[]): Prisma.TicketWhereInput {
    const visibility: Prisma.TicketWhereInput = this.has(c, 'tickets.view.all')
      ? {}
      : this.has(c, 'tickets.view.team')
        ? { teamId: { in: teamIds } }
        : this.has(c, 'tickets.view.assigned')
          ? { employeeId: c.accountId }
          : { id: '__none__' };
    // Branch narrows whatever the permission already allows; it never widens
    // it, so `tickets.view.all` still means "all tickets in my branches".
    // An unrestricted caller gets the visibility clause untouched, so adding
    // branches changed nothing for anyone who is not confined to one.
    const branches = branchWhere(c, 'branchId');
    return Object.keys(branches).length
      ? { AND: [visibility, branches] }
      : visibility;
  }
  assertVisible(visible: boolean) {
    if (!visible) throw new NotFoundException();
  }
}
