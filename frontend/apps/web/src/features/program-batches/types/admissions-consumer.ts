export interface BatchAdmissionEligibilityProjection {
  programId: string
  batchId: string
  batchVersion: number
  evaluatedOn: string
  evaluatedAt: string
  eligible: boolean
  reasons: string[]
  availableSeats: number
  registrationBranchIds: string[]
  studyBranchIds: string[]
  financialRevisionId: string
  price: string
  registrationFees: string
  currency: string
}
