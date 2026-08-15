import type { GeneralSettings } from "../types/domain"

/**
 * The profile is configuration, not seeded mock data: it is code-owned and has no
 * editor. Re-exported here so the service reads one constant.
 */
export { ORGANIZATION_PROFILE as organizationProfile } from "../config/organization-profile"

const audit = { createdAt: "2026-01-01T08:00:00.000Z", updatedAt: "2026-07-31T08:00:00.000Z", createdBy: "system", updatedBy: "admin-1" }
export const generalSettings: GeneralSettings = { version: 1, ...audit, defaultLanguage: "ar", timeZone: "Africa/Cairo", currency: "EGP", dateFormat: "dd/MM/yyyy", numberFormat: "ar-EG", workingDays: ["sun", "mon", "tue", "wed", "thu"], defaultBranchId: "branch-cairo", defaultAcademicYearId: "year-2026" }
