import { describe, expect, it } from "vitest"
import { rolePermissionsSchema, roleSchema } from "@/features/organization-settings/schemas/role-permission-schema"
describe("role schemas", () => { it("validates roles and permission selection", () => { expect(roleSchema.safeParse({ name: "", description: "", permissionIds: [], status: "active" }).success).toBe(false); expect(rolePermissionsSchema.safeParse({ roleId: "role-1", permissionIds: [] }).success).toBe(true) }) })
