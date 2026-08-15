import { describe, expect, it } from "vitest"
import {
  createUserSchema,
  userSchema,
} from "@/features/organization-settings/schemas/user-schema"

const valid = {
  fullName: "مستخدم جديد",
  email: "user@alsalam.academy",
  phone: "+201234567890",
  branchId: "b",
  branchName: "B",
  departmentId: "d",
  departmentName: "D",
  roleIds: ["role-1"],
  status: "active" as const,
}

describe("user schema", () => {
  it("requires valid contact and an assigned role", () =>
    expect(
      userSchema.safeParse({ ...valid, email: "bad", phone: "bad", roleIds: [] })
        .success
    ).toBe(false))

  it("requires an international phone with a leading plus", () => {
    expect(userSchema.safeParse({ ...valid, phone: "01234567890" }).success).toBe(
      false
    )
    expect(userSchema.safeParse(valid).success).toBe(true)
  })
})

/**
 * The password rules mirror the server policy exactly.
 *
 * Each case here is one the API rejects. If these ever pass, the form starts
 * accepting a password the server will refuse, and the user learns about it
 * only after submitting.
 */
describe("initial password", () => {
  const parse = (password: string) =>
    createUserSchema.safeParse({ ...valid, password }).success

  it("accepts a password meeting every rule", () =>
    expect(parse("Str0ngPassw0rd!")).toBe(true))

  it("rejects one shorter than twelve characters", () =>
    expect(parse("Passw0rd!")).toBe(false))

  it("rejects one with no uppercase letter", () =>
    expect(parse("str0ngpassw0rd!")).toBe(false))

  it("rejects one with no lowercase letter", () =>
    expect(parse("STR0NGPASSW0RD!")).toBe(false))

  it("rejects one with no digit", () =>
    expect(parse("StrongPassword!")).toBe(false))

  it("rejects one with no symbol", () =>
    expect(parse("Str0ngPassw0rd")).toBe(false))

  it("is required only when creating", () => {
    expect(userSchema.safeParse(valid).success).toBe(true)
    expect(createUserSchema.safeParse(valid).success).toBe(false)
  })
})
