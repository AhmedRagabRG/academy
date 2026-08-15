import type { AdmissionId } from "../types/common"
import type { AdmissionListQuery } from "../types/commands"

export const admissionKeys = {
  all: ["admissions"] as const,
  lookups: (scope = "mock") => ["admissions", "lookups", scope] as const,
  lists: () => ["admissions", "list"] as const,
  list: (query: AdmissionListQuery, scope = "mock") =>
    ["admissions", "list", scope, query] as const,
  detail: (id: AdmissionId) => ["admissions", "detail", id] as const,
  readiness: (id: AdmissionId, version: number, action: string) =>
    ["admissions", "readiness", id, version, action] as const,
  documents: (id: AdmissionId) => ["admissions", "documents", id] as const,
  lifecycle: (id: AdmissionId) => ["admissions", "lifecycle", id] as const,
  finances: (id: AdmissionId) => ["admissions", "finances", id] as const,
  enrollmentReadiness: (id: AdmissionId) =>
    ["admissions", "enrollment-readiness", id] as const,
}
