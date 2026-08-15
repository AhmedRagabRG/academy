"use client"

import { useState } from "react"
import { Check, RotateCcw, ScanEye, Wallet, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import type { DecisionKind, ExpenseStatus } from "../types/common"
import type { ExpenseRequestDetail } from "../types/projections"
import { approvalCopy } from "../config/accounting-copy"
import { transitionRule } from "../utils/expense-lifecycle"
import { DecisionDialog } from "./decision-dialog"
import { MarkPaidDialog } from "./mark-paid-dialog"
import { AccountingBidiValue } from "./accounting-area-states"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
})
const formatMoment = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

const decisionFor: Partial<Record<ExpenseStatus, DecisionKind>> = {
  approved: "approved",
  rejected: "rejected",
  "returned-for-revision": "returned",
}

const label: Record<DecisionKind, string> = {
  approved: approvalCopy.approve,
  rejected: approvalCopy.reject,
  returned: approvalCopy.return,
}

const icon = {
  approved: Check,
  rejected: X,
  returned: RotateCcw,
} as const

/**
 * The decisions available on a request.
 *
 * Derived from `derived.availableTransitions` — which the service computes from
 * the policy table and the acting user's permissions — rather than hardcoded per
 * status. A policy change reaches this panel with no edit here, and the buttons
 * shown are provably the same set the service will accept.
 */
export function DecisionPanel({
  request,
  pending,
  onStartReview,
  onDecide,
  onMarkPaid,
}: {
  request: ExpenseRequestDetail
  pending: boolean
  onStartReview: () => void
  onDecide: (decision: DecisionKind, note?: string) => void
  onMarkPaid: () => void
}) {
  const [dialog, setDialog] = useState<DecisionKind | undefined>(undefined)
  const [payingOpen, setPayingOpen] = useState(false)

  const canStartReview = request.derived.availableTransitions.includes("under-review")
  const canMarkPaid = request.derived.availableTransitions.includes("paid")
  const decisions = request.derived.availableTransitions
    .map((status) => decisionFor[status])
    .filter((decision): decision is DecisionKind => Boolean(decision))

  const noteRequired =
    dialog !== undefined &&
    Boolean(
      transitionRule(
        request.status,
        dialog === "returned" ? "returned-for-revision" : dialog
      )?.reasonRequired
    )

  return (
    <Card className="space-y-4">
      {request.reviewer && (
        <p className="text-muted-foreground text-sm">
          {approvalCopy.reviewer}: {request.reviewer.name}
        </p>
      )}

      {request.decision && (
        <div className="text-sm">
          <p className="font-medium">
            {approvalCopy.decidedBy} {request.decision.decidedBy.name} ·{" "}
            <AccountingBidiValue>
              {formatMoment(request.decision.decidedAt)}
            </AccountingBidiValue>
          </p>
          {request.decision.note && (
            <p className="text-muted-foreground mt-1">{request.decision.note}</p>
          )}
        </div>
      )}

      {canStartReview && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">
            {approvalCopy.startReviewNotice}
          </p>
          <Button onClick={onStartReview} disabled={pending}>
            <ScanEye aria-hidden />
            {approvalCopy.startReview}
          </Button>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {decisions.map((decision) => {
            const Icon = icon[decision]
            return (
              <Button
                key={decision}
                variant={decision === "approved" ? "default" : "outline"}
                disabled={pending}
                onClick={() => setDialog(decision)}
              >
                <Icon aria-hidden />
                {label[decision]}
              </Button>
            )
          })}
        </div>
      )}

      {canMarkPaid && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">{approvalCopy.markPaidNotice}</p>
          <Button onClick={() => setPayingOpen(true)} disabled={pending}>
            <Wallet aria-hidden />
            {approvalCopy.markPaid}
          </Button>
        </div>
      )}

      {!canStartReview && !canMarkPaid && decisions.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {approvalCopy.noActionsAvailable}
        </p>
      )}

      {payingOpen && (
        <MarkPaidDialog
          pending={pending}
          onClose={() => setPayingOpen(false)}
          onConfirm={() => {
            onMarkPaid()
            setPayingOpen(false)
          }}
        />
      )}

      {dialog && (
        <DecisionDialog
          decision={dialog}
          noteRequired={noteRequired}
          pending={pending}
          onClose={() => setDialog(undefined)}
          onConfirm={(note) => {
            onDecide(dialog, note)
            setDialog(undefined)
          }}
        />
      )}
    </Card>
  )
}
