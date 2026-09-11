import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../prisma/generated/client';
import { ForbiddenException, NotFoundException } from '../../core/exceptions';
import type { CallerContext } from '../../shared/types/caller-context';
import { branchWhere } from '../../core/authorization/branch-scope';

@Injectable()
export class ContactPolicy {
  has(c: CallerContext, permission: string): boolean {
    return c.permissionKeys.includes(permission);
  }

  assert(c: CallerContext, permission: string): void {
    if (!this.has(c, permission)) throw new ForbiddenException();
  }

  /** Contact view scope. */
  scope(c: CallerContext): Prisma.ContactWhereInput {
    this.assert(c, 'contacts.view');
    return branchWhere(c, 'branchId');
  }

  assertVisible(value: unknown): asserts value {
    if (!value) throw new NotFoundException();
  }
}
