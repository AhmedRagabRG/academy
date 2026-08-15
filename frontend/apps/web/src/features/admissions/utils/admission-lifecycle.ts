import type { AdmissionStatus } from "../types/common"

export interface TransitionPolicy {
  permission: string
  reasonRequired?: boolean
}

export const admissionTransitionPolicy: Partial<
  Record<AdmissionStatus, Partial<Record<AdmissionStatus, TransitionPolicy>>>
> = {
  draft: {
    submitted: { permission: "admissions.submit" },
    archived: { permission: "admissions.archive", reasonRequired: true },
  },
  submitted: {
    "under-review": { permission: "admissions.review" },
    draft: { permission: "admissions.return", reasonRequired: true },
  },
  "under-review": {
    draft: { permission: "admissions.return", reasonRequired: true },
    approved: { permission: "admissions.approve" },
    rejected: { permission: "admissions.reject", reasonRequired: true },
  },
  rejected: {
    draft: { permission: "admissions.return", reasonRequired: true },
    archived: { permission: "admissions.archive", reasonRequired: true },
  },
  approved: {
    archived: { permission: "admissions.archive", reasonRequired: true },
  },
}

export function getTransitionPolicy(
  from: AdmissionStatus,
  to: AdmissionStatus
) {
  return admissionTransitionPolicy[from]?.[to]
}
