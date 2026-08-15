import { describe, expect, it } from "vitest"
import { loginSchema } from "@/features/auth/schemas/login-schema"

describe("login schema", () => {
  it("reports Arabic errors", () => {
    const result = loginSchema.safeParse({ email: "bad", password: "" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.message).toContain("بريد")
  })
})
