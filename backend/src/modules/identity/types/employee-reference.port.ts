export const IAM_EMPLOYEE_REFERENCE_PORT = Symbol(
  'IAM_EMPLOYEE_REFERENCE_PORT',
);

export interface EmployeeAssignmentReference {
  id: string;
  label: string;
  organizationId: string;
  active: boolean;
  assignmentEligible: boolean;
  managerEligible: boolean;
  disabledReason?: 'inactive' | 'archived';
}

export interface EmployeeReferencePort {
  resolve(
    employeeId: string,
    organizationId: string,
  ): Promise<EmployeeAssignmentReference | null>;
  selectable(
    organizationId: string,
    options?: { search?: string; managerOnly?: boolean },
  ): Promise<EmployeeAssignmentReference[]>;
}
