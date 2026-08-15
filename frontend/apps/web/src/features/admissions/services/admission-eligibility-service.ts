import type { AcademicSelectionInput, AssignmentInput } from "../types/commands"
import type { EligibilityAssessment } from "../types/domain"
import type { EligibilityAssessmentId } from "../types/common"
import {
  academicOfferingReader,
  batchAdmissionEligibilityReader,
} from "./admissions-dependency-adapters"

export async function evaluateAdmissionSelection(
  selection: AcademicSelectionInput,
  assignment: AssignmentInput,
  context: "selection" | "submission" | "approval" = "selection"
): Promise<EligibilityAssessment> {
  const now = new Date()
  const evaluatedAt = now.toISOString()
  const evaluatedOn = evaluatedAt.slice(0, 10)
  const offering = await academicOfferingReader.getAdmissionOffering(
    selection.offeringId
  )
  const reasons: EligibilityAssessment["reasons"] = []
  if (!offering || offering.status !== "active")
    reasons.push("offering-inactive")
  let availableSeats: number | undefined
  let batchVersion: number | undefined
  if (selection.offeringKind === "professional-program") {
    if (!selection.batchId) reasons.push("batch-required")
    else {
      const result =
        await batchAdmissionEligibilityReader.evaluateAdmissionBatch({
          programId: selection.offeringId,
          batchId: selection.batchId,
          registrationBranchId: assignment.registrationBranchId,
          studyBranchId: assignment.studyBranchId,
          evaluatedOn,
        })
      for (const reason of result.reasons)
        reasons.push(reason as EligibilityAssessment["reasons"][number])
      availableSeats = result.batch?.availableSeats
      batchVersion = result.batch?.version
    }
  } else if (selection.batchId) reasons.push("batch-forbidden")
  return {
    id: `eligibility-${Date.now()}` as EligibilityAssessmentId,
    context,
    eligible: reasons.length === 0,
    reasons,
    evaluatedAt,
    evaluatedOn,
    availableSeats,
    offeringVersion: offering?.version ?? 0,
    batchVersion,
  }
}
