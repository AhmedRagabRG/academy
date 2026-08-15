import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../prisma/generated/client';
import { PasswordService } from '../../../core/auth/password.service';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  InvalidCredentialsException,
  NotFoundException,
  ValidationException,
  VersionConflictException,
} from '../../../core/exceptions';
import { mapEmployee } from '../mappers/identity.mapper';
import { SessionRepository } from '../sessions/session.repository';
import { PasswordPolicyService } from '../auth/password-policy.service';
import { EmployeeRepository } from '../employees/employee.repository';
import { IdentityEventName } from '../events/identity.events';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { UpdateProfileDto } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly passwords: PasswordService,
    private readonly policy: PasswordPolicyService,
    private readonly sessions: SessionRepository,
    private readonly transactions: TransactionManager,
    private readonly events: DomainEventBus,
  ) {}
  private emit(
    name: string,
    caller: CallerContext,
    payload: Record<string, unknown>,
  ): void {
    this.events.emit({
      name,
      occurredAt: new Date().toISOString(),
      actor: { accountId: caller.accountId },
      target: { type: 'employee', id: caller.accountId },
      operation: name,
      payload,
    });
  }
  async get(accountId: string) {
    const employee = await this.employees.findById(accountId);
    if (!employee) throw new NotFoundException();
    return mapEmployee(employee);
  }
  async update(caller: CallerContext, dto: UpdateProfileDto) {
    const accountId = caller.accountId;
    if (
      dto.displayName === undefined &&
      dto.phone === undefined &&
      dto.avatar === undefined
    )
      throw new ValidationException([
        { field: 'body', message: 'يجب إرسال حقل واحد على الأقل' },
      ]);
    const { expectedVersion, avatar, ...data } = dto;
    const result = await this.employees.updateProfile(
      accountId,
      expectedVersion,
      {
        ...data,
        ...(avatar ? { avatar: avatar as Prisma.InputJsonValue } : {}),
      },
    );
    if (result.count !== 1) {
      const current = await this.employees.findById(accountId);
      if (!current) throw new NotFoundException();
      throw new VersionConflictException(current.version);
    }
    const employee = await this.get(accountId);
    this.emit(IdentityEventName.EmployeeUpdated, caller, {
      changedFields: Object.keys(data).concat(avatar ? ['avatar'] : []),
    });
    return employee;
  }
  async changePassword(
    caller: CallerContext,
    dto: ChangePasswordDto,
  ): Promise<null> {
    const accountId = caller.accountId;
    const currentSessionId = caller.sessionId;
    if (dto.newPassword !== dto.confirmPassword)
      throw new ValidationException([
        { field: 'confirmPassword', message: 'يجب أن تتطابق كلمتا المرور' },
      ]);
    this.policy.validate(dto.newPassword);
    const employee = await this.employees.findById(accountId);
    if (!employee) throw new NotFoundException();
    if (
      !(await this.passwords.verify(dto.currentPassword, employee.passwordHash))
    )
      throw new InvalidCredentialsException();
    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.transactions.run(async (tx) => {
      const result = await this.employees.updateVersioned(
        accountId,
        dto.expectedVersion,
        { passwordHash, updatedBy: accountId },
        tx,
      );
      if (result.count !== 1)
        throw new VersionConflictException(employee.version);
      await this.sessions.revokeOthersInTransaction(
        accountId,
        currentSessionId,
        tx,
      );
    });
    this.emit(IdentityEventName.PasswordChanged, caller, {
      preservedSessionId: currentSessionId,
    });
    return null;
  }
}
