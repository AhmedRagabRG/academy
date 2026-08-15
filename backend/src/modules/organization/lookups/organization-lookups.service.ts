import { Injectable } from '@nestjs/common';
import { LookupRepository } from './lookup.repository';
import { BranchRepository } from '../branches/branch.repository';
import { DepartmentRepository } from '../departments/department.repository';
import { AcademicYearRepository } from '../academic-calendar/academic-year.repository';
import { AcademicTermRepository } from '../academic-calendar/academic-term.repository';
import type {
  OrganizationMasterDataKind,
  OrganizationMasterDataOption,
  OrganizationMasterDataPort,
} from '../types/organization-master-data.port';

const STATIC_LOOKUPS = Object.freeze({
  languages: [{ code: 'ar', label: 'العربية' }],
  timeZones: [{ code: 'Africa/Cairo', label: 'القاهرة' }],
  currencies: [{ code: 'EGP', label: 'الجنيه المصري' }],
  countries: [{ code: 'EG', label: 'مصر' }],
  locales: [
    { code: 'ar-EG', label: 'العربية (مصر)' },
    { code: 'en-US', label: 'English (US)' },
  ],
  dateFormats: [
    { code: 'dd/MM/yyyy', label: 'DD/MM/YYYY' },
    { code: 'yyyy-MM-dd', label: 'YYYY-MM-DD' },
  ],
  numberFormats: [
    { code: 'ar-EG', label: '١٢٣' },
    { code: 'en-US', label: '123' },
  ],
  weekdays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
});

@Injectable()
export class OrganizationLookupsService implements OrganizationMasterDataPort {
  constructor(
    private readonly repository: LookupRepository,
    private readonly branches: BranchRepository,
    private readonly departments: DepartmentRepository,
    private readonly years: AcademicYearRepository,
    private readonly terms: AcademicTermRepository,
  ) {}
  standards() {
    return STATIC_LOOKUPS;
  }
  async selectableValues(groupCode: string) {
    const rows = await this.repository.selectable(groupCode);
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      label: row.name,
      active: true,
    }));
  }
  async resolveValue(groupCode: string, id: string) {
    const value = await this.repository.findValue(id);
    if (!value || value.lookupGroup.code !== groupCode) return null;
    return {
      id: value.id,
      code: value.code,
      label: value.name,
      active: value.status === 'ACTIVE',
      ...(value.status === 'ACTIVE'
        ? {}
        : {
            disabledReason:
              value.status === 'ARCHIVED'
                ? ('archived' as const)
                : ('inactive' as const),
          }),
    };
  }
  async selectable(
    kind: OrganizationMasterDataKind,
  ): Promise<OrganizationMasterDataOption[]> {
    if (kind === 'branch')
      return (await this.branches.selectable()).map((x) => ({
        id: x.id,
        code: x.code,
        label: x.name,
        active: true,
      }));
    if (kind === 'department')
      return (await this.departments.selectable()).map((x) => ({
        id: x.id,
        code: x.code,
        label: x.name,
        active: true,
      }));
    if (kind === 'academicYear')
      return (await this.years.selectable()).map((x) => ({
        id: x.id,
        code: x.code,
        label: x.name,
        active: true,
      }));
    return (await this.terms.selectable()).map((x) => ({
      id: x.id,
      label: x.name,
      active: true,
      academicYearId: x.academicYearId,
      order: x.order,
    }));
  }
  async resolve(
    kind: OrganizationMasterDataKind,
    id: string,
  ): Promise<OrganizationMasterDataOption | null> {
    const row =
      kind === 'branch'
        ? await this.branches.resolve(id)
        : kind === 'department'
          ? await this.departments.resolve(id)
          : kind === 'academicYear'
            ? await this.years.resolve(id)
            : await this.terms.resolve(id);
    if (!row) return null;
    const active = row.status === 'ACTIVE';
    return {
      id: row.id,
      ...('code' in row ? { code: row.code } : {}),
      label: row.name,
      active,
      ...(active
        ? {}
        : {
            disabledReason:
              row.status === 'ARCHIVED'
                ? ('archived' as const)
                : ('inactive' as const),
          }),
      ...('academicYearId' in row
        ? { academicYearId: row.academicYearId, order: row.order }
        : {}),
    };
  }
}
export { STATIC_LOOKUPS };
