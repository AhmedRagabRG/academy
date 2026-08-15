import type { ConversationStatus, SavedViewKey } from "../types/common"

export const savedViews: { key: SavedViewKey; label: string }[] = [
  { key: "all", label: "كل المحادثات" },
  { key: "assigned", label: "مسندة إليّ" },
  { key: "team", label: "فريقي" },
  { key: "unassigned", label: "غير مسندة" },
  { key: "closed", label: "مغلقة" },
  { key: "archived", label: "مؤرشفة" },
]
export const statusLabels: Record<ConversationStatus, string> = {
  open: "مفتوحة",
  pending: "قيد الانتظار",
  snoozed: "مؤجلة",
  closed: "مغلقة",
  archived: "مؤرشفة",
}
export const attachmentLimit = 10 * 1024 * 1024
export const acceptedAttachmentTypes = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])
