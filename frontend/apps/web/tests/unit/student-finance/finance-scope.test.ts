import { describe, expect, it } from "vitest"
import {
  branchIdsInScope,
  buildScopeFingerprint,
  defaultFinanceContext,
  hasFinancePermission,
  isInScope,
  type FinanceServiceContext,
} from "@/features/student-finance/utils/finance-scope"
import { financePermissions } from "@/features/student-finance/config/finance-permissions"

const context = (patch: Partial<FinanceServiceContext>): FinanceServiceContext => ({
  ...defaultFinanceContext,
  ...patch,
})

const record = (branchId: string, organizationId = "organization-alsalam") => ({
  organizationId,
  branchId,
})

describe("organization isolation comes first", () => {
  it("excludes a record from another organization even for an org-wide user", () => {
    expect(
      isInScope(
        record("branch-main", "organization-other"),
        context({ organizationWide: true })
      )
    ).toBe(false)
  })

  it("excludes it even when the branch id happens to match", () => {
    const scoped = context({
      organizationWide: false,
      authorizedBranchIds: ["branch-main"],
    })
    expect(isInScope(record("branch-main", "organization-other"), scoped)).toBe(
      false
    )
  })
})

describe("branch intersection", () => {
  it("admits every branch for an organization-wide user", () => {
    const wide = context({ organizationWide: true, authorizedBranchIds: [] })
    for (const branch of ["branch-main", "branch-cairo", "branch-unknown"])
      expect(isInScope(record(branch), wide), branch).toBe(true)
  })

  it("admits only the authorized branches otherwise", () => {
    const scoped = context({
      organizationWide: false,
      authorizedBranchIds: ["branch-cairo", "branch-giza"],
    })
    expect(isInScope(record("branch-cairo"), scoped)).toBe(true)
    expect(isInScope(record("branch-giza"), scoped)).toBe(true)
    expect(isInScope(record("branch-main"), scoped)).toBe(false)
  })

  it("admits nothing when a restricted user has no branches", () => {
    const none = context({ organizationWide: false, authorizedBranchIds: [] })
    expect(isInScope(record("branch-main"), none)).toBe(false)
  })

  it("reports the branch filter a query should apply", () => {
    expect(branchIdsInScope(context({ organizationWide: true }))).toBeUndefined()
    expect(
      branchIdsInScope(
        context({ organizationWide: false, authorizedBranchIds: ["branch-alex"] })
      )
    ).toEqual(["branch-alex"])
  })
})

describe("permissions are exact keys", () => {
  it("matches only the exact key", () => {
    const limited = context({ permissions: [financePermissions.invoicesView] })
    expect(hasFinancePermission(limited, financePermissions.invoicesView)).toBe(true)
    expect(hasFinancePermission(limited, financePermissions.invoicesCreate)).toBe(
      false
    )
  })

  it("does not treat a prefix as a match", () => {
    const limited = context({ permissions: ["finance.invoices"] })
    expect(hasFinancePermission(limited, financePermissions.invoicesView)).toBe(
      false
    )
  })

  it("grants nothing to a user with no permissions", () => {
    const none = context({ permissions: [] })
    for (const permission of Object.values(financePermissions))
      expect(hasFinancePermission(none, permission), permission).toBe(false)
  })
})

/**
 * The fingerprint is part of every query key, so two different scopes can never
 * read each other's cached results (research R8).
 */
describe("the scope fingerprint", () => {
  const build = (patch: Partial<FinanceServiceContext>) =>
    buildScopeFingerprint(context(patch))

  it("differs between an organization-wide and a branch-scoped user", () => {
    expect(build({ organizationWide: true })).not.toBe(
      build({ organizationWide: false, authorizedBranchIds: ["branch-main"] })
    )
  })

  it("differs between two different branch sets", () => {
    expect(
      build({ organizationWide: false, authorizedBranchIds: ["branch-main"] })
    ).not.toBe(
      build({ organizationWide: false, authorizedBranchIds: ["branch-cairo"] })
    )
  })

  it("differs between two different permission sets", () => {
    expect(build({ permissions: [financePermissions.invoicesView] })).not.toBe(
      build({
        permissions: [
          financePermissions.invoicesView,
          financePermissions.export,
        ],
      })
    )
  })

  it("differs between organizations", () => {
    expect(build({ organizationId: "organization-a" })).not.toBe(
      build({ organizationId: "organization-b" })
    )
  })

  it("does not depend on the order the branches or permissions arrive in", () => {
    expect(
      build({
        organizationWide: false,
        authorizedBranchIds: ["branch-main", "branch-cairo"],
        permissions: [financePermissions.export, financePermissions.invoicesView],
      })
    ).toBe(
      build({
        organizationWide: false,
        authorizedBranchIds: ["branch-cairo", "branch-main"],
        permissions: [financePermissions.invoicesView, financePermissions.export],
      })
    )
  })

  it("is stable across repeated calls", () => {
    const input = {
      organizationWide: false,
      authorizedBranchIds: ["branch-giza"],
    }
    expect(build(input)).toBe(build(input))
  })
})
