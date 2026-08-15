import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  normalizeArabic,
  normalizeDigits,
} from '../../../shared/utils/arabic-normalize';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { StudentMapper } from '../mappers/student.mapper';
import type { ListStudentsDto } from './dto/list-students.dto';
import { StudentPolicy } from './student.policy';
import { StudentRepository } from './student.repository';

const STATUS_TO_PRISMA = {
  active: 'ACTIVE',
  suspended: 'SUSPENDED',
  graduated: 'GRADUATED',
  withdrawn: 'WITHDRAWN',
  archived: 'ARCHIVED',
} as const;

/** Bounded so an export can never become an unbounded read. */
const EXPORT_ROW_LIMIT = 20_000;

const COLUMNS = [
  'studentCode',
  'fullName',
  'phoneHint',
  'registrationBranchLabel',
  'studyBranchLabel',
  'departmentLabel',
  'primaryOfferingLabel',
  'primaryBatchLabel',
  'customerServiceEmployeeName',
  'status',
  'enrollmentCount',
  'updatedAt',
] as const;

@Injectable()
export class StudentExportService {
  constructor(
    private readonly repository: StudentRepository,
    private readonly policy: StudentPolicy,
    private readonly mapper: StudentMapper,
    private readonly profile: OrganizationProfileService,
  ) {}

  /**
   * Applies the caller's current query, branch scope and the same redaction as
   * the list — the export carries `phoneHint`, never a full phone (FR-028).
   */
  async toCsv(caller: CallerContext, query: ListStudentsDto): Promise<string> {
    const organizationId = (await this.profile.get()).organizationId;
    const statuses = query.statuses?.map(
      (status) => STATUS_TO_PRISMA[status],
    ) as Prisma.StudentWhereInput['status'][] | undefined;

    const rows = await this.repository.listAll(
      {
        organizationId,
        ...(query.search
          ? {
              search: normalizeArabic(
                normalizeDigits(query.search.trim()),
              ).toLowerCase(),
            }
          : {}),
        ...(query.branchIds ? { branchIds: query.branchIds } : {}),
        ...(query.departmentIds ? { departmentIds: query.departmentIds } : {}),
        ...(query.offeringIds ? { offeringIds: query.offeringIds } : {}),
        ...(query.batchIds ? { batchIds: query.batchIds } : {}),
        ...(statuses ? { statuses } : {}),
        ...(query.customerServiceEmployeeIds
          ? { customerServiceEmployeeIds: query.customerServiceEmployeeIds }
          : {}),
        scope: this.policy.scopeFilter(caller),
        includeArchived: Boolean(query.statuses?.includes('archived')),
      },
      {
        field: query.sortBy ?? 'updatedAt',
        direction: query.sortOrder === 'asc' ? 'asc' : 'desc',
      },
      EXPORT_ROW_LIMIT,
    );

    const header = COLUMNS.join(',');
    const body = rows
      .map((row) => {
        const projected = this.mapper.listRow(row);
        return COLUMNS.map((column) =>
          this.escape(projected[column as keyof typeof projected]),
        ).join(',');
      })
      .join('\r\n');

    // Leading BOM so Excel opens the Arabic content as UTF-8. Written as an
    // escape rather than a literal so it stays visible in review.
    return `\uFEFF${header}\r\n${body}`;
  }

  private escape(value: unknown): string {
    if (value === null || value === undefined) return '';
    const text =
      typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : '';
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
}
