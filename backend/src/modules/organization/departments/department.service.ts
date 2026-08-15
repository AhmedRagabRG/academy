import { Injectable } from '@nestjs/common';
import { RecordPermissionsHelper } from '../../../core/authorization/record-permissions.helper';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  NotFoundException,
  VersionConflictException,
} from '../../../core/exceptions';
import { PrismaErrorMapper } from '../../../database/prisma-error.mapper';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { OrganizationEventName } from '../events/organization.events';
import { mapDepartment } from '../mappers/organization.mapper';
import {
  normalizeOrganizationCode,
  normalizeOrganizationSearch,
} from '../types/organization-normalization';
import { DepartmentPolicy } from './department.policy';
import { DepartmentRepository } from './department.repository';
import type {
  CreateDepartmentDto,
  DepartmentListDto,
  DepartmentStatusDto,
  UpdateDepartmentDto,
} from './dto/department.dto';
@Injectable()
export class DepartmentService {
  constructor(
    private readonly repository: DepartmentRepository,
    private readonly policy: DepartmentPolicy,
    private readonly recordPermissions: RecordPermissionsHelper,
    private readonly events: DomainEventBus,
    private readonly errors: PrismaErrorMapper,
    private readonly transactions: TransactionManager,
  ) {}
  private permissions(c: CallerContext) {
    const p = this.recordPermissions.compute(c, [
      'settings.departments.view',
      'settings.departments.update',
    ] as const);
    return {
      view: p['settings.departments.view'],
      update: p['settings.departments.update'],
      changeStatus: p['settings.departments.update'],
    };
  }
  private emit(
    name: string,
    c: CallerContext,
    id: string,
    operation: string,
    payload: Record<string, unknown>,
  ) {
    this.events.emit({
      name,
      occurredAt: new Date().toISOString(),
      actor: { accountId: c.accountId },
      target: { type: 'department', id },
      operation,
      payload,
    });
  }
  async list(c: CallerContext, q: DepartmentListDto) {
    const r = await this.repository.list({
      ...q,
      ...(q.search ? { search: normalizeOrganizationSearch(q.search) } : {}),
    });
    return {
      ...r,
      items: r.items.map((x) => mapDepartment(x, this.permissions(c))),
    };
  }
  async get(c: CallerContext, id: string) {
    const x = await this.repository.findById(id);
    if (!x) throw new NotFoundException();
    return mapDepartment(x, this.permissions(c));
  }
  async create(c: CallerContext, d: CreateDepartmentDto) {
    const org = await this.repository.organization();
    try {
      const x = await this.repository.create({
        ...d,
        organizationId: org.id,
        normalizedName: normalizeOrganizationSearch(d.name),
        code: normalizeOrganizationCode(d.code),
        createdBy: c.accountId,
      });
      this.emit(OrganizationEventName.DepartmentCreated, c, x.id, 'create', {
        version: x.version,
      });
      return mapDepartment(x, this.permissions(c));
    } catch (e) {
      this.errors.map(e);
    }
  }
  async update(c: CallerContext, id: string, d: UpdateDepartmentDto) {
    const old = await this.repository.findById(id);
    if (!old) throw new NotFoundException();
    const { expectedVersion, ...v } = d;
    const r = await this.repository.updateVersioned(id, expectedVersion, {
      ...v,
      ...(v.name
        ? { normalizedName: normalizeOrganizationSearch(v.name) }
        : {}),
      ...(v.code ? { code: normalizeOrganizationCode(v.code) } : {}),
      updatedBy: c.accountId,
    });
    if (r.count !== 1) throw new VersionConflictException(old.version);
    const x = await this.repository.findById(id);
    if (!x) throw new NotFoundException();
    this.emit(OrganizationEventName.DepartmentUpdated, c, id, 'update', {
      version: x.version,
    });
    return mapDepartment(x, this.permissions(c));
  }
  async status(c: CallerContext, id: string, d: DepartmentStatusDto) {
    const old = await this.repository.findById(id);
    if (!old) throw new NotFoundException();
    await this.policy.assertTransition(id, d.status);
    const x = await this.transactions.run(async (tx) => {
      const r = await this.repository.updateVersioned(
        id,
        d.expectedVersion,
        {
          status: d.status,
          archivedAt: d.status === 'ARCHIVED' ? new Date() : null,
          updatedBy: c.accountId,
        },
        tx,
      );
      if (r.count !== 1) throw new VersionConflictException(old.version);
      const updated = await this.repository.findById(id, tx);
      if (!updated) throw new NotFoundException();
      return updated;
    });
    this.emit(OrganizationEventName.DepartmentStatusChanged, c, id, 'status', {
      status: d.status,
      version: x.version,
    });
    return mapDepartment(x, this.permissions(c));
  }
}
