import type { ConfigStatus, LookupOption } from "./common"

export type AcademicFieldKey =
  | "duration"
  | "durationUnit"
  | "termCount"
  | "sessionCount"
  | "hourCount"
  | "studyMode"
  | "trainingIncluded"
  | "internshipIncluded"
  | "certificateIncluded"
  | "finalProjectRequired"
export interface AcademicFieldDefinition {
  key: AcademicFieldKey
  label: string
  kind: "number" | "option" | "boolean"
  required: boolean
  position: number
}
export interface CatalogLookups {
  currencies: LookupOption[]
  durationUnits: LookupOption[]
  studyModes: LookupOption[]
  branches: LookupOption[]
  departments: LookupOption[]
  statuses: Array<LookupOption & { value: string }>
  mediaPolicy: {
    imageTypes: string[]
    brochureTypes: string[]
    imageMaxSize: number
    brochureMaxSize: number
    galleryMaxCount: number
  }
  configStatuses: Array<{ value: ConfigStatus; label: string }>
  /** Default currency and minor-unit digits for every price in the catalog. */
  currency: string
  precision: number
}
