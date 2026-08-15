import { Injectable } from '@nestjs/common';
import { EntityStatus } from '../../../../prisma/generated/client';
import { RecordPermissionsHelper } from '../../../core/authorization/record-permissions.helper';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  NotFoundException,
  OrganizationInvalidStateException,
  VersionConflictException,
} from '../../../core/exceptions';
import { PrismaErrorMapper } from '../../../database/prisma-error.mapper';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { OrganizationEventName } from '../events/organization.events';
import { mapLookupGroup, mapLookupValue } from '../mappers/organization.mapper';
import {
  normalizeOrganizationCode,
  normalizeOrganizationSearch,
} from '../types/organization-normalization';
import type {
  CreateLookupGroupDto,
  LookupGroupListDto,
  LookupGroupStatusDto,
  UpdateLookupGroupDto,
} from './dto/lookup-group.dto';
import type {
  CreateLookupValueDto,
  LookupValueListDto,
  LookupValueStatusDto,
  ReorderLookupValuesDto,
  UpdateLookupValueDto,
} from './dto/lookup-value.dto';
import { LookupPolicy } from './lookup.policy';
import { LookupRepository } from './lookup.repository';

@Injectable()
export class LookupService {
  constructor(
    private readonly repository: LookupRepository,
    private readonly policy: LookupPolicy,
    private readonly permissionsHelper: RecordPermissionsHelper,
    private readonly events: DomainEventBus,
    private readonly errors: PrismaErrorMapper,
    private readonly transactions: TransactionManager,
  ) {}
  private permissions(c: CallerContext) {
    const p = this.permissionsHelper.compute(c, [
      'settings.lookups.view',
      'settings.lookups.update',
    ] as const);
    return {
      view: p['settings.lookups.view'],
      update: p['settings.lookups.update'],
      changeStatus: p['settings.lookups.update'],
    };
  }
  private emit(
    name: string,
    c: CallerContext,
    type: string,
    id: string,
    operation: string,
    payload: Record<string, unknown>,
  ) {
    this.events.emit({
      name,
      occurredAt: new Date().toISOString(),
      actor: { accountId: c.accountId },
      target: { type, id },
      operation,
      payload,
    });
  }
  async listGroups(c: CallerContext, q: LookupGroupListDto) {
    const r = await this.repository.listGroups(q);
    return {
      ...r,
      items: r.items.map((x) => mapLookupGroup(x, this.permissions(c))),
    };
  }
  async group(c: CallerContext, id: string) {
    const r = await this.repository.findGroupById(id);
    if (!r) throw new NotFoundException();
    return mapLookupGroup(r, this.permissions(c));
  }
  async createGroup(c: CallerContext, dto: CreateLookupGroupDto) {
    await this.policy.assertGroupParent(undefined, dto.parentGroupId);
    const org = await this.repository.organization();
    try {
      const r = await this.repository.createGroup({
        organizationId: org.id,
        code: normalizeOrganizationCode(dto.code).toLowerCase(),
        name: dto.name.trim(),
        normalizedName: normalizeOrganizationSearch(dto.name),
        parentGroupId: dto.parentGroupId,
        status: dto.status ?? EntityStatus.ACTIVE,
        createdBy: c.accountId,
      });
      this.emit(
        OrganizationEventName.LookupGroupChanged,
        c,
        'lookup-group',
        r.id,
        'create',
        { version: r.version },
      );
      return mapLookupGroup(r, this.permissions(c));
    } catch (e) {
      this.errors.map(e);
    }
  }
  async updateGroup(c: CallerContext, id: string, dto: UpdateLookupGroupDto) {
    const current = await this.repository.findGroupById(id);
    if (!current) throw new NotFoundException();
    await this.policy.assertGroupParent(id, dto.parentGroupId);
    const { expectedVersion, ...changes } = dto;
    const result = await this.repository.updateGroup(id, expectedVersion, {
      ...changes,
      ...(changes.name
        ? {
            name: changes.name.trim(),
            normalizedName: normalizeOrganizationSearch(changes.name),
          }
        : {}),
      updatedBy: c.accountId,
    });
    if (result.count !== 1) throw new VersionConflictException(current.version);
    const r = await this.repository.findGroupById(id);
    if (!r) throw new NotFoundException();
    this.emit(
      OrganizationEventName.LookupGroupChanged,
      c,
      'lookup-group',
      id,
      'update',
      { version: r.version },
    );
    return mapLookupGroup(r, this.permissions(c));
  }
  async statusGroup(c: CallerContext, id: string, dto: LookupGroupStatusDto) {
    const current = await this.repository.findGroupById(id);
    if (!current) throw new NotFoundException();
    await this.policy.assertGroupArchive(id, dto.status);
    const result = await this.repository.updateGroup(id, dto.expectedVersion, {
      status: dto.status,
      archivedAt: dto.status === EntityStatus.ARCHIVED ? new Date() : null,
      updatedBy: c.accountId,
    });
    if (result.count !== 1) throw new VersionConflictException(current.version);
    const r = await this.repository.findGroupById(id);
    if (!r) throw new NotFoundException();
    this.emit(
      OrganizationEventName.LookupGroupChanged,
      c,
      'lookup-group',
      id,
      'status',
      { status: dto.status, version: r.version },
    );
    return mapLookupGroup(r, this.permissions(c));
  }
  private async groupByCode(code: string) {
    const g = await this.repository.findGroupByCode(
      normalizeOrganizationCode(code).toLowerCase(),
    );
    if (!g) throw new NotFoundException();
    return g;
  }
  async listValues(c: CallerContext, code: string, q: LookupValueListDto) {
    const g = await this.groupByCode(code);
    const r = await this.repository.listValues(g.id, q);
    return {
      ...r,
      items: r.items.map((x) => mapLookupValue(x, this.permissions(c))),
    };
  }
  async value(c: CallerContext, code: string, id: string) {
    const g = await this.groupByCode(code);
    const r = await this.repository.findValue(id);
    if (!r || r.lookupGroupId !== g.id) throw new NotFoundException();
    return mapLookupValue(r, this.permissions(c));
  }
  async createValue(c: CallerContext, code: string, dto: CreateLookupValueDto) {
    const g = await this.groupByCode(code);
    await this.policy.assertValueParent(g.parentGroupId, dto.parentValueId);
    try {
      const r = await this.repository.createValue({
        lookupGroupId: g.id,
        name: dto.name.trim(),
        normalizedName: normalizeOrganizationSearch(dto.name),
        code: normalizeOrganizationCode(dto.code).toLowerCase(),
        description: dto.description?.trim() || null,
        sortOrder: dto.sortOrder,
        parentValueId: dto.parentValueId,
        status: dto.status ?? EntityStatus.ACTIVE,
        createdBy: c.accountId,
      });
      this.emit(
        OrganizationEventName.LookupValueChanged,
        c,
        'lookup-value',
        r.id,
        'create',
        { version: r.version },
      );
      return mapLookupValue(r, this.permissions(c));
    } catch (e) {
      this.errors.map(e);
    }
  }
  async updateValue(
    c: CallerContext,
    code: string,
    id: string,
    dto: UpdateLookupValueDto,
  ) {
    const g = await this.groupByCode(code);
    const current = await this.repository.findValue(id);
    if (!current || current.lookupGroupId !== g.id)
      throw new NotFoundException();
    await this.policy.assertValueParent(g.parentGroupId, dto.parentValueId);
    const { expectedVersion, ...changes } = dto;
    const result = await this.repository.updateValue(id, expectedVersion, {
      ...changes,
      ...(changes.name
        ? {
            name: changes.name.trim(),
            normalizedName: normalizeOrganizationSearch(changes.name),
          }
        : {}),
      updatedBy: c.accountId,
    });
    if (result.count !== 1) throw new VersionConflictException(current.version);
    const record = await this.value(c, code, id);
    this.emit(
      OrganizationEventName.LookupValueChanged,
      c,
      'lookup-value',
      id,
      'update',
      { version: record.version },
    );
    return record;
  }
  async statusValue(
    c: CallerContext,
    code: string,
    id: string,
    dto: LookupValueStatusDto,
  ) {
    const g = await this.groupByCode(code);
    const current = await this.repository.findValue(id);
    if (!current || current.lookupGroupId !== g.id)
      throw new NotFoundException();
    await this.policy.assertValueArchive(id, dto.status);
    const result = await this.repository.updateValue(id, dto.expectedVersion, {
      status: dto.status,
      archivedAt: dto.status === EntityStatus.ARCHIVED ? new Date() : null,
      updatedBy: c.accountId,
    });
    if (result.count !== 1) throw new VersionConflictException(current.version);
    const r = await this.value(c, code, id);
    this.emit(
      OrganizationEventName.LookupValueChanged,
      c,
      'lookup-value',
      id,
      'status',
      { status: dto.status },
    );
    return r;
  }
  async reorder(c: CallerContext, code: string, dto: ReorderLookupValuesDto) {
    const group = await this.groupByCode(code);
    const ids = dto.items.map((x) => x.id);
    if (new Set(ids).size !== ids.length) throw new NotFoundException();
    const values = await Promise.all(
      ids.map((id) => this.repository.findValue(id)),
    );
    if (values.some((v) => !v || v.lookupGroupId !== group.id))
      throw new NotFoundException();
    const result = await this.transactions.run(async (tx) => {
      const groupUpdate = await this.repository.updateGroup(
        group.id,
        dto.expectedGroupVersion,
        { updatedBy: c.accountId },
        tx,
      );
      if (groupUpdate.count !== 1)
        throw new VersionConflictException(group.version);
      const completeMembership = await this.repository.groupValues(
        group.id,
        tx,
      );
      if (
        completeMembership.length !== dto.items.length ||
        completeMembership.some((member) => !ids.includes(member.id))
      )
        throw new OrganizationInvalidStateException(
          'يجب إرسال جميع قيم المجموعة عند إعادة الترتيب',
        );
      for (const item of dto.items) {
        const current = values.find((v) => v?.id === item.id);
        const updated = await this.repository.updateValue(
          item.id,
          item.expectedVersion,
          { sortOrder: item.sortOrder, updatedBy: c.accountId },
          tx,
        );
        if (updated.count !== 1)
          throw new VersionConflictException(
            current?.version ?? item.expectedVersion,
          );
      }
      return Promise.all(ids.map((id) => this.repository.findValue(id, tx)));
    });
    const mapped = result
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .map((x) => mapLookupValue(x, this.permissions(c)))
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name) ||
          a.id.localeCompare(b.id),
      );
    this.emit(
      OrganizationEventName.LookupValuesReordered,
      c,
      'lookup-group',
      group.id,
      'reorder',
      { ids },
    );
    return mapped;
  }
}
