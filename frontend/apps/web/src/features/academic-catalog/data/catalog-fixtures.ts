import type { AcademicProduct, Category, ProductType } from "../types/domain"
import type { CatalogLookups } from "../types/configuration"
import {
  CATALOG_CURRENCY,
  CATALOG_PRECISION,
  catalogMoney,
} from "../utils/catalog-money"

const audit = {
  organizationId: "org-1",
  version: 1,
  createdAt: "2026-01-01T08:00:00.000Z",
  updatedAt: "2026-07-31T08:00:00.000Z",
  createdBy: "system",
  updatedBy: "admin-1",
}
const numberFields = [
  {
    key: "duration",
    label: "المدة",
    kind: "number",
    required: true,
    position: 1,
  },
  {
    key: "hourCount",
    label: "عدد الساعات",
    kind: "number",
    required: true,
    position: 2,
  },
] as const
export const productTypes: ProductType[] = [
  {
    ...audit,
    id: "type-program" as ProductType["id"],
    nameAr: "برنامج مهني",
    nameEn: "Professional Program",
    description: "برنامج مهني متكامل",
    status: "active",
    batchable: true,
    fields: [
      ...numberFields,
      {
        key: "termCount",
        label: "عدد الفصول",
        kind: "number",
        required: true,
        position: 3,
      },
    ],
  },
  {
    ...audit,
    batchable: false,
    id: "type-diploma" as ProductType["id"],
    nameAr: "دبلوم مهني",
    nameEn: "Professional Diploma",
    description: "دبلوم تطبيقي",
    status: "active",
    fields: [
      ...numberFields,
      {
        key: "certificateIncluded",
        label: "شهادة متضمنة",
        kind: "boolean",
        required: false,
        position: 3,
      },
    ],
  },
  {
    ...audit,
    batchable: false,
    id: "type-course" as ProductType["id"],
    nameAr: "دورة تدريبية",
    nameEn: "Training Course",
    description: "دورة قصيرة",
    status: "active",
    fields: [
      {
        key: "sessionCount",
        label: "عدد الجلسات",
        kind: "number",
        required: true,
        position: 1,
      },
      {
        key: "hourCount",
        label: "عدد الساعات",
        kind: "number",
        required: true,
        position: 2,
      },
    ],
  },
]
export const categories: Category[] = [
  {
    ...audit,
    id: "category-business" as Category["id"],
    nameAr: "إدارة الأعمال",
    nameEn: "Business",
    description: "برامج الإدارة والقيادة",
    status: "active",
  },
  {
    ...audit,
    id: "category-technology" as Category["id"],
    nameAr: "التكنولوجيا",
    nameEn: "Technology",
    description: "البرامج التقنية",
    status: "active",
  },
  {
    ...audit,
    id: "category-design" as Category["id"],
    nameAr: "التصميم",
    nameEn: "Design",
    description: "برامج التصميم الإبداعي",
    status: "active",
  },
]
export const catalogLookups: CatalogLookups = {
  currency: CATALOG_CURRENCY,
  precision: CATALOG_PRECISION,
  currencies: [{ value: "EGP", label: "جنيه مصري" }],
  durationUnits: [
    { value: "month", label: "شهر" },
    { value: "week", label: "أسبوع" },
  ],
  studyModes: [
    { value: "onsite", label: "حضوري" },
    { value: "online", label: "عن بُعد" },
    { value: "hybrid", label: "مدمج" },
  ],
  branches: [
    { value: "branch-cairo", label: "فرع القاهرة", status: "active" },
    { value: "branch-giza", label: "فرع الجيزة", status: "active" },
  ],
  departments: [
    { value: "dept-training", label: "التدريب", status: "active" },
    { value: "dept-business", label: "إدارة البرامج", status: "active" },
  ],
  statuses: [
    { value: "draft", label: "مسودة" },
    { value: "active", label: "نشط" },
    { value: "hidden", label: "مخفي" },
    { value: "closed", label: "مغلق" },
    { value: "archived", label: "مؤرشف" },
  ],
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
}
export const products: AcademicProduct[] = [
  {
    ...audit,
    id: "product-leadership" as AcademicProduct["id"],
    officialName: "دبلوم القيادة التنفيذية",
    nameAr: "دبلوم القيادة التنفيذية",
    nameEn: "Executive Leadership Diploma",
    code: "ALP-001",
    codeLockedAt: "2026-01-15T08:00:00.000Z",
    productTypeId: "type-diploma",
    categoryId: "category-business",
    departmentId: "dept-business",
    description: "تجربة تعليمية مهنية لإعداد قادة الأعمال.",
    status: "active",
    academic: {
      duration: 6,
      durationUnit: "month",
      hourCount: 120,
      certificateIncluded: true,
      studyMode: "hybrid",
    },
    pricing: {
      basePrice: catalogMoney("18000.00"),
      registrationFees: catalogMoney("500.00"),
      certificateFees: catalogMoney("350.00"),
      trainingFees: catalogMoney("0.00"),
      cardFees: catalogMoney("100.00"),
      examFees: catalogMoney("300.00"),
      additionalFees: catalogMoney("0.00"),
      discount: catalogMoney("0.00"),
      scholarship: catalogMoney("0.00"),
      installmentAvailable: true,
      installmentMinCount: 2,
      installmentMaxCount: 12,
      installmentFrequency: "monthly",
    },
    branches: [
      { branchId: "branch-cairo", role: "registration" },
      { branchId: "branch-cairo", role: "study" },
      { branchId: "branch-giza", role: "registration" },
    ],
    content: {
      salesScript: "برنامج عملي يربط القيادة بالنتائج.",
      faqs: [],
      admissionRequirements: [],
      requiredDocuments: [],
    },
    lifecycle: [
      {
        id: "event-1" as AcademicProduct["id"],
        from: "draft",
        to: "active",
        actorId: "admin-1",
        at: "2026-01-15T08:00:00.000Z",
        version: 1,
      },
    ],
  },
]

products.push({
  ...structuredClone(products[0]!),
  id: "product-professional" as AcademicProduct["id"],
  officialName: "برنامج إدارة المشاريع المهنية",
  nameAr: "برنامج إدارة المشاريع المهنية",
  nameEn: "Professional Project Management Program",
  code: "PPM-001",
  productTypeId: "type-program",
  academic: {
    duration: 9,
    durationUnit: "month",
    hourCount: 180,
    termCount: 3,
    studyMode: "hybrid",
  },
  lifecycle: [
    {
      id: "event-professional-1" as AcademicProduct["id"],
      from: "draft",
      to: "active",
      actorId: "admin-1",
      at: "2026-02-01T08:00:00.000Z",
      version: 1,
    },
  ],
})
export function buildScaleProducts(count = 10_000): AcademicProduct[] {
  const base = products[0]!
  return Array.from({ length: count }, (_, index) => ({
    ...structuredClone(base),
    id: `product-scale-${index + 1}` as AcademicProduct["id"],
    officialName: `برنامج مهني ${index + 1}`,
    nameAr: `برنامج مهني ${index + 1}`,
    nameEn: `Professional Program ${index + 1}`,
    code: `SCALE-${String(index + 1).padStart(5, "0")}`,
    status: index % 5 === 0 ? "draft" : "active",
    updatedAt: new Date(Date.UTC(2026, 0, 1 + (index % 180))).toISOString(),
  }))
}
