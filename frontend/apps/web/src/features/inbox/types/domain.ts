import type {
  AttachmentKind,
  ConversationId,
  ConversationStatus,
  CustomerId,
  EmployeeId,
  MessageId,
  NoteId,
  PlatformId,
  TagId,
  TeamId,
} from "./common"

export interface NamedLookup<Id extends string = string> {
  id: Id
  label: string
  active: boolean
}

export interface Customer {
  id: CustomerId
  name: string
  phone: string
  avatarUrl?: string
  firstContactAt: string
  lastActivityAt: string
}

export interface Employee extends NamedLookup<EmployeeId> {
  teamIds: TeamId[]
  avatarUrl?: string
}

export type Team = NamedLookup<TeamId>
export interface Platform extends NamedLookup<PlatformId> {
  icon: string
}
export interface Tag extends NamedLookup<TagId> {
  color: "blue" | "amber" | "red" | "green" | "violet" | "slate"
}

export interface Attachment {
  id: string
  kind: AttachmentKind
  fileName: string
  /** Unknown for inbound provider attachments the server never measured. */
  sizeBytes?: number
  url?: string
  durationSeconds?: number
  placeholder?: boolean
}

export interface Message {
  id: MessageId
  conversationId: ConversationId
  direction: "incoming" | "outgoing"
  authorType: "customer" | "human-agent" | "ai-agent"
  senderName: string
  body: string
  sentAt: string
  delivery:
    | "received"
    | "queued"
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | "suppressed"
  attachments: Attachment[]
}

export interface InternalNote {
  id: NoteId
  conversationId: ConversationId
  authorEmployeeId: EmployeeId
  authorName: string
  content: string
  createdAt: string
  updatedAt?: string
}

export interface AssignmentSnapshot {
  employeeId: EmployeeId | null
  teamId: TeamId | null
}

export interface AssignmentHistoryEvent {
  id: string
  conversationId: ConversationId
  previous: AssignmentSnapshot
  next: AssignmentSnapshot
  actorName: string
  occurredAt: string
}

export interface SystemEvent {
  id: string
  conversationId: ConversationId
  label: string
  actorName: string
  occurredAt: string
}

export interface Conversation {
  id: ConversationId
  customerId: CustomerId
  platformId: PlatformId
  status: ConversationStatus
  assignedEmployeeId: EmployeeId | null
  assignedTeamId: TeamId | null
  tagIds: TagId[]
  unreadCount: number
  lastMessage: string
  lastActivityAt: string
  messages: Message[]
  notes: InternalNote[]
  assignmentHistory: AssignmentHistoryEvent[]
  systemEvents: SystemEvent[]
  deletedAt?: string
  previousStatus?: ConversationStatus
  version: number
}
