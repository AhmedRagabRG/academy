import type {
  CatalogId,
  ConfigStatus,
  EnrollmentEligibility,
  Money,
  PaginatedResult,
  ProductStatus,
} from "../types/common"
import type { AcademicFieldDefinition, AcademicFieldKey } from "../types/configuration"
import type {
  AcademicProfile,
  BranchAssignment,
  Category,
  LifecycleEvent,
  PricingProfile,
  ProductContent,
  ProductDetail,
  ProductSummary,
  ProductType,
} from "../types/domain"
import type { Page } from "@/shared/api"

/**
 * Translation between the catalog API and this module's domain types.
 *
 * The API stores a product flat — `durationValue`, `numberOfTerms`,
 * `salesScript` and a single `content` array all sit on the row — while the
 * UI works with the grouped `academic` / `pricing` / `content` profiles the
 * forms are built around. This module owns that regrouping in both directions
 * so neither the screens nor the service body carry it.
 */

const EPOCH = "1970-01-01T00:00:00.000Z"

interface AuditSource {
  organizationId?: string | null
  version: number
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: string | null
  updatedBy?: string | null
}

const audit = (row: AuditSource) => ({
  organizationId: row.organizationId ?? "",
  version: row.version,
  createdAt: row.createdAt ?? EPOCH,
  updatedAt: row.updatedAt ?? row.createdAt ?? EPOCH,
  createdBy: row.createdBy ?? "",
  updatedBy: row.updatedBy ?? row.createdBy ?? "",
})

export const toConfigStatus = (value: string): ConfigStatus => {
  const normalized = value?.toLowerCase()
  return normalized === "active" || normalized === "archived" ? normalized : "inactive"
}

const PRODUCT_STATUSES: ProductStatus[] = [
  "draft",
  "active",
  "hidden",
  "closed",
  "archived",
]

export const toProductStatus = (value: string): ProductStatus => {
  const normalized = value?.toLowerCase() as ProductStatus
  return PRODUCT_STATUSES.includes(normalized) ? normalized : "draft"
}

export const toApiProductStatus = (status: ProductStatus) => status.toUpperCase()

/**
 * Field keys, which the two sides spell differently.
 *
 * The API names count fields after their storage columns (`numberOfTerms`);
 * the UI names them after what they measure (`termCount`). Anything unmapped
 * passes through, so a field added on the backend still renders.
 */
const FIELD_KEYS: Record<string, AcademicFieldKey> = {
  duration: "duration",
  durationUnit: "durationUnit",
  numberOfTerms: "termCount",
  numberOfSessions: "sessionCount",
  numberOfHours: "hourCount",
  studyMode: "studyMode",
  trainingIncluded: "trainingIncluded",
  internshipIncluded: "internshipIncluded",
  certificateIncluded: "certificateIncluded",
  finalProjectRequired: "finalProjectRequired",
}
const API_FIELD_KEYS = Object.fromEntries(
  Object.entries(FIELD_KEYS).map(([api, ui]) => [ui, api])
) as Record<AcademicFieldKey, string>

const FIELD_KINDS: Record<string, AcademicFieldDefinition["kind"]> = {
  NUMBER: "number",
  OPTION: "option",
  REFERENCE: "option",
  BOOLEAN: "boolean",
}

export interface ApiProductType extends AuditSource {
  id: string
  identity: string
  nameAr: string
  nameEn: string
  description: string | null
  status: string
  batchable?: boolean
  fields: Array<{
    key: string
    label: string
    kind: string
    required: boolean
    position: number
  }>
}

export const toProductType = (row: ApiProductType): ProductType => ({
  ...audit(row),
  id: row.id as CatalogId,
  nameAr: row.nameAr,
  nameEn: row.nameEn,
  description: row.description ?? "",
  status: toConfigStatus(row.status),
  fields: (row.fields ?? []).map((field) => ({
    key: (FIELD_KEYS[field.key] ?? field.key) as AcademicFieldKey,
    label: field.label,
    kind: FIELD_KINDS[field.kind] ?? "number",
    required: field.required,
    position: field.position,
  })),
  batchable: row.batchable ?? false,
})

