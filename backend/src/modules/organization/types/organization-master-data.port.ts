export const ORGANIZATION_MASTER_DATA_PORT = Symbol(
  'ORGANIZATION_MASTER_DATA_PORT',
);

export interface OrganizationMasterDataOption {
  id: string;
  code?: string;
  label: string;
  active: boolean;
  disabledReason?: 'inactive' | 'archived';
}

export interface OrganizationMasterDataPort {
  selectableValues(groupCode: string): Promise<OrganizationMasterDataOption[]>;
  resolveValue(
    groupCode: string,
    id: string,
  ): Promise<OrganizationMasterDataOption | null>;
}
