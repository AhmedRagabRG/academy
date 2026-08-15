export type Brand<T, N extends string> = T & { readonly __brand: N }
export type TicketId = Brand<string, "TicketId">
export type TeamId = Brand<string, "TeamId">
export type UserId = Brand<string, "UserId">
export type CommentId = Brand<string, "CommentId">
export type ActivityId = Brand<string, "ActivityId">
export type AttachmentId = Brand<string, "AttachmentId">

export type TicketStatus =
  | "backlog"
  | "todo"
  | "in-progress"
  | "waiting"
  | "review"
  | "done"
  | "archived"
export type TicketPriority = "low" | "medium" | "high" | "critical"

export interface CursorPage<T> {
  items: T[]
  nextCursor?: string
  total: number
}
