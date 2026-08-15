import { Injectable } from '@nestjs/common';
import type { BatchStatus } from '../../../../prisma/generated/client';
import {
  BatchCapacityExceededException,
  InvalidTransitionException,
  ValidationException,
} from '../../../core/exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import type { CreateProgramBatchDto } from './dto/upsert-batch.dto';

const TRANSITIONS: Readonly<Record<BatchStatus, readonly BatchStatus[]>> = {
  DRAFT: ['REGISTRATION_OPEN', 'ARCHIVED'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'ARCHIVED'],
  REGISTRATION_CLOSED: ['REGISTRATION_OPEN', 'STUDYING', 'ARCHIVED'],
  STUDYING: ['GRADUATED', 'ARCHIVED'],
  GRADUATED: ['ARCHIVED'],
  ARCHIVED: [],
};

export const STATUS_PERMISSION: Readonly<Partial<Record<BatchStatus, string>>> =
  {
    REGISTRATION_OPEN: 'batches.registration.open',
    REGISTRATION_CLOSED: 'batches.registration.close',
    STUDYING: 'batches.study.start',
    GRADUATED: 'batches.graduate',
    ARCHIVED: 'batches.archive',
  };

@Injectable()
export class BatchPolicy {
  eligibilityReasons(facts: {
    programAvailable: boolean;
    registrationOpen: boolean;
    today: string;
    registrationStartDate?: string;
    registrationEndDate?: string;
    availableSeats: number;
    branchEligible: boolean;
  }): string[] {
    const reasons: string[] = [];
    if (!facts.programAvailable) reasons.push('PROGRAM_UNAVAILABLE');
    if (!facts.registrationOpen) reasons.push('REGISTRATION_NOT_OPEN');
    if (
      facts.registrationStartDate &&
      facts.today < facts.registrationStartDate
    )
      reasons.push('REGISTRATION_NOT_STARTED');
    if (facts.registrationEndDate && facts.today > facts.registrationEndDate)
      reasons.push('REGISTRATION_ENDED');
    if (facts.availableSeats === 0) reasons.push('NO_AVAILABLE_SEATS');
    if (!facts.branchEligible) reasons.push('BRANCH_NOT_ELIGIBLE');
    return [...new Set(reasons)];
  }

  validateInput(dto: CreateProgramBatchDto): void {
    const details: Array<{ field: string; message: string }> = [];
    const s = dto.schedule;
    if (
      s.registrationStartDate &&
      s.registrationEndDate &&
      s.registrationEndDate <= s.registrationStartDate
    )
      details.push({
        field: 'schedule.registrationEndDate',
        message: 'نهاية التسجيل يجب أن تلي بدايته',
      });
    if (
      s.registrationEndDate &&
      s.studyStartDate &&
      s.studyStartDate < s.registrationEndDate
    )
      details.push({
        field: 'schedule.studyStartDate',
        message: 'بداية الدراسة لا تسبق نهاية التسجيل',
      });
    if (
      s.studyStartDate &&
      s.studyEndDate &&
      s.studyEndDate <= s.studyStartDate
    )
      details.push({
        field: 'schedule.studyEndDate',
        message: 'نهاية الدراسة يجب أن تلي بدايتها',
      });
    if (s.studyEndDate && s.graduationDate && s.graduationDate < s.studyEndDate)
      details.push({
        field: 'schedule.graduationDate',
        message: 'التخرج لا يسبق نهاية الدراسة',
      });
    const assignments = new Set(
      dto.branchAssignments.map((x) => `${x.branchId}:${x.role}`),
    );
    if (assignments.size !== dto.branchAssignments.length)
      details.push({
        field: 'branchAssignments',
        message: 'توجد تعيينات فروع مكررة',
      });
    if (!dto.branchAssignments.some((x) => x.role === 'registration'))
      details.push({
        field: 'branchAssignments',
        message: 'يجب اختيار فرع تسجيل واحد على الأقل',
      });
    if (details.length) throw new ValidationException(details);
  }

  assertCapacity(maximum: number, current: number): void {
    if (maximum < current) throw new BatchCapacityExceededException();
  }

  assertTransition(from: BatchStatus, to: BatchStatus, reason?: string): void {
    if (!TRANSITIONS[from].includes(to)) throw new InvalidTransitionException();
    if (
      (to === 'ARCHIVED' ||
        (from === 'REGISTRATION_CLOSED' && to === 'REGISTRATION_OPEN')) &&
      !reason?.trim()
    )
      throw new ValidationException([
        { field: 'reason', message: 'سبب التغيير مطلوب' },
      ]);
  }

  requiredTransitionPermission(from: BatchStatus, to: BatchStatus): string {
    if (from === 'REGISTRATION_CLOSED' && to === 'REGISTRATION_OPEN')
      return 'batches.registration.correct';
    return STATUS_PERMISSION[to] ?? 'batches.update';
  }

  assertFieldPermissions(
    caller: CallerContext,
    changes: { capacity: boolean; pricing: boolean; branches: boolean },
  ): boolean {
    return (
      (!changes.capacity ||
        caller.permissionKeys.includes('batches.capacity.manage')) &&
      (!changes.pricing ||
        caller.permissionKeys.includes('batches.pricing.manage')) &&
      (!changes.branches ||
        caller.permissionKeys.includes('batches.branches.manage'))
    );
  }
}