export const toApiProductTypeFields = (fields: AcademicFieldDefinition[]) =>
  fields.map((field) => ({
    key: API_FIELD_KEYS[field.key] ?? field.key,
    label: field.label,
    kind: field.kind === "option" ? "OPTION" : field.kind.toUpperCase(),
    required: field.required,
    position: field.position,
  }))

/**
 * A business category, which the API stores as a value in a lookup group.
 *
 * A lookup value has a `name` and a machine `code` and nothing else, so the
 * Arabic name maps to `name` and the English name to `code`. There is no
 * description column behind this route, so that field stays empty rather than
 * pretending to round-trip.
 */
export interface ApiCategory extends AuditSource {
  id: string
  name: string
  code: string
  sortOrder: number
  status: string
}

export const toCategory = (row: ApiCategory): Category => ({
  ...audit(row),
  id: row.id as CatalogId,
  nameAr: row.name,
  nameEn: row.code,
  description: "",
  status: toConfigStatus(row.status),
})

/** Turns an English name into the slug shape the lookup `code` column accepts. */
export const toCategoryCode = (nameEn: string) =>
  nameEn
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "category"

const zero = (currency: string, precision: number): Money => ({
  amount: "0",
  currency,
  precision,
})

interface ApiMoney {
  amount: string
  currency: string
  precision: number
}

interface ApiPricing {
  currency: string
  precision: number
  basePrice: ApiMoney
  registrationFees: ApiMoney
  certificateFees: ApiMoney
  trainingFees: ApiMoney
  cardFees: ApiMoney
  examFees: ApiMoney
  additionalFees: ApiMoney
  discount: ApiMoney
  scholarship: ApiMoney
  installmentAvailable: boolean
  installmentMinCount: number
  installmentMaxCount: number
  installmentFrequency: "WEEKLY" | "MONTHLY" | "BIMONTHLY"
}

export interface ApiProduct extends AuditSource {
  id: string
  officialName: string
  nameAr: string
  nameEn: string
  code: string
  codeLockedAt: string | null
  productTypeId: string
  categoryId: string
  departmentId: string | null
  description: string | null
  durationValue: number | null
  durationUnitId: string | null
  studyModeId: string | null
  numberOfTerms: number | null
  numberOfSessions: number | null
  numberOfHours: number | null
  internshipIncluded: boolean | null
  trainingIncluded: boolean | null
  finalProjectRequired: boolean | null
  certificateIncluded: boolean | null
  instructorEmployeeId: string | null
  salesScript: string | null
  status: string
  productType?: { nameAr?: string; nameEn?: string; batchable?: boolean } | null
  category?: { label?: string } | null
  department?: { label?: string } | null
  pricing: ApiPricing | null
  branches?: Array<{ branchId: string; role: string }>
  content?: Array<{
    id: string
    kind: string
    title: string
    description: string | null
    required: boolean | null
    position: number
  }>
  lifecycle?: ApiLifecycleEvent[]
}

const toAcademic = (row: ApiProduct): AcademicProfile => ({
  duration: row.durationValue ?? undefined,
  durationUnit: row.durationUnitId ?? undefined,
  termCount: row.numberOfTerms ?? undefined,
  sessionCount: row.numberOfSessions ?? undefined,
  hourCount: row.numberOfHours ?? undefined,
  studyMode: row.studyModeId ?? undefined,
  trainingIncluded: row.trainingIncluded ?? undefined,
  internshipIncluded: row.internshipIncluded ?? undefined,
  certificateIncluded: row.certificateIncluded ?? undefined,
  finalProjectRequired: row.finalProjectRequired ?? undefined,
})

