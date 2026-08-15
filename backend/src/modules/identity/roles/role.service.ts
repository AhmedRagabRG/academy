import { Injectable } from '@nestjs/common';
import {
  DuplicateException,
  NotFoundException,
  RoleInUseException,
  ValidationException,
  VersionConflictException,
} from '../../../core/exceptions';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { IdentityEventName } from '../events/identity.events';
import { normalizeArabic } from '../../../shared/utils/arabic-normalize';
import {
  createPageResult,
  pageOffset,
} from '../../../shared/pagination/pagination.helper';
import { PermissionRepository } from './permission.repository';
import { RoleRepository } from './role.repository';
import type {
  CreateRoleDto,
  ReplaceRolePermissionsDto,
  RoleStatusDto,
  UpdateRoleDto,
} from './dto/role.dto';

const mapRole = (
  role: Awaited<ReturnType<RoleRepository['findById']>> extends infer R
    ? NonNullable<R>
    : never,
) => ({
  id: role.id,
  code: role.code,
  displayName: role.displayName,
  description: role.description,
  status: role.status.toLowerCase(),
  version: role.version,
  assignedCount: role._count.accounts,
  permissionIds: role.permissions
    .map(({ permissionId }) => permissionId)
    .sort(),
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
});

@Injectable()
export class RoleService {
  constructor(
    private readonly roles: RoleRepository,
    private readonly permissions: PermissionRepository,
    private readonly transactions: TransactionManager,
    private readonly events: DomainEventBus,
  ) {}
  private emit(
    name: string,
    caller: CallerContext,
    id: string,
    payload: Record<string, unknown>,
  ): void {
    this.events.emit({
      name,
      occurredAt: new Date().toISOString(),
      actor: { accountId: caller.accountId },
      target: { type: 'role', id },
      operation: name,
      payload,
    });
  }
  async list(query: { page?: number; pageSize?: number; search?: string }) {
    const where = query.search
      ? {
          OR: [
            { code: { contains: query.search, mode: 'insensitive' as const } },
            {
              normalizedDisplayName: {
                contains: normalizeArabic(query.search).toLowerCase(),
              },
            },
          ],
        }
      : {};
    const result = await this.roles.list(
      where,
      pageOffset(query),
      Math.min(query.pageSize ?? 20, 100),
    );
    return createPageResult(result.items.map(mapRole), result.total, query);
  }
  async get(id: string) {
    const role = await this.roles.findById(id);
    if (!role) throw new NotFoundException();
    return mapRole(role);
  }
  async create(caller: CallerContext, dto: CreateRoleDto) {
    const permissionIds = [...new Set(dto.permissionIds)];
    if (
      (await this.permissions.findActiveByIds(permissionIds)).length !==
      permissionIds.length
    )
      throw new ValidationException([
        { field: 'permissionIds', message: 'توجد صلاحيات غير معروفة' },
      ]);
    try {
      const role = await this.roles.create({
        code: dto.code.toLowerCase(),
        displayName: dto.displayName,
        normalizedDisplayName: normalizeArabic(dto.displayName).toLowerCase(),
        description: dto.description ?? '',
        status: dto.status,
        permissions: {
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      });
      this.emit(IdentityEventName.RoleCreated, caller, role.id, {
        permissionIds,
      });
      return mapRole(role);
    } catch {
      throw new DuplicateException('ROLE_CODE_EXISTS');
    }
  }
  async update(caller: CallerContext, id: string, dto: UpdateRoleDto) {
    const { expectedVersion, ...data } = dto;
    const result = await this.roles.updateVersioned(id, expectedVersion, {
      ...data,
      ...(data.displayName
        ? {
            normalizedDisplayName: normalizeArabic(
              data.displayName,
            ).toLowerCase(),
          }
        : {}),
      updatedBy: caller.accountId,
    });
    if (result.count !== 1) {
      const current = await this.roles.findById(id);
      if (!current) throw new NotFoundException();
      throw new VersionConflictException(current.version);
    }
    const role = await this.get(id);
    this.emit(IdentityEventName.RoleUpdated, caller, id, {
      changedFields: Object.keys(data),
    });
    return role;
  }
  async status(caller: CallerContext, id: string, dto: RoleStatusDto) {
    const role = await this.roles.findById(id);
    if (!role) throw new NotFoundException();
    if (dto.status === 'ARCHIVED' && role._count.accounts > 0)
      throw new RoleInUseException();
    if (
      dto.status !== 'ACTIVE' &&
      (await this.roles.countAccountsLosingLastActiveRole(id)) > 0
    )
      throw new RoleInUseException();
    const result = await this.roles.updateVersioned(id, dto.expectedVersion, {
      status: dto.status,
      archivedAt: dto.status === 'ARCHIVED' ? new Date() : null,
    });
    if (result.count !== 1) throw new VersionConflictException(role.version);
    const updated = await this.get(id);
    this.emit(IdentityEventName.RoleUpdated, caller, id, {
      changedFields: ['status'],
      status: dto.status,
    });
    return updated;
  }
  async replacePermissions(
    id: string,
    dto: ReplaceRolePermissionsDto,
    caller: CallerContext,
  ) {
    const role = await this.roles.findById(id);
    if (!role) throw new NotFoundException();
    if (role.version !== dto.expectedVersion)
      throw new VersionConflictException(role.version);
    const ids = [...new Set(dto.permissionIds)];
    if ((await this.permissions.findActiveByIds(ids)).length !== ids.length)
      throw new ValidationException([
        {
          field: 'permissionIds',
          message: 'توجد صلاحيات غير معروفة أو غير فعالة',
        },
      ]);
    const updated = await this.transactions.run(async (tx) => {
      const result = await this.roles.updateVersioned(
        id,
        dto.expectedVersion,
        { updatedBy: caller.accountId },
        tx,
      );
      if (result.count !== 1) throw new VersionConflictException(role.version);
      return this.permissions.replaceForRole(id, ids, caller.accountId, tx);
    });
    this.emit(IdentityEventName.RolePermissionsChanged, caller, id, {
      permissionIds: ids,
    });
    return mapRole(updated);
  }
}
