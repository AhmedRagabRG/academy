import { Injectable } from '@nestjs/common';
import { EntityStatus } from '../../../../prisma/generated/client';
import type { CatalogIdentityPort } from '../../catalog/types/catalog-reference.port';
import type { CatalogInstructor } from '../../catalog/types/catalog.types';
import { EmployeeRepository } from './employee.repository';

@Injectable()
export class CatalogIdentityReferenceService implements CatalogIdentityPort {
  constructor(private readonly employees: EmployeeRepository) {}
  private map(row: {
    id: string;
    displayName: string;
    status: EntityStatus;
    departmentId: string | null;
    position: string | null;
  }): CatalogInstructor {
    return {
      id: row.id,
      label: row.displayName,
      active: row.status === EntityStatus.ACTIVE,
      departmentId: row.departmentId ?? undefined,
      position: row.position ?? undefined,
      ...(row.status === EntityStatus.ACTIVE
        ? {}
        : {
            disabledReason:
              row.status === EntityStatus.ARCHIVED
                ? ('archived' as const)
                : ('inactive' as const),
          }),
    };
  }
  async instructor(id: string) {
    const row = await this.employees.findById(id);
    return row ? this.map(row) : null;
  }
  async instructors(search = '', page = 1, pageSize = 20) {
    const take = Math.min(100, Math.max(1, pageSize));
    const current = Math.max(1, page);
    const result = await this.employees.list(
      {
        status: EntityStatus.ACTIVE,
        ...(search.trim()
          ? {
              displayName: {
                contains: search.trim(),
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      (current - 1) * take,
      take,
      { displayName: 'asc' },
    );
    return {
      items: result.items.map((row) => this.map(row)),
      total: result.total,
      page: current,
      pageSize: take,
    };
  }
}
