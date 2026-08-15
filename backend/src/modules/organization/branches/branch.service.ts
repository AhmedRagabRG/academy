import { Injectable } from '@nestjs/common';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  NotFoundException,
  VersionConflictException,
} from '../../../core/exceptions';
import { RecordPermissionsHelper } from '../../../core/authorization/record-permissions.helper';
import { PrismaErrorMapper } from '../../../database/prisma-error.mapper';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { OrganizationEventName } from '../events/organization.events';
import { mapBranch } from '../mappers/organization.mapper';
import {
  normalizeOrganizationCode,
  normalizeOrganizationEmail,
  normalizeOrganizationSearch,
} from '../types/organization-normalization';
import { BranchPolicy } from './branch.policy';
import { BranchRepository } from './branch.repository';
import type {
  BranchListDto,
  BranchStatusDto,
  CreateBranchDto,
  UpdateBranchDto,
} from './dto/branch.dto';
@Injectable()
export class BranchService {
  constructor(
    private readonly repository: BranchRepository,
    private readonly policy: BranchPolicy,
    private readonly recordPermissions: RecordPermissionsHelper,
    private readonly events: DomainEventBus,
    private readonly errors: PrismaErrorMapper,
    private readonly transactions: TransactionManager,
  ) {}
  private permissions(caller: CallerContext) {
    const p = this.recordPermissions.compute(caller, [
      'settings.branches.view',
      'settings.branches.update',
    ] as const);
    return {
      view: p['settings.branches.view'],
      update: p['settings.branches.update'],
      changeStatus: p['settings.branches.update'],
    };
  }
  private emit(
    name: string,
    caller: CallerContext,
    id: string,
    operation: string,
    payload: Record<string, unknown>,
  ) {
    this.events.emit({
      name,
      occurredAt: new Date().toISOString(),
      actor: { accountId: caller.accountId },
      target: { type: 'branch', id },
      operation,
      payload,
    });
  }
  async list(caller: CallerContext, query: BranchListDto) {
    const result = await this.repository.list(
      {
        ...query,
        ...(query.search
          ? { search: normalizeOrganizationSearch(query.search) }
          : {}),
      },
      caller.organizationWide ? undefined : caller.authorizedBranchIds,
    );
    return {
      ...result,
      items: result.items.map((item) =>
        mapBranch(item, this.permissions(caller)),
      ),
    };
  }
  async get(caller: CallerContext, id: string) {
    const record = await this.repository.findById(id);
    if (!record) throw new NotFoundException();
    this.policy.assertScope(caller, id);
    return mapBranch(record, this.permissions(caller));
  }
  async create(caller: CallerContext, dto: CreateBranchDto) {
    await this.policy.assertManager(dto.managerId);
    const org = await this.repository.organization();
    try {
      const record = await this.repository.create({
        ...dto,
        organizationId: org.id,
        normalizedName: normalizeOrganizationSearch(dto.name),
        code: normalizeOrganizationCode(dto.code),
        email: normalizeOrganizationEmail(dto.email),
        createdBy: caller.accountId,
      });
      this.emit(
        OrganizationEventName.BranchCreated,
        caller,
        record.id,
        'create',
        { version: record.version },
      );
      return mapBranch(record, this.permissions(caller));
    } catch (error) {
      this.errors.map(error);
    }
  }
  async update(caller: CallerContext, id: string, dto: UpdateBranchDto) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException();
    this.policy.assertScope(caller, id);
    await this.policy.assertManager(dto.managerId);
    const { expectedVersion, ...changes } = dto;
    const result = await this.repository.updateVersioned(id, expectedVersion, {
      ...changes,
      ...(changes.name
        ? { normalizedName: normalizeOrganizationSearch(changes.name) }
        : {}),
      ...(changes.code
        ? { code: normalizeOrganizationCode(changes.code) }
        : {}),
      ...(changes.email
        ? { email: normalizeOrganizationEmail(changes.email) }
        : {}),
      updatedBy: caller.accountId,
    });
    if (result.count !== 1) throw new VersionConflictException(current.version);
    const record = await this.repository.findById(id);
    if (!record) throw new NotFoundException();
    this.emit(OrganizationEventName.BranchUpdated, caller, id, 'update', {
      version: record.version,
    });
    return mapBranch(record, this.permissions(caller));
  }
  async status(caller: CallerContext, id: string, dto: BranchStatusDto) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException();
    this.policy.assertScope(caller, id);
    await this.policy.assertTransition(id, dto.status);
    const record = await this.transactions.run(async (tx) => {
      const result = await this.repository.updateVersioned(
        id,
        dto.expectedVersion,
        {
          status: dto.status,
          archivedAt: dto.status === 'ARCHIVED' ? new Date() : null,
          updatedBy: caller.accountId,
        },
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(current.version);
      const updated = await this.repository.findById(id, tx);
      if (!updated) throw new NotFoundException();
      return updated;
    });
    this.emit(OrganizationEventName.BranchStatusChanged, caller, id, 'status', {
      status: dto.status,
      version: record.version,
    });
    return mapBranch(record, this.permissions(caller));
  }
}
