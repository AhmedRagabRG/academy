import { describe, expect, it } from "vitest"
import { studentWorkspaceTabs } from "@/shared/config/student-workspace-tabs"
import { studentFinanceWorkspaceTab } from "@/features/student-finance/config/workspace-tab"

/**
 * The workspace tab list is aggregated statically, the same way
 * `foundation-navigation.ts` aggregates navigation entries. Student Management
 * reads this list and never imports the feature a tab belongs to.
 */
describe("student workspace tab contributions", () => {
  it("includes the finance tab", () => {
    expect(studentWorkspaceTabs().map((tab) => tab.id)).toContain("student-finance")
  })

  it("returns tabs sorted by order", () => {
    const orders = studentWorkspaceTabs().map((tab) => tab.order)
    expect(orders).toEqual([...orders].sort((left, right) => left - right))
  })

  it("keeps contributed tabs after Student Management's own tabs", () => {
    // Student Management occupies 10–40; contributions start at 50.
    for (const tab of studentWorkspaceTabs())
      expect(tab.order).toBeGreaterThanOrEqual(50)
  })

  it("carries the permission key the workspace filters on", () => {
    expect(studentFinanceWorkspaceTab.permissionKey).toBe("finance.view")
  })

  it("routes to a segment under the student workspace, not a separate page", () => {
    expect(studentFinanceWorkspaceTab.segment).toBe("finance")
    expect(studentFinanceWorkspaceTab.segment).not.toContain("/")
  })

  it("returns a copy so callers cannot mutate the aggregate", () => {
    const first = studentWorkspaceTabs() as StudentWorkspaceTabMutable[]
    const originalLength = first.length
    first.push({ ...studentFinanceWorkspaceTab, id: "rogue" })
    expect(studentWorkspaceTabs()).toHaveLength(originalLength)
  })

  it("gives every tab a unique id", () => {
    const ids = studentWorkspaceTabs().map((tab) => tab.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

type StudentWorkspaceTabMutable = ReturnType<typeof studentWorkspaceTabs>[number]
