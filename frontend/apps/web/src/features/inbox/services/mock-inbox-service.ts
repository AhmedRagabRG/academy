import { findMockContactByName } from "@/features/contacts/services/mock-contacts-service"
import {
  findMockLeadByContact,
  mockPipelineId,
  mockPipelineStages,
} from "@/features/lead-pipeline/services/mock-pipeline-service"
import {
  conversations as conversationSeeds,
  customers,
} from "../data/inbox-fixtures"
import { employees, platforms, tags, teams } from "../data/inbox-lookups"
import {
  acceptedAttachmentTypes,
  attachmentLimit,
  statusLabels,
} from "../config/inbox-config"
import {
  inboxPermissions,
  type InboxPermission,
} from "../config/inbox-permissions"
import { replySchema, noteSchema } from "../schemas/inbox-schemas"
import type { InboxService, InboxLookups } from "./inbox-service"
import { InboxError } from "./inbox-error"
import { inboxScenarioController } from "./mock-scenario-controller"
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
  TeamId,
} from "../types/common"
import type { Conversation, InternalNote } from "../types/domain"
import type {
  ConversationCrmLink,
  ConversationDetail,
  ConversationView,
  InboxDashboard,
} from "../types/projections"
import { canSee, type InboxActor } from "../utils/inbox-scope"
import { filterConversations } from "../utils/conversation-query"

const allPermissions = new Set(
  Object.values(inboxPermissions)
) as Set<InboxPermission>
const employeeTeams = (id: EmployeeId) =>
  employees.find((employee) => employee.id === id)?.teamIds ?? []

class MockInboxService implements InboxService {
  private rows = structuredClone(conversationSeeds)
  private actor: InboxActor = {
    employeeId: "employee-demo" as EmployeeId,
    teamIds: ["team-admissions" as TeamId],
    permissions: allPermissions,
  }
  private retryTokens = new Set<string>()
  private attachmentSequence = 0

  setActor(employeeId: EmployeeId) {
    const permissions =
      employeeId === "employee-no-access"
        ? new Set<InboxPermission>()
        : employeeId === "employee-omar"
          ? new Set<InboxPermission>([
              inboxPermissions.viewAssigned,
              inboxPermissions.reply,
            ])
          : employeeId === "employee-sara"
            ? new Set<InboxPermission>([
                inboxPermissions.viewTeam,
                inboxPermissions.reply,
                inboxPermissions.manageNotes,
              ])
            : allPermissions
    this.actor = { employeeId, teamIds: employeeTeams(employeeId), permissions }
  }
  reset() {
    this.rows = structuredClone(conversationSeeds)
    this.actor = {
      employeeId: "employee-demo" as EmployeeId,
      teamIds: ["team-admissions" as TeamId],
      permissions: allPermissions,
    }
    this.retryTokens.clear()
    this.attachmentSequence = 0
    inboxScenarioController.reset()
  }

  private visibleRows() {
    return this.rows
      .filter((row) => !row.deletedAt && canSee(row, this.actor))
      .map((row) => this.project(row))
  }
  private find(id: ConversationId) {
    const row = this.rows.find((item) => item.id === id)
    if (!row || row.deletedAt || !canSee(row, this.actor))
      throw new InboxError("NOT_FOUND", "لم تعد المحادثة متاحة")
    return row
  }
  /**
   * Mirrors the API's link between an inbox customer and the CRM. The API
   * matches on channel identity; the fixtures only share names, so a customer
   * whose name has no contact reads as not-yet-linked — which is what the real
   * system shows until an inbound message creates the pair.
   */
  private crmLink(customerName: string): ConversationCrmLink | null {
    const contact = findMockContactByName(customerName)
    if (!contact) return null
    const lead = findMockLeadByContact(contact.id)
    const stage = lead
      ? mockPipelineStages().find((item) => item.id === lead.stageId)
      : undefined
    return {
      contactId: contact.id,
      lead:
        lead && stage
          ? {
              id: lead.id,
              pipelineId: mockPipelineId,
              stageId: stage.id,
              stageRecordId: stage.id,
              stageName: stage.name,
            }
          : null,
    }
  }
  private project(row: Conversation): ConversationDetail {
    const customer = customers.find((item) => item.id === row.customerId)!
    return {
      ...structuredClone(row),
      crm: this.crmLink(customer.name),
      customer,
      platform: platforms.find((item) => item.id === row.platformId)!,
      employee:
        employees.find((item) => item.id === row.assignedEmployeeId) ?? null,
      team: teams.find((item) => item.id === row.assignedTeamId) ?? null,
      tags: tags.filter((tag) => row.tagIds.includes(tag.id)),
    }
  }
  private touch(row: Conversation, label: string) {
    row.version += 1
    row.lastActivityAt = new Date().toISOString()
    row.systemEvents.push({
      id: crypto.randomUUID(),
      conversationId: row.id,
      type: "conversation.updated",
      label,
      actorName: "أحمد محمد",
      occurredAt: row.lastActivityAt,
    })
  }
  private failIfRequested() {
    if (inboxScenarioController.get() === "failure")
      throw new InboxError("VALIDATION", "تعذر تنفيذ العملية التجريبية")
  }

