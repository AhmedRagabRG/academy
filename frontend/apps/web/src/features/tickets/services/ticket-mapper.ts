import type {
  ActivityId,
  AttachmentId,
  CommentId,
  CursorPage,
  TeamId,
  TicketId,
  TicketPriority,
  TicketStatus,
  UserId,
} from "../types/common"
import type {
  TicketActivity,
  TicketAttachment,
  TicketComment,
  TicketConfiguration,
} from "../types/domain"
import type {
  TicketDashboard,
  TicketDetail,
  TicketSummary,
} from "../types/projections"
import type { Page } from "@/shared/api"

interface ApiNamedEntity { id: string; name: string }
interface ApiEmployee extends ApiNamedEntity { teamIds: string[] }

export interface ApiTicketConfiguration {
  statuses: Array<{ id: string; name: string; order: number }>
  priorities: Array<{ id: string; name: string; tone: string; order: number }>
  teams: ApiNamedEntity[]
  employees: ApiEmployee[]
  customers: ApiNamedEntity[]
  students: ApiNamedEntity[]
  conversations: ApiNamedEntity[]
  tags: string[]
}

export interface ApiTicket {
  id: string
  number: string
  title: string
  description: string
  status: string
  lastActiveStatus: string
  priority: string
  teamId?: string
  employeeId?: string
  customerId?: string
  studentId?: string
  conversationId?: string
  dueAt?: string
  tags: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  version: number
  teamName?: string
  employeeName?: string
  customerName?: string
  studentName?: string
  conversationName?: string
  commentCount: number
  capabilities: TicketSummary["capabilities"]
  comments?: ApiTicketComment[]
  activity?: ApiTicketActivity[]
  attachments?: ApiTicketAttachment[]
}

interface ApiTicketComment {
  id: string
  ticketId: string
  authorId: string
  authorName: string
  message: string
  createdAt: string
  updatedAt?: string
}

interface ApiTicketActivity {
  id: string
  ticketId: string
  type: string
  actorId: string
  actorName: string
  occurredAt: string
  message: string
}

export interface ApiTicketAttachment {
  id: string
  ticketId: string
  name: string
  mimeType: string
  sizeBytes: number
  uploadedBy: string
  uploadedAt: string
  previewUrl?: string
}

export type ApiTicketDashboard = TicketDashboard

const ticketBase = (row: ApiTicket) => ({
  id: row.id as TicketId,
  number: row.number,
  title: row.title,
  description: row.description,
  status: row.status as TicketStatus,
  lastActiveStatus: row.lastActiveStatus as Exclude<TicketStatus, "archived">,
  priority: row.priority as TicketPriority,
  teamId: row.teamId as TeamId | undefined,
  employeeId: row.employeeId,
  customerId: row.customerId,
  studentId: row.studentId,
  conversationId: row.conversationId,
  dueAt: row.dueAt,
  tags: row.tags ?? [],
  createdBy: row.createdBy as UserId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  completedAt: row.completedAt,
  version: row.version,
})

export const toTicketSummary = (row: ApiTicket): TicketSummary => ({
  ...ticketBase(row),
  teamName: row.teamName,
  employeeName: row.employeeName,
  customerName: row.customerName,
  studentName: row.studentName,
  commentCount: row.commentCount,
  capabilities: row.capabilities,
})

const toComment = (row: ApiTicketComment): TicketComment => ({
  ...row,
  id: row.id as CommentId,
  ticketId: row.ticketId as TicketId,
  authorId: row.authorId as UserId,
})

const toActivity = (row: ApiTicketActivity): TicketActivity => ({
  id: row.id as ActivityId,
  ticketId: row.ticketId as TicketId,
  type: row.type as TicketActivity["type"],
  actorId: row.actorId as UserId,
  actorName: row.actorName,
  occurredAt: row.occurredAt,
  message: row.message,
})

export const toTicketAttachment = (
  row: ApiTicketAttachment
): TicketAttachment => ({
  ...row,
  id: row.id as AttachmentId,
  ticketId: row.ticketId as TicketId,
  uploadedBy: row.uploadedBy as UserId,
})

export const toTicketDetail = (row: ApiTicket): TicketDetail => ({
  ...toTicketSummary(row),
  conversationName: row.conversationName,
  comments: (row.comments ?? []).map(toComment),
  activity: (row.activity ?? []).map(toActivity),
  attachments: (row.attachments ?? []).map(toTicketAttachment),
})

export const toTicketPage = (page: Page<ApiTicket>): CursorPage<TicketSummary> => ({
  items: page.items.map(toTicketSummary),
  total: page.meta.total,
  ...(page.meta.nextCursor ? { nextCursor: page.meta.nextCursor } : {}),
})

export const toTicketConfiguration = (
  value: ApiTicketConfiguration
): TicketConfiguration => ({
  ...value,
  statuses: value.statuses.map((status) => ({
    ...status,
    id: status.id as TicketStatus,
  })),
  priorities: value.priorities.map((priority) => ({
    ...priority,
    id: priority.id as TicketPriority,
  })),
  teams: value.teams.map((team) => ({ ...team, id: team.id as TeamId })),
  employees: value.employees.map((employee) => ({
    ...employee,
    teamIds: employee.teamIds.map((id) => id as TeamId),
  })),
})
