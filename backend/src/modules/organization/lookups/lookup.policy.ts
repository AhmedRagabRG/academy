import { Injectable } from '@nestjs/common';
import {
  EntityInUseException,
  NotFoundException,
  OrganizationInvalidStateException,
} from '../../../core/exceptions';
import { EntityStatus } from '../../../../prisma/generated/client';
import { LookupRepository } from './lookup.repository';

@Injectable()
export class LookupPolicy {
  constructor(private readonly repository: LookupRepository) {}
  async assertGroupParent(
    groupId: string | undefined,
    parentId: string | undefined,
  ) {
    if (!parentId) return;
    if (groupId === parentId)
      throw new OrganizationInvalidStateException(
        'لا يمكن أن تكون المجموعة والدة لنفسها',
      );
    let cursor = await this.repository.findGroupById(parentId);
    if (!cursor) throw new NotFoundException();
    const visited = new Set<string>();
    while (cursor) {
      if (cursor.id === groupId || visited.has(cursor.id))
        throw new OrganizationInvalidStateException(
          'دورة غير صالحة في هيكل مجموعات القيم',
        );
      visited.add(cursor.id);
      cursor = cursor.parentGroupId
        ? await this.repository.findGroupById(cursor.parentGroupId)
        : null;
    }
  }
  async assertGroupArchive(id: string, status: EntityStatus) {
    if (status !== EntityStatus.ARCHIVED) return;
    if (
      (await this.repository.nonArchivedValueCount(id)) ||
      (await this.repository.nonArchivedChildGroupCount(id))
    )
      throw new EntityInUseException();
  }
  async assertValueParent(
    groupParentId: string | null,
    parentValueId?: string,
  ) {
    if (!parentValueId) return;
    const parent = await this.repository.findValue(parentValueId);
    if (!parent || parent.lookupGroupId !== groupParentId)
      throw new OrganizationInvalidStateException(
        'القيمة الأب لا تنتمي للمجموعة الأب',
      );
  }
  async assertValueArchive(id: string, status: EntityStatus) {
    if (
      status === EntityStatus.ARCHIVED &&
      (await this.repository.nonArchivedChildValueCount(id))
    )
      throw new EntityInUseException();
  }
}
