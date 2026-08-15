import type { StudentStatus } from "../types/common"
import { studentsPermissions } from "../config/students-permissions"

export interface TransitionRule {
  permission: string
  reasonRequired: boolean
  /** Marks a deliberate correction out of a terminal status. */
  correction?: true
}

/**
 * The single authoritative transition table. It drives the mock service's refusals,
 * the available-actions projection rendered in the UI, and bulk-action evaluation,
 * so no button can exist for a transition the service would reject (spec FR-029).
 */
export const studentTransitionPolicy: Record<
  StudentStatus,
  Partial<Record<StudentStatus, TransitionRule>>
> = {
  active: {
    suspended: {
      permission: studentsPermissions.statusManage,
      reasonRequired: true,
    },
    graduated: {
      permission: studentsPermissions.statusManage,
      reasonRequired: false,
    },
    withdrawn: {
      permission: studentsPermissions.statusManage,
      reasonRequired: true,
    },
    archived: { permission: studentsPermissions.archive, reasonRequired: true },
  },
  suspended: {
    active: {
      permission: studentsPermissions.statusManage,
      reasonRequired: false,
    },
    withdrawn: {
      permission: studentsPermissions.statusManage,
      reasonRequired: true,
    },
    archived: { permission: studentsPermissions.archive, reasonRequired: true },
  },
  graduated: {
    archived: {
      permission: studentsPermissions.archive,
      reasonRequired: false,
    },
    active: {
      permission: studentsPermissions.statusCorrect,
      reasonRequired: true,
      correction: true,
    },
  },
  withdrawn: {
    archived: {
      permission: studentsPermissions.archive,
      reasonRequired: false,
    },
    active: {
      permission: studentsPermissions.statusCorrect,
      reasonRequired: true,
      correction: true,
    },
  },
  archived: {
    active: {
      permission: studentsPermissions.activate,
      reasonRequired: false,
    },
  },
}

export function allowedTransitions(from: StudentStatus): StudentStatus[] {
  return Object.keys(studentTransitionPolicy[from] ?? {}) as StudentStatus[]
}

export function transitionRule(
  from: StudentStatus,
  to: StudentStatus
): TransitionRule | undefined {
  return studentTransitionPolicy[from]?.[to]
}

export function isTransitionAllowed(
  from: StudentStatus,
  to: StudentStatus
): boolean {
  return Boolean(transitionRule(from, to))
}

/** Transitions this employee may actually perform, given the policy and permissions. */
export function availableStatusActions(
  from: StudentStatus,
  permissions: readonly string[]
): StudentStatus[] {
  return allowedTransitions(from).filter((to) => {
    const rule = transitionRule(from, to)
    return rule ? permissions.includes(rule.permission) : false
  })
}

export type TransitionEvaluation =
  | { ok: true; rule: TransitionRule }
  | {
      ok: false
      code: "invalid-status-transition" | "forbidden" | "reason-required"
      allowed: StudentStatus[]
    }

export function evaluateTransition(input: {
  from: StudentStatus
  to: StudentStatus
  reason?: string
  permissions: readonly string[]
}): TransitionEvaluation {
  const allowed = allowedTransitions(input.from)
  const rule = transitionRule(input.from, input.to)
  if (!rule) return { ok: false, code: "invalid-status-transition", allowed }
  if (!input.permissions.includes(rule.permission))
    return { ok: false, code: "forbidden", allowed }
  if (rule.reasonRequired && !input.reason?.trim())
    return { ok: false, code: "reason-required", allowed }
  return { ok: true, rule }
}

/** Archived students are read-only until activated (spec FR-031). */
export function isReadOnlyStatus(status: StudentStatus): boolean {
  return status === "archived"
}
