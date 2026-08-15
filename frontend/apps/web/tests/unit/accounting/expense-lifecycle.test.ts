import { describe, expect, it } from "vitest"
import {
  allowedTransitions,
  expenseTransitionPolicy,
  isEditable,
  isTerminal,
  transitionRule,
} from "@/features/accounting/utils/expense-lifecycle"
import { accountingPermissions } from "@/features/accounting/config/accounting-permissions"
import type { ExpenseStatus } from "@/features/accounting/types/common"

const every: ExpenseStatus[] = [
  "draft",
  "submitted",
  "under-review",
  "returned-for-revision",
  "approved",
  "rejected",
  "paid",
  "cancelled",
]

describe("the documented path", () => {
  it("goes draft → submitted → under-review → decided", () => {
    expect(allowedTransitions("draft").sort()).toEqual(["cancelled", "submitted"])
    expect(allowedTransitions("submitted").sort()).toEqual([
      "cancelled",
      "under-review",
    ])
    expect(allowedTransitions("under-review").sort()).toEqual([
      "approved",
      "cancelled",
      "rejected",
      "returned-for-revision",
    ])
  })

  it("lets a returned request be resubmitted", () => {
    expect(allowedTransitions("returned-for-revision").sort()).toEqual([
      "cancelled",
      "submitted",
    ])
  })

  it("allows paid only from approved", () => {
    expect(transitionRule("approved", "paid")).toBeDefined()
    for (const from of every.filter((status) => status !== "approved"))
      expect(transitionRule(from, "paid"), from).toBeUndefined()
  })

  it("cannot decide a request that was never put under review", () => {
    for (const to of ["approved", "rejected", "returned-for-revision"] as const) {
      expect(transitionRule("draft", to)).toBeUndefined()
      expect(transitionRule("submitted", to)).toBeUndefined()
    }
  })

  it("never allows a request to return to an earlier state", () => {
    expect(transitionRule("under-review", "draft")).toBeUndefined()
    expect(transitionRule("approved", "under-review")).toBeUndefined()
    expect(transitionRule("paid", "approved")).toBeUndefined()
  })
})

/**
 * The four terminal statuses have no outgoing rows, so "a paid request cannot be
 * edited" and "cancellation only before approval" need no separate guard — they
 * are properties of the table itself.
 */
describe("terminal statuses are terminal by construction", () => {
  it("offers no transition out of approved-terminal states", () => {
    for (const status of ["rejected", "paid", "cancelled"] as const)
      expect(allowedTransitions(status), status).toEqual([])
  })

  it("reports the terminal set", () => {
    expect(every.filter(isTerminal).sort()).toEqual([
      "cancelled",
      "paid",
      "rejected",
    ])
  })

  it("has no cancel row from approved, so cancellation is pre-approval only", () => {
    expect(transitionRule("approved", "cancelled")).toBeUndefined()
  })

  it("never names a target outside the known status set", () => {
    for (const status of every)
      for (const target of allowedTransitions(status))
        expect(every).toContain(target)
  })
})

describe("editability is derived, not stored", () => {
  it("is true only for draft and returned", () => {
    expect(isEditable("draft")).toBe(true)
    expect(isEditable("returned-for-revision")).toBe(true)
    for (const status of every.filter(
      (candidate) =>
        candidate !== "draft" && candidate !== "returned-for-revision"
    ))
      expect(isEditable(status), status).toBe(false)
  })
})

describe("each transition carries its own authority", () => {
  it("requires the decide permission for every decision", () => {
    for (const to of ["approved", "rejected", "returned-for-revision"] as const)
      expect(transitionRule("under-review", to)?.permission).toBe(
        accountingPermissions.requestsDecide
      )
  })

  it("requires the review permission to start a review", () => {
    expect(transitionRule("submitted", "under-review")?.permission).toBe(
      accountingPermissions.requestsReview
    )
  })

  it("requires its own permission to mark paid, not the decide permission", () => {
    const rule = transitionRule("approved", "paid")
    expect(rule?.permission).toBe(accountingPermissions.requestsMarkPaid)
    expect(rule?.permission).not.toBe(accountingPermissions.requestsDecide)
  })

  it("requires the submit permission for both submission and resubmission", () => {
    expect(transitionRule("draft", "submitted")?.permission).toBe(
      accountingPermissions.requestsSubmit
    )
    expect(
      transitionRule("returned-for-revision", "submitted")?.permission
    ).toBe(accountingPermissions.requestsSubmit)
  })

  it("never satisfies a decision step with a non-decision permission", () => {
    for (const [from, targets] of Object.entries(expenseTransitionPolicy))
      for (const [to, rule] of Object.entries(targets))
        if (to === "approved" || to === "rejected" || to === "returned-for-revision")
          expect(rule.permission, `${from} → ${to}`).toBe(
            accountingPermissions.requestsDecide
          )
  })

  it("never satisfies any transition with a read-only permission", () => {
    const readOnly: string[] = [
      accountingPermissions.view,
      accountingPermissions.dashboardView,
      accountingPermissions.requestsView,
      accountingPermissions.categoriesView,
      accountingPermissions.historyView,
      accountingPermissions.export,
    ]
    for (const targets of Object.values(expenseTransitionPolicy))
      for (const rule of Object.values(targets))
        expect(readOnly).not.toContain(rule.permission)
  })
})

describe("notes", () => {
  it("requires a note for every negative outcome", () => {
    expect(transitionRule("under-review", "rejected")?.reasonRequired).toBe(true)
    expect(
      transitionRule("under-review", "returned-for-revision")?.reasonRequired
    ).toBe(true)
    for (const from of [
      "draft",
      "submitted",
      "under-review",
      "returned-for-revision",
    ] as const)
      expect(transitionRule(from, "cancelled")?.reasonRequired, from).toBe(true)
  })

  it("does not demand one for approving, submitting, reviewing, or paying", () => {
    expect(transitionRule("under-review", "approved")?.reasonRequired).toBe(false)
    expect(transitionRule("draft", "submitted")?.reasonRequired).toBe(false)
    expect(transitionRule("submitted", "under-review")?.reasonRequired).toBe(false)
    expect(transitionRule("approved", "paid")?.reasonRequired).toBe(false)
  })
})

describe("allowedTransitions is the single source the UI reads", () => {
  it("returns nothing for an unknown status rather than throwing", () => {
    expect(allowedTransitions("not-a-status" as ExpenseStatus)).toEqual([])
  })

  it("agrees with the policy table for every status", () => {
    for (const status of every)
      expect(allowedTransitions(status).sort()).toEqual(
        Object.keys(expenseTransitionPolicy[status] ?? {}).sort()
      )
  })
})
