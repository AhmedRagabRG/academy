import type { AdmissionId, AdmissionStatus } from "../types/common"
import type { AdmissionSummary } from "../types/domain"

const statuses: AdmissionStatus[] = [
  "draft",
  "submitted",
  "under-review",
  "approved",
  "rejected",
  "enrolled",
  "archived",
]

/** Narrow, deterministic records used only by scale and list-contract tests. */
export function createAdmissionScaleSummaries(
  count = 10_000
): AdmissionSummary[] {
  return Array.from({ length: count }, (_, index) => {
    const sequence = index + 1
    const suffix = String(sequence).padStart(5, "0")
    return {
      id: `admission-scale-${suffix}` as AdmissionId,
      reference: `ADM-26-${suffix}`,
      applicantName:
        sequence === 7_777 ? "هدف البحث المؤكد" : `متقدم ${suffix}`,
      phoneHint: `***${String(sequence).padStart(4, "0").slice(-4)}`,
      offeringLabel: sequence % 2 ? "برنامج القيادة المهنية" : "دبلومة الإدارة",
      offeringCode: sequence % 2 ? "PLP" : "DIP-MGT",
      batchLabel: sequence % 2 ? "دفعة الخريف" : undefined,
      batchCode: sequence % 2 ? "F26" : undefined,
      registrationBranch: sequence % 3 ? "القاهرة" : "الإسكندرية",
      assignedEmployee: sequence % 2 ? "منى السيد" : "أحمد حسن",
      status: statuses[index % statuses.length] ?? "draft",
      updatedAt: new Date(Date.UTC(2026, 6, 31, 12, index % 60)).toISOString(),
      version: 1,
    }
  })
}
