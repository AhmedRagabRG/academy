import { Injectable } from '@nestjs/common';
import { ValidationException } from '../../../core/exceptions';
import { InvalidTransitionException } from '../../../core/exceptions';
import { EntityStatus } from '../../../../prisma/generated/client';
@Injectable()
export class EmployeePolicy {
  assertTransition(current: EntityStatus, next: EntityStatus): void {
    if (
      current === EntityStatus.ARCHIVED ||
      current === next ||
      (current === EntityStatus.INACTIVE && next === EntityStatus.INACTIVE)
    )
      throw new InvalidTransitionException();
  }
  assertAssignments(roleIds: string[]): void {
    if (!roleIds.length)
      throw new ValidationException([
        { field: 'roleIds', message: 'يجب إسناد دور واحد على الأقل' },
      ]);
  }
}