/** A draft may have no pricing row yet; the UI still needs every figure. */
const toPricing = (
  pricing: ApiPricing | null,
  currency: string,
  precision: number
): PricingProfile => {
  const blank = zero(pricing?.currency ?? currency, pricing?.precision ?? precision)
  return {
    basePrice: pricing?.basePrice ?? blank,
    registrationFees: pricing?.registrationFees ?? blank,
    certificateFees: pricing?.certificateFees ?? blank,
    trainingFees: pricing?.trainingFees ?? blank,
    cardFees: pricing?.cardFees ?? blank,
    examFees: pricing?.examFees ?? blank,
    additionalFees: pricing?.additionalFees ?? blank,
    discount: pricing?.discount ?? blank,
    scholarship: pricing?.scholarship ?? blank,
    installmentAvailable: pricing?.installmentAvailable ?? false,
    installmentMinCount: pricing?.installmentMinCount ?? 1,
    installmentMaxCount: pricing?.installmentMaxCount ?? 12,
    installmentFrequency:
      pricing?.installmentFrequency === "WEEKLY"
        ? "weekly"
        : pricing?.installmentFrequency === "BIMONTHLY"
          ? "bimonthly"
          : "monthly",
  }
}

const CONTENT_KINDS = {
  FAQ: "faqs",
  ADMISSION_REQUIREMENT: "admissionRequirements",
  REQUIRED_DOCUMENT: "requiredDocuments",
} as const

const toContent = (row: ApiProduct): ProductContent => {
  const grouped: Pick<
    ProductContent,
    "faqs" | "admissionRequirements" | "requiredDocuments"
  > = { faqs: [], admissionRequirements: [], requiredDocuments: [] }

  for (const entry of row.content ?? []) {
    const bucket = CONTENT_KINDS[entry.kind as keyof typeof CONTENT_KINDS]
    if (!bucket) continue
    grouped[bucket].push({
      id: entry.id,
      title: entry.title,
      description: entry.description ?? undefined,
      position: entry.position,
      required: entry.required ?? undefined,
    })
  }
  for (const bucket of Object.values(grouped))
    bucket.sort((left, right) => left.position - right.position)

  return { ...grouped, salesScript: row.salesScript ?? "" }
}

const toBranches = (row: ApiProduct): BranchAssignment[] =>
  (row.branches ?? []).map((assignment) => ({
    branchId: assignment.branchId,
    role: assignment.role.toLowerCase() as BranchAssignment["role"],
  }))

export interface ApiLifecycleEvent {
  id: string
  fromStatus: string | null
  toStatus: string
  reason: string | null
  actorId: string | null
  resultingVersion: number
  occurredAt: string
}

export const toLifecycleEvent = (event: ApiLifecycleEvent): LifecycleEvent => ({
  id: event.id as CatalogId,
  from: event.fromStatus ? toProductStatus(event.fromStatus) : null,
  to: toProductStatus(event.toStatus),
  reason: event.reason ?? undefined,
  actorId: event.actorId ?? "",
  at: event.occurredAt,
  version: event.resultingVersion,
})

export function toProductDetail(
  row: ApiProduct,
  defaults: { currency: string; precision: number }
): ProductDetail {
  return {
    ...audit(row),
    id: row.id as CatalogId,
    officialName: row.officialName,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    code: row.code,
    codeLockedAt: row.codeLockedAt ?? undefined,
    productTypeId: row.productTypeId,
    categoryId: row.categoryId,
    departmentId: row.departmentId ?? undefined,
    description: row.description ?? "",
    status: toProductStatus(row.status),
    academic: toAcademic(row),
    pricing: toPricing(row.pricing, defaults.currency, defaults.precision),
    branches: toBranches(row),
    content: toContent(row),
    lifecycle: (row.lifecycle ?? []).map(toLifecycleEvent),
    typeName: row.productType?.nameAr ?? "",
    categoryName: row.category?.label ?? "",
    departmentName: row.department?.label ?? undefined,
  }
}

export const toProductSummary = (
  row: ApiProduct,
  defaults: { currency: string; precision: number }
): ProductSummary => ({
  id: row.id as CatalogId,
  officialName: row.officialName,
  nameAr: row.nameAr,
  code: row.code,
  typeName: row.productType?.nameAr ?? "",
  categoryName: row.category?.label ?? "",
  departmentName: row.department?.label ?? undefined,
  basePrice:
    row.pricing?.basePrice ?? zero(defaults.currency, defaults.precision),
  status: toProductStatus(row.status),
  branchCount: row.branches?.length ?? 0,
  updatedAt: row.updatedAt ?? EPOCH,
  version: row.version,
  batchable: row.productType?.batchable ?? false,
})

