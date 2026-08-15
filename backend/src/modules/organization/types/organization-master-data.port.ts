export const ORGANIZATION_MASTER_DATA_PORT = Symbol(
  'ORGANIZATION_MASTER_DATA_PORT',
);

export type OrganizationMasterDataKind =
  'branch' | 'department' | 'academicYear' | 'academicTerm';

export interface OrganizationMasterDataOption {
  id: string;
  code?: string;
  label: string;
  active: boolean;
  disabledReason?: 'inactive' | 'archived';
  academicYearId?: string;
  order?: number;
}

export interface OrganizationMasterDataPort {
  selectable(
    kind: OrganizationMasterDataKind,
  ): Promise<OrganizationMasterDataOption[]>;
  resolve(
    kind: OrganizationMasterDataKind,
    id: string,
  ): Promise<OrganizationMasterDataOption | null>;
  selectableValues(groupCode: string): Promise<OrganizationMasterDataOption[]>;
  resolveValue(
    groupCode: string,
    id: string,
  ): Promise<OrganizationMasterDataOption | null>;
}
