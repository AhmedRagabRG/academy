import { Injectable } from '@nestjs/common';
import { EntityStatus } from '../../../../prisma/generated/client';
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
import {
  normalizeOrganizationCode,
  normalizeOrganizationSearch,
} from '../types/organization-normalization';
import { AcademicCalendarPolicy } from './academic-calendar.policy';
import { AcademicYearRepository } from './academic-year.repository';
import type {
  AcademicYearListDto,
  AcademicYearStatusDto,
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
} from './dto/academic-year.dto';

@Injectable()
export class AcademicYearService {
  constructor(
    private readonly repository: AcademicYearRepository,
    private readonly policy: AcademicCalendarPolicy,
    private readonly transactions: TransactionManager,
    private readonly permissionsHelper: RecordPermissionsHelper,
    private readonly events: DomainEventBus,
    private readonly errors: PrismaErrorMapper,
  ) {}
  private permissions(caller: CallerContext) {
    const result = this.permissionsHelper.compute(caller, [
      'settings.academicYears.view',
      'settings.academicYears.update',
    ] as const);
    return {
      view: result['settings.academicYears.view'],
      update: result['settings.academicYears.update'],
      changeStatus: result['settings.academicYears.update'],
    };
  }
  private map(
    record: NonNullable<
      Awaited<ReturnType<AcademicYearRepository['findById']>>
    >,
    caller: CallerContext,
  ) {
    return {
      ...record,
      startDate: record.startDate.toISOString().slice(0, 10),
      endDate: record.endDate.toISOString().slice(0, 10),
      status: record.status.toLowerCase(),
      permissions: this.permissions(caller),
    };
  }
  private emit(
    name: string,
    caller: CallerContext,
    id: string,
    payload: Record<string, unknown>,
  ) {
    this.events.emit({
      name,
      occurredAt: new Date().toISOString(),
      actor: { accountId: caller.accountId },
      target: { type: 'academicYear', id },
      operation: name,
      payload,
    });
  }
  async list(caller: CallerContext, query: AcademicYearListDto) {
    const page = await this.repository.list({
      ...query,
      ...(query.search
        ? { search: normalizeOrganizationSearch(query.search) }
        : {}),
    });
    return { ...page, items: page.items.map((item) => this.map(item, caller)) };
  }
  async get(caller: CallerContext, id: string) {
    const record = await this.repository.findById(id);
    if (!record) throw new NotFoundException();
    return this.map(record, caller);
  }
  async create(caller: CallerContext, dto: CreateAcademicYearDto) {
    const dates = this.policy.dates(dto.startDate, dto.endDate);
    const org = await this.repository.organization();
    try {
      const record = await this.repository.create({
        ...dates,
        name: dto.name,
        normalizedName: normalizeOrganizationSearch(dto.name),
        code: normalizeOrganizationCode(dto.code),
        organizationId: org.id,
        status: dto.status ?? EntityStatus.INACTIVE,
        createdBy: caller.accountId,
      });
      this.emit(OrganizationEventName.AcademicYearCreated, caller, record.id, {
        version: record.version,
      });
      return this.map(record, caller);
    } catch (error) {
      this.errors.map(error);
    }
  }
  async update(caller: CallerContext, id: string, dto: UpdateAcademicYearDto) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException();
    const start = dto.startDate ?? current.startDate.toISOString().slice(0, 10);
    const end = dto.endDate ?? current.endDate.toISOString().slice(0, 10);
    const dates = this.policy.dates(start, end);
    const { expectedVersion, ...changes } = dto;
    const result = await this.repository.updateVersioned(id, expectedVersion, {
      ...changes,
      ...dates,
      ...(changes.name
        ? { normalizedName: normalizeOrganizationSearch(changes.name) }
        : {}),
      ...(changes.code
        ? { code: normalizeOrganizationCode(changes.code) }
        : {}),
      updatedBy: caller.accountId,
    });
    if (result.count !== 1) throw new VersionConflictException(current.version);
    const record = await this.repository.findById(id);
    if (!record) throw new NotFoundException();
    this.emit(OrganizationEventName.AcademicYearUpdated, caller, id, {
      version: record.version,
    });
    return this.map(record, caller);
  }
  async status(caller: CallerContext, id: string, dto: AcademicYearStatusDto) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException();
    if (dto.status === EntityStatus.ARCHIVED)
      await this.policy.assertYearArchivable(id);
    const result = await this.repository.updateVersioned(
      id,
      dto.expectedVersion,
      {
        status: dto.status,
        archivedAt: dto.status === EntityStatus.ARCHIVED ? new Date() : null,
        updatedBy: caller.accountId,
      },
    );
    if (result.count !== 1) throw new VersionConflictException(current.version);
    const record = await this.repository.findById(id);
    if (!record) throw new NotFoundException();
    this.emit(OrganizationEventName.AcademicYearUpdated, caller, id, {
      status: dto.status,
      version: record.version,
    });
    return this.map(record, caller);
  }
  async activate(caller: CallerContext, id: string, expectedVersion: number) {
    const activated = await this.transactions.runSerializable(async (tx) => {
      const current = await this.repository.findById(id, tx);
      if (!current) throw new NotFoundException();
      if (current.version !== expectedVersion)
        throw new VersionConflictException(current.version);
      const active = await this.repository.findActive(
        current.organizationId,
        tx,
      );
      if (active && active.id !== id)
        await this.repository.inactivate(active.id, tx);
      const result = await this.repository.updateVersioned(
        id,
        expectedVersion,
        {
          status: EntityStatus.ACTIVE,
          archivedAt: null,
          updatedBy: caller.accountId,
        },
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(current.version);
      await this.repository.updateDefault(current.organizationId, id, tx);
      const record = await this.repository.findById(id, tx);
      if (!record) throw new NotFoundException();
      return record;
    });
    this.emit(OrganizationEventName.AcademicYearActivated, caller, id, {
      version: activated.version,
    });
    return this.map(activated, caller);
  }
}
