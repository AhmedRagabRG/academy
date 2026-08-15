import { Injectable } from '@nestjs/common';
import type { CallerContext } from '../../shared/types/caller-context';
import { OutOfScopeException } from '../exceptions';
@Injectable()
export class BranchScopeService {
  applyToQuery(
    caller: CallerContext,
    where: Record<string, unknown>,
  ): Record<string, unknown> {
    return caller.organizationWide
      ? where
      : { AND: [where, { branchId: { in: caller.authorizedBranchIds } }] };
  }
  assertInScope(caller: CallerContext, recordBranchId: string): void {
    if (
      !caller.organizationWide &&
      !caller.authorizedBranchIds.includes(recordBranchId)
    )
      throw new OutOfScopeException();
  }
}
