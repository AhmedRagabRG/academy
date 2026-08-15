import { Injectable } from '@nestjs/common';
import type { StudentStatus } from '../types/students.types';

export interface StudentTransitionRule {
  from: StudentStatus;
  to: StudentStatus;
  permission: string;
  reasonRequired: boolean;
}

export const STUDENT_REASON_MAX_LENGTH = 500;

/**
 * The authoritative transition table (docs/api-data-requirements.html §4.6).
 * Any pair absent from this list is refused. Adding a status later means adding
 * rows here, never editing control flow (constitution Principle XIX).
 */
const TRANSITIONS: readonly StudentTransitionRule[] = Object.freeze([
  {
    from: 'active',
    to: 'suspended',
    permission: 'students.status.manage',
    reasonRequired: true,
  },
  {
    from: 'active',
    to: 'graduated',
    permission: 'students.status.manage',
    reasonRequired: false,
  },
  {
    from: 'active',
    to: 'withdrawn',
    permission: 'students.status.manage',
    reasonRequired: true,
  },
  {
    from: 'active',
    to: 'archived',
    permission: 'students.archive',
    reasonRequired: true,
  },
  {
    from: 'suspended',
    to: 'active',
    permission: 'students.status.manage',
    reasonRequired: false,
  },
  {
    from: 'suspended',
    to: 'withdrawn',
    permission: 'students.status.manage',
    reasonRequired: true,
  },
  {
    from: 'suspended',
    to: 'archived',
    permission: 'students.archive',
    reasonRequired: true,
  },
  {
    from: 'graduated',
    to: 'archived',
    permission: 'students.archive',
    reasonRequired: false,
  },
  // Correction out of a terminal status needs its own authority.
  {
    from: 'graduated',
    to: 'active',
    permission: 'students.status.correct',
    reasonRequired: true,
  },
  {
    from: 'withdrawn',
    to: 'archived',
    permission: 'students.archive',
    reasonRequired: false,
  },
  {
    from: 'withdrawn',
    to: 'active',
    permission: 'students.status.correct',
    reasonRequired: true,
  },
  {
    from: 'archived',
    to: 'active',
    permission: 'students.activate',
    reasonRequired: false,
  },
]);

/** Statuses that reject any profile, document or note mutation. */
const READ_ONLY_STATUSES: readonly StudentStatus[] = ['archived'];

@Injectable()
export class StudentLifecyclePolicy {
  find(from: StudentStatus, to: StudentStatus): StudentTransitionRule | null {
    return (
      TRANSITIONS.find((rule) => rule.from === from && rule.to === to) ?? null
    );
  }

  /** Every target reachable from `from`, ignoring permissions. */
  allowedFrom(from: StudentStatus): StudentStatus[] {
    return TRANSITIONS.filter((rule) => rule.from === from).map(
      (rule) => rule.to,
    );
  }

  /**
   * The targets a specific caller may actually pick — current status
   * intersected with held permissions (FR-043).
   */
  availableActions(
    from: StudentStatus,
    permissionKeys: readonly string[],
  ): StudentStatus[] {
    return TRANSITIONS.filter(
      (rule) => rule.from === from && permissionKeys.includes(rule.permission),
    ).map((rule) => rule.to);
  }

  isReadOnlyStatus(status: StudentStatus): boolean {
    return READ_ONLY_STATUSES.includes(status);
  }

  all(): readonly StudentTransitionRule[] {
    return TRANSITIONS;
  }
}
