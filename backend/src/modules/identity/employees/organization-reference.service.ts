import { Injectable } from '@nestjs/common';
import type { OrganizationReferencePort } from '../../organization/types/organization-reference.port';
import { EmployeeRepository } from './employee.repository';

@Injectable()
export class OrganizationReferenceService implements OrganizationReferencePort {
  constructor(private readonly employees: EmployeeRepository) {}

  async isEligibleManager(accountId: string): Promise<boolean> {
    const employee = await this.employees.findById(accountId);
    return employee?.status === 'ACTIVE';
  }

  countActiveBranchReferences(branchId: string): Promise<number> {
    return this.employees.countActiveByBranch(branchId);
  }

  countActiveDepartmentReferences(departmentId: string): Promise<number> {
    return this.employees.countActiveByDepartment(departmentId);
  }
}
