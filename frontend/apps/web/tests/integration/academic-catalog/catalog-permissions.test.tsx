import { afterEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { CatalogPermissionBoundary } from "@/features/academic-catalog/components/catalog-permission-boundary"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import type {
  BranchId,
  EmployeeContext,
  EmployeeId,
  PermissionKey,
  RoleId,
} from "@/shared/types/foundation"

function setPermissions(permissionKeys: string[]) {
  const context: EmployeeContext = {
    employee: {
      id: "employee-test" as EmployeeId,
      displayName: "Test employee",
      email: "test@example.com",
      roleIds: ["role-test" as RoleId],
      branchIds: ["branch-test" as BranchId],
    },
    branch: {
      id: "branch-test" as BranchId,
      code: "test",
      displayName: "Test branch",
      status: "active",
    },
    role: {
      id: "role-test" as RoleId,
      code: "test-role",
      displayName: "Test role",
      permissionKeys: permissionKeys as PermissionKey[],
      status: "active",
    },
    authenticatedAt: "2026-07-31T00:00:00.000Z",
  }

  useEmployeeContextStore.getState().setContext(context)
}

describe("academic catalog permission boundary", () => {
  afterEach(() => useEmployeeContextStore.getState().setContext(null))

  it("renders the protected action when the employee has its permission", () => {
    setPermissions(["catalog.products.create"])

    render(
      <CatalogPermissionBoundary permission="catalog.products.create">
        <button type="button">Create product</button>
      </CatalogPermissionBoundary>
    )

    expect(screen.getByRole("button", { name: "Create product" })).toBeVisible()
  })

  it("hides the protected action when its permission is absent", () => {
    setPermissions(["catalog.products.view"])

    render(
      <CatalogPermissionBoundary
        permission="catalog.products.archive"
        fallback={<span>Forbidden</span>}
      >
        <button type="button">Archive product</button>
      </CatalogPermissionBoundary>
    )

    expect(
      screen.queryByRole("button", { name: "Archive product" })
    ).not.toBeInTheDocument()
    expect(screen.getByText("Forbidden")).toBeVisible()
  })
})
