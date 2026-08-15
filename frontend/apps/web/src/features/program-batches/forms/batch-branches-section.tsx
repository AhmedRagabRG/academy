"use client"
import { useFormContext, useWatch } from "react-hook-form"
import type { BatchLookups, BranchAssignment } from "../types/domain"
export function BatchBranchesSection({ lookups }: { lookups: BatchLookups }) {
  const { control, setValue } = useFormContext(),
    values = (useWatch({ control, name: "branchAssignments" }) ??
      []) as BranchAssignment[]
  const toggle = (branchId: string, role: "registration" | "study") => {
    const exists = values.some(
      (x) => x.branchId === branchId && x.role === role
    )
    setValue(
      "branchAssignments",
      exists
        ? values.filter((x) => !(x.branchId === branchId && x.role === role))
        : [...values, { branchId, role, status: "active" }],
      { shouldDirty: true, shouldValidate: true }
    )
  }
  return (
    <fieldset>
      <legend className="font-heading text-lg font-bold">توفر الفروع</legend>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(["registration", "study"] as const).map((role) => (
          <fieldset key={role} className="rounded-lg border p-4">
            <legend className="px-2 font-medium">
              {role === "registration" ? "فروع التسجيل" : "فروع الدراسة"}
            </legend>
            {lookups.branches.map((branch) => (
              <label
                key={branch.value}
                className="flex min-h-11 items-center gap-2"
              >
                <input
                  type="checkbox"
                  disabled={branch.status !== "active"}
                  checked={values.some(
                    (x) => x.branchId === branch.value && x.role === role
                  )}
                  onChange={() => toggle(branch.value, role)}
                />
                {branch.label}
                {branch.status !== "active" && " (غير نشط)"}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </fieldset>
  )
}
