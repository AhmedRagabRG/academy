import type { LookupOption, OfferingKind, StudentStatus } from "../types/common"
import type {
  StudentDocumentType,
  StudentIdentityRules,
  StudentImagePolicy,
} from "../types/domain"
import { documentTypeCopy, studentStatusCopy } from "../config/students-copy"

/**
 * Seeded configurable business data. Nothing here is an application rule: the
 * service reads these through lookups so a future administration source can
 * replace them without touching screens (constitution III).
 */

const option = (
  value: string,
  label: string,
  active = true
): LookupOption => ({ value, label, active })

export const studentBranches: LookupOption[] = [
  option("branch-main", "الفرع الرئيسي"),
  option("branch-cairo", "فرع القاهرة"),
  option("branch-giza", "فرع الجيزة"),
  option("branch-alex", "فرع الإسكندرية"),
  option("branch-legacy", "الفرع القديم", false),
]

export const studentDepartments: LookupOption[] = [
  option("department-it", "تقنية المعلومات"),
  option("department-business", "إدارة الأعمال"),
  option("department-languages", "اللغات"),
  option("department-design", "التصميم"),
]

export const studentAcademicGrades: LookupOption[] = [
  option("grade-foundation", "المستوى التأسيسي"),
  option("grade-intermediate", "المستوى المتوسط"),
  option("grade-advanced", "المستوى المتقدم"),
]

export const studentQualifications: LookupOption[] = [
  option("qualification-highschool", "الثانوية العامة"),
  option("qualification-diploma", "دبلوم فني"),
  option("qualification-bachelor", "بكالوريوس"),
  option("qualification-master", "ماجستير"),
]

export const customerServiceEmployees: LookupOption[] = [
  option("employee-demo", "أحمد محمد"),
  option("employee-sara", "سارة علي"),
  option("employee-omar", "عمر حسن"),
  option("employee-mona", "منى إبراهيم"),
]

export interface OfferingCatalogEntry {
  id: string
  kind: OfferingKind
  label: string
  code: string
  version: number
}

export const offeringCatalog: OfferingCatalogEntry[] = [
  {
    id: "offering-program-fullstack",
    kind: "professional-program",
    label: "برنامج تطوير الويب الاحترافي",
    code: "PRG-FS",
    version: 3,
  },
  {
    id: "offering-program-data",
    kind: "professional-program",
    label: "برنامج تحليل البيانات",
    code: "PRG-DA",
    version: 2,
  },
  {
    id: "offering-diploma-hr",
    kind: "professional-diploma",
    label: "دبلومة الموارد البشرية",
    code: "DIP-HR",
    version: 4,
  },
  {
    id: "offering-diploma-marketing",
    kind: "professional-diploma",
    label: "دبلومة التسويق الرقمي",
    code: "DIP-MK",
    version: 1,
  },
  {
    id: "offering-course-english",
    kind: "training-course",
    label: "دورة اللغة الإنجليزية",
    code: "CRS-EN",
    version: 5,
  },
  {
    id: "offering-course-excel",
    kind: "training-course",
    label: "دورة إكسل المتقدم",
    code: "CRS-XL",
    version: 2,
  },
  {
    id: "offering-archived-legacy",
    kind: "training-course",
    label: "دورة مؤرشفة (بيانات تاريخية)",
    code: "CRS-OLD",
    version: 1,
  },
]

export interface BatchCatalogEntry {
  id: string
  programId: string
  label: string
  code: string
  version: number
}

export const batchCatalog: BatchCatalogEntry[] = [
  {
    id: "batch-fs-2026-a",
    programId: "offering-program-fullstack",
    label: "دفعة تطوير الويب - يناير ٢٠٢٦",
    code: "FS-26A",
    version: 2,
  },
  {
    id: "batch-fs-2026-b",
    programId: "offering-program-fullstack",
    label: "دفعة تطوير الويب - مايو ٢٠٢٦",
    code: "FS-26B",
    version: 1,
  },
  {
    id: "batch-da-2026-a",
    programId: "offering-program-data",
    label: "دفعة تحليل البيانات - مارس ٢٠٢٦",
    code: "DA-26A",
    version: 3,
  },
]

export const studentDocumentTypes: StudentDocumentType[] = [
  {
    key: "personal-photo",
    label: documentTypeCopy["personal-photo"],
    required: true,
    multiple: false,
    allowedMimeTypes: ["image/jpeg", "image/png"],
    maxBytes: 2 * 1024 * 1024,
  },
  {
    key: "national-id",
    label: documentTypeCopy["national-id"],
    required: true,
    multiple: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxBytes: 5 * 1024 * 1024,
  },
  {
    key: "parent-national-id",
    label: documentTypeCopy["parent-national-id"],
    required: false,
    multiple: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxBytes: 5 * 1024 * 1024,
  },
  {
    key: "birth-certificate",
    label: documentTypeCopy["birth-certificate"],
    required: true,
    multiple: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxBytes: 5 * 1024 * 1024,
  },
  {
    key: "qualification-certificate",
    label: documentTypeCopy["qualification-certificate"],
    required: true,
    multiple: false,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxBytes: 5 * 1024 * 1024,
  },
  {
    key: "admission-declaration",
    label: documentTypeCopy["admission-declaration"],
    required: true,
    multiple: false,
    allowedMimeTypes: ["application/pdf"],
    maxBytes: 5 * 1024 * 1024,
  },
  {
    key: "additional-attachment",
    label: documentTypeCopy["additional-attachment"],
    required: false,
    multiple: true,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxBytes: 10 * 1024 * 1024,
  },
]

export const studentIdentityRules: StudentIdentityRules = {
  nationalIdPattern: "^\\d{14}$",
  phonePattern: "^01\\d{9}$",
  minorAgeThreshold: 18,
  minimumGraduationAge: 16,
}

export const studentImagePolicy: StudentImagePolicy = {
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxBytes: 2 * 1024 * 1024,
}

export const studentStatusOptions: { value: StudentStatus; label: string }[] = (
  ["active", "suspended", "graduated", "withdrawn", "archived"] as const
).map((value) => ({ value, label: studentStatusCopy[value] }))

export interface StudentLookupFixtures {
  branches: LookupOption[]
  departments: LookupOption[]
  academicGrades: LookupOption[]
  qualifications: LookupOption[]
  customerServiceEmployees: LookupOption[]
  offerings: LookupOption[]
  batches: LookupOption[]
  offeringCatalog: OfferingCatalogEntry[]
  batchCatalog: BatchCatalogEntry[]
  statuses: { value: StudentStatus; label: string }[]
  documentTypes: StudentDocumentType[]
  identityRules: StudentIdentityRules
  imagePolicy: StudentImagePolicy
  currency: string
  precision: number
}

export function studentLookupFixtures(): StudentLookupFixtures {
  return {
    branches: studentBranches,
    departments: studentDepartments,
    academicGrades: studentAcademicGrades,
    qualifications: studentQualifications,
    customerServiceEmployees,
    offerings: offeringCatalog.map((entry) => option(entry.id, entry.label)),
    batches: batchCatalog.map((entry) => option(entry.id, entry.label)),
    offeringCatalog,
    batchCatalog,
    statuses: studentStatusOptions,
    documentTypes: studentDocumentTypes,
    identityRules: studentIdentityRules,
    imagePolicy: studentImagePolicy,
    currency: "EGP",
    precision: 2,
  }
}
