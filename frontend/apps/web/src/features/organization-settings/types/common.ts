export type Brand<T, Name extends string> = T & { readonly __brand: Name }
export type EntityId = Brand<string, "EntityId">
export type EntityStatus = "active" | "inactive" | "archived"

export interface AuditMetadata {
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

export interface BaseEntity extends AuditMetadata {
  id: EntityId
  organizationId: string
  version: number
}

export interface ContactPoint {
  id: string
  type: "phone" | "email"
  label: string
  value: string
  isPrimary: boolean
}

export interface FileAsset {
  id: string
  fileName: string
  mimeType: "image/jpeg" | "image/png" | "image/webp"
  size: number
  url: string
}

export interface StatusDefinition {
  id: string
  entityKind: string
  labelAr: string
  labelEn: string
  behavior: EntityStatus
  colorToken: "success" | "warning" | "neutral"
  sortOrder: number
  selectable: boolean
}

export interface ListQuery {
  search?: string
  status?: EntityStatus | "all"
  sort?: string
  direction?: "asc" | "desc"
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface LookupOption {
  value: string
  label: string
}
