export type Brand<T, Name extends string> = T & { readonly __brand: Name }
export type CatalogId = Brand<string, "CatalogId">
export type ProductStatus =
  "draft" | "active" | "hidden" | "closed" | "archived"
export type ConfigStatus = "active" | "inactive" | "archived"
export type BranchRole = "registration" | "study" | "general"

export interface AuditRecord {
  id: CatalogId
  organizationId: string
  version: number
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}
/**
 * Catalog money is the shared value type, not a local one.
 *
 * It carries a **decimal string** amount so no floating-point operator ever
 * touches a price: a catalog price flows into Admissions and then into Student
 * Finance, which derives balances in integer minor units, and a `number` here
 * would put a float at the head of that chain.
 */
export type { Money } from "@/shared/utils/money"
export interface CatalogAsset {
  id: string
  kind: "primary" | "gallery" | "brochure" | "video"
  fileName: string
  mimeType: string
  size: number
  url: string
  label: string
  position: number
}
export interface OrderedText {
  id: string
  title: string
  description?: string
  position: number
  required?: boolean
}
export interface LookupOption {
  value: string
  label: string
  status?: ConfigStatus
}
export interface ProductListQuery {
  search?: string
  typeIds?: string[]
  categoryIds?: string[]
  departmentIds?: string[]
  branchIds?: string[]
  statuses?: ProductStatus[]
  sort?: "name" | "code" | "price" | "updatedAt"
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
export interface ReadinessIssue {
  section: string
  field: string
  message: string
}
export interface ActivationReadiness {
  ready: boolean
  issues: ReadinessIssue[]
  version: number
}
export interface EnrollmentEligibility {
  eligible: boolean
  reason:
    | "eligible"
    | "product-not-active"
    | "branch-inactive"
    | "registration-not-assigned"
}
