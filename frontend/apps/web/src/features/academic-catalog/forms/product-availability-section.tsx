"use client"
import { useFormContext } from "react-hook-form"
import type { ProductFormValues } from "../schemas/product-schema"
import type { CatalogLookups } from "../types/configuration"
import type { BranchRole } from "../types/common"
const roles: Array<{ role: BranchRole; label: string }> = [
  { role: "registration", label: "فروع التسجيل" },
  { role: "study", label: "فروع الدراسة" },
  { role: "general", label: "الفروع المتاحة" },
]
export function ProductAvailabilitySection({
  lookups,
}: {
  lookups: CatalogLookups
}) {
  const { watch, setValue } = useFormContext<ProductFormValues>()
  const assignments = watch("branches")
  const toggle = (branchId: string, role: BranchRole, checked: boolean) =>
    setValue(
      "branches",
      checked
        ? [...assignments, { branchId, role }]
        : assignments.filter(
            (item) => !(item.branchId === branchId && item.role === role)
          ),
      { shouldDirty: true }
    )
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {roles.map(({ role, label }) => (
        <fieldset key={role} className="rounded-lg border p-4">
          <legend className="px-2 font-medium">{label}</legend>
          <div className="space-y-2">
            {lookups.branches
              .filter((item) => item.status === "active")
              .map((branch) => (
                <label
                  key={branch.value}
                  className="flex min-h-10 items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={assignments.some(
                      (item) =>
                        item.branchId === branch.value && item.role === role
                    )}
                    onChange={(event) =>
                      toggle(branch.value, role, event.target.checked)
                    }
                  />
                  {branch.label}
                </label>
              ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
