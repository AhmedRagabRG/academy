import type { AcademicProduct, Category, ProductType } from "./domain"
import type { ConfigStatus, ProductStatus } from "./common"

export type ProductInput = Pick<
  AcademicProduct,
  | "officialName"
  | "nameAr"
  | "nameEn"
  | "code"
  | "productTypeId"
  | "categoryId"
  | "departmentId"
  | "description"
  | "academic"
  | "pricing"
  | "branches"
  | "content"
>
export type CreateProductCommand = ProductInput
export type UpdateProductCommand = ProductInput & {
  id: string
  expectedVersion: number
}
export interface TransitionProductCommand {
  id: string
  toStatus: ProductStatus
  reason?: string
  expectedVersion: number
}
export type ProductTypeInput = Pick<
  ProductType,
  "nameAr" | "nameEn" | "description" | "fields"
>
export type CategoryInput = Pick<Category, "nameAr" | "nameEn" | "description">
export interface TaxonomyStatusCommand {
  id: string
  status: ConfigStatus
  expectedVersion: number
}
