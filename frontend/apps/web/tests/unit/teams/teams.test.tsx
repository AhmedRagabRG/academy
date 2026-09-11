import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { permissionCatalog } from "@/shared/config/permission-catalog"
import { teamsPermissions } from "@/features/teams/config/teams-permissions"
import { organizationSettingsNavigation } from "@/features/organization-settings/config/navigation"
import { iconRegistry } from "@/shared/config/icon-registry"

afterEach(cleanup)

describe("teams wiring", () => {
  it("registers every team permission in the shared catalogue", () => {
    const keys = permissionCatalog.flatMap((group) =>
      group.permissions.map((permission) => permission.key),
    )
    for (const key of Object.values(teamsPermissions)) {
      expect(keys).toContain(key)
    }
  })

  it("exposes a settings nav entry whose icon key is registered", () => {
    const entry = organizationSettingsNavigation.children?.find(
      (child) => child.route === "/settings/teams",
    )
    expect(entry).toBeDefined()
    // A nav entry with an unregistered icon key renders nothing at all.
    expect(Object.keys(iconRegistry)).toContain(entry!.iconKey)
    expect(entry!.permissionKey).toBe(teamsPermissions.view)
  })
})

describe("TeamsScreen", () => {
  it("renders the empty state when no team exists", async () => {
    vi.doMock("@/features/teams/hooks/use-teams", () => ({
      useTeams: () => ({ data: [], isLoading: false, isError: false }),
      useCreateTeam: () => ({ mutate: vi.fn(), isPending: false }),
      useUpdateTeam: () => ({ mutate: vi.fn(), isPending: false }),
      useDeleteTeam: () => ({ mutate: vi.fn(), isPending: false }),
      useAddTeamMember: () => ({ mutate: vi.fn(), isPending: false }),
      useRemoveTeamMember: () => ({ mutate: vi.fn(), isPending: false }),
    }))
    vi.doMock("@/features/inbox/hooks/use-inbox-list", () => ({
      useInboxLookups: () => ({ data: { employees: [] } }),
    }))
    vi.doMock("@/shared/hooks/use-permission", () => ({
      usePermission: () => true,
    }))
    const { TeamsScreen } = await import(
      "@/features/teams/screens/teams-screen"
    )
    render(<TeamsScreen />)
    expect(screen.getByText("لا توجد فرق بعد")).toBeInTheDocument()
    vi.doUnmock("@/features/teams/hooks/use-teams")
    vi.doUnmock("@/features/inbox/hooks/use-inbox-list")
    vi.doUnmock("@/shared/hooks/use-permission")
  })
})
