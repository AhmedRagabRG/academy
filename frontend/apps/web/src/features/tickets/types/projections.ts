import type { Ticket, TicketActivity, TicketAttachment, TicketComment, TicketConfiguration } from "./domain"
import type { TicketStatus } from "./common"

export interface TicketCapabilities {
  edit: boolean
  changeStatus: boolean
  changePriority: boolean
  assignTeam: boolean
  assignEmployee: boolean
  comment: boolean
  attach: boolean
  archive: boolean
  restore: boolean
  delete: boolean
}

export interface TicketSummary extends Ticket {
  departmentName: string
  branchName?: string
  teamName?: string
  employeeName?: string
  customerName?: string
  studentName?: string
  commentCount: number
  capabilities: TicketCapabilities
}

export interface TicketDetail extends TicketSummary {
  conversationName?: string
  comments: TicketComment[]
  activity: TicketActivity[]
  attachments: TicketAttachment[]
}

export interface TicketDashboard {
  mine: number
  team: number
  open: number
  waiting: number
  critical: number
  closedToday: number
}

export interface TicketBoardData {
  configuration: TicketConfiguration
  columns: Record<Exclude<TicketStatus, "archived">, TicketSummary[]>
  dashboard: TicketDashboard
}
