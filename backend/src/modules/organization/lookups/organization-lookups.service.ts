import { Injectable } from '@nestjs/common';
import { LookupRepository } from './lookup.repository';
import type {
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
}
export { STATIC_LOOKUPS };
