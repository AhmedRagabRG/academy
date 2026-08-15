import type { AcademicFieldDefinition } from "./configuration"
import type {
  AuditRecord,
  BranchRole,
  CatalogId,
  ConfigStatus,
  Money,
  OrderedText,
  ProductStatus,
} from "./common"

export interface ProductType extends AuditRecord {
  nameAr: string
  nameEn: string
  description: string
  status: ConfigStatus
  fields: AcademicFieldDefinition[]
  /**
   * Whether products of this type are delivered in batches.
   *
   * The backend derives it from the type's fixed identity — only a
   * professional program is batchable — so it is read, never authored.
   */
  batchable: boolean
}
export interface Category extends AuditRecord {
  nameAr: string
  nameEn: string
  description: string
  status: ConfigStatus
}
export interface AcademicProfile {
  duration?: number
  durationUnit?: string
  termCount?: number
  sessionCount?: number
  hourCount?: number
  studyMode?: string
  trainingIncluded?: boolean
  internshipIncluded?: boolean
  certificateIncluded?: boolean
  finalProjectRequired?: boolean
}
/**
 * Reference pricing for the catalog.
 *
 * Every figure is a `Money`, not a bare number: these values are the head of the
 * chain that ends in a student's balance, and a float here would drift by the
 * time it reached one.
 */
export interface PricingProfile {
  basePrice: Money
  registrationFees: Money
  certificateFees: Money
  trainingFees: Money
  cardFees: Money
  examFees: Money
  additionalFees: Money
  discount: Money
  scholarship: Money
  installmentAvailable: boolean
  installmentMinCount: number
  installmentMaxCount: number
  installmentFrequency: "weekly" | "monthly" | "bimonthly"
}
export interface BranchAssignment {
  branchId: string
  role: BranchRole
}
export interface ProductContent {
  salesScript: string
  faqs: OrderedText[]
  admissionRequirements: OrderedText[]
  requiredDocuments: OrderedText[]
}
export interface LifecycleEvent {
  id: CatalogId
  from: ProductStatus | null
  to: ProductStatus
  reason?: string
  actorId: string
  at: string
  version: number
}
export interface AcademicProduct extends AuditRecord {
  officialName: string
  nameAr: string
  nameEn: string
  code: string
  codeLockedAt?: string
  productTypeId: string
  categoryId: string
  departmentId?: string
  description: string
  status: ProductStatus
  academic: AcademicProfile
  pricing: PricingProfile
  branches: BranchAssignment[]
  content: ProductContent
  lifecycle: LifecycleEvent[]
}
export interface ProductSummary {
  id: CatalogId
  officialName: string
  nameAr: string
  code: string
  typeName: string
  categoryName: string
  departmentName?: string
  basePrice: Money
  status: ProductStatus
  branchCount: number
  updatedAt: string
  version: number
  /** Whether this product runs in batches, from its type. */
  batchable: boolean
}
export interface ProductDetail extends AcademicProduct {
  typeName: string
  categoryName: string
  departmentName?: string
}
