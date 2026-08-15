export type Brand<T, Name extends string> = T & { readonly __brand: Name }

export type StudentId = Brand<string, "StudentId">
export type StudentEnrollmentId = Brand<string, "StudentEnrollmentId">
export type StudentDocumentId = Brand<string, "StudentDocumentId">
export type StudentDocumentVersionId = Brand<
  string,
  "StudentDocumentVersionId"
>
export type StudentNoteId = Brand<string, "StudentNoteId">
export type StudentTimelineEventId = Brand<string, "StudentTimelineEventId">
export type StudentStatusChangeId = Brand<string, "StudentStatusChangeId">
export type StudentIntakeId = Brand<string, "StudentIntakeId">

export type StudentStatus =
  | "active"
  | "suspended"
  | "graduated"
  | "withdrawn"
  | "archived"

export type EnrollmentStatus =
  | "active"
  | "completed"
  | "suspended"
  | "withdrawn"

export type OfferingKind =
  | "professional-program"
  | "professional-diploma"
  | "training-course"

export type DocumentState = "missing" | "present" | "archived"

export type StudentDocumentTypeKey =
  | "personal-photo"
  | "national-id"
  | "parent-national-id"
  | "birth-certificate"
  | "qualification-certificate"
  | "admission-declaration"
  | "additional-attachment"

export type TimelineCategory =
  | "admission-submitted"
  | "admission-approved"
  | "student-created"
  | "enrollment-added"
  | "document-uploaded"
  | "document-replaced"
  | "document-archived"
  | "profile-updated"
  | "status-changed"
  | "financial-event"
  | "academic-event"

export type TimelineOrigin = "admissions" | "students" | "finance" | "academic"

/** Money is carried as a decimal string so totals never drift through float math. */
export interface Money {
  amount: string
  currency: string
  precision: number
}

export interface ActorRef {
  id: string
  name: string
  active: boolean
}

export interface LookupOption {
  value: string
  label: string
  active: boolean
  disabledReason?: string
}

export interface AuditContext {
  createdAt: string
  createdBy: ActorRef
  updatedAt: string
  updatedBy: ActorRef
  /** Optimistic-concurrency token carried by every command. */
  version: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface Cursor<T> {
  items: T[]
  nextCursor?: string
}
