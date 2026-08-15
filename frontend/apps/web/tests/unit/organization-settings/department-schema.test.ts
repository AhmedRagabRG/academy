import { describe, expect, it } from "vitest"
import { departmentSchema } from "@/features/organization-settings/schemas/department-schema"
describe("department schema", () => { it("requires useful labels and descriptions", () => expect(departmentSchema.safeParse({ name: "", description: "", status: "active" }).success).toBe(false)) })
