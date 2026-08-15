export type Brand<T, N extends string> = T & { readonly __brand: N }
export type ProgramBatchId = Brand<string, "ProgramBatchId">
export type ProgramId = Brand<string, "ProgramId">
export type FinancialRevisionId = Brand<string, "FinancialRevisionId">
export type BatchStatus =
  | "draft"
  | "registration-open"
  | "registration-closed"
  | "studying"
  | "graduated"
  | "archived"
export type CapacityState =
  "available" | "nearly-full" | "full" | "over-capacity"
export type BranchRole = "registration" | "study"
export interface LocalizedText {
  ar: string
  en?: string
}
/**
 * Batch money is the shared value type.
 *
 * `precision` travels with the amount because a batch price is pinned into an
 * Admissions financial revision and then into a Student Finance invoice, both of
 * which convert to integer minor units — a value without its precision forces
 * those consumers to guess.
 */
export type { Money } from "@/shared/utils/money"
export interface Audit {
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
  version: number
}
export interface Lookup {
  value: string
  label: string
  status?: "active" | "inactive" | "archived"
}
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