  private require(permission: InboxPermission) {
    if (!this.actor.permissions.has(permission))
      throw new InboxError(
        "FORBIDDEN_ACTION",
        "لا تملك صلاحية تنفيذ هذا الإجراء"
      )
  }

  async list(
    query: InboxListQuery,
    _signal?: AbortSignal
  ): Promise<CursorPage<ConversationView>> {
    void _signal
    this.failIfRequested()
    const visible =
      inboxScenarioController.get() === "empty"
        ? []
        : filterConversations(
            this.visibleRows(),
            query,
            this.actor.employeeId,
            this.actor.teamIds
          )
    const start = Number(query.cursor ?? 0)
    const items = visible.slice(start, start + query.limit)
    return {
      items,
      total: visible.length,
      nextCursor:
        start + query.limit < visible.length
          ? String(start + query.limit)
          : null,
    }
  }
  async detail(id: ConversationId, _signal?: AbortSignal) {
    void _signal
    this.failIfRequested()
    return this.project(this.find(id))
  }
  async markRead(id: ConversationId) {
    const row = this.find(id)
    row.unreadCount = 0
    return this.project(row)
  }
  async dashboard(
    _query: InboxListQuery,
    _signal?: AbortSignal
  ): Promise<InboxDashboard> {
    void _query
    void _signal
    const rows = this.visibleRows()
    const today = new Date().toISOString().slice(0, 10)
    return {
      assigned: rows.filter(
        (row) => row.assignedEmployeeId === this.actor.employeeId
      ).length,
      open: rows.filter((row) => row.status === "open").length,
      pending: rows.filter((row) => row.status === "pending").length,
      unread: rows.filter((row) => row.unreadCount > 0).length,
      closedToday: rows.filter(
        (row) => row.status === "closed" && row.lastActivityAt.startsWith(today)
      ).length,
    }
  }
  async lookups(_signal?: AbortSignal): Promise<InboxLookups> {
    void _signal
    return {
      platforms,
      statuses: Object.entries(statusLabels).map(([id, label]) => ({
        id: id as ConversationStatus,
        label,
      })),
      tags,
      teams,
      employees,
    }
  }
  async stageAttachment(file: File, signal?: AbortSignal) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
    this.require(inboxPermissions.reply)
    if (file.size > attachmentLimit)
      throw new InboxError(
        "UNSUPPORTED_ATTACHMENT",
        "حجم الملف أكبر من الحد المسموح"
      )
    if (!acceptedAttachmentTypes.has(file.type))
      throw new InboxError("UNSUPPORTED_ATTACHMENT", "نوع الملف غير مدعوم")
    const kind = file.type.startsWith("image/")
      ? "image"
      : file.type === "application/pdf"
        ? "pdf"
        : "document"
    this.attachmentSequence += 1
    return {
      id: `mock-attachment-${this.attachmentSequence}`,
      kind: kind as "image" | "pdf" | "document",
      fileName: file.name,
      sizeBytes: file.size,
    }
  }
  async sendReply(command: ReplyCommand) {
    this.require(inboxPermissions.reply)
    const parsed = replySchema.safeParse({
      body: command.body,
      attachmentCount: command.attachments.length,
    })
    if (!parsed.success)
      throw new InboxError(
        "VALIDATION",
        parsed.error.issues[0]?.message ?? "رسالة غير صالحة"
      )
    const row = this.find(command.conversationId)
    if (!this.retryTokens.has(command.retryToken)) {
      this.retryTokens.add(command.retryToken)
      const sentAt = new Date().toISOString()
      row.messages.push({
        id: crypto.randomUUID() as never,
        conversationId: row.id,
        direction: "outgoing",
        authorType: "human-agent",
        senderName: "أحمد محمد",
        body: command.body.trim(),
        sentAt,
        delivery: "sent",
        attachments: command.attachments,
      })
      row.lastMessage =
        command.body.trim() || command.attachments[0]?.fileName || "مرفق"
      row.unreadCount = 0
      this.touch(row, "تم إرسال رد")
    }
    return this.project(row)
  }
  async assign(command: AssignmentCommand) {
    const row = this.find(command.conversationId)
    if (command.employeeId) this.require(inboxPermissions.assignEmployee)
    if (command.teamId) this.require(inboxPermissions.assignTeam)
    if (row.assignedEmployeeId || row.assignedTeamId)
      this.require(inboxPermissions.reassign)
    const previous = {
      employeeId: row.assignedEmployeeId,
      teamId: row.assignedTeamId,
    }
    row.assignedEmployeeId = command.employeeId
    row.assignedTeamId = command.teamId
    row.assignmentHistory.push({
      id: crypto.randomUUID(),
      conversationId: row.id,
      previous,
      next: { employeeId: command.employeeId, teamId: command.teamId },
      actorName: "أحمد محمد",
      occurredAt: new Date().toISOString(),
    })
    this.touch(row, "تم تحديث الإسناد")
    return this.project(row)
  }
  async changeStatus(id: ConversationId, status: ConversationStatus) {
    this.require(inboxPermissions.changeStatus)
    const row = this.find(id)
    row.status = status
    this.touch(row, `تغيرت الحالة إلى ${statusLabels[status]}`)
    return this.project(row)
  }
  async toggleTag(id: ConversationId, tagId: TagId) {
    this.require(inboxPermissions.manageTags)
    const row = this.find(id)
    row.tagIds = row.tagIds.includes(tagId)
      ? row.tagIds.filter((item) => item !== tagId)
      : [...row.tagIds, tagId]
    this.touch(row, "تم تحديث الوسوم")
    return this.project(row)
  }
  async archive(id: ConversationId) {
    this.require(inboxPermissions.archive)
    const row = this.find(id)
    row.previousStatus = row.status
    row.status = "archived"
    this.touch(row, "تمت أرشفة المحادثة")
    return this.project(row)
  }
  async restore(id: ConversationId) {
    this.require(inboxPermissions.restore)
    const row = this.rows.find((item) => item.id === id)
    if (!row) throw new InboxError("NOT_FOUND", "المحادثة غير موجودة")
    row.deletedAt = undefined
    row.status =
      row.previousStatus === "archived"
        ? "open"
        : (row.previousStatus ?? "open")
    this.touch(row, "تمت استعادة المحادثة")
    return this.project(row)
  }
  async setAiMode(
    id: ConversationId,
    action: "pause" | "resume",
    expectedVersion: number
  ) {
    this.require(inboxPermissions.aiControl)
    const row = this.find(id)
    if (!row.ai) throw new InboxError("NOT_FOUND", "حالة المساعد غير موجودة")
    if (row.ai.version !== expectedVersion)
      throw new InboxError("CONFLICT", "تم تعديل حالة المساعد")
    row.ai = {
      ...row.ai,
      mode: action === "pause" ? "paused" : "auto",
      pausedReason: action === "pause" ? "manual" : null,
      pausedAt: action === "pause" ? new Date().toISOString() : null,
      resumeAt: null,
      version: row.ai.version + 1,
    }
    row.systemEvents.push({
      id: crypto.randomUUID(),
      conversationId: row.id,
      type: action === "pause" ? "ai.paused.manual" : "ai.resumed",
      label:
        action === "pause"
          ? "أُوقف المساعد الذكي مؤقتًا"
          : "استؤنف المساعد الذكي",
      actorName: "أحمد محمد",
      occurredAt: new Date().toISOString(),
    })
    return structuredClone(row.ai)
  }
  async addNote(id: ConversationId, content: string) {
    this.require(inboxPermissions.manageNotes)
    const parsed = noteSchema.parse({ content })
    const row = this.find(id)
    const note: InternalNote = {
      id: crypto.randomUUID() as NoteId,
      conversationId: id,
      authorEmployeeId: this.actor.employeeId,
      authorName: "أحمد محمد",
      content: parsed.content,
      createdAt: new Date().toISOString(),
    }
    row.notes.push(note)
    this.touch(row, "أضيفت ملاحظة داخلية")
    return structuredClone(note)
  }
  async editNote(id: ConversationId, noteId: NoteId, content: string) {
    this.require(inboxPermissions.manageNotes)
    const row = this.find(id)
    const note = row.notes.find((item) => item.id === noteId)
    if (!note) throw new InboxError("NOT_FOUND", "الملاحظة غير موجودة")
    if (note.authorEmployeeId !== this.actor.employeeId)
      throw new InboxError("FORBIDDEN_ACTION", "يمكنك تعديل ملاحظاتك فقط")
    note.content = noteSchema.parse({ content }).content
    note.updatedAt = new Date().toISOString()
    return structuredClone(note)
  }
  async deleteNote(id: ConversationId, noteId: NoteId) {
    this.require(inboxPermissions.manageNotes)
    const row = this.find(id)
    const note = row.notes.find((item) => item.id === noteId)
    if (!note) throw new InboxError("NOT_FOUND", "الملاحظة غير موجودة")
    if (note.authorEmployeeId !== this.actor.employeeId)
      throw new InboxError("FORBIDDEN_ACTION", "يمكنك حذف ملاحظاتك فقط")
    row.notes = row.notes.filter((item) => item.id !== noteId)
    this.touch(row, "حُذفت ملاحظة داخلية")
  }

  async delete(id: ConversationId) {
    this.require(inboxPermissions.delete)
    const row = this.find(id)
    row.previousStatus = row.status
    row.deletedAt = new Date().toISOString()
    this.touch(row, "حُذفت المحادثة")
  }
}

export const mockInboxService = new MockInboxService()
