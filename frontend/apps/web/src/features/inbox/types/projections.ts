import type {
  Conversation,
  Customer,
  Employee,
  Platform,
  Tag,
  Team,
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
}

/**
 * The CRM records the API linked to this conversation's customer. Null while a
 * customer has no contact yet, and `lead` is null when every opportunity for
 * that contact is already closed.
 */
export interface ConversationCrmLink {
  contactId: string
  lead: {
    id: string
    pipelineId: string
    stageId: string
    stageRecordId: string
    stageName: string
  } | null
}

export interface ConversationDetail extends ConversationView {
  messages: Message[]
  notes: InternalNote[]
  assignmentHistory: AssignmentHistoryEvent[]
  systemEvents: SystemEvent[]
  crm: ConversationCrmLink | null
}

export interface InboxDashboard {
  assigned: number
  open: number
  pending: number
  unread: number
  closedToday: number
}
