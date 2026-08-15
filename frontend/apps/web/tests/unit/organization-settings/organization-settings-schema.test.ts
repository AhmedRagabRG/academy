import { describe, expect, it } from "vitest"
import { generalSettingsSchema } from "@/features/organization-settings/schemas/general-settings-schema"
describe("organization settings schemas", () => { it("requires at least one working day", () => { expect(generalSettingsSchema.safeParse({ defaultLanguage: "ar", timeZone: "Africa/Cairo", currency: "EGP", dateFormat: "dd/MM/yyyy", numberFormat: "ar-EG", workingDays: [], defaultBranchId: "b", defaultAcademicYearId: "y" }).success).toBe(false) }) })
