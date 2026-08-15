"use client"

import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { usePermission } from "@/shared/hooks/use-permission"
import type { RefundStatus } from "../types/common"
import type { RefundSummary } from "../types/projections"
import { refundCopy } from "../config/finance-copy"
import { financePermissions } from "../config/finance-permissions"
import {
  allowedRefundTransitions,
  refundTransitionRule,
} from "../utils/finance-lifecycle"
import { RefundStatusBadge } from "./invoice-status-badge"

export interface RefundDecision {
  refund: RefundSummary
  to: Extract<RefundStatus, "approved" | "rejected" | "completed">
  reason?: string
}

/**
 * The decisions available on a refund, derived from the transition policy rather
 * than hardcoded per status — a policy change reaches the UI without an edit here.
 *
 * Permission gating is an affordance only: the service checks every transition
 * again, and both checks read the same key from the same policy.
 */
export function RefundStatusActions({
  refund,
  pending,
  onDecide,
}: {
  refund: RefundSummary
  pending: boolean
  onDecide: (decision: RefundDecision) => void
}) {
  const canApprove = usePermission(financePermissions.refundsApprove)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")

  const available = allowedRefundTransitions(refund.status).filter(
    (to): to is RefundDecision["to"] =>
      to === "approved" || to === "rejected" || to === "completed"
  )
  const allowed = available.filter((to) => {
    const rule = refundTransitionRule(refund.status, to)
    return rule?.permission === financePermissions.refundsApprove
      ? canApprove
      : true
  })

  if (allowed.length === 0)
    return <RefundStatusBadge status={refund.status} />

  const label: Record<RefundDecision["to"], string> = {
    approved: refundCopy.approve,
    rejected: refundCopy.reject,
    completed: refundCopy.complete,
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RefundStatusBadge status={refund.status} />
      {allowed.map((to) =>
        to === "rejected" ? (
          <Button
            key={to}
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setRejecting(true)}
          >
            {label[to]}
          </Button>
        ) : (
          <Button
            key={to}
            size="sm"
            variant={to === "completed" ? "default" : "outline"}
            disabled={pending}
            onClick={() => onDecide({ refund, to })}
          >
            {label[to]}
          </Button>
        )
      )}

      {rejecting && (
        <form
          className="flex w-full flex-wrap items-start gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            // A rejection without a reason is refused by the service, so the form
            // never submits an empty one.
            if (!reason.trim()) return
            onDecide({ refund, to: "rejected", reason: reason.trim() })
            setRejecting(false)
            setReason("")
          }}
        >
          <label className="sr-only" htmlFor={`reject-${refund.id}`}>
            سبب الرفض
          </label>
          <input
            id={`reject-${refund.id}`}
            autoFocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="سبب الرفض"
            className="border-input bg-background focus-visible:ring-ring h-9 min-w-48 flex-1 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
          />
          <Button size="sm" type="submit" disabled={!reason.trim() || pending}>
            تأكيد الرفض
          </Button>
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              setRejecting(false)
              setReason("")
            }}
          >
            إلغاء
          </Button>
        </form>
      )}
    </div>
  )
}
