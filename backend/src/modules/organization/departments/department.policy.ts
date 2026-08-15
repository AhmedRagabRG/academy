import { Inject, Injectable } from '@nestjs/common';
import { EntityStatus } from '../../../../prisma/generated/client';
import { EntityInUseException } from '../../../core/exceptions';
import {
  ORGANIZATION_REFERENCE_PORT,
  type OrganizationReferencePort,
} from '../types/organization-reference.port';
@Injectable()
export class DepartmentPolicy {
  constructor(
    @Inject(ORGANIZATION_REFERENCE_PORT)
    private readonly references: OrganizationReferencePort,
  ) {}
  async assertTransition(id: string, status: EntityStatus): Promise<void> {
    if (
      status === EntityStatus.ARCHIVED &&
      (await this.references.countActiveDepartmentReferences(id)) > 0
    )
      throw new EntityInUseException('لا يمكن أرشفة قسم مرتبط بموظفين نشطين');
  }
}
