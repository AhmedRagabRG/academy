import type {
  ActivationReadiness,
  EnrollmentEligibility,
  LookupOption,
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
import { AcademicCatalogError } from "./academic-catalog-error"
import type {
  AcademicCatalogService,
  TaxonomyListQuery,
} from "./academic-catalog-service"
import {
  toApiProductStatus,
  toApiProductTypeFields,
  toCategory,
  toCategoryCode,
  toEligibility,
  toLifecycleEvent,
  toPaginated,
  toProductBody,
  toProductDetail,
  toProductSummary,
  toProductType,
  type ApiCategory,
  type ApiLifecycleEvent,
  type ApiProduct,
  type ApiProductType,
} from "./academic-catalog-mapper"
import { ApiError, httpClient, type QueryValue } from "@/shared/api"

/** Currency defaults for a draft that has no pricing row yet. */
const FALLBACK_CURRENCY = "EGP"
const FALLBACK_PRECISION = 2

function toCatalogError(error: unknown): AcademicCatalogError {
  if (!(error instanceof ApiError))
    return new AcademicCatalogError(
      "unexpected",
      "unexpected",
      "تعذر إكمال الطلب. حاول مرة أخرى.",
      undefined,
      true
    )

  const { code, status, message, fieldErrors } = error
  if (code === "VERSION_CONFLICT")
    return new AcademicCatalogError("version-conflict", "conflict", message, fieldErrors)
  if (code === "DUPLICATE_VALUE")
    return new AcademicCatalogError("duplicate", "duplicate", message, fieldErrors)
  if (code === "INVALID_TRANSITION")
    return new AcademicCatalogError("invalid-transition", "transition", message, fieldErrors)
  if (code === "NOT_READY")
    return new AcademicCatalogError("not-ready", "transition", message, fieldErrors)
  if (code === "CODE_LOCKED")
    return new AcademicCatalogError("code-locked", "validation", message, fieldErrors)
  if (code === "FILE_TOO_LARGE" || code === "UNSUPPORTED_FILE_TYPE" || code === "file-unreadable")
    return new AcademicCatalogError(code, "asset", message, fieldErrors)
  if (code === "DEPENDENCY_IN_USE" || code === "ENTITY_IN_USE" || code === "DEPENDENCY_NOT_FOUND")
    return new AcademicCatalogError(code, "dependency", message, fieldErrors)
  if (code === "VALIDATION_ERROR" || status === 422)
    return new AcademicCatalogError("validation", "validation", message, fieldErrors)
  if (status === 404)
    return new AcademicCatalogError("not-found", "not-found", message)
  if (status === 401 || status === 403)
    return new AcademicCatalogError("forbidden", "forbidden", message)
  if (status === 409)
    return new AcademicCatalogError(code, "conflict", message, fieldErrors)
  if (status === 0 || status >= 500)
    return new AcademicCatalogError(code, "unavailable", message, fieldErrors, true)
  return new AcademicCatalogError(code, "unexpected", message, fieldErrors)
}

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw toCatalogError(error)
  }
}

const taxonomyParams = (query: TaxonomyListQuery): Record<string, QueryValue> => ({
  page: query.page,
  pageSize: query.pageSize,
  ...(query.search ? { search: query.search } : {}),
  ...(query.status ? { status: query.status === "all" ? "ALL" : query.status } : {}),
})

const productParams = (query: ProductListQuery): Record<string, QueryValue> => ({
  page: query.page,
  pageSize: query.pageSize,
  ...(query.search ? { search: query.search } : {}),
  ...(query.typeIds?.length ? { typeIds: query.typeIds } : {}),
  ...(query.categoryIds?.length ? { categoryIds: query.categoryIds } : {}),
  ...(query.departmentIds?.length ? { departmentIds: query.departmentIds } : {}),
  ...(query.branchIds?.length ? { branchIds: query.branchIds } : {}),
  ...(query.statuses?.length
    ? { statuses: query.statuses.map(toApiProductStatus) }
    : {}),
  ...(query.sort ? { sort: query.sort } : {}),
  ...(query.direction ? { sortOrder: query.direction } : {}),
})

