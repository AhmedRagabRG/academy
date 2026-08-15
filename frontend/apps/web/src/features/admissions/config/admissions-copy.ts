import type { AdmissionStatus } from "../types/common"

export const admissionStatusLabels: Record<AdmissionStatus, string> = {
  draft: "مسودة",
  submitted: "مقدّم",
  "under-review": "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  enrolled: "تم التسجيل",
  archived: "مؤرشف",
}

export const admissionsCopy = {
  title: "القبول والتسجيل",
  description: "إدارة طلبات القبول من التسجيل حتى قرار القبول.",
  create: "تسجيل متقدم",
  emptyTitle: "لا توجد طلبات قبول",
  emptyDescription: "ابدأ بتسجيل أول متقدم أو عدّل عوامل التصفية.",
  forbidden: "لا تملك صلاحية الوصول إلى طلبات القبول.",
} as const
