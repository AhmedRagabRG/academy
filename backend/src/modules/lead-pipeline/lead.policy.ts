import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../prisma/generated/client';
import { ForbiddenException, NotFoundException } from '../../core/exceptions';
import type { CallerContext } from '../../shared/types/caller-context';

@Injectable()
export class LeadPolicy {
  has(c: CallerContext, permission: string): boolean {
    return c.permissionKeys.includes(permission);
  }

  assert(c: CallerContext, permission: string): void {
    if (!this.has(c, permission)) throw new ForbiddenException();
  }

  scope(c: CallerContext): Prisma.LeadWhereInput {
    this.assert(c, 'pipeline.view');
    return {};
  }

  assertVisible(value: unknown): asserts value {
    if (!value) throw new NotFoundException();
  }
}
