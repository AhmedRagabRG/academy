import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { IdentityAuthController } from './auth/auth.controller';
import { IdentityAuthService } from './auth/auth.service';
import { PasswordPolicyService } from './auth/password-policy.service';
import { EmployeesController } from './employees/employees.controller';
import { EmployeePolicy } from './employees/employee.policy';
import { EmployeeRepository } from './employees/employee.repository';
import { EmployeeService } from './employees/employee.service';
import { OrganizationReferenceService } from './employees/organization-reference.service';
import { CatalogIdentityReferenceService } from './employees/catalog-reference.service';
import { EmployeeReferenceService } from './employees/employee-reference.service';
import { IAM_EMPLOYEE_REFERENCE_PORT } from './types/employee-reference.port';
import { ProfileController } from './profile/profile.controller';
import { ProfileService } from './profile/profile.service';
import { PermissionRepository } from './roles/permission.repository';
import { PermissionsController } from './roles/permissions.controller';
import { PermissionService } from './roles/permission.service';
import { RoleRepository } from './roles/role.repository';
import { RolesController } from './roles/roles.controller';
import { RoleService } from './roles/role.service';
import { SessionRepository } from './sessions/session.repository';
import { SessionService } from './sessions/session.service';
import { SessionsController } from './sessions/sessions.controller';

@Module({
  imports: [CoreModule],
  controllers: [
    IdentityAuthController,
    SessionsController,
    EmployeesController,
    RolesController,
    PermissionsController,
    ProfileController,
  ],
  providers: [
    IdentityAuthService,
    PasswordPolicyService,
    SessionRepository,
    SessionService,
    EmployeeRepository,
    EmployeePolicy,
    EmployeeService,
    OrganizationReferenceService,
    CatalogIdentityReferenceService,
    EmployeeReferenceService,
    {
      provide: IAM_EMPLOYEE_REFERENCE_PORT,
      useExisting: EmployeeReferenceService,
    },
    RoleRepository,
    PermissionRepository,
    RoleService,
    PermissionService,
    ProfileService,
  ],
  exports: [
    EmployeeRepository,
    RoleRepository,
    PermissionRepository,
    SessionRepository,
    OrganizationReferenceService,
    CatalogIdentityReferenceService,
    IAM_EMPLOYEE_REFERENCE_PORT,
  ],
})
export class IdentityModule {}
