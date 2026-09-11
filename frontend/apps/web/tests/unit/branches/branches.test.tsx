import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { permissionCatalog } from "@/shared/config/permission-catalog"
import { branchesPermissions } from "@/features/branches/config/branches-permissions"
import { organizationSettingsNavigation } from "@/features/organization-settings/config/navigation"
import { iconRegistry } from "@/shared/config/icon-registry"
import { branchesService } from "@/features/branches/services/branches-service"
import type { BranchId } from "@/features/branches/types/domain"

afterEach(cleanup)

describe("branches wiring", () => {
  it("registers every branch permission in the shared catalogue", () => {
    const keys = permissionCatalog.flatMap((group) =>
      group.permissions.map((permission) => permission.key)
    )
    for (const key of Object.values(branchesPermissions)) {
      expect(keys).toContain(key)
    }
  })

  it("exposes a settings nav entry whose icon key is registered", () => {
    const entry = organizationSettingsNavigation.children?.find(
      (child) => child.route === "/settings/branches"
    )
    expect(entry).toBeDefined()
    // A nav entry with an unregistered icon key renders nothing at all.
    expect(Object.keys(iconRegistry)).toContain(entry!.iconKey)
    expect(entry!.permissionKey).toBe(branchesPermissions.view)
  })
})

describe("branches mock service", () => {
  it("creates a branch that starts active and unreferenced", async () => {
    const created = await branchesService.create({
      name: "الإسكندرية",
      code: "alexandria",
    })
    expect(created.active).toBe(true)
    // A brand new branch cannot already own rows, and the delete guard reads
    // these counts to decide whether to talk the user out of deleting.
    expect(created.ticketCount).toBe(0)
    expect(created.memberCount).toBe(0)
    await branchesService.remove(created.id, created.version)
  })

  it("rejects an update carrying a stale version", async () => {
    const [branch] = await branchesService.list()
    await expect(
      branchesService.update({
        id: branch!.id,
        expectedVersion: branch!.version + 99,
        name: "اسم آخر",
      })
    ).rejects.toThrow()
  })

  it("round-trips an account branch assignment", async () => {
    const accounts = await branchesService.accounts()
    const unrestricted = accounts.find((a) => a.branchIds.length === 0)
    expect(unrestricted).toBeDefined()
    const result = await branchesService.setAccountBranches(
      unrestricted!.accountId,
      ["branch-cairo" as BranchId]
    )
    expect(result.branchIds).toEqual(["branch-cairo"])
    // Restore, because an empty list is the unrestricted case the other
    // assertions in this file depend on finding.
    await branchesService.setAccountBranches(unrestricted!.accountId, [])
  })
})

describe("AccountBranchesScreen", () => {
  it("calls an empty assignment unrestricted rather than blank", async () => {
    // The whole safety story rests on empty meaning "sees everything". If this
    // ever renders as "no branches", an admin will read it as "no access" and
    // start assigning branches to people who did not need them.
    vi.doMock("@/features/branches/hooks/use-branches", () => ({
      useAccounts: () => ({
        data: [
          {
            accountId: "acc-1",
            displayName: "أحمد محمد",
            branchIds: [],
            organizationWide: false,
          },
        ],
        isLoading: false,
        isError: false,
      }),
      useBranches: () => ({ data: [], isLoading: false, isError: false }),
      useSetAccountBranches: () => ({ mutate: vi.fn(), isPending: false }),
    }))
    const { AccountBranchesScreen } =
      await import("@/features/branches/screens/account-branches-screen")
    render(<AccountBranchesScreen />)
    expect(screen.getByText("يرى كل الفروع غير المقيّد")).toBeInTheDocument()
    vi.doUnmock("@/features/branches/hooks/use-branches")
  })
})

describe("BranchesScreen", () => {
  it("renders the empty state when no branch exists", async () => {
    vi.doMock("@/features/branches/hooks/use-branches", () => ({
      useBranches: () => ({ data: [], isLoading: false, isError: false }),
      useCreateBranch: () => ({ mutate: vi.fn(), isPending: false }),
      useUpdateBranch: () => ({ mutate: vi.fn(), isPending: false }),
      useDeleteBranch: () => ({ mutate: vi.fn(), isPending: false }),
    }))
    vi.doMock("@/shared/hooks/use-permission", () => ({
      usePermission: () => true,
    }))
    const { BranchesScreen } =
      await import("@/features/branches/screens/branches-screen")
    render(<BranchesScreen />)
    expect(screen.getByText("لا توجد فروع بعد")).toBeInTheDocument()
    vi.doUnmock("@/features/branches/hooks/use-branches")
    vi.doUnmock("@/shared/hooks/use-permission")
  })
})
