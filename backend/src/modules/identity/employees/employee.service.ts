import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PasswordService } from '../../../core/auth/password.service';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import { TransactionManager } from '../../../database/transaction.manager';
import {
  DuplicateException,
  NotFoundException,
  ValidationException,
  VersionConflictException,
} from '../../../core/exceptions';
import {
  createPageResult,
  pageOffset,
} from '../../../shared/pagination/pagination.helper';
import type { CallerContext } from '../../../shared/types/caller-context';
import { normalizeArabic } from '../../../shared/utils/arabic-normalize';
import { PasswordPolicyService } from '../auth/password-policy.service';
import { IdentityEventName } from '../events/identity.events';
import { mapEmployee } from '../mappers/identity.mapper';
import { RoleRepository } from '../roles/role.repository';
import { SessionRepository } from '../sessions/session.repository';
import type {
  CreateEmployeeDto,
  EmployeeStatusDto,
  ResetPasswordDto,
  UpdateEmployeeDto,
} from './dto/employee-mutations.dto';
import type { ListEmployeesDto } from './dto/list-employees.dto';
import { EmployeePolicy } from './employee.policy';
import { EmployeeRepository } from './employee.repository';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly roles: RoleRepository,
    private readonly passwords: PasswordService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly policy: EmployeePolicy,
    private readonly sessions: SessionRepository,
    private readonly transactions: TransactionManager,
    private readonly events: DomainEventBus,
  ) {}
  private emit(
    name: (typeof IdentityEventName)[keyof typeof IdentityEventName],
    caller: CallerContext,
    targetId: string,
    payload: Record<string, unknown>,
  ): void {
    this.events.emit({
      name,
      occurredAt: new Date().toISOString(),
      actor: { accountId: caller.accountId },
      target: { type: 'employee', id: targetId },
      operation: name,
      payload,
    });
  }
  async list(caller: CallerContext, query: ListEmployeesDto) {
    const where: Prisma.AccountWhereInput = {
      ...(query.status
        ? { status: query.status }
        : { status: { not: 'ARCHIVED' } }),
      ...(query.roleId ? { roles: { some: { roleId: query.roleId } } } : {}),
      ...(query.search
        ? {
            OR: [
              {
                normalizedDisplayName: {
                  contains: normalizeArabic(query.search).toLowerCase(),
                },
              },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };
    const result = await this.employees.list(
      where,
      pageOffset(query),
      query.pageSize ?? 20,
      { [query.sort ?? 'updatedAt']: query.sortOrder ?? 'desc' },
    );
    return createPageResult(result.items.map(mapEmployee), result.total, query);
  }
  async get(caller: CallerContext, id: string) {
    const employee = await this.employees.findById(id);
    if (!employee) throw new NotFoundException();
    return mapEmployee(employee);
  }
  private async validateRoles(roleIds: string[]): Promise<string[]> {
    const ids = [...new Set(roleIds)];
    if (
      !ids.length ||
      (await this.roles.findManyByIds(ids)).length !== ids.length
    )
      throw new ValidationException([
        { field: 'roleIds', message: 'يجب إسناد أدوار فعالة ومعروفة' },
      ]);
    return ids;
  }
  async create(caller: CallerContext, dto: CreateEmployeeDto) {
    const roleIds = await this.validateRoles(dto.roleIds);
    this.policy.assertAssignments(roleIds);
    this.passwordPolicy.validate(dto.password);
    try {
      const passwordHash = await this.passwords.hash(dto.password);
      const employee = await this.transactions.run((tx) =>
        this.employees.create(
          {
            email: dto.email.toLowerCase(),
            displayName: dto.displayName,
            normalizedDisplayName: normalizeArabic(
              dto.displayName,
            ).toLowerCase(),
            phone: dto.phone,
            position: dto.position,
            organizationWide: dto.organizationWide ?? false,
            status: dto.status,
            passwordHash,
            createdBy: caller.accountId,
          },
          roleIds,
          tx,
        ),
      );
      this.emit(IdentityEventName.EmployeeCreated, caller, employee.id, {
        roleIds,
      });
      return mapEmployee(employee);
    } catch {
      throw new DuplicateException('EMAIL_EXISTS');
    }
  }
  async update(caller: CallerContext, id: string, dto: UpdateEmployeeDto) {
    const current = await this.employees.findById(id);
    if (!current) throw new NotFoundException();
    const { expectedVersion, roleIds, avatar, ...data } = dto;
    const nextRoles = roleIds
      ? await this.validateRoles(roleIds)
      : current.roles.map(({ roleId }) => roleId);
    this.policy.assertAssignments(nextRoles);
    await this.transactions.run(async (tx) => {
      const result = await this.employees.updateVersioned(
        id,
        expectedVersion,
        {
          ...data,
          ...(avatar ? { avatar: avatar as Prisma.InputJsonValue } : {}),
          ...(data.email ? { email: data.email.toLowerCase() } : {}),
          ...(data.displayName
            ? {
                normalizedDisplayName: normalizeArabic(
                  data.displayName,
                ).toLowerCase(),
              }
            : {}),
          updatedBy: caller.accountId,
        },
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(current.version);
      if (roleIds)
        await this.employees.replaceRoles(id, nextRoles, caller.accountId, tx);
    });
    const employee = await this.get(caller, id);
    this.emit(IdentityEventName.EmployeeUpdated, caller, id, {
      changedFields: Object.keys(dto).filter(
        (key) => key !== 'expectedVersion',
      ),
    });
    return employee;
  }
  async status(caller: CallerContext, id: string, dto: EmployeeStatusDto) {
    const current = await this.employees.findById(id);
    if (!current) throw new NotFoundException();
    this.policy.assertTransition(current.status, dto.status);
    const sessionsRevoked = await this.transactions.run(async (tx) => {
      const result = await this.employees.setStatus(
        id,
        dto.expectedVersion,
        dto.status,
        caller.accountId,
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(current.version);
      return dto.status === 'ACTIVE'
        ? 0
        : this.sessions.revokeAllInTransaction(
            id,
            `account-${dto.status.toLowerCase()}`,
            tx,
          );
    });
    const employee = await this.get(caller, id);
    this.emit(IdentityEventName.EmployeeStatusChanged, caller, id, {
      previousStatus: current.status,
      status: dto.status,
      sessionsRevoked,
    });
    return employee;
  }
  async resetPassword(
    caller: CallerContext,
    id: string,
    dto: ResetPasswordDto,
  ): Promise<null> {
    if (dto.newPassword !== dto.confirmPassword)
      throw new ValidationException([
        { field: 'confirmPassword', message: 'يجب أن تتطابق كلمتا المرور' },
      ]);
    this.passwordPolicy.validate(dto.newPassword);
    const current = await this.employees.findById(id);
    if (!current) throw new NotFoundException();
    const passwordHash = await this.passwords.hash(dto.newPassword);
    const sessionsRevoked = await this.transactions.run(async (tx) => {
      const result = await this.employees.updateVersioned(
        id,
        dto.expectedVersion,
        { passwordHash, updatedBy: caller.accountId },
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(current.version);
      return this.sessions.revokeAllInTransaction(id, 'password-reset', tx);
    });
    this.emit(IdentityEventName.PasswordReset, caller, id, { sessionsRevoked });
    return null;
  }
  async effectivePermissions(caller: CallerContext, id: string) {
    return { permissionKeys: (await this.get(caller, id)).permissionKeys };
  }
}
