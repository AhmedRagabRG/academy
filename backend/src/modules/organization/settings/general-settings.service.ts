import { Injectable } from '@nestjs/common';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  NotFoundException,
  ValidationException,
  VersionConflictException,
} from '../../../core/exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { OrganizationEventName } from '../events/organization.events';
import type { UpdateGeneralSettingsDto } from './dto/general-settings.dto';
import { GeneralSettingsRepository } from './general-settings.repository';

@Injectable()
export class GeneralSettingsService {
  constructor(
    private readonly repository: GeneralSettingsRepository,
    private readonly transactions: TransactionManager,
    private readonly events: DomainEventBus,
  ) {}
  async get() {
    const r = await this.repository.get();
    if (!r) throw new NotFoundException();
    return r;
  }
  async update(c: CallerContext, dto: UpdateGeneralSettingsDto) {
    const current = await this.repository.get();
    if (!current) throw new NotFoundException();
    const record = await this.transactions.run(async (tx) => {
      const [branch, year] = await Promise.all([
        this.repository.activeBranch(dto.defaultBranchId, tx),
        this.repository.activeYear(dto.defaultAcademicYearId, tx),
      ]);
      const details = [];
      if (!branch)
        details.push({
          field: 'defaultBranchId',
          message: 'يجب اختيار فرع نشط',
        });
      if (!year)
        details.push({
          field: 'defaultAcademicYearId',
          message: 'يجب اختيار العام الأكاديمي النشط',
        });
      if (details.length) throw new ValidationException(details);
      const { expectedVersion, ...data } = dto;
      const result = await this.repository.update(
        current.id,
        expectedVersion,
        { ...data, updatedBy: c.accountId },
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(current.version);
      const updated = await this.repository.get(tx);
      if (!updated) throw new NotFoundException();
      return updated;
    });
    this.events.emit({
      name: OrganizationEventName.SettingsUpdated,
      occurredAt: new Date().toISOString(),
      actor: { accountId: c.accountId },
      target: { type: 'general-settings', id: record.id },
      operation: 'update',
      payload: { version: record.version },
    });
    return record;
  }
}
