import type { BatchLookups } from "../types/domain"
import type { ProgramId } from "../types/common"
export const programBatchLookups: BatchLookups = {
  program: {
    id: "product-professional" as ProgramId,
    name: "برنامج إدارة المشاريع المهنية",
    active: true,
    batchingEligible: true,
  },
  academicYears: [
    { value: "year-2026", label: "العام الأكاديمي 2026/2027" },
    { value: "year-2027", label: "العام الأكاديمي 2027/2028" },
  ],
  intakes: [
    { value: "fall", label: "القبول الخريفي" },
    { value: "spring", label: "القبول الربيعي" },
    { value: "summer", label: "القبول الصيفي" },
  ],
  branches: [
    { value: "branch-cairo", label: "فرع القاهرة", status: "active" },
    { value: "branch-giza", label: "فرع الجيزة", status: "active" },
    { value: "branch-history", label: "فرع تاريخي", status: "inactive" },
  ],
  milestones: [
    { value: "registration-start", label: "بداية التسجيل" },
    { value: "study-start", label: "بداية الدراسة" },
  ],
  currency: "EGP",
  precision: 2,
}
