import { Injectable } from '@nestjs/common';
import { RecordPermissionsHelper } from '../../../core/authorization/record-permissions.helper';
import {
  StudentArchivedReadOnlyException,
  StudentOutOfScopeException,
} from '../../../core/exceptions/students.exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import { StudentLifecyclePolicy } from '../lifecycle/student-lifecycle.policy';
import type {
  StudentRecordPermissions,
  StudentStatus,
} from '../types/students.types';

/**
 * Fields that no profile update may change, whatever the request body carries
 * (FR-017). Enumerated rather than inferred so adding a server-owned column
 * forces a deliberate decision here.
 */
export const STUDENT_PROTECTED_FIELDS: readonly string[] = Object.freeze([
  'id',
  'organizationId',
  'studentCode',
  'status',
  'admissionId',
  'admissionReference',
  'approvalSnapshotId',
  'admissionDate',
  'enrollmentDate',
  'statusHistory',
  'archivedAt',
  'archiveReason',
  'version',
  'createdAt',
  'createdById',
  'updatedAt',
  'updatedById',
]);

@Injectable()
export class StudentPolicy {
  constructor(
    private readonly permissions: RecordPermissionsHelper,
    private readonly lifecycle: StudentLifecyclePolicy,
  ) {}

  /**
   * A student is in scope when either of its branches is authorized. The
   * refusal is deliberately distinct from a plain `forbidden` so the client can
   * explain *why* the record is unreachable (contract §4.6).
   */
  assertInScope(
    caller: CallerContext,
    student: { registrationBranchId: string; studyBranchId: string },
  ): void {
    if (caller.organizationWide) return;
    const authorized = caller.authorizedBranchIds ?? [];
    if (
      !authorized.includes(student.registrationBranchId) &&
      !authorized.includes(student.studyBranchId)
    )
      throw new StudentOutOfScopeException();
  }

  /** Archived students accept no profile, document or note mutation (FR-018). */
  assertMutable(status: StudentStatus): void {
    if (this.lifecycle.isReadOnlyStatus(status))
      throw new StudentArchivedReadOnlyException();
  }

  /**
   * Always fully populated — an absent or empty permissions object blanks the
   * entire action surface of a detail screen, which the contract treats as a
   * violation rather than a cosmetic omission.
   */
  recordPermissions(caller: CallerContext): StudentRecordPermissions {
    const held = this.permissions.compute(caller, [
      'students.view',
      'students.update',
      'students.archive',
      'students.activate',
      'students.status.manage',
      'students.status.correct',
      'students.export',
      'students.enrollments.view',
      'students.documents.view',
      'students.documents.manage',
      'students.notes.view',
      'students.notes.manage',
      'students.timeline.view',
      'students.finance.view',
    ] as const);

    return {
      overview: held['students.view'],
      enrollments: held['students.enrollments.view'],
      documents: held['students.documents.view'],
      documentsManage: held['students.documents.manage'],
      notes: held['students.notes.view'],
      notesManage: held['students.notes.manage'],
      timeline: held['students.timeline.view'],
      financial: held['students.finance.view'],
      update: held['students.update'],
      archive: held['students.archive'],
      activate: held['students.activate'],
      statusManage: held['students.status.manage'],
      statusCorrect: held['students.status.correct'],
      export: held['students.export'],
    };
  }

  /** Branch predicate for list queries — mirrors `assertInScope`. */
  scopeFilter(caller: CallerContext): Record<string, unknown> | null {
    if (caller.organizationWide) return null;
    const authorized = caller.authorizedBranchIds ?? [];
    return {
      OR: [
        { registrationBranchId: { in: authorized } },
        { studyBranchId: { in: authorized } },
      ],
    };
  }
}
