import { Injectable } from '@nestjs/common';
import { EntityStatus } from '../../../../prisma/generated/client';
import { RecordPermissionsHelper } from '../../../core/authorization/record-permissions.helper';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  DateOverlapException,
  NotFoundException,
  OrganizationInvalidStateException,
  VersionConflictException,
} from '../../../core/exceptions';
import { PrismaErrorMapper } from '../../../database/prisma-error.mapper';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { OrganizationEventName } from '../events/organization.events';
import { normalizeOrganizationSearch } from '../types/organization-normalization';
import { AcademicCalendarPolicy } from './academic-calendar.policy';
import { AcademicTermRepository } from './academic-term.repository';
import type {
  AcademicTermListDto,
  AcademicTermStatusDto,
  CreateAcademicTermDto,
  UpdateAcademicTermDto,
} from './dto/academic-term.dto';

@Injectable()
export class AcademicTermService {
  constructor(
    private readonly repository: AcademicTermRepository,
    private readonly policy: AcademicCalendarPolicy,
    private readonly permissionsHelper: RecordPermissionsHelper,
    private readonly events: DomainEventBus,
    private readonly errors: PrismaErrorMapper,
    private readonly transactions: TransactionManager,
  ) {}
  private permissions(caller: CallerContext) {
    const result = this.permissionsHelper.compute(caller, [
      'settings.academicTerms.view',
      'settings.academicTerms.update',
    ] as const);
    return {
      view: result['settings.academicTerms.view'],
      update: result['settings.academicTerms.update'],
      changeStatus: result['settings.academicTerms.update'],
    };
  }
  private map(
    record: NonNullable<
      Awaited<ReturnType<AcademicTermRepository['findById']>>
    >,
    caller: CallerContext,
  ) {
    return {
      ...record,
      academicYearName: record.academicYear.name,
      academicYear: undefined,
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
      target: { type: 'academicTerm', id },
      operation: name,
      payload,
    });
  }
  async list(caller: CallerContext, query: AcademicTermListDto) {
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
  async create(caller: CallerContext, dto: CreateAcademicTermDto) {
    const dates = this.policy.dates(dto.startDate, dto.endDate);
    try {
      const record = await this.transactions.runSerializable(async (tx) => {
        await this.repository.lockYears([dto.academicYearId], tx);
        const year = await this.repository.findYear(dto.academicYearId, tx);
        if (!year) throw new NotFoundException();
        this.policy.assertYearVersion(
          year.version,
          dto.expectedAcademicYearVersion,
        );
        await this.policy.assertTermRange(
          dto.academicYearId,
          dates.startDate,
          dates.endDate,
          undefined,
          tx,
        );
        const count = await this.repository.countByYear(dto.academicYearId, tx);
        this.policy.assertInsertOrder(dto.order, count);
        await this.repository.shiftForInsert(dto.academicYearId, dto.order, tx);
        const created = await this.repository.create(
          {
            ...dates,
            academicYearId: dto.academicYearId,
            organizationId: year.organizationId,
            name: dto.name.trim(),
            normalizedName: normalizeOrganizationSearch(dto.name),
            order: dto.order,
            status: dto.status ?? EntityStatus.ACTIVE,
            createdBy: caller.accountId,
          },
          tx,
        );
        const bumped = await this.repository.bumpYearVersion(
          year.id,
          dto.expectedAcademicYearVersion,
          tx,
        );
        if (bumped.count !== 1)
          throw new VersionConflictException(year.version);
        return created;
      });
      this.emit(OrganizationEventName.AcademicTermCreated, caller, record.id, {
        version: record.version,
      });
      return this.map(record, caller);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === '23P01'
      )
        throw new DateOverlapException();
      this.errors.map(error);
    }
  }
  async update(caller: CallerContext, id: string, dto: UpdateAcademicTermDto) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException();
    const yearId = dto.academicYearId ?? current.academicYearId;
    const dates = this.policy.dates(
      dto.startDate ?? current.startDate.toISOString().slice(0, 10),
      dto.endDate ?? current.endDate.toISOString().slice(0, 10),
    );
    const record = await this.transactions.runSerializable(async (tx) => {
      const locked = await this.repository.findById(id, tx);
      if (!locked) throw new NotFoundException();
      const movingYear = yearId !== locked.academicYearId;
      await this.repository.lockYears([locked.academicYearId, yearId], tx);
      const [sourceYear, destinationYear] = await Promise.all([
        this.repository.findYear(locked.academicYearId, tx),
        this.repository.findYear(yearId, tx),
      ]);
      if (!sourceYear || !destinationYear) throw new NotFoundException();
      this.policy.assertYearVersion(
        sourceYear.version,
        dto.expectedAcademicYearVersion,
      );
      if (movingYear) {
        if (!dto.expectedDestinationAcademicYearVersion)
          throw new VersionConflictException(destinationYear.version);
        this.policy.assertYearVersion(
          destinationYear.version,
          dto.expectedDestinationAcademicYearVersion,
        );
      }
      await this.policy.assertTermRange(
        yearId,
        dates.startDate,
        dates.endDate,
        id,
        tx,
      );
      const requestedOrder = dto.order ?? locked.order;
      if (movingYear) {
        if (dto.order === undefined)
          throw new OrganizationInvalidStateException(
            'يجب تحديد ترتيب الفصل في العام الأكاديمي الجديد',
          );
        const destinationCount = await this.repository.countByYear(yearId, tx);
        this.policy.assertInsertOrder(requestedOrder, destinationCount);
        await this.repository.compactAfterRemoval(
          locked.academicYearId,
          locked.order,
          tx,
        );
        await this.repository.shiftForInsert(yearId, requestedOrder, tx);
      } else {
        const count = await this.repository.countByYear(yearId, tx);
        this.policy.assertInsertOrder(requestedOrder, count - 1);
        if (requestedOrder !== locked.order)
          await this.repository.shiftForMove(
            yearId,
            locked.order,
            requestedOrder,
            tx,
          );
      }
      const {
        expectedVersion,
        expectedAcademicYearVersion: _sourceVersion,
        expectedDestinationAcademicYearVersion: _destinationVersion,
        ...changes
      } = dto;
      void _sourceVersion;
      void _destinationVersion;
      const result = await this.repository.updateVersioned(
        id,
        expectedVersion,
        {
          ...changes,
          academicYearId: yearId,
          order: requestedOrder,
          ...dates,
          ...(changes.name
            ? {
                name: changes.name.trim(),
                normalizedName: normalizeOrganizationSearch(changes.name),
              }
            : {}),
          updatedBy: caller.accountId,
        },
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(locked.version);
      if (movingYear || requestedOrder !== locked.order) {
        const sourceBump = await this.repository.bumpYearVersion(
          sourceYear.id,
          dto.expectedAcademicYearVersion,
          tx,
        );
        if (sourceBump.count !== 1)
          throw new VersionConflictException(sourceYear.version);
        if (movingYear) {
          const destinationBump = await this.repository.bumpYearVersion(
            destinationYear.id,
            dto.expectedDestinationAcademicYearVersion ?? 0,
            tx,
          );
          if (destinationBump.count !== 1)
            throw new VersionConflictException(destinationYear.version);
        }
      }
      const updated = await this.repository.findById(id, tx);
      if (!updated) throw new NotFoundException();
      return updated;
    });
    this.emit(
      dto.order !== undefined || dto.academicYearId !== undefined
        ? OrganizationEventName.AcademicTermMoved
        : OrganizationEventName.AcademicTermUpdated,
      caller,
      id,
      {
        version: record.version,
        academicYearId: record.academicYearId,
        order: record.order,
      },
    );
    return this.map(record, caller);
  }
  async status(caller: CallerContext, id: string, dto: AcademicTermStatusDto) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException();
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
    this.emit(OrganizationEventName.AcademicTermStatusChanged, caller, id, {
      status: dto.status,
      version: record.version,
    });
    return this.map(record, caller);
  }
}
