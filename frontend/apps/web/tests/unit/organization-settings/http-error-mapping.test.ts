import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { httpOrganizationSettingsService as service } from "@/features/organization-settings/services/http-organization-settings-service"
import { clearCsrfToken } from "@/shared/api"

/**
 * How a refused write reaches the form.
 *
 * The API names the field it rejected using its own vocabulary, and the
 * request body already renamed those fields on the way out. These cover the
 * return trip: unless the name is translated back, the message attaches to a
 * field the form does not have and the user sees "review the highlighted
 * fields" with nothing highlighted.
 */
function respondWith(status: number, body: unknown) {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    // Mutations pass CSRF preflight by way of the priming session read.
    if (!init || (init.method ?? "GET") === "GET")
      return new Response(JSON.stringify({ success: true, data: null }), {
        status: 200,
        headers: { "x-csrf-token": "test-token" },
      })
    return new Response(JSON.stringify(body), { status })
  })
}

const employee = {
  fullName: "موظف",
  email: "staff@alsalam.academy",
  phone: "+201234567890",
  branchId: "branch-1",
  branchName: "",
  departmentId: "dept-1",
  departmentName: "",
  roleIds: ["role-1"],
  status: "active",
  password: "Str0ngPassw0rd!",
} as never

const original = globalThis.fetch

beforeEach(() => clearCsrfToken())
afterEach(() => {
  globalThis.fetch = original
  vi.restoreAllMocks()
})

describe("employee write failures", () => {
  it("keeps a password rejection on the password field", async () => {
    globalThis.fetch = respondWith(422, {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "توجد بيانات غير صالحة. راجع الحقول المميزة.",
        details: [{ field: "password", message: "كلمة المرور ضعيفة" }],
      },
    }) as never

    const error = await service.create("users", employee).catch((e) => e)
    expect(error.kind).toBe("validation")
    expect(error.fieldErrors).toEqual({ password: "كلمة المرور ضعيفة" })
  })

  it("renames displayName onto the form's fullName field", async () => {
    globalThis.fetch = respondWith(422, {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "بيانات غير صالحة",
        details: [{ field: "displayName", message: "الاسم طويل" }],
      },
    }) as never

    const error = await service.create("users", employee).catch((e) => e)
    expect(error.fieldErrors).toEqual({ fullName: "الاسم طويل" })
  })

  it("renames branchIds onto the form's single branchId field", async () => {
    globalThis.fetch = respondWith(422, {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "بيانات غير صالحة",
        details: [{ field: "branchIds", message: "الفرع مطلوب" }],
      },
    }) as never

    const error = await service.create("users", employee).catch((e) => e)
    expect(error.fieldErrors).toEqual({ branchId: "الفرع مطلوب" })
  })

  it("marks the email field when the address is already taken", async () => {
    // The identity module raises EMAIL_EXISTS with no details of its own.
    globalThis.fetch = respondWith(409, {
      success: false,
      error: { code: "EMAIL_EXISTS", message: "القيمة مستخدمة بالفعل" },
    }) as never

    const error = await service.create("users", employee).catch((e) => e)
    expect(error.kind).toBe("duplicate")
    expect(error.fieldErrors).toEqual({ email: "القيمة مستخدمة بالفعل" })
  })

  it("marks the code field when a role code is already taken", async () => {
    globalThis.fetch = respondWith(409, {
      success: false,
      error: { code: "ROLE_CODE_EXISTS", message: "القيمة مستخدمة بالفعل" },
    }) as never

    const error = await service
      .create("roles", { name: "دور", code: "dup", description: "وصف", permissionIds: [], status: "active" } as never)
      .catch((e) => e)
    expect(error.kind).toBe("duplicate")
    expect(error.fieldErrors).toEqual({ code: "القيمة مستخدمة بالفعل" })
  })

  it("reports a stale version as a version conflict", async () => {
    globalThis.fetch = respondWith(409, {
      success: false,
      error: {
        code: "VERSION_CONFLICT",
        message: "تم تعديل هذا السجل بواسطة موظف آخر.",
        currentVersion: 4,
      },
    }) as never

    const error = await service
      .update("branches", "branch-1", { expectedVersion: 1 })
      .catch((e) => e)
    expect(error.kind).toBe("version-conflict")
  })

  it("reports a refusal as a permission error", async () => {
    globalThis.fetch = respondWith(403, {
      success: false,
      error: { code: "FORBIDDEN", message: "لا تملك صلاحية" },
    }) as never

    const error = await service.create("users", employee).catch((e) => e)
    expect(error.kind).toBe("permission")
  })
})
