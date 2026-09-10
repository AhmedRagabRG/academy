import { describe, expect, it } from "vitest"
import {
  allPermissionKeys,
  permissionCatalog,
} from "@/shared/config/permission-catalog"
// The granted set is the fixture the runtime guard reads.
// eslint-disable-next-line no-restricted-imports
import { mockRole } from "@/features/auth/data/auth-fixtures"
import { inboxPermissions } from "@/features/inbox/config/inbox-permissions"
import { contactsPermissions } from "@/features/contacts/config/contacts-permissions"
import { pipelinePermissions } from "@/features/lead-pipeline/config/pipeline-permissions"
import { campaignsPermissions } from "@/features/campaigns/config/campaigns-permissions"

/**
 * The catalogue behind مصفوفة الصلاحيات must offer exactly the keys the
 * application enforces.
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
      "contacts",
      "campaigns",
      "pipeline",
      "settings",
      "tickets",
      "ai",
    ])
  })

  it("matches each module's own typed permission constants", () => {
    const keysOf = (moduleKey: string) =>
      permissionCatalog
        .find((group) => group.key === moduleKey)!
        .permissions.map((permission) => permission.key)
        .sort()

    expect(keysOf("inbox")).toEqual(Object.values(inboxPermissions).sort())
    expect(keysOf("contacts")).toEqual(
      Object.values(contactsPermissions).sort()
    )
    expect(keysOf("pipeline")).toEqual(
      Object.values(pipelinePermissions).sort()
    )
    expect(keysOf("campaigns")).toEqual(
      Object.values(campaignsPermissions).sort()
    )
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
