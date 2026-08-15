import type {
  ActivationReadiness,
  ConfigStatus,
  EnrollmentEligibility,
  PaginatedResult,
  ProductListQuery,
} from "../types/common"
import type { CatalogLookups } from "../types/configuration"
import type {
  Category,
  LifecycleEvent,
  ProductDetail,
  ProductSummary,
  ProductType,
} from "../types/domain"
import type {
  CategoryInput,
  CreateProductCommand,
  ProductTypeInput,
  TaxonomyStatusCommand,
  TransitionProductCommand,
  UpdateProductCommand,
} from "../types/commands"

export interface TaxonomyListQuery {
  search?: string
  status?: ConfigStatus | "all"
  page: number
  pageSize: number
}
export interface AcademicCatalogService {
  getLookups(): Promise<CatalogLookups>
  listProductTypes(
    query: TaxonomyListQuery
  ): Promise<PaginatedResult<ProductType>>
  createProductType(input: ProductTypeInput): Promise<ProductType>
  updateProductType(
    id: string,
    input: ProductTypeInput & { expectedVersion: number }
  ): Promise<ProductType>
  changeProductTypeStatus(command: TaxonomyStatusCommand): Promise<ProductType>
  listCategories(query: TaxonomyListQuery): Promise<PaginatedResult<Category>>
  createCategory(input: CategoryInput): Promise<Category>
  updateCategory(
    id: string,
    input: CategoryInput & { expectedVersion: number }
  ): Promise<Category>
  changeCategoryStatus(command: TaxonomyStatusCommand): Promise<Category>
  listProducts(
    query: ProductListQuery,
    signal?: AbortSignal
  ): Promise<PaginatedResult<ProductSummary>>
  getProduct(id: string): Promise<ProductDetail>
  createDraft(input: CreateProductCommand): Promise<ProductDetail>
  updateProduct(input: UpdateProductCommand): Promise<ProductDetail>
  transitionProduct(command: TransitionProductCommand): Promise<ProductDetail>
  getActivationReadiness(id: string): Promise<ActivationReadiness>
  getEligibility(id: string, branchId: string): Promise<EnrollmentEligibility>
  getLifecycleHistory(id: string): Promise<LifecycleEvent[]>
}
