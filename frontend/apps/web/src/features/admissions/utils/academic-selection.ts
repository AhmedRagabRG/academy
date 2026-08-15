import type { AcademicSelectionInput } from "../types/commands"
import type { AdmissionBatchOption, AdmissionOffering } from "../types/domain"

export function validateAcademicSelection(
  input: AcademicSelectionInput,
  offering?: AdmissionOffering,
  batch?: AdmissionBatchOption
) {
  const reasons: string[] = []
  if (!offering || offering.status !== "active")
    reasons.push("offering-inactive")
  if (input.offeringKind === "professional-program") {
    if (!input.batchId || !batch) reasons.push("batch-required")
    if (batch && batch.programId !== input.offeringId)
      reasons.push("batch-parent-mismatch")
  } else if (input.batchId) reasons.push("batch-forbidden")
  return { eligible: reasons.length === 0, reasons }
}

export function selectionConsequences(
  previous: AcademicSelectionInput | undefined,
  next: AcademicSelectionInput
) {
  if (!previous) return []
  if (
    previous.offeringId === next.offeringId &&
    previous.batchId === next.batchId
  )
    return []
  return ["branches", "documents", "financials", "readiness"]
}
