import { describe, expect, it } from "vitest"
import {
  affectsBalance,
  allowedRefundTransitions,
  refundTransitionPolicy,
  refundTransitionRule,
} from "@/features/student-finance/utils/finance-lifecycle"
import { financePermissions } from "@/features/student-finance/config/finance-permissions"
import type { RefundStatus } from "@/features/student-finance/types/common"

const every: RefundStatus[] = [
  "requested",
  "approved",
  "completed",
  "rejected",
  "cancelled",
]

describe("the refund path", () => {
  it("goes requested → approved → completed and nowhere else forward", () => {
    expect(allowedRefundTransitions("requested").sort()).toEqual([
      "approved",
      "cancelled",
      "rejected",
    ])
    expect(allowedRefundTransitions("approved").sort()).toEqual([
      "cancelled",
      "completed",
    ])
  })

  it("cannot complete a refund that was never approved", () => {
    expect(refundTransitionRule("requested", "completed")).toBeUndefined()
  })

  it("treats completed, rejected, and cancelled as terminal", () => {
    for (const status of ["completed", "rejected", "cancelled"] as const)
      expect(allowedRefundTransitions(status)).toEqual([])
  })

  it("never allows a refund to return to an earlier state", () => {
    expect(refundTransitionRule("approved", "requested")).toBeUndefined()
    expect(refundTransitionRule("completed", "approved")).toBeUndefined()
    expect(refundTransitionRule("rejected", "requested")).toBeUndefined()
  })

  it("offers no transition at all to deletion — there is no such state", () => {
    // Refunds are never removed; the terminal states are the whole vocabulary
    // (spec FR-046).
    for (const status of every)
      for (const target of allowedRefundTransitions(status))
        expect(every).toContain(target)
  })
})

describe("approval is separate from recording", () => {
  it("requires the approve permission to approve, reject, or complete", () => {
    expect(refundTransitionRule("requested", "approved")?.permission).toBe(
      financePermissions.refundsApprove
    )
    expect(refundTransitionRule("requested", "rejected")?.permission).toBe(
      financePermissions.refundsApprove
    )
    expect(refundTransitionRule("approved", "completed")?.permission).toBe(
      financePermissions.refundsApprove
    )
  })

  it("lets the requester cancel their own request with the record permission", () => {
    expect(refundTransitionRule("requested", "cancelled")?.permission).toBe(
      financePermissions.refundsRecord
    )
  })

  it("never satisfies an approval step with the record permission", () => {
    for (const [from, targets] of Object.entries(refundTransitionPolicy))
      for (const [to, rule] of Object.entries(targets))
        if (to === "approved" || to === "rejected" || to === "completed")
          expect(rule.permission, `${from} → ${to}`).toBe(
            financePermissions.refundsApprove
          )
  })

  it("never satisfies any refund step with the payment-recording permission", () => {
    for (const targets of Object.values(refundTransitionPolicy))
      for (const rule of Object.values(targets))
        expect(rule.permission).not.toBe(financePermissions.paymentsRecord)
  })
})

describe("reasons", () => {
  it("requires a reason for every negative outcome", () => {
    expect(refundTransitionRule("requested", "rejected")?.reasonRequired).toBe(true)
    expect(refundTransitionRule("requested", "cancelled")?.reasonRequired).toBe(true)
    expect(refundTransitionRule("approved", "cancelled")?.reasonRequired).toBe(true)
  })

  it("does not demand one for approving or completing", () => {
    expect(refundTransitionRule("requested", "approved")?.reasonRequired).toBe(false)
    expect(refundTransitionRule("approved", "completed")?.reasonRequired).toBe(false)
  })
})

describe("only a completed refund moves money", () => {
  it("counts completed and nothing else", () => {
    expect(affectsBalance("completed")).toBe(true)
    for (const status of ["requested", "approved", "rejected", "cancelled"] as const)
      expect(affectsBalance(status), status).toBe(false)
  })
})