/** Flattens the grouped product form back into the API's column-shaped body. */
export function toProductBody(input: {
  officialName: string
  nameAr: string
  nameEn: string
  code: string
  productTypeId: string
  categoryId: string
  departmentId?: string
  description: string
  academic: AcademicProfile
  pricing: PricingProfile
  branches: BranchAssignment[]
  content: ProductContent
}): Record<string, unknown> {
  const { academic, pricing, content } = input
  const ordered = (
    entries: ProductContent["faqs"],
    kind: keyof typeof CONTENT_KINDS
  ) =>
    entries.map((entry, index) => ({
      kind,
      title: entry.title,
      ...(entry.description ? { description: entry.description } : {}),
      ...(entry.required === undefined ? {} : { required: entry.required }),
      position: entry.position || index + 1,
    }))

  return {
    code: input.code,
    officialName: input.officialName,
    nameAr: input.nameAr,
    nameEn: input.nameEn,
    productTypeId: input.productTypeId,
    categoryId: input.categoryId,
    ...(input.departmentId ? { departmentId: input.departmentId } : {}),
    description: input.description,
    ...(academic.duration ? { durationValue: academic.duration } : {}),
    ...(academic.durationUnit ? { durationUnitId: academic.durationUnit } : {}),
    ...(academic.studyMode ? { studyModeId: academic.studyMode } : {}),
    ...(academic.termCount ? { numberOfTerms: academic.termCount } : {}),
    ...(academic.sessionCount ? { numberOfSessions: academic.sessionCount } : {}),
    ...(academic.hourCount ? { numberOfHours: academic.hourCount } : {}),
    ...(academic.internshipIncluded === undefined
      ? {}
      : { internshipIncluded: academic.internshipIncluded }),
    ...(academic.trainingIncluded === undefined
      ? {}
      : { trainingIncluded: academic.trainingIncluded }),
    ...(academic.finalProjectRequired === undefined
      ? {}
      : { finalProjectRequired: academic.finalProjectRequired }),
    ...(academic.certificateIncluded === undefined
      ? {}
      : { certificateIncluded: academic.certificateIncluded }),
    ...(content.salesScript ? { salesScript: content.salesScript } : {}),
    pricing: {
      basePrice: pricing.basePrice,
      registrationFees: pricing.registrationFees,
      certificateFees: pricing.certificateFees,
      trainingFees: pricing.trainingFees,
      cardFees: pricing.cardFees,
      examFees: pricing.examFees,
      additionalFees: pricing.additionalFees,
      discount: pricing.discount,
      scholarship: pricing.scholarship,
      installmentAvailable: pricing.installmentAvailable,
      installmentMinCount: pricing.installmentMinCount,
      installmentMaxCount: pricing.installmentMaxCount,
      installmentFrequency: pricing.installmentFrequency.toUpperCase(),
    },
    branches: input.branches.map((assignment) => ({
      branchId: assignment.branchId,
      role: assignment.role.toUpperCase(),
    })),
    content: [
      ...ordered(content.faqs, "FAQ"),
      ...ordered(content.admissionRequirements, "ADMISSION_REQUIREMENT"),
      ...ordered(content.requiredDocuments, "REQUIRED_DOCUMENT"),
    ],
  }
}

const ELIGIBILITY_REASONS: Record<string, EnrollmentEligibility["reason"]> = {
  ELIGIBLE: "eligible",
  PRODUCT_NOT_ACTIVE: "product-not-active",
  BRANCH_NOT_ACTIVE: "branch-inactive",
  BRANCH_NOT_ASSIGNED: "registration-not-assigned",
}

export const toEligibility = (row: {
  eligible: boolean
  reason: string
}): EnrollmentEligibility => ({
  eligible: row.eligible,
  reason: ELIGIBILITY_REASONS[row.reason] ?? "product-not-active",
})

export const toPaginated = <Row, Mapped>(
  page: Page<Row>,
  map: (row: Row) => Mapped
): PaginatedResult<Mapped> => ({
  items: page.items.map(map),
  total: page.meta.total,
  page: page.meta.page,
  pageSize: page.meta.limit,
  totalPages: page.meta.totalPages,
})
