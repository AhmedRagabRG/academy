export const ORGANIZATION_REFERENCE_PORT = Symbol(
  'ORGANIZATION_REFERENCE_PORT',
);

export interface OrganizationReferencePort {
  isEligibleManager(accountId: string): Promise<boolean>;
  countActiveBranchReferences(branchId: string): Promise<number>;
  countActiveDepartmentReferences(departmentId: string): Promise<number>;
}
