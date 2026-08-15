import { Inject, Injectable } from '@nestjs/common';
import { EntityStatus } from '../../../../prisma/generated/client';
import {
  EntityInUseException,
  OutOfScopeException,
  ValidationException,
} from '../../../core/exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  ORGANIZATION_REFERENCE_PORT,
  type OrganizationReferencePort,
} from '../types/organization-reference.port';
@Injectable()
export class BranchPolicy {
  constructor(
    @Inject(ORGANIZATION_REFERENCE_PORT)
    private readonly references: OrganizationReferencePort,
  ) {}
  assertScope(caller: CallerContext, branchId: string): void {
    if (
      !caller.organizationWide &&
      !caller.authorizedBranchIds.includes(branchId)
    )
      throw new OutOfScopeException();
  }
  async assertManager(managerId?: string): Promise<void> {
    if (managerId && !(await this.references.isEligibleManager(managerId)))
      throw new ValidationException([
        { field: 'managerId', message: 'المدير غير موجود أو غير نشط' },
      ]);
  }
  async assertTransition(id: string, status: EntityStatus): Promise<void> {
    if (
      status === EntityStatus.ARCHIVED &&
      (await this.references.countActiveBranchReferences(id)) > 0
    )
      throw new EntityInUseException('لا يمكن أرشفة فرع مرتبط بموظفين نشطين');
  }
}
