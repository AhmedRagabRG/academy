/**
 * The client-side mirror of the server's branch visibility rule, used to narrow
 * the employee lists in the assignment UIs so nobody is offered a colleague who
 * would not be able to see the row once assigned.
 *
 * This is a usability filter, not a security boundary. Authorization lives in
 * `TicketPolicy.scope` / `InboxPolicy.scope` on the server, and a restricted
 * user never receives the rows in the first place. The reason to keep the two
 * in step anyway is that assigning a ticket to someone who cannot open it is a
 * silent dead end — the assignment succeeds and the work disappears.
 *
 * Both escape hatches from `core/authorization/branch-scope.ts` are reproduced
 * here, and both are load-bearing on a system that predates branches:
 *
 *   * An employee with no branches is unrestricted, so they are always
 *     assignable.
 *   * A row with no branch is visible to everyone, so every employee is
 *     assignable to it.
 */
export const assignableToBranch = (
  employeeBranchIds: readonly string[] | undefined,
  rowBranchId: string | null | undefined
): boolean => {
  if (!rowBranchId) return true
  const branchIds = employeeBranchIds ?? []
  if (!branchIds.length) return true
  return branchIds.includes(rowBranchId)
}

/**
 * Filters a list of employees down to those who could see `rowBranchId`.
 *
 * `currentlyAssignedId` is always kept, even when the rule would drop them: a
 * ticket can already be assigned to someone whose branches changed afterwards,
 * and silently omitting them would make the select fall back to "unassigned"
 * and quietly unassign the ticket on the next save.
 */
export const employeesForBranch = <
  T extends { id: string; branchIds?: string[] },
>(
  employees: readonly T[],
  rowBranchId: string | null | undefined,
  currentlyAssignedId?: string | null
): T[] =>
  employees.filter(
    (employee) =>
      employee.id === currentlyAssignedId ||
      assignableToBranch(employee.branchIds, rowBranchId)
  )
