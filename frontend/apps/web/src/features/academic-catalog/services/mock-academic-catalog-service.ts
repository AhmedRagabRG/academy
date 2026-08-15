import { compare } from "@/shared/utils/money"
import {
  catalogLookups,
  categories as categorySeed,
  products as productSeed,
  productTypes as typeSeed,
  buildScaleProducts,
} from "../data/catalog-fixtures"
import type {
  AcademicProduct,
  Category,
  ProductDetail,
  ProductSummary,
  ProductType,
} from "../types/domain"
import type { CatalogId, ConfigStatus, PaginatedResult } from "../types/common"
import type {
  AcademicCatalogService,
  TaxonomyListQuery,
} from "./academic-catalog-service"
import { AcademicCatalogError } from "./academic-catalog-error"
import { catalogMockScenarios } from "./mock-scenario-controller"
import {
  allowedTransitions,
  getActivationReadiness,
  getEligibility,
  normalizeProductCode,
} from "../utils/catalog-rules"

const clone = <T>(value: T): T => structuredClone(value)
let types = clone(typeSeed),
  categories = clone(categorySeed),
  products = clone(productSeed)
const now = () => new Date().toISOString()
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}` as CatalogId
async function prepare() {
  await catalogMockScenarios.wait()
  const mode = catalogMockScenarios.get()
  if (mode === "forbidden")
    throw new AcademicCatalogError(
      "FORBIDDEN",
      "forbidden",
      "لا تملك صلاحية تنفيذ هذا الإجراء"
    )
  if (mode === "unavailable")
    throw new AcademicCatalogError(
      "UNAVAILABLE",
      "unavailable",
      "الخدمة غير متاحة حاليًا",
      undefined,
      true
    )
  if (mode === "error")
    throw new AcademicCatalogError(
      "UNEXPECTED",
      "unexpected",
      "تعذر إكمال الطلب",
      undefined,
      true
    )
  if (mode === "conflict")
    throw new AcademicCatalogError(
      "CONFLICT_VERSION",
      "conflict",
      "تم تحديث السجل في جلسة أخرى"
    )
  if (mode === "duplicate") throw new AcademicCatalogError("CONFLICT_CODE", "duplicate", "رمز المنتج مستخدم مسبقًا", { code: "رمز المنتج مستخدم مسبقًا" })
  if (mode === "dependency") throw new AcademicCatalogError("DEPENDENCY_INACTIVE", "dependency", "أحد السجلات المرتبطة غير نشط")
  if (mode === "transition") throw new AcademicCatalogError("TRANSITION_INVALID", "transition", "الانتقال المطلوب غير متاح")
  if (mode === "activation") throw new AcademicCatalogError("ACTIVATION_INCOMPLETE", "dependency", "أكمل متطلبات التفعيل")
  if (mode === "asset") throw new AcademicCatalogError("ASSET_SIZE", "asset", "الملف يتجاوز الحد المسموح")
  return mode
}
const page = <T>(
  items: T[],
  current: number,
  pageSize: number
): PaginatedResult<T> => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safe = Math.min(Math.max(1, current), totalPages)
  return {
    items: items.slice((safe - 1) * pageSize, safe * pageSize),
    total: items.length,
    page: safe,
    pageSize,
    totalPages,
  }
}
const details = (product: AcademicProduct): ProductDetail => ({
  ...clone(product),
  typeName:
    types.find((item) => item.id === product.productTypeId)?.nameAr ??
    "نوع غير متاح",
  categoryName:
    categories.find((item) => item.id === product.categoryId)?.nameAr ??
    "تصنيف غير متاح",
  departmentName: catalogLookups.departments.find(
    (item) => item.value === product.departmentId
  )?.label,
})
const summary = (product: AcademicProduct): ProductSummary => ({
  id: product.id,
  officialName: product.officialName,
  nameAr: product.nameAr,
  code: product.code,
  typeName:
    types.find((item) => item.id === product.productTypeId)?.nameAr ?? "—",
  categoryName:
    categories.find((item) => item.id === product.categoryId)?.nameAr ?? "—",
  departmentName: catalogLookups.departments.find(
    (item) => item.value === product.departmentId
  )?.label,
  basePrice: product.pricing.basePrice,
  status: product.status,
  branchCount: new Set(product.branches.map((item) => item.branchId)).size,
  updatedAt: product.updatedAt,
  version: product.version,
  batchable:
    types.find((item) => item.id === product.productTypeId)?.batchable ?? false,
})
function assertVersion(record: { version: number }, expected: number) {
  if (record.version !== expected)
    throw new AcademicCatalogError(
      "CONFLICT_VERSION",
      "conflict",
      "تم تحديث السجل في جلسة أخرى"
    )
}
function assertCode(code: string, ignored?: string) {
  const normalized = normalizeProductCode(code)
  if (
    products.some(
      (item) =>
        item.id !== ignored && normalizeProductCode(item.code) === normalized
    )
  )
    throw new AcademicCatalogError(
      "CONFLICT_CODE",
      "duplicate",
      "رمز المنتج مستخدم مسبقًا",
      { code: "رمز المنتج مستخدم مسبقًا" }
    )
}
function listTaxonomy<T extends ProductType | Category>(
  items: T[],
  query: TaxonomyListQuery
) {
  const search = query.search?.trim().toLocaleLowerCase("ar") ?? ""
  return page(
    items.filter(
      (item) =>
        (!search ||
          `${item.nameAr} ${item.nameEn}`
            .toLocaleLowerCase("ar")
            .includes(search)) &&
        (!query.status ||
          query.status === "all" ||
          item.status === query.status)
    ),
    query.page,
    query.pageSize
  )
}
function setTaxonomyStatus<T extends ProductType | Category>(
  items: T[],
  command: { id: string; status: ConfigStatus; expectedVersion: number }
) {
  const index = items.findIndex((item) => item.id === command.id)
  if (index < 0)
    throw new AcademicCatalogError("NOT_FOUND", "not-found", "السجل غير موجود")
  const current = items[index]!
  assertVersion(current, command.expectedVersion)
  const next = {
    ...current,
    status: command.status,
    version: current.version + 1,
    updatedAt: now(),
    updatedBy: "admin-1",
  }
  items[index] = next
  return clone(next)
}

export const academicCatalogService: AcademicCatalogService & {
  reset(): void
} = {
  async getLookups() {
    await prepare()
    return clone(catalogLookups)
  },
  async listProductTypes(query) {
    const mode = await prepare()
    return mode === "empty"
      ? page([], 1, query.pageSize)
      : clone(listTaxonomy(types, query))
  },
  async createProductType(input) {
    await prepare()
    const stamp = now()
    const record: ProductType = {
      ...input,
      id: id("type"),
      organizationId: "org-1",
      status: "active",
      // Batching follows a type's fixed identity, which only the seeded types
      // carry; an authored type is never batchable.
      batchable: false,
      version: 1,
      createdAt: stamp,
      updatedAt: stamp,
      createdBy: "admin-1",
      updatedBy: "admin-1",
    }
    types.push(record)
    return clone(record)
  },
  async updateProductType(recordId, input) {
    await prepare()
    const index = types.findIndex((item) => item.id === recordId)
    if (index < 0)
      throw new AcademicCatalogError(
        "NOT_FOUND",
        "not-found",
        "السجل غير موجود"
      )
    assertVersion(types[index]!, input.expectedVersion)
    types[index] = {
      ...types[index]!,
      ...input,
      id: types[index]!.id,
      version: types[index]!.version + 1,
      updatedAt: now(),
    }
    return clone(types[index]!)
  },
  async changeProductTypeStatus(command) {
    await prepare()
    return setTaxonomyStatus(types, command)
  },
  async listCategories(query) {
    const mode = await prepare()
    return mode === "empty"
      ? page([], 1, query.pageSize)
      : clone(listTaxonomy(categories, query))
  },
  async createCategory(input) {
    await prepare()
    const stamp = now()
    const record: Category = {
      ...input,
      id: id("category"),
      organizationId: "org-1",
      status: "active",
      version: 1,
      createdAt: stamp,
      updatedAt: stamp,
      createdBy: "admin-1",
      updatedBy: "admin-1",
    }
    categories.push(record)
    return clone(record)
  },
  async updateCategory(recordId, input) {
    await prepare()
    const index = categories.findIndex((item) => item.id === recordId)
    if (index < 0)
      throw new AcademicCatalogError(
        "NOT_FOUND",
        "not-found",
        "السجل غير موجود"
      )
    assertVersion(categories[index]!, input.expectedVersion)
    categories[index] = {
      ...categories[index]!,
      ...input,
      id: categories[index]!.id,
      version: categories[index]!.version + 1,
      updatedAt: now(),
    }
    return clone(categories[index]!)
  },
  async changeCategoryStatus(command) {
    await prepare()
    return setTaxonomyStatus(categories, command)
  },
  async listProducts(query, signal) {
    const mode = await prepare()
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")
    if (mode === "empty") return page([], 1, query.pageSize)
    const search = query.search?.trim().toLocaleLowerCase("ar") ?? ""
    let result = (mode === "scale" ? buildScaleProducts() : products).filter(
      (product) =>
        (!search ||
          `${product.officialName} ${product.nameAr} ${product.nameEn} ${product.code}`
            .toLocaleLowerCase("ar")
            .includes(search)) &&
        (!query.typeIds?.length ||
          query.typeIds.includes(product.productTypeId)) &&
        (!query.categoryIds?.length ||
          query.categoryIds.includes(product.categoryId)) &&
        (!query.departmentIds?.length ||
          (product.departmentId &&
            query.departmentIds.includes(product.departmentId))) &&
        (!query.branchIds?.length ||
          product.branches.some((item) =>
            query.branchIds!.includes(item.branchId)
          )) &&
        (!query.statuses?.length || query.statuses.includes(product.status))
    )
    const direction = query.direction === "asc" ? 1 : -1
    /**
     * Price sorts numerically, every other field lexicographically.
     *
     * Comparing prices as text ordered "18000.00" before "9500.00", because "1"
     * precedes "9" — so the cheapest product was not first. `compare` works in
     * integer minor units, which is the only ordering that agrees with the value.
     */
    const textOf = (product: AcademicProduct) =>
      query.sort === "code"
        ? product.code
        : query.sort === "name"
          ? product.officialName
          : product.updatedAt
    result = [...result].sort((a, b) => {
      const ordering =
        query.sort === "price"
          ? compare(a.pricing.basePrice, b.pricing.basePrice)
          : textOf(a).localeCompare(textOf(b), "ar")
      return ordering * direction || a.id.localeCompare(b.id)
    })
    return clone(page(result.map(summary), query.page, query.pageSize))
  },
  async getProduct(recordId) {
    await prepare()
    const product = products.find((item) => item.id === recordId)
    if (!product)
      throw new AcademicCatalogError(
        "NOT_FOUND",
        "not-found",
        "المنتج غير موجود"
      )
    return details(product)
  },
  async createDraft(input) {
    await prepare()
    assertCode(input.code)
    const stamp = now()
    const product: AcademicProduct = {
      ...clone(input),
      code: normalizeProductCode(input.code),
      id: id("product"),
      organizationId: "org-1",
      status: "draft",
      lifecycle: [
        {
          id: id("event"),
          from: null,
          to: "draft",
          actorId: "admin-1",
          at: stamp,
          version: 1,
        },
      ],
      version: 1,
      createdAt: stamp,
      updatedAt: stamp,
      createdBy: "admin-1",
      updatedBy: "admin-1",
    }
    products.push(product)
    return details(product)
  },
  async updateProduct(input) {
    await prepare()
    const index = products.findIndex((item) => item.id === input.id)
    if (index < 0)
      throw new AcademicCatalogError(
        "NOT_FOUND",
        "not-found",
        "المنتج غير موجود"
      )
    const current = products[index]!
    if (current.status === "archived")
      throw new AcademicCatalogError(
        "ARCHIVED_READ_ONLY",
        "transition",
        "المنتج المؤرشف للقراءة فقط"
      )
    assertVersion(current, input.expectedVersion)
    if (
      current.codeLockedAt &&
      normalizeProductCode(input.code) !== current.code
    )
      throw new AcademicCatalogError(
        "CODE_LOCKED",
        "validation",
        "لا يمكن تغيير الرمز بعد التفعيل",
        { code: "الرمز مقفل بعد التفعيل" }
      )
    assertCode(input.code, current.id)
    products[index] = {
      ...current,
      ...clone(input),
      id: current.id,
      code: normalizeProductCode(input.code),
      version: current.version + 1,
      updatedAt: now(),
      updatedBy: "admin-1",
    }
    return details(products[index]!)
  },
  async transitionProduct(command) {
    await prepare()
    const index = products.findIndex((item) => item.id === command.id)
    if (index < 0)
      throw new AcademicCatalogError(
        "NOT_FOUND",
        "not-found",
        "المنتج غير موجود"
      )
    const current = products[index]!
    assertVersion(current, command.expectedVersion)
    if (!allowedTransitions[current.status].includes(command.toStatus))
      throw new AcademicCatalogError(
        "TRANSITION_INVALID",
        "transition",
        "الانتقال المطلوب غير متاح"
      )
    if (command.toStatus === "active") {
      const readiness = getActivationReadiness(
        current,
        types.find((item) => item.id === current.productTypeId),
        catalogLookups
      )
      if (!readiness.ready)
        throw new AcademicCatalogError(
          "ACTIVATION_INCOMPLETE",
          "dependency",
          "أكمل متطلبات التفعيل",
          Object.fromEntries(
            readiness.issues.map((item) => [item.field, item.message])
          )
        )
    }
    const stamp = now()
    const nextVersion = current.version + 1
    const next = {
      ...current,
      status: command.toStatus,
      codeLockedAt:
        current.codeLockedAt ??
        (command.toStatus === "active" ? stamp : undefined),
      version: nextVersion,
      updatedAt: stamp,
      lifecycle: [
        ...current.lifecycle,
        {
          id: id("event"),
          from: current.status,
          to: command.toStatus,
          reason: command.reason,
          actorId: "admin-1",
          at: stamp,
          version: nextVersion,
        },
      ],
    }
    products[index] = next
    return details(next)
  },
  async getActivationReadiness(recordId) {
    await prepare()
    const product = products.find((item) => item.id === recordId)
    if (!product)
      throw new AcademicCatalogError(
        "NOT_FOUND",
        "not-found",
        "المنتج غير موجود"
      )
    return getActivationReadiness(
      product,
      types.find((item) => item.id === product.productTypeId),
      catalogLookups
    )
  },
  async getEligibility(recordId, branchId) {
    await prepare()
    const product = products.find((item) => item.id === recordId)
    if (!product)
      throw new AcademicCatalogError(
        "NOT_FOUND",
        "not-found",
        "المنتج غير موجود"
      )
    return getEligibility(product, branchId, catalogLookups)
  },
  async getLifecycleHistory(recordId) {
    return (await this.getProduct(recordId)).lifecycle
  },
  reset() {
    types = clone(typeSeed)
    categories = clone(categorySeed)
    products = clone(productSeed)
    catalogMockScenarios.reset()
  },
}
