import type { InboxListQuery } from "../types/commands"
import type { ConversationView } from "../types/projections"

const normalize = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/[\s\-()+]/g, "")
export function filterConversations(
  rows: ConversationView[],
  query: InboxListQuery,
  employeeId: string,
  teamIds: string[]
) {
  const needle = normalize(query.search)
  return rows
    .filter((row) => {
      const matchesSearch =
        !needle ||
        [
          row.customer.name,
          row.customer.phone,
          row.lastMessage,
          ...row.tags.map((tag) => tag.label),
        ].some((value) => normalize(value).includes(needle))
      const matchesView =
        query.view === "all" ||
        (query.view === "assigned" && row.assignedEmployeeId === employeeId) ||
        (query.view === "team" &&
          row.assignedTeamId !== null &&
          teamIds.includes(row.assignedTeamId)) ||
        (query.view === "unassigned" &&
          !row.assignedEmployeeId &&
          !row.assignedTeamId) ||
        (query.view === "closed" && row.status === "closed") ||
        (query.view === "archived" && row.status === "archived")
      return (
        matchesSearch &&
        matchesView &&
        (!query.unreadOnly || row.unreadCount > 0) &&
        (!query.platforms.length || query.platforms.includes(row.platformId)) &&
        (!query.statuses.length || query.statuses.includes(row.status)) &&
        (!query.employeeIds.length ||
          (row.assignedEmployeeId !== null &&
            query.employeeIds.includes(row.assignedEmployeeId))) &&
        (!query.teamIds.length ||
          (row.assignedTeamId !== null &&
            query.teamIds.includes(row.assignedTeamId))) &&
        (!query.branchIds.length ||
          query.branchIds.includes(row.customer.branchId)) &&
        (!query.tagIds.length ||
          query.tagIds.some((id) => row.tagIds.includes(id)))
      )
    })
    .sort((a, b) =>
      query.sort === "oldest"
        ? a.lastActivityAt.localeCompare(b.lastActivityAt)
        : query.sort === "unread"
          ? b.unreadCount - a.unreadCount ||
            b.lastActivityAt.localeCompare(a.lastActivityAt)
          : b.lastActivityAt.localeCompare(a.lastActivityAt)
    )
}
