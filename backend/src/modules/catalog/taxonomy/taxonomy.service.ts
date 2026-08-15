import { Injectable } from '@nestjs/common';
import { EntityStatus } from '../../../../prisma/generated/client';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import { EntityInUseException } from '../../../core/exceptions/organization.exceptions';
import {
  ForbiddenException,
  NotFoundException,
  VersionConflictException,
  ValidationException,
} from '../../../core/exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { CatalogEventName } from '../events/catalog.events';
import { BATCHABLE } from '../types/catalog.types';
import { assertContiguous } from '../types/catalog-normalization';
import type {
  ProductTypeStatusDto,
  UpdateProductTypeDto,
} from './dto/product-type.dto';
import { TaxonomyRepository } from './taxonomy.repository';
const ALLOWED_FIELDS = {
  PROFESSIONAL_PROGRAM: new Set([
    'duration',
    'numberOfTerms',
    'internshipIncluded',
    'trainingIncluded',
    'finalProjectRequired',
  ]),
  PROFESSIONAL_DIPLOMA: new Set([
    'duration',
    'numberOfSessions',
    'trainingIncluded',
  ]),
  TRAINING_COURSE: new Set([
    'numberOfHours',
    'numberOfSessions',
    'instructorEmployeeId',
  ]),
} as const;
@Injectable()
export class TaxonomyService {
  constructor(
    private readonly repo: TaxonomyRepository,
    private readonly tx: TransactionManager,
    private readonly events: DomainEventBus,
  ) {}
  private map<T extends { identity: keyof typeof BATCHABLE }>(x: T) {
    return { ...x, batchable: BATCHABLE[x.identity] };
  }
  async list() {
    return {
      items: (await this.repo.list()).map((x) => this.map(x)),
      total: 3,
      page: 1,
      pageSize: 3,
      totalPages: 1,
    };
  }
  async get(id: string) {
    const x = await this.repo.find(id);
    if (!x) throw new NotFoundException();
    return this.map(x);
  }
  async update(c: CallerContext, id: string, d: UpdateProductTypeDto) {
    const current = await this.repo.find(id);
    if (!current) throw new NotFoundException();
    if (d.fields) {
      if (
        d.fields.some(
          (field) => !ALLOWED_FIELDS[current.identity].has(field.key),
        )
      )
        throw new ValidationException([
          {
            field: 'fields',
            message: 'Unsupported field key for this fixed Product Type',
          },
        ]);
      if ((await this.repo.countProducts(id)) > 0)
        throw new EntityInUseException(
          'Cannot replace Product Type schema while non-archived products reference it',
        );
      assertContiguous(
        [...d.fields]
          .sort((a, b) => a.position - b.position)
          .map((x) => x.position),
      );
      if (new Set(d.fields.map((x) => x.key)).size !== d.fields.length)
        throw new ValidationException();
    }
    await this.tx.run(async (tx) => {
      const r = await this.repo.update(
        id,
        d.expectedVersion,
        {
          nameAr: d.nameAr,
          nameEn: d.nameEn,
          description: d.description,
          updatedBy: c.accountId,
        },
        tx,
      );
      if (r.count !== 1) throw new VersionConflictException(current.version);
      if (d.fields) await this.repo.replaceFields(id, d.fields, tx);
    });
    const row = await this.get(id);
    this.events.emit({
      name: CatalogEventName.TaxonomyChanged,
      occurredAt: new Date().toISOString(),
      actor: { accountId: c.accountId },
      target: { type: 'product-type', id },
      operation: 'update',
      payload: { version: row.version },
    });
    return row;
  }
  async status(c: CallerContext, id: string, d: ProductTypeStatusDto) {
    const required =
      d.status === EntityStatus.ARCHIVED
        ? 'catalog.types.archive'
        : 'catalog.types.activate';
    if (!c.permissionKeys.includes(required)) throw new ForbiddenException();
    const current = await this.repo.find(id);
    if (!current) throw new NotFoundException();
    if (
      d.status !== EntityStatus.ACTIVE &&
      (await this.repo.countProducts(id)) > 0
    )
      throw new EntityInUseException();
    const r = await this.tx.run((tx) =>
      this.repo.update(
        id,
        d.expectedVersion,
        {
          status: d.status,
          archivedAt: d.status === EntityStatus.ARCHIVED ? new Date() : null,
          updatedBy: c.accountId,
        },
        tx,
      ),
    );
    if (r.count !== 1) throw new VersionConflictException(current.version);
    return this.get(id);
  }
}
