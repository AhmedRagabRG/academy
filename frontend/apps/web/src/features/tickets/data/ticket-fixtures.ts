import type { Ticket, TicketActivity, TicketAttachment, TicketComment } from "../types/domain"
import type { ActivityId, AttachmentId, CommentId, TeamId, TicketId, UserId } from "../types/common"

const now = Date.now()
const hoursAgo = (hours: number) => new Date(now - hours * 3_600_000).toISOString()

// The last column is the branch. A null branch means the ticket belongs to no branch and stays visible —
// and assignable — to everyone, which is the state every ticket predating branches is in.
const definitions = [
  ["TKT-1048", "تحديث بيانات ولي الأمر", "backlog", "medium", "team-support", "employee-demo", "customer-1", "student-1", ["متابعة"], "branch-cairo"],
  ["TKT-1047", "تعذر إتمام تسجيل الدفعة", "todo", "critical", "team-admissions", "employee-sara", "customer-2", "student-2", ["عاجل", "تسجيل"], "branch-giza"],
  ["TKT-1046", "مراجعة طلب خصم الرسوم", "in-progress", "high", "team-finance", "employee-omar", "customer-1", "student-2", ["سداد"], null],
  ["TKT-1045", "انتظار مستند إثبات الهوية", "waiting", "medium", "team-admissions", undefined, "customer-2", "student-1", ["متابعة"], "branch-giza"],
  ["TKT-1044", "طلب تعديل الجدول الدراسي", "review", "high", "team-support", "employee-demo", "customer-1", "student-1", ["جدول"], "branch-cairo"],
  ["TKT-1043", "تأكيد استلام دفعة", "done", "low", "team-finance", "employee-omar", "customer-2", "student-2", ["سداد"], null],
  ["TKT-1042", "تحديث موعد المقابلة", "todo", "medium", "team-admissions", "employee-sara", "customer-1", undefined, ["تسجيل"], "branch-giza"],
  ["TKT-1041", "استفسار عن جدول الدراسة", "backlog", "low", undefined, undefined, "customer-2", "student-2", [], null],
] as const

export const ticketFixtures: Ticket[] = definitions.map((row, index) => ({
  id: `ticket-${index + 1}` as TicketId,
  number: row[0], title: row[1], description: `تفاصيل تشغيلية حول: ${row[1]}. يرجى مراجعة السياق المرتبط واتخاذ الإجراء المناسب.`,
  status: row[2], lastActiveStatus: row[2], priority: row[3],
  teamId: row[4] as TeamId | undefined, employeeId: row[5], customerId: row[6], studentId: row[7], branchId: row[9], conversationId: index < 2 ? `conversation-${index + 1}` : undefined,
  dueAt: index < 5 ? new Date(now + (index - 1) * 86_400_000).toISOString() : undefined, tags: [...row[8]],
  createdBy: "employee-demo" as UserId, createdAt: hoursAgo(72 - index * 6), updatedAt: hoursAgo(index + 1),
  completedAt: row[2] === "done" ? hoursAgo(2) : undefined, version: 1,
}))

export const commentFixtures: TicketComment[] = [
  { id: "comment-1" as CommentId, ticketId: "ticket-1" as TicketId, authorId: "employee-sara" as UserId, authorName: "سارة علي", message: "تم التواصل مع ولي الأمر وننتظر التأكيد.", createdAt: hoursAgo(8) },
  { id: "comment-2" as CommentId, ticketId: "ticket-1" as TicketId, authorId: "employee-demo" as UserId, authorName: "أحمد محمد", message: "سأتابع الطلب اليوم.", createdAt: hoursAgo(4) },
]

export const activityFixtures: TicketActivity[] = ticketFixtures.map((ticket, index) => ({
  id: `activity-${index + 1}` as ActivityId, ticketId: ticket.id, type: "created", actorId: ticket.createdBy,
  actorName: "أحمد محمد", occurredAt: ticket.createdAt, message: "تم إنشاء التذكرة",
}))

export const attachmentFixtures: TicketAttachment[] = [{
  id: "attachment-1" as AttachmentId, ticketId: "ticket-2" as TicketId, name: "اثبات-التسجيل.pdf", mimeType: "application/pdf", sizeBytes: 420_000,
  uploadedBy: "employee-sara" as UserId, uploadedAt: hoursAgo(5),
}]
