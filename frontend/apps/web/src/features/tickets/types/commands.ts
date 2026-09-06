import type { TicketPriority, TicketStatus } from "./common"

export interface TicketActor {
  userId: string
  name: string
  employeeId?: string
  teamIds: string[]
  permissions: string[]
}

export interface TicketFilters {
  statuses?: TicketStatus[]
  priorities?: TicketPriority[]
  teamIds?: string[]
  employeeIds?: string[]
  tags?: string[]
  createdByIds?: string[]
}

export type TicketSort = "newest" | "oldest" | "priority" | "updated"
export interface TicketListQuery {
  actor?: TicketActor
  mode?: "active" | "archived"
  search?: string
  filters?: TicketFilters
  sort?: TicketSort
  status?: TicketStatus
  cursor?: string
  pageSize?: number
}

export interface CreateTicketInput {
  title: string
  description: string
  status: Exclude<TicketStatus, "archived">
  priority: TicketPriority
  teamId?: string
  employeeId?: string
  customerId?: string
  studentId?: string
  conversationId?: string
  dueAt?: string
  tags: string[]
}
