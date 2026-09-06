import type { Attachment } from "./domain"
import type {
  ConversationId,
  ConversationStatus,
  EmployeeId,
  SavedViewKey,
  SortMode,
  TagId,
  TeamId,
} from "./common"

export interface InboxListQuery {
  search: string
  view: SavedViewKey
  platforms: string[]
  statuses: ConversationStatus[]
  employeeIds: EmployeeId[]
  teamIds: TeamId[]
  tagIds: TagId[]
  unreadOnly: boolean
  sort: SortMode
  cursor?: string | null
  limit: number
}

export interface ReplyCommand {
  conversationId: ConversationId
  body: string
  attachments: Attachment[]
  retryToken: string
}
export interface AssignmentCommand {
  conversationId: ConversationId
  employeeId: EmployeeId | null
  teamId: TeamId | null
}
