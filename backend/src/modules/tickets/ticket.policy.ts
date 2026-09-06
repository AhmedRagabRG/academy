import { Injectable } from '@nestjs/common';
import { ForbiddenException, NotFoundException } from '../../core/exceptions';
import type { CallerContext } from '../../shared/types/caller-context';
import type { Prisma } from '../../../prisma/generated/client';

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
    return this.has(c, 'tickets.view.all')
      ? {}
      : this.has(c, 'tickets.view.team')
        ? { teamId: { in: teamIds } }
        : this.has(c, 'tickets.view.assigned')
          ? { employeeId: c.accountId }
          : { id: '__none__' };
  }
  assertVisible(visible: boolean) {
    if (!visible) throw new NotFoundException();
  }
}
