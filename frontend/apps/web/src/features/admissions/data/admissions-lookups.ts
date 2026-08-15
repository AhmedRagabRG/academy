import type {
  AdmissionBatchOption,
  AdmissionLookups,
  AdmissionOffering,
  DocumentRequirementSnapshot,
} from "../types/domain"
import type { DocumentRequirementSnapshotId, Money } from "../types/common"

const money = (amount: string): Money => ({
  amount,
  currency: "EGP",
  precision: 2,
})

export const admissionOfferings: AdmissionOffering[] = [
  {
    id: "product-professional",
    version: 1,
    kind: "professional-program",
    name: { ar: "برنامج القيادة المهنية", en: "Professional Leadership" },
    code: "PLP",
    status: "active",
    branchIds: ["branch-main", "branch-cairo", "branch-giza"],
    price: money("18000.00"),
    registrationFees: money("1000.00"),
    pricingRevisionId: "catalog-price-plp-1",
    documentPolicyId: "policy-standard",
  },
  {
    id: "product-diploma",
    version: 1,
    kind: "professional-diploma",
    name: { ar: "الدبلومة المهنية في الإدارة", en: "Management Diploma" },
    code: "DPM",
    status: "active",
    branchIds: ["branch-main", "branch-cairo"],
    price: money("12000.00"),
    registrationFees: money("750.00"),
    pricingRevisionId: "catalog-price-dpm-1",
    documentPolicyId: "policy-standard",
  },
  {
    id: "product-course",
    version: 1,
    kind: "training-course",
    name: { ar: "دورة مهارات التواصل", en: "Communication Skills" },
    code: "CSC",
    status: "active",
    branchIds: ["branch-main", "branch-giza"],
    price: money("3500.00"),
    registrationFees: money("250.00"),
    pricingRevisionId: "catalog-price-csc-1",
    documentPolicyId: "policy-course",
  },
]

export const admissionBatches: AdmissionBatchOption[] = [
  {
    id: "batch-fall-2026",
    programId: "product-professional",
    version: 2,
    name: "دفعة خريف 2026",
    code: "PLP-F26",
    status: "registration-open",
    registrationBranchIds: ["branch-main", "branch-cairo"],
    studyBranchIds: ["branch-main", "branch-giza"],
    availableSeats: 18,
    registrationStartDate: "2026-06-01",
    registrationEndDate: "2026-10-31",
    financialRevisionId: "financial-revision-1",
    price: money("18000.00"),
    registrationFees: money("1000.00"),
  },
]

export const admissionDocumentPolicy: DocumentRequirementSnapshot = {
  id: "requirement-snapshot-standard" as DocumentRequirementSnapshotId,
  policyId: "policy-standard",
  policyVersion: 1,
  createdAt: "2026-07-31T12:00:00.000Z",
  requirements: [
    {
      id: "requirement-national-id",
      key: "national-id",
      label: "بطاقة الرقم القومي",
      required: true,
      requiredAt: "approval",
      allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
      maxBytes: 5_000_000,
    },
    {
      id: "requirement-photo",
      key: "personal-photo",
      label: "الصورة الشخصية",
      required: true,
      requiredAt: "approval",
      allowedMimeTypes: ["image/jpeg", "image/png"],
      maxBytes: 3_000_000,
    },
    {
      id: "requirement-qualification",
      key: "qualification-certificate",
      label: "شهادة المؤهل",
      required: true,
      requiredAt: "approval",
      allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
      maxBytes: 5_000_000,
    },
    {
      id: "requirement-additional",
      key: "additional-attachment",
      label: "مرفق إضافي",
      required: false,
      requiredAt: "approval",
      allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
      maxBytes: 5_000_000,
    },
  ],
}

export const admissionLookups: AdmissionLookups = {
  branches: [
    { value: "branch-main", label: "الفرع الرئيسي", status: "active" },
    { value: "branch-cairo", label: "فرع القاهرة", status: "active" },
    { value: "branch-giza", label: "فرع الجيزة", status: "active" },
  ],
  employees: [
    { value: "employee-demo", label: "أحمد محمد", status: "active" },
    { value: "employee-admissions", label: "سارة محمود", status: "active" },
    { value: "employee-service", label: "منى إبراهيم", status: "active" },
  ],
  managers: [
    { value: "manager-service", label: "محمد سمير", status: "active" },
  ],
  departments: [
    { value: "department-admissions", label: "القبول", status: "active" },
    { value: "department-service", label: "خدمة العملاء", status: "active" },
  ],
  leadSources: [
    { value: "source-website", label: "الموقع الإلكتروني", status: "active" },
    { value: "source-referral", label: "ترشيح", status: "active" },
  ],
  academicGrades: [
    { value: "grade-good", label: "جيد", status: "active" },
    { value: "grade-very-good", label: "جيد جدًا", status: "active" },
  ],
  qualifications: [
    { value: "qualification-bachelor", label: "بكالوريوس", status: "active" },
    { value: "qualification-diploma", label: "دبلوم", status: "active" },
  ],
  offerings: admissionOfferings,
  batches: admissionBatches,
  documentPolicy: admissionDocumentPolicy,
  currency: "EGP",
  precision: 2,
}
