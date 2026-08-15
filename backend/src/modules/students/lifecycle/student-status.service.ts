import { Injectable } from '@nestjs/common';
import { DomainEventBus } from '../../../core/events/domain-event.bus';
import { DomainException } from '../../../core/exceptions/domain.exception';
import {
  InvalidStudentStatusTransitionException,
  StudentForbiddenException,
  StudentNotFoundException,
  StudentReasonRequiredException,
  StudentVersionConflictException,
} from '../../../core/exceptions/students.exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import { OrganizationProfileService } from '../../organization/profile/organization-profile.service';
import { STUDENT_EVENT_NAMES, studentEvent } from '../events/students.events';
import { StudentMapper } from '../mappers/student.mapper';
import { StudentPolicy } from '../students/student.policy';
import { StudentRepository } from '../students/student.repository';
import { StudentService } from '../students/student.service';
import { StudentTimelineService } from '../timeline/student-timeline.service';
import type {
  BulkStatusItemDto,
  BulkStudentStatusDto,
  ChangeStudentStatusDto,
} from './dto/student-status.dto';
import { StudentLifecyclePolicy } from './student-lifecycle.policy';
import type { StudentStatus } from '../types/students.types';

const STATUS_TO_PRISMA = {
  active: 'ACTIVE',
  suspended: 'SUSPENDED',
  graduated: 'GRADUATED',
  withdrawn: 'WITHDRAWN',
  archived: 'ARCHIVED',
} as const;

const STATUS_LABELS: Record<StudentStatus, string> = {
  active: 'نشط',
  suspended: 'موقوف',
  graduated: 'متخرج',
  withdrawn: 'منسحب',
  archived: 'مؤرشف',
};

export interface BulkStatusOutcome {
  studentId: string;
  studentCode: string;
  outcome: 'applied' | 'refused';
  refusalCode?: string;
  message?: string;
}

@Injectable()
export class StudentStatusService {
  constructor(
    private readonly repository: StudentRepository,
    private readonly lifecycle: StudentLifecyclePolicy,
    private readonly policy: StudentPolicy,
    private readonly mapper: StudentMapper,
    private readonly timeline: StudentTimelineService,
    private readonly students: StudentService,
    private readonly transactions: TransactionManager,
    private readonly profile: OrganizationProfileService,
    private readonly events: DomainEventBus,
  ) {}

  async change(
    caller: CallerContext,
    studentId: string,
    dto: ChangeStudentStatusDto,
  ) {
    await this.apply(caller, {
      studentId,
      toStatus: dto.toStatus,
      ...(dto.reason ? { reason: dto.reason } : {}),
      expectedVersion: dto.expectedVersion,
    });
    return this.students.getDetail(caller, studentId);
  }

  /**
   * Every item reports its own outcome and an applied item is never rolled back
   * because of a later failure (FR-044).
   */
  async bulk(
    caller: CallerContext,
    dto: BulkStudentStatusDto,
  ): Promise<BulkStatusOutcome[]> {
    const outcomes: BulkStatusOutcome[] = [];
    for (const item of dto.items) {
      try {
        const applied = await this.apply(caller, item);
        outcomes.push({
          studentId: item.studentId,
          studentCode: applied.studentCode,
          outcome: 'applied',
        });
      } catch (error: unknown) {
        outcomes.push({
          studentId: item.studentId,
          studentCode: await this.codeOf(item.studentId),
          outcome: 'refused',
          refusalCode:
            error instanceof DomainException
              ? error.code
              : 'service-unavailable',
          message:
            error instanceof DomainException
              ? error.message
              : 'الخدمة غير متاحة حاليًا. حاول مرة أخرى.',
        });
      }
    }
    return outcomes;
  }

  private async apply(
    caller: CallerContext,
    item: BulkStatusItemDto,
  ): Promise<{ studentCode: string }> {
    const organizationId = (await this.profile.get()).organizationId;
    const student = await this.repository.findById(
      item.studentId,
      organizationId,
    );
    if (!student) throw new StudentNotFoundException();
    this.policy.assertInScope(caller, student);

    const from = this.mapper.status(student.status);
    const rule = this.lifecycle.find(from, item.toStatus);
    if (!rule)
      throw new InvalidStudentStatusTransitionException(
        from,
        item.toStatus,
        this.lifecycle.allowedFrom(from),
      );

    // Permission is per transition, not per endpoint.
    if (!(caller.permissionKeys ?? []).includes(rule.permission))
      throw new StudentForbiddenException();

    const reason = item.reason?.trim();
    if (rule.reasonRequired && !reason)
      throw new StudentReasonRequiredException();

    const actorName = caller.displayName || 'موظف';
    const isArchiving = item.toStatus === 'archived';

    await this.transactions.run(async (tx) => {
      const result = await this.repository.updateCompareAndSwap(
        item.studentId,
        organizationId,
        item.expectedVersion,
        {
          status: STATUS_TO_PRISMA[item.toStatus],
          ...(isArchiving
            ? { archivedAt: new Date(), archiveReason: reason ?? null }
            : { archivedAt: null, archiveReason: null }),
          updatedById: caller.accountId,
          updatedByName: actorName,
        },
        tx,
      );
      if (result.count === 0) {
        const latest = await this.repository.findById(
          item.studentId,
          organizationId,
          tx,
        );
        if (!latest) throw new StudentNotFoundException();
        throw new StudentVersionConflictException(latest.version);
      }

      await tx.studentStatusChange.create({
        data: {
          studentId: item.studentId,
          fromStatus: student.status,
          toStatus: STATUS_TO_PRISMA[item.toStatus],
          ...(reason ? { reason } : {}),
          actorId: caller.accountId,
          actorName,
          sourceVersion: item.expectedVersion,
          resultVersion: item.expectedVersion + 1,
        },
      });

      await this.timeline.append(
        {
          studentId: item.studentId,
          category: 'status-changed',
          actorId: caller.accountId,
          actorName,
          origin: 'students',
          summary: `تم تغيير الحالة من ${STATUS_LABELS[from]} إلى ${STATUS_LABELS[item.toStatus]}`,
        },
        tx,
      );
    });

    this.events.emit(
      studentEvent(STUDENT_EVENT_NAMES.statusChanged, {
        actorId: caller.accountId,
        studentId: item.studentId,
        operation: 'status-changed',
        payload: { fromStatus: from, toStatus: item.toStatus },
      }),
    );
    if (isArchiving)
      this.events.emit(
        studentEvent(STUDENT_EVENT_NAMES.archived, {
          actorId: caller.accountId,
          studentId: item.studentId,
          operation: 'archived',
          payload: { reason: reason ?? null },
        }),
      );

    return { studentCode: student.studentCode };
  }

  private async codeOf(studentId: string): Promise<string> {
    const organizationId = (await this.profile.get()).organizationId;
    const student = await this.repository.findById(studentId, organizationId);
    return student?.studentCode ?? '';
  }
}
