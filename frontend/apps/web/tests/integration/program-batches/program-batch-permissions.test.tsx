import { afterEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { BatchPermission } from "@/features/program-batches/components/program-batch-permission-boundary"
import { useEmployeeContextStore } from "@/shared/store/employee-context-store"
import type {
  BranchId,
  EmployeeId,
  PermissionKey,
  RoleId,
} from "@/shared/types/foundation"
const keys = [
  "batches.view",
  "batches.create",
  "batches.update",
  "batches.export",
  "batches.capacity.manage",
  "batches.pricing.manage",
  "batches.branches.manage",
  "batches.registration.open",
  "batches.registration.close",
  "batches.registration.correct",
  "batches.study.start",
  "batches.graduate",
  "batches.archive",
]
function setPermissions(values: string[]) {
  useEmployeeContextStore.getState().setContext({
    employee: {
      id: "e" as EmployeeId,
      displayName: "Test",
      email: "t@example.com",
      roleIds: ["r" as RoleId],
      branchIds: ["b" as BranchId],
    },
    role: {
      id: "r" as RoleId,
      code: "test",
      displayName: "Test",
      permissionKeys: values as PermissionKey[],
      status: "active",
    },
    branch: {
      id: "b" as BranchId,
      code: "b",
      displayName: "B",
      status: "active",
    },
    authenticatedAt: "2026-07-31T00:00:00Z",
  })
}
describe("batch permissions", () => {
  afterEach(() => useEmployeeContextStore.getState().setContext(null))
  it("recognizes all granular keys", () => {
    for (const key of keys) {
      setPermissions([key])
      const { unmount } = render(
        <BatchPermission permission={key}>
          <span>{key}</span>
        </BatchPermission>
      )
      expect(screen.getByText(key)).toBeVisible()
      unmount()
    }
  })
  it("hides an action without its exact key", () => {
    setPermissions(["batches.view"])
    render(
      <BatchPermission permission="batches.archive">
        <button>Archive</button>
      </BatchPermission>
    )
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
