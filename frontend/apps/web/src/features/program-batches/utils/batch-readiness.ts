import type { BatchDetail, Finding, Readiness } from "../types/domain"
import { isPlanBalanced } from "./batch-money"
export function getReadiness(batch: BatchDetail): Readiness {
  const findings: Finding[] = []
  const add = (
    code: string,
    section: string,
    message: string,
    field?: string
  ) => findings.push({ code, section, message, field })
  const s = batch.schedule
  if (
    !s.registrationStartDate ||
    !s.registrationEndDate ||
    !s.studyStartDate ||
    !s.studyEndDate
  )
    add("schedule-incomplete", "schedule", "أكمل الجدول الأكاديمي")
  if (batch.capacity.maximumStudents <= batch.capacity.currentStudents)
    add("capacity-full", "capacity", "لا توجد مقاعد متاحة")
  if (
    !batch.branchAssignments.some(
      (x) => x.role === "registration" && x.status === "active"
    )
  )
    add("registration-branch", "branches", "أضف فرع تسجيل")
  if (
    !batch.branchAssignments.some(
      (x) => x.role === "study" && x.status === "active"
    )
  )
    add("study-branch", "branches", "أضف فرع دراسة")
  if (
    batch.financialProfile.installmentsEnabled &&
    (!batch.financialProfile.installmentPlans.length ||
      batch.financialProfile.installmentPlans.some(
        (p) => !isPlanBalanced(batch.financialProfile, p)
      ))
  )
    add("installments-invalid", "financial", "راجع خطط التقسيط")
  return { ready: findings.length === 0, findings, batchVersion: batch.version }
}
