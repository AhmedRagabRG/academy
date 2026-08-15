import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { PermissionMatrixForm } from "@/features/organization-settings/forms/permission-matrix-form"
// Test fixtures intentionally validate the matrix in isolation from the service adapter.
// eslint-disable-next-line no-restricted-imports
import { permissionGroups } from "@/features/organization-settings/data/organization-settings-fixtures"
// eslint-disable-next-line no-restricted-imports
import { roles } from "@/features/organization-settings/data/access-fixtures"
describe("permission matrix", () => { it("labels groups and submits selected permissions", async () => { const submit = vi.fn(); render(<PermissionMatrixForm role={roles[1]!} groups={permissionGroups.slice(0, 1)} pending={false} onSubmit={submit} />); expect(screen.getByText("لوحة التحكم")).toBeInTheDocument(); await userEvent.click(screen.getByLabelText("تحديد المجموعة")); await userEvent.click(screen.getByRole("button", { name: "حفظ الصلاحيات" })); expect(submit).toHaveBeenCalled() }) })
