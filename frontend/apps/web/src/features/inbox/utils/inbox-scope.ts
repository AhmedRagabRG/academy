import type { Conversation } from "../types/domain"
import type { EmployeeId, TeamId, VisibilityScope } from "../types/common"
import {
  inboxPermissions,
  type InboxPermission,
} from "../config/inbox-permissions"

export interface InboxActor {
  employeeId: EmployeeId
  teamIds: TeamId[]
  permissions: Set<InboxPermission>
}
export function effectiveScope(actor: InboxActor): VisibilityScope {
  if (actor.permissions.has(inboxPermissions.viewAll)) return "all"
  if (actor.permissions.has(inboxPermissions.viewTeam)) return "team"
  if (actor.permissions.has(inboxPermissions.viewAssigned)) return "assigned"
  return "none"
}
export function canSee(conversation: Conversation, actor: InboxActor) {
  const scope = effectiveScope(actor)
  if (scope === "all") return true
  if (scope === "team")
    return (
      conversation.assignedTeamId !== null &&
      actor.teamIds.includes(conversation.assignedTeamId)
    )
  if (scope === "assigned")
    return conversation.assignedEmployeeId === actor.employeeId
  return false
}
export function scopeFingerprint(actor: InboxActor) {
  return [
    actor.employeeId,
    ...actor.teamIds,
    ...Array.from(actor.permissions).sort(),
  ].join(":")
}
