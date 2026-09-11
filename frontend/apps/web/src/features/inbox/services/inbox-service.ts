import type {
  AssignmentCommand,
  InboxListQuery,
  ReplyCommand,
} from "../types/commands"
import type {
  ConversationStatus,
  CursorPage,
  ConversationId,
  EmployeeId,
  NoteId,
  TagId,
} from "../types/common"
import type {
  ConversationDetail,
  ConversationView,
  InboxDashboard,
} from "../types/projections"
import type { ConversationAiState, InternalNote } from "../types/domain"
import type { Attachment } from "../types/domain"

export interface InboxLookups {
  /**
   * `code` is the stable channel key ('whatsapp', 'messenger', ...) and is what
   * anything configuring per-channel behaviour must use; `id` is only the row
   * key inbox filters pass around.
   */
  platforms: { id: string; code: string; label: string }[]
  statuses: { id: ConversationStatus; label: string }[]
  tags: { id: string; label: string; color: string }[]
  teams: { id: string; label: string }[]
  employees: { id: string; label: string }[]
}
export interface InboxService {
  list(
    query: InboxListQuery,
    signal?: AbortSignal
  ): Promise<CursorPage<ConversationView>>
  detail(id: ConversationId, signal?: AbortSignal): Promise<ConversationDetail>
  markRead(id: ConversationId): Promise<ConversationDetail>
  dashboard(
    query: InboxListQuery,
    signal?: AbortSignal
  ): Promise<InboxDashboard>
  lookups(signal?: AbortSignal): Promise<InboxLookups>
  /**
   * Staging still exists on the backend (`POST /inbox/attachments`) and is
   * contract-tested, but no UI calls it: the composer is text-only because
   * every Meta channel rejects attachments outright.
   */
  stageAttachment(file: File, signal?: AbortSignal): Promise<Attachment>
  sendReply(command: ReplyCommand): Promise<ConversationDetail>
  assign(command: AssignmentCommand): Promise<ConversationDetail>
  changeStatus(
    id: ConversationId,
    status: ConversationStatus
  ): Promise<ConversationDetail>
  toggleTag(id: ConversationId, tagId: TagId): Promise<ConversationDetail>
  archive(id: ConversationId): Promise<ConversationDetail>
  delete(id: ConversationId): Promise<void>
  restore(id: ConversationId): Promise<ConversationDetail>
  setAiMode(
    id: ConversationId,
    action: "pause" | "resume",
    expectedVersion: number
  ): Promise<ConversationAiState>
  addNote(id: ConversationId, content: string): Promise<InternalNote>
  editNote(
    id: ConversationId,
    noteId: NoteId,
    content: string
  ): Promise<InternalNote>
  deleteNote(id: ConversationId, noteId: NoteId): Promise<void>
  setActor(employeeId: EmployeeId): void
  reset(): void
}
