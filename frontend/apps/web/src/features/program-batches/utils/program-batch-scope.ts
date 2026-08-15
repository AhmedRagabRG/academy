import type { BranchAssignment } from "../types/domain"
export const intersectsScope = (
  assignments: BranchAssignment[],
  branchIds: string[]
) =>
  branchIds.length === 0 ||
  assignments.some((x) => branchIds.includes(x.branchId))
