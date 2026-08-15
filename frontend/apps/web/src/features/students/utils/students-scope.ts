import type { Student } from "../types/domain"
import type { StudentSummary } from "../types/projections"
import { allStudentsPermissions } from "../config/students-permissions"
import { redactPhone } from "./student-identity-rules"

/**
 * Authenticated context supplied outside command payloads. Commands never accept
 * actor, organization, roles, or arbitrary scope. This mock enforcement exists for
 * UX and test fidelity; a future backend is authoritative.
 */
export interface StudentServiceContext {
  employeeId: string
  employeeName: string
  organizationId: string
  permissions: readonly string[]
  authorizedBranchIds: readonly string[]
  organizationWide: boolean
  /** Stable fingerprint included in every query key so scopes never share cache. */
  scopeFingerprint: string
}

export const defaultStudentContext: StudentServiceContext = {
  employeeId: "employee-demo",
  employeeName: "أحمد محمد",
  organizationId: "organization-alsalam",
  permissions: allStudentsPermissions,
  authorizedBranchIds: ["branch-main", "branch-cairo", "branch-giza"],
  organizationWide: true,
  scopeFingerprint: "organization-alsalam:all",
}

export function hasStudentPermission(
  context: StudentServiceContext,
  permission: string
): boolean {
  return context.permissions.includes(permission)
}

export function isStudentInScope(
  student: Student,
  context: StudentServiceContext
): boolean {
  if (student.organizationId !== context.organizationId) return false
  if (context.organizationWide) return true
  return [
    student.assignment.registrationBranchId,
    student.assignment.studyBranchId,
  ].some((branchId) => context.authorizedBranchIds.includes(branchId))
}

export function branchIdsInScope(
  context: StudentServiceContext
): readonly string[] | undefined {
  return context.organizationWide ? undefined : context.authorizedBranchIds
}

/** Scoped contexts see masked contact values in list projections. */
export function redactSummary(
  summary: StudentSummary,
  context: StudentServiceContext
): StudentSummary {
  if (context.organizationWide) return summary
  return { ...summary, phoneHint: redactPhone(summary.phoneHint) }
}

export function buildScopeFingerprint(
  context: Omit<StudentServiceContext, "scopeFingerprint">
): string {
  const branches = context.organizationWide
    ? "all"
    : [...context.authorizedBranchIds].sort().join(",")
  return `${context.organizationId}:${branches}:${[...context.permissions].sort().join("|")}`
}
