import {
  mockBranch,
  mockCredentials,
  mockEmployee,
  mockRole,
} from "../data/auth-fixtures"
import type { AuthService, LoginCredentials } from "../types/auth"
import type { EmployeeContext } from "@/shared/types/foundation"
import { ServiceError } from "@/shared/types/foundation"
import { z } from "zod"

const KEY = "alsalam.mock-session"
const sessionSchema = z.object({
  version: z.literal(1),
  context: z.custom<EmployeeContext>(),
})
const delay = () => new Promise((resolve) => setTimeout(resolve, 250))

export const mockAuthService: AuthService = {
  async signIn(credentials: LoginCredentials) {
    await delay()
    if (
      credentials.email !== mockCredentials.email ||
      credentials.password !== mockCredentials.password
    ) {
      throw new ServiceError(
        "invalid_credentials",
        "بيانات الدخول غير صحيحة",
        false
      )
    }
    const context: EmployeeContext = {
      employee: mockEmployee,
      role: mockRole,
      branch: mockBranch,
      organizationId: "organization-alsalam",
      authorizedBranchIds: mockEmployee.branchIds,
      organizationWide: true,
      authenticatedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(KEY, JSON.stringify({ version: 1, context }))
    return context
  },
  async getSession() {
    if (typeof window === "undefined") return null
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    try {
      const result = sessionSchema.safeParse(JSON.parse(raw))
      if (!result.success) window.localStorage.removeItem(KEY)
      return result.success ? result.data.context : null
    } catch {
      window.localStorage.removeItem(KEY)
      return null
    }
  },
  async signOut() {
    await delay()
    window.localStorage.removeItem(KEY)
  },
}
