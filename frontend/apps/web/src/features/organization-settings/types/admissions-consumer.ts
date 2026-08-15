export interface AdmissionOrganizationReference {
  id: string
  label: string
  status: "active" | "inactive" | "archived"
}

export interface AdmissionOrganizationConfiguration {
  organizationId: string
  branches: AdmissionOrganizationReference[]
  departments: AdmissionOrganizationReference[]
  employees: AdmissionOrganizationReference[]
  leadSources: AdmissionOrganizationReference[]
  academicGrades: AdmissionOrganizationReference[]
  qualifications: AdmissionOrganizationReference[]
  currency: string
  precision: number
  minorAge: number
}
