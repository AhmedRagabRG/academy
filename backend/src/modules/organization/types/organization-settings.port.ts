export const ORGANIZATION_SETTINGS_PORT = Symbol('ORGANIZATION_SETTINGS_PORT');

export interface OrganizationFinancialDefaults {
  currency: string;
  precision: number;
}

export interface OrganizationSettingsPort {
  financialDefaults(): Promise<OrganizationFinancialDefaults>;
}
