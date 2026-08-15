import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/client';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import {
  NotFoundException,
  ValidationException,
  VersionConflictException,
} from '../../../core/exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import type { FileDescriptor } from '../../../shared/types/file-descriptor';
import { OrganizationEventName } from '../events/organization.events';
import { isSafeFileDescriptor } from '../types/organization-normalization';
import type { UpdateOrganizationProfileDto } from './dto/organization-profile.dto';
import { OrganizationProfileRepository } from './organization-profile.repository';

@Injectable()
export class OrganizationProfileService {
  constructor(
    private readonly repository: OrganizationProfileRepository,
    private readonly transactions: TransactionManager,
    private readonly events: DomainEventBus,
  ) {}
  private descriptor(value: Prisma.JsonValue | null): FileDescriptor | null {
    return isSafeFileDescriptor(value) ? value : null;
  }
  private map(
    record: NonNullable<
      Awaited<ReturnType<OrganizationProfileRepository['get']>>
    >,
  ) {
    return {
      id: record.id,
      organizationId: record.id,
      name: record.name,
      code: record.code,
      logo: this.descriptor(record.logo),
      favicon: this.descriptor(record.favicon),
      cover: this.descriptor(record.cover),
      website: record.website,
      address: record.address,
      workingHours: record.workingHours as Record<string, string>,
      contacts: record.contacts,
      socialLinks: record.socialLinks,
      version: record.version,
      createdAt: record.createdAt,
      createdBy: record.createdBy,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
    };
  }
  async get() {
    const record = await this.repository.get();
    if (!record) throw new NotFoundException();
    return this.map(record);
  }
  private validate(dto: UpdateOrganizationProfileDto) {
    const platforms = new Set<string>();
    if (dto.contacts) {
      for (const type of ['EMAIL', 'PHONE'] as const) {
        const rows = dto.contacts.filter((c) => c.type === type);
        if (rows.length && rows.filter((c) => c.isPrimary).length !== 1)
          throw new ValidationException([
            {
              field: 'contacts',
              message: 'يجب تحديد جهة اتصال رئيسية واحدة لكل نوع',
            },
          ]);
        for (const row of rows) {
          const valid =
            type === 'EMAIL'
              ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.value)
              : /^\+?[0-9]{8,15}$/.test(row.value);
          if (!valid)
            throw new ValidationException([
              { field: 'contacts.value', message: 'قيمة الاتصال غير صحيحة' },
            ]);
        }
      }
    }
    if (dto.socialLinks)
      for (const link of dto.socialLinks) {
        const key = link.platform.trim().toLowerCase();
        if (platforms.has(key))
          throw new ValidationException([
            { field: 'socialLinks.platform', message: 'المنصة مكررة' },
          ]);
        platforms.add(key);
      }
  }
  async update(caller: CallerContext, dto: UpdateOrganizationProfileDto) {
    this.validate(dto);
    const current = await this.repository.get();
    if (!current) throw new NotFoundException();
    const { expectedVersion, contacts, socialLinks, ...scalars } = dto;
    const record = await this.transactions.run(async (tx) => {
      const result = await this.repository.update(
        current.id,
        expectedVersion,
        {
          ...(scalars.website !== undefined
            ? { website: scalars.website }
            : {}),
          ...(scalars.address !== undefined
            ? { address: scalars.address }
            : {}),
          ...(scalars.logo !== undefined
            ? {
                logo:
                  scalars.logo === null ? Prisma.DbNull : { ...scalars.logo },
              }
            : {}),
          ...(scalars.favicon !== undefined
            ? {
                favicon:
                  scalars.favicon === null
                    ? Prisma.DbNull
                    : { ...scalars.favicon },
              }
            : {}),
          ...(scalars.cover !== undefined
            ? {
                cover:
                  scalars.cover === null ? Prisma.DbNull : { ...scalars.cover },
              }
            : {}),
          ...(scalars.workingHours !== undefined
            ? { workingHours: { ...scalars.workingHours } }
            : {}),
          updatedBy: caller.accountId,
        },
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(current.version);
      if (contacts)
        await this.repository.replaceContacts(current.id, contacts, tx);
      if (socialLinks)
        await this.repository.replaceSocialLinks(
          current.id,
          socialLinks.map((x) => ({
            platform: x.platform.trim().toLowerCase(),
            url: x.url,
            sortOrder: x.sortOrder,
          })),
          tx,
        );
      const updated = await this.repository.get(tx);
      if (!updated) throw new NotFoundException();
      return updated;
    });
    const mapped = this.map(record);
    this.events.emit({
      name: OrganizationEventName.ProfileUpdated,
      occurredAt: new Date().toISOString(),
      actor: { accountId: caller.accountId },
      target: { type: 'organization', id: record.id },
      operation: 'update',
      payload: { version: record.version },
    });
    return mapped;
  }
}
