import { describe, expect, it } from "vitest"
import {
  assignableToBranch,
  employeesForBranch,
} from "@/features/branches/utils/branch-assignment"

/**
 * This filter mirrors the server's branch visibility rule. Getting it wrong is
 * asymmetric in the same way the server rule is: too narrow and an assignment
 * list goes empty on a system that predates branches, too wide and someone is
 * offered a colleague who will never see the row. Both directions are asserted.
 */
describe("assignableToBranch", () => {
  it("allows everyone when the row has no branch", () => {
    // Every row predating branches has a null branchId.
    expect(assignableToBranch(["b1"], null)).toBe(true)
    expect(assignableToBranch(["b1"], undefined)).toBe(true)
  })

  it("allows an employee with no branches anywhere", () => {
    // Every account predating branches has an empty array, and empty means
    // unrestricted rather than "no access".
    expect(assignableToBranch([], "b1")).toBe(true)
    expect(assignableToBranch(undefined, "b1")).toBe(true)
  })

  it("allows an employee assigned to the row's branch", () => {
    expect(assignableToBranch(["b1", "b2"], "b2")).toBe(true)
  })

  it("refuses an employee confined to other branches", () => {
    expect(assignableToBranch(["b1"], "b2")).toBe(false)
  })
})

describe("employeesForBranch", () => {
  const employees = [
    { id: "cairo-only", branchIds: ["branch-cairo"] },
    { id: "giza-only", branchIds: ["branch-giza"] },
    { id: "unrestricted", branchIds: [] },
  ]

  it("keeps only those who can see the branch, plus the unrestricted", () => {
    expect(
      employeesForBranch(employees, "branch-cairo").map((e) => e.id)
    ).toEqual(["cairo-only", "unrestricted"])
  })

  it("keeps everyone when the row has no branch", () => {
    expect(employeesForBranch(employees, null)).toHaveLength(3)
  })

  it("keeps the current assignee even once they no longer qualify", () => {
    // A ticket can already be assigned to someone whose branches changed after
    // the fact. Dropping them would make the select fall back to "unassigned"
    // and silently unassign the ticket the next time the form is saved.
    const result = employeesForBranch(employees, "branch-cairo", "giza-only")
    expect(result.map((e) => e.id)).toContain("giza-only")
  })

  it("does not duplicate the current assignee when they still qualify", () => {
    const result = employeesForBranch(employees, "branch-cairo", "cairo-only")
    expect(result.filter((e) => e.id === "cairo-only")).toHaveLength(1)
  })
})
