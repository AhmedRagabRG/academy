import type {
  ActivityId,
  AttachmentId,
  CommentId,
  TeamId,
  TicketId,
  TicketPriority,
  TicketStatus,
  UserId,
} from "./common"

export interface NamedEntity { id: string; name: string }
export interface Employee extends NamedEntity { teamIds: TeamId[] }

export interface Ticket {
  id: TicketId
  number: string
  title: string
  description: string
  status: TicketStatus
  lastActiveStatus: Exclude<TicketStatus, "archived">
  priority: TicketPriority
  teamId?: TeamId
  employeeId?: string
  customerId?: string
  studentId?: string
  conversationId?: string
  dueAt?: string
  tags: string[]
  createdBy: UserId
  createdAt: string
  updatedAt: string
  completedAt?: string
  version: number
}

export interface TicketComment {
  id: CommentId
  ticketId: TicketId
  authorId: UserId
  authorName: string
  message: string
  createdAt: string
  updatedAt?: string
}

export type ActivityType =
  | "created"
  | "status-changed"
  | "priority-changed"
  | "assignment-changed"
  | "comment-added"
  | "comment-edited"
  | "comment-deleted"
  | "attachment-added"
  | "updated"
  | "archived"
  | "restored"

export interface TicketActivity {
  id: ActivityId
  ticketId: TicketId
  type: ActivityType
  actorId: UserId
  actorName: string
  occurredAt: string
  message: string
}

export interface TicketAttachment {
  id: AttachmentId
  ticketId: TicketId
  name: string
  mimeType: string
  sizeBytes: number
  uploadedBy: UserId
  uploadedAt: string
  previewUrl?: string
}

export interface TicketConfiguration {
  statuses: { id: TicketStatus; name: string; order: number }[]
  priorities: { id: TicketPriority; name: string; tone: string; order: number }[]
  teams: (NamedEntity & { id: TeamId })[]
  employees: Employee[]
  customers: NamedEntity[]
  students: NamedEntity[]
  conversations: NamedEntity[]
  tags: string[]
}
