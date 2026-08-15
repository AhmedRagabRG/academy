import { describe, expect, it } from "vitest"
import {
  allPermissionKeys,
  permissionCatalog,
} from "@/shared/config/permission-catalog"
// The granted set is the fixture the runtime guard reads.
// eslint-disable-next-line no-restricted-imports
import { mockRole } from "@/features/auth/data/auth-fixtures"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"
import { financePermissions } from "@/features/student-finance/config/finance-permissions"
import { studentsPermissions } from "@/features/students/config/students-permissions"
import { admissionPermissions } from "@/features/admissions/config/admissions-permissions"
import { inboxPermissions } from "@/features/inbox/config/inbox-permissions"

/**
 * The catalogue behind مصفوفة الصلاحيات must offer exactly the keys the
 * application enforces.
 *
 * It previously offered 48 generated `module.action` ids of which three matched a
 * real key, leaving every Catalog, Batches, Admissions, Students, Finance and
 * Accounting permission ungrantable. These assert the two sets agree, so a module
 * that adds a permission cannot forget to publish it — and the matrix can never
 * again offer a key nothing checks.
 */
describe("the permission catalogue", () => {
  const granted = new Set(mockRole.permissionKeys as string[])
  const offered = new Set(allPermissionKeys)

  it("offers every key the application grants", () => {
    const missing = [...granted].filter((key) => !offered.has(key)).sort()
    expect(missing).toEqual([])
  })

  it("offers no key nothing checks", () => {
    const phantom = [...offered].filter((key) => !granted.has(key)).sort()
    expect(phantom).toEqual([])
  })

  it("covers every business module, not only settings", () => {
    expect(permissionCatalog.map((group) => group.key)).toEqual([
      "dashboard",
      "inbox",
      "settings",
      "catalog",
      "batches",
      "admissions",
      "students",
      "finance",
      "accounting",
      "tickets",
    ])
  })

  it("matches each module's own typed permission constants", () => {
    const keysOf = (moduleKey: string) =>
      permissionCatalog
        .find((group) => group.key === moduleKey)!
        .permissions.map((permission) => permission.key)
        .sort()

    expect(keysOf("accounting")).toEqual(
      Object.values(accountingPermissions).sort()
    )
    expect(keysOf("finance")).toEqual(Object.values(financePermissions).sort())
    expect(keysOf("students")).toEqual(Object.values(studentsPermissions).sort())
    expect(keysOf("admissions")).toEqual([...admissionPermissions].sort())
    expect(keysOf("inbox")).toEqual(Object.values(inboxPermissions).sort())
  })

  it("carries the separation-of-duty keys the matrix must be able to split", () => {
    // Collapsing any of these would remove a financial control that exists
    // precisely because the keys are distinct.
    for (const key of [
      "finance.payments.record",
      "finance.refunds.approve",
      "finance.discounts.approve",
      "finance.scholarships.approve",
      "accounting.requests.decide",
      "accounting.requests.markPaid",
      "students.status.manage",
      "students.status.correct",
      "admissions.documents.manage",
      "admissions.documents.verify",
      "batches.registration.correct",
    ])
      expect(offered.has(key), key).toBe(true)
  })

  it("gives every permission a unique id and a description", () => {
    expect(new Set(allPermissionKeys).size).toBe(allPermissionKeys.length)
    for (const group of permissionCatalog)
      for (const permission of group.permissions) {
        expect(permission.id, permission.key).toBe(permission.key)
        expect(permission.key).toBe(
          `${permission.moduleKey}.${permission.actionKey}`
        )
        expect(permission.label.trim(), permission.key).not.toBe("")
        expect(permission.description.trim(), permission.key).not.toBe("")
      }
  })

  it("registers no permission for the removed component showcase", () => {
    expect(allPermissionKeys.some((key) => key.startsWith("foundation."))).toBe(
      false
    )
  })

  it("offers no write for the code-owned organization profile", () => {
    expect(offered.has("settings.organization.view")).toBe(true)
    expect(offered.has("settings.organization.update")).toBe(false)
  })
})
