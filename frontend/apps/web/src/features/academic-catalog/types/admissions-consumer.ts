export interface AdmissionOfferingProjection {
  id: string
  version: number
  kind: "professional-program" | "professional-diploma" | "training-course"
  label: string
  code: string
  status: "active" | "inactive" | "archived"
  branchIds: string[]
  price: string
  registrationFees: string
  currency: string
  pricingRevisionId: string
  documentPolicyId: string
}
