export type Brand<T, Name extends string> = T & { readonly __brand: Name }
export type ConversationId = Brand<string, "ConversationId">
export type CustomerId = Brand<string, "CustomerId">
export type MessageId = Brand<string, "MessageId">
export type NoteId = Brand<string, "NoteId">
export type EmployeeId = Brand<string, "InboxEmployeeId">
export type TeamId = Brand<string, "TeamId">
export type TagId = Brand<string, "TagId">
export type PlatformId = Brand<string, "PlatformId">

export type ConversationStatus =
  "open" | "pending" | "snoozed" | "closed" | "archived"
export type VisibilityScope = "all" | "team" | "assigned" | "none"
export type AttachmentKind = "image" | "pdf" | "document" | "voice" | "video"
export type SortMode = "latest" | "oldest" | "unread"
export type SavedViewKey =
  "all" | "assigned" | "team" | "unassigned" | "closed" | "archived"

export interface CursorPage<T> {
  items: T[]
  nextCursor: string | null
  total: number
}
