import { beforeEach, describe, expect, it } from "vitest"
import { mockAuthService } from "@/features/auth/services/mock-auth-service"

describe("mock auth service", () => {
  beforeEach(() => localStorage.clear())
  it("signs in and restores a valid mock session", async () => {
    await mockAuthService.signIn({ email: "employee@alsalam.edu", password: "demo1234" })
    expect((await mockAuthService.getSession())?.employee.email).toBe("employee@alsalam.edu")
  })
  it("rejects invalid credentials", async () => {
    await expect(mockAuthService.signIn({ email: "wrong@example.com", password: "bad" })).rejects.toMatchObject({ code: "invalid_credentials" })
  })
  it("discards corrupt persistence", async () => {
    localStorage.setItem("alsalam.mock-session", "bad-json")
    expect(await mockAuthService.getSession()).toBeNull()
  })
})
