import { Injectable } from '@nestjs/common';
import { EntityStatus } from '../../../../prisma/generated/client';
import type {
  EmployeeAssignmentReference,
  EmployeeReferencePort,
} from '../types/employee-reference.port';
import { EmployeeRepository } from './employee.repository';

type EmployeeRow = NonNullable<
  Awaited<ReturnType<EmployeeRepository['findById']>>
>;

@Injectable()
export class EmployeeReferenceService implements EmployeeReferencePort {
  constructor(private readonly employees: EmployeeRepository) {}

  private map(
    row: EmployeeRow,
    organizationId: string,
  ): EmployeeAssignmentReference {
    const active = row.status === EntityStatus.ACTIVE;
    const managerEligible = row.roles.some(({ role }) => {
      const roleCode = role.code.toLowerCase();
      return roleCode === 'super-admin' || roleCode.includes('manager');
    });
    return {
      id: row.id,
      label: row.displayName,
      organizationId,
      active,
      assignmentEligible: active,
      managerEligible: active && managerEligible,
      branchIds: row.branchIds,
      ...(row.departmentId ? { departmentId: row.departmentId } : {}),
      ...(active
        ? {}
        : {
            disabledReason:
              row.status === EntityStatus.ARCHIVED
                ? ('archived' as const)
                : ('inactive' as const),
          }),
    };
  }

  async resolve(employeeId: string, organizationId: string) {
    const row = await this.employees.findById(employeeId);
    return row ? this.map(row, organizationId) : null;
  }

  async selectable(
    organizationId: string,
    options: { search?: string; managerOnly?: boolean } = {},
  ) {
    const search = options.search?.trim();
    const result = await this.employees.list(
      {
        status: EntityStatus.ACTIVE,
        ...(search
          ? { displayName: { contains: search, mode: 'insensitive' as const } }
          : {}),
      },
      0,
      100,
      { displayName: 'asc' },
    );
    const mapped = result.items.map((row) => this.map(row, organizationId));
    return options.managerOnly
      ? mapped.filter((employee) => employee.managerEligible)
      : mapped;
  }
}
