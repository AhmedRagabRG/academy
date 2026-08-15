import type {
  Conversation,
  Customer,
  Employee,
  Platform,
  Tag,
  Team,
  Branch,
  Message,
  InternalNote,
  AssignmentHistoryEvent,
  SystemEvent,
} from "./domain"

export interface ConversationView extends Conversation {
  customer: Customer
  platform: Platform
  employee: Employee | null
  team: Team | null
  tags: Tag[]
  branch: Branch
}

export interface ConversationDetail extends ConversationView {
  messages: Message[]
  notes: InternalNote[]
  assignmentHistory: AssignmentHistoryEvent[]
  systemEvents: SystemEvent[]
}

export interface InboxDashboard {
  assigned: number
  open: number
  pending: number
  unread: number
  closedToday: number
}
