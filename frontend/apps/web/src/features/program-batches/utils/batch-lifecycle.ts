import type { BatchStatus } from "../types/common"
import type { BatchDetail } from "../types/domain"
import { getReadiness } from "./batch-readiness"
export const transitions: Record<BatchStatus, BatchStatus[]> = {
  draft: ["registration-open", "archived"],
  "registration-open": ["registration-closed", "draft"],
  "registration-closed": ["registration-open", "studying"],
  studying: ["graduated"],
  graduated: ["archived"],
  archived: [],
}
export function transitionAllowed(batch: BatchDetail, to: BatchStatus) {
  if (!transitions[batch.status].includes(to)) return false
  if (to === "registration-open" && !getReadiness(batch).ready) return false
  if (
    batch.status === "registration-open" &&
    to === "draft" &&
    batch.capacity.currentStudents > 0
  )
    return false
  return true
}
export const transitionPermission: Record<BatchStatus, string> = {
  draft: "batches.registration.correct",
  "registration-open": "batches.registration.open",
  "registration-closed": "batches.registration.close",
  studying: "batches.study.start",
  graduated: "batches.graduate",
  archived: "batches.archive",
}
