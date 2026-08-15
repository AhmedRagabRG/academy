import { describe, expect, it } from "vitest"
import {
  buildScopeFingerprint,
  createAccountingContext,
  hasPermission,
  isInScope,
} from "@/features/accounting/utils/accounting-scope"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"

const record = (organizationId: string, branchId: string) => ({
  organizationId,
  branchId,
})

describe("organization isolation is checked before branch membership", () => {
  it("refuses a record from another organization even when the branch id matches", () => {
    const context = createAccountingContext({
      organizationId: "organization-a",
      organizationWide: false,
      authorizedBranchIds: ["branch-main"],
    })
    // The same branch id in a different organization is still out of scope.
    expect(isInScope(record("organization-b", "branch-main"), context)).toBe(false)
  })

  it("refuses another organization even for an organization-wide user", () => {
    const context = createAccountingContext({
      organizationId: "organization-a",
      organizationWide: true,
    })
    expect(isInScope(record("organization-b", "branch-main"), context)).toBe(false)
  })
})

describe("branch scope", () => {
  it("admits any branch for an organization-wide user", () => {
    const context = createAccountingContext({ organizationWide: true })
    expect(isInScope(record("organization-alsalam", "branch-anything"), context)).toBe(
      true
    )
  })

  it("admits only the authorized branches otherwise", () => {
    const context = createAccountingContext({
      organizationWide: false,
      authorizedBranchIds: ["branch-cairo", "branch-giza"],
    })
    expect(isInScope(record("organization-alsalam", "branch-cairo"), context)).toBe(true)
    expect(isInScope(record("organization-alsalam", "branch-alex"), context)).toBe(false)
  })

  it("admits nothing for a user with no authorized branches", () => {
    const context = createAccountingContext({
      organizationWide: false,
      authorizedBranchIds: [],
    })
    expect(isInScope(record("organization-alsalam", "branch-cairo"), context)).toBe(
      false
    )
  })
})

describe("permissions", () => {
  it("reports exactly what the context holds", () => {
    const context = createAccountingContext({
      permissions: [accountingPermissions.requestsView],
    })
    expect(hasPermission(context, accountingPermissions.requestsView)).toBe(true)
    expect(hasPermission(context, accountingPermissions.requestsDecide)).toBe(false)
  })
})

describe("the scope fingerprint", () => {
  const base = {
    organizationId: "organization-alsalam",
    actor: { id: "e1", name: "n", active: true },
    permissions: ["b", "a"],
    authorizedBranchIds: ["branch-2", "branch-1"],
    organizationWide: false,
    currency: "EGP",
    precision: 2,
  }

  it("is independent of the order branches and permissions arrive in", () => {
    // Otherwise the same user misses their own cache after an unrelated reorder.
    expect(buildScopeFingerprint(base)).toBe(
      buildScopeFingerprint({
        ...base,
        permissions: ["a", "b"],
        authorizedBranchIds: ["branch-1", "branch-2"],
      })
    )
  })

  it("differs across organizations", () => {
    expect(buildScopeFingerprint(base)).not.toBe(
      buildScopeFingerprint({ ...base, organizationId: "organization-other" })
    )
  })

  it("differs across branch sets", () => {
    expect(buildScopeFingerprint(base)).not.toBe(
      buildScopeFingerprint({ ...base, authorizedBranchIds: ["branch-1"] })
    )
  })

  it("differs across permission sets", () => {
    expect(buildScopeFingerprint(base)).not.toBe(
      buildScopeFingerprint({ ...base, permissions: ["a"] })
    )
  })

  it("distinguishes organization-wide from an explicit branch list", () => {
    expect(buildScopeFingerprint(base)).not.toBe(
      buildScopeFingerprint({ ...base, organizationWide: true })
    )
  })
})
