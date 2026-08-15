import type {
  Attachment,
  AssignmentHistoryEvent,
  Branch,
  Customer,
  Employee,
  InternalNote,
  Message,
  Platform,
  SystemEvent,
  Tag,
  Team,
} from "../types/domain"
import type {
  BranchId,
  ConversationId,
  ConversationStatus,
  CustomerId,
  EmployeeId,
  MessageId,
  NoteId,
  PlatformId,
  TagId,
  TeamId,
} from "../types/common"
import type { ConversationDetail, InboxDashboard } from "../types/projections"
import type { InboxLookups } from "./inbox-service"

export interface ApiAttachment {
  id: string
  kind: Attachment["kind"]
  fileName: string
  sizeBytes: number
  durationSeconds?: number
}

interface ApiNamedLookup {
  id: string
  label: string
  active: boolean
}

export interface ApiConversation {
  id: string
  customerId: string
  platformId: string
  status: ConversationStatus
  assignedEmployeeId: string | null
  assignedTeamId: string | null
  tagIds: string[]
  unreadCount: number
  lastMessage: string
  lastActivityAt: string
  version: number
  deletedAt?: string
  previousStatus?: ConversationStatus
  customer: Omit<Customer, "id" | "branchId"> & { id: string; branchId: string }
  platform: ApiNamedLookup & { icon: string }
  employee: (ApiNamedLookup & { teamIds: string[]; avatarUrl?: string }) | null
  team: ApiNamedLookup | null
  tags: Array<ApiNamedLookup & { color: string }>
  branch: ApiNamedLookup
  messages: Array<
    Omit<Message, "id" | "conversationId" | "delivery" | "attachments"> & {
      id: string
      conversationId: string
      delivery: Message["delivery"]
      attachments: ApiAttachment[]
    }
  >
  notes: Array<
    Omit<InternalNote, "id" | "conversationId" | "authorEmployeeId"> & {
      id: string
      conversationId: string
      authorEmployeeId: string
    }
  >
  assignmentHistory: Array<{
    id: string
    conversationId: string
    previous: { employeeId: string | null; teamId: string | null }
    next: { employeeId: string | null; teamId: string | null }
    actorName: string
    occurredAt: string
  }>
  systemEvents: Array<
    Omit<SystemEvent, "conversationId"> & { conversationId: string }
  >
}

const tagColors = new Set<Tag["color"]>([
  "blue",
  "amber",
  "red",
  "green",
  "violet",
  "slate",
])
const toTagColor = (color: string): Tag["color"] =>
  tagColors.has(color as Tag["color"]) ? (color as Tag["color"]) : "slate"

export const toAttachment = (row: ApiAttachment): Attachment => ({ ...row })

export const toInternalNote = (
  note: ApiConversation["notes"][number]
): InternalNote => ({
  ...note,
  id: note.id as NoteId,
  conversationId: note.conversationId as ConversationId,
  authorEmployeeId: note.authorEmployeeId as EmployeeId,
})

export function toConversation(row: ApiConversation): ConversationDetail {
  return {
    ...row,
    id: row.id as ConversationId,
    customerId: row.customerId as CustomerId,
    platformId: row.platformId as PlatformId,
    assignedEmployeeId: row.assignedEmployeeId as EmployeeId | null,
    assignedTeamId: row.assignedTeamId as TeamId | null,
    tagIds: row.tagIds as TagId[],
    customer: {
      ...row.customer,
      id: row.customer.id as CustomerId,
      branchId: row.customer.branchId as BranchId,
    } as Customer,
    platform: {
      ...row.platform,
      id: row.platform.id as PlatformId,
    } as Platform,
    employee: row.employee
      ? ({
          ...row.employee,
          id: row.employee.id as EmployeeId,
          teamIds: row.employee.teamIds as TeamId[],
        } as Employee)
      : null,
    team: row.team
      ? ({ ...row.team, id: row.team.id as TeamId } as Team)
      : null,
    tags: row.tags.map((tag) => ({
      ...tag,
      id: tag.id as TagId,
      color: toTagColor(tag.color),
    })),
    branch: { ...row.branch, id: row.branch.id as BranchId } as Branch,
    messages: row.messages.map((message) => ({
      ...message,
      id: message.id as MessageId,
      conversationId: message.conversationId as ConversationId,
      attachments: message.attachments.map(toAttachment),
    })),
    notes: row.notes.map(toInternalNote),
    assignmentHistory: row.assignmentHistory.map((event) => ({
      ...event,
      conversationId: event.conversationId as ConversationId,
      previous: {
        employeeId: event.previous.employeeId as EmployeeId | null,
        teamId: event.previous.teamId as TeamId | null,
      },
      next: {
        employeeId: event.next.employeeId as EmployeeId | null,
        teamId: event.next.teamId as TeamId | null,
      },
    })) as AssignmentHistoryEvent[],
    systemEvents: row.systemEvents.map((event) => ({
      ...event,
      conversationId: event.conversationId as ConversationId,
    })),
  }
}

export interface ApiLookups extends Omit<InboxLookups, "statuses"> {
  statuses: Array<{ id: string; label: string }>
  employees: Array<{ id: string; label: string; teamIds?: string[] }>
}

export const toLookups = (row: ApiLookups): InboxLookups => ({
  ...row,
  statuses: row.statuses.map((status) => ({
    id: status.id as ConversationStatus,
    label: status.label,
  })),
})

export const toDashboard = (row: InboxDashboard): InboxDashboard => ({ ...row })
