import { Injectable } from '@nestjs/common';
import type {
  OrganizationFinancialDefaults,
  OrganizationSettingsPort,
} from '../types/organization-settings.port';
import { GeneralSettingsRepository } from './general-settings.repository';

@Injectable()
export class OrganizationSettingsReferenceService implements OrganizationSettingsPort {
  constructor(private readonly settings: GeneralSettingsRepository) {}

  async financialDefaults(): Promise<OrganizationFinancialDefaults> {
    const value = await this.settings.get();
    return { currency: value?.currency ?? 'EGP', precision: 2 };
  }
}
