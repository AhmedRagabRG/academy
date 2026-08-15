import type { BranchAssignment } from "../types/domain"
export function normalizeAssignments(values: BranchAssignment[]) {
  return values.filter(
    (item, index) =>
      values.findIndex(
        (other) => other.branchId === item.branchId && other.role === item.role
      ) === index
  )
}