interface ApiCatalogLookups {
  branches: Array<{ id: string; label: string; active: boolean }>
  departments: Array<{ id: string; label: string; active: boolean }>
  categories: Array<{ id: string; label: string; active: boolean }>
  studyModes: Array<{ id: string; label: string; active: boolean }>
  durationUnits: Array<{ id: string; label: string; active: boolean }>
  currencies: string[]
  productStatuses: string[]
}

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  active: "نشط",
  hidden: "مخفي",
  closed: "مغلق",
  archived: "مؤرشف",
}

const options = (
  entries: Array<{ id: string; label: string; active: boolean }> | undefined
): LookupOption[] =>
  (entries ?? []).map((entry) => ({
    value: entry.id,
    label: entry.label,
    status: entry.active ? ("active" as const) : ("inactive" as const),
  }))

export const httpAcademicCatalogService: AcademicCatalogService = {
  async getLookups(): Promise<CatalogLookups> {
    return guard(async () => {
      const lookups = await httpClient.get<ApiCatalogLookups>("/catalog/lookups")
      const currency = lookups.currencies?.[0] ?? FALLBACK_CURRENCY
      return {
        currencies: (lookups.currencies ?? []).map((code) => ({
          value: code,
          label: code,
        })),
        durationUnits: options(lookups.durationUnits),
        studyModes: options(lookups.studyModes),
        branches: options(lookups.branches),
        departments: options(lookups.departments),
        statuses: (lookups.productStatuses ?? []).map((status) => {
          const value = status.toLowerCase()
          return { value, label: PRODUCT_STATUS_LABELS[value] ?? value }
        }),
        // The API exposes no media policy route; these limits mirror what the
        // upload endpoints enforce server-side.
        mediaPolicy: {
          imageTypes: ["image/jpeg", "image/png", "image/webp"],
          brochureTypes: ["application/pdf"],
          imageMaxSize: 5_000_000,
          brochureMaxSize: 10_000_000,
          galleryMaxCount: 8,
        },
        configStatuses: [
          { value: "active", label: "نشط" },
          { value: "inactive", label: "غير نشط" },
          { value: "archived", label: "مؤرشف" },
        ],
        currency,
        precision: FALLBACK_PRECISION,
      }
    })
  },

  async listProductTypes(
    query: TaxonomyListQuery
  ): Promise<PaginatedResult<ProductType>> {
    return guard(async () =>
      toPaginated(
        await httpClient.getPage<ApiProductType>(
          "/catalog/product-types",
          taxonomyParams(query)
        ),
        toProductType
      )
    )
  },

  /**
   * Product types are seeded, not authored.
   *
   * Each type is bound to a fixed `identity` the backend keys behaviour off
   * (only `PROFESSIONAL_PROGRAM` supports batches), so the API deliberately
   * exposes no create route. Failing loudly here beats a request that would
   * 404 with nothing to explain it.
   */
  async createProductType(_input: ProductTypeInput): Promise<ProductType> {
    throw new AcademicCatalogError(
      "unsupported",
      "forbidden",
      "أنواع المنتجات معرّفة في النظام ولا يمكن إنشاء نوع جديد."
    )
  },

  async updateProductType(
    id: string,
    input: ProductTypeInput & { expectedVersion: number }
  ): Promise<ProductType> {
    return guard(async () =>
      toProductType(
        await httpClient.patch<ApiProductType>(`/catalog/product-types/${id}`, {
          expectedVersion: input.expectedVersion,
          nameAr: input.nameAr,
          nameEn: input.nameEn,
          description: input.description,
          fields: toApiProductTypeFields(input.fields),
        })
      )
    )
  },

  async changeProductTypeStatus(
    command: TaxonomyStatusCommand
  ): Promise<ProductType> {
    return guard(async () =>
      toProductType(
        await httpClient.patch<ApiProductType>(
          `/catalog/product-types/${command.id}/status`,
          {
            status: command.status.toUpperCase(),
            expectedVersion: command.expectedVersion,
          }
        )
      )
    )
  },

  async listCategories(
    query: TaxonomyListQuery
  ): Promise<PaginatedResult<Category>> {
    return guard(async () =>
      toPaginated(
        await httpClient.getPage<ApiCategory>(
          "/catalog/categories",
          taxonomyParams(query)
        ),
        toCategory
      )
    )
  },

  async createCategory(input: CategoryInput): Promise<Category> {
    return guard(async () =>
      toCategory(
        await httpClient.post<ApiCategory>("/catalog/categories", {
          name: input.nameAr,
          code: toCategoryCode(input.nameEn),
          sortOrder: 0,
        })
      )
    )
  },

  async updateCategory(
    id: string,
    input: CategoryInput & { expectedVersion: number }
  ): Promise<Category> {
    return guard(async () =>
      toCategory(
        await httpClient.patch<ApiCategory>(`/catalog/categories/${id}`, {
          expectedVersion: input.expectedVersion,
          name: input.nameAr,
        })
      )
    )
  },

  async changeCategoryStatus(command: TaxonomyStatusCommand): Promise<Category> {
    return guard(async () =>
      toCategory(
        await httpClient.patch<ApiCategory>(
          `/catalog/categories/${command.id}/status`,
          { status: command.status, expectedVersion: command.expectedVersion }
        )
      )
    )
  },

  async listProducts(
    query: ProductListQuery,
    signal?: AbortSignal
  ): Promise<PaginatedResult<ProductSummary>> {
    return guard(async () => {
      const page = await httpClient.getPage<ApiProduct>(
        "/catalog/products",
        productParams(query),
        signal
      )
      return toPaginated(page, (row) =>
        toProductSummary(row, {
          currency: FALLBACK_CURRENCY,
          precision: FALLBACK_PRECISION,
        })
      )
    })
  },

  async getProduct(id: string): Promise<ProductDetail> {
    return guard(async () =>
      toProductDetail(await httpClient.get<ApiProduct>(`/catalog/products/${id}`), {
        currency: FALLBACK_CURRENCY,
        precision: FALLBACK_PRECISION,
      })
    )
  },

  async createDraft(input: CreateProductCommand): Promise<ProductDetail> {
    return guard(async () =>
      toProductDetail(
        await httpClient.post<ApiProduct>("/catalog/products", toProductBody(input)),
        { currency: FALLBACK_CURRENCY, precision: FALLBACK_PRECISION }
      )
    )
  },

  async updateProduct(input: UpdateProductCommand): Promise<ProductDetail> {
    return guard(async () =>
      toProductDetail(
        await httpClient.patch<ApiProduct>(`/catalog/products/${input.id}`, {
          ...toProductBody(input),
          expectedVersion: input.expectedVersion,
        }),
        { currency: FALLBACK_CURRENCY, precision: FALLBACK_PRECISION }
      )
    )
  },

  async transitionProduct(
    command: TransitionProductCommand
  ): Promise<ProductDetail> {
    return guard(async () =>
      toProductDetail(
        await httpClient.patch<ApiProduct>(
          `/catalog/products/${command.id}/status`,
          {
            toStatus: toApiProductStatus(command.toStatus),
            expectedVersion: command.expectedVersion,
            ...(command.reason ? { reason: command.reason } : {}),
          }
        ),
        { currency: FALLBACK_CURRENCY, precision: FALLBACK_PRECISION }
      )
    )
  },

  async getActivationReadiness(id: string): Promise<ActivationReadiness> {
    return guard(async () => {
      const readiness = await httpClient.get<{
        ready: boolean
        issues: Array<{ section?: string; field?: string; message: string }>
        version: number
      }>(`/catalog/products/${id}/readiness`)
      return {
        ready: readiness.ready,
        version: readiness.version,
        issues: (readiness.issues ?? []).map((issue) => ({
          section: issue.section ?? "general",
          field: issue.field ?? "",
          message: issue.message,
        })),
      }
    })
  },

  async getEligibility(
    id: string,
    branchId: string
  ): Promise<EnrollmentEligibility> {
    return guard(async () =>
      toEligibility(
        await httpClient.get<{ eligible: boolean; reason: string }>(
          `/catalog/products/${id}/eligibility`,
          { branchId }
        )
      )
    )
  },

  async getLifecycleHistory(id: string): Promise<LifecycleEvent[]> {
    return guard(async () => {
      const events = await httpClient.get<ApiLifecycleEvent[]>(
        `/catalog/products/${id}/lifecycle`
      )
      return (events ?? []).map(toLifecycleEvent)
    })
  },
}
