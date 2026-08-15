import type { BatchDetail, Eligibility } from "../types/domain"
export function getEligibility(
  batch: BatchDetail,
  branchId: string,
  today = new Date().toISOString().slice(0, 10)
): Eligibility {
  const reasons: string[] = []
  if (batch.status !== "registration-open") reasons.push("status-not-open")
  if (
    batch.schedule.registrationStartDate &&
    today < batch.schedule.registrationStartDate
  )
    reasons.push("registration-not-started")
  if (
    batch.schedule.registrationEndDate &&
    today > batch.schedule.registrationEndDate
  )
    reasons.push("registration-ended")
  if (batch.capacity.availableSeats <= 0) reasons.push("batch-full")
  if (
    !batch.branchAssignments.some(
      (x) =>
        x.branchId === branchId &&
        x.role === "registration" &&
        x.status === "active"
    )
  )
    reasons.push("registration-branch-not-assigned")
  return {
    eligible: reasons.length === 0,
    reasons,
    availableSeats: batch.capacity.availableSeats,
    financialRevisionId: batch.financialProfile.currentRevisionId,
    batchVersion: batch.version,
  }
}
