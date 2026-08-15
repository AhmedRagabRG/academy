# Validation: US7 — Process Refunds Against Payments

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US7-1 a refund is recorded against a specific payment with reason and date | `refund-limits.test.ts` — "allows a refund up to the full payment amount" |
| US7-2 a refund above the payment less prior refunds is refused | "refuses a single refund above the payment amount"; "counts prior refunds against the ceiling" |
| US7-3 only a completed refund moves the balance | `refund-balance-effect.test.ts` — the whole first block |
| US7-4 the invoice status returns to what the balance dictates | "returns the invoice status to what the balance dictates" |
| US7-5 refunds are never deleted | `refund-governance.test.ts` — "refunds cannot be deleted" |
| US7-6 approving a refund requires its own permission | "approval requires its own permission" |

## The ceiling

Refundable = the payment less every refund against it that has not been rejected
or cancelled. An **approved but not yet completed** refund keeps its share
reserved, because it is expected to complete — asserted by "keeps an
approved-but-not-yet-completed refund reserved". A **rejected** request releases
it again ("frees the ceiling again when a request is rejected").

The same rule is implemented once for the UI in `refundableAmount` and verified
against five cases directly, so the figure shown in the form and the figure the
service enforces come from the same definition.

## Money moves exactly once, at completion

Requested and approved refunds leave `netPaid`, `remaining`, and the derived
status completely untouched. Completion reduces `netPaid`, restores `remaining`,
and — because the status is derived rather than stored — moves a `paid` invoice
back to `partially-paid` with no separate status step. The effect appears in the
student's totals as well as on the invoice.

## What the tests found

**`expectedVersion` was accepted and never checked.** The contract states every
command carries `expectedVersion` against the invoice aggregate, and
`decideRefund`/`completeRefund` both took the field and ignored it — a parameter
that reads as a guarantee at every call site while guaranteeing nothing. Both now
assert it, and completion `touch`es the invoice because completion is the point
where the aggregate's money actually changes.

Two ordering details came out of that change:

- **Authority is checked before concurrency.** A user who may not decide is told
  exactly that, rather than receiving a version conflict that implies they
  otherwise could. This matches every other command in the service.
- **`RefundSummary.version` was hardcoded to `1`** in both projections — a
  placeholder that would have made every decision from the queue fail once the
  version was enforced. It now carries the invoice version, so the queue can act
  without a second read.

## No deletion, anywhere

- the service exposes no operation matching delete/remove/destroy/purge — asserted
  by enumerating the service surface rather than by inspection
- rejected and completed refunds stay readable in the list
- `completed`, `rejected`, and `cancelled` have no outgoing transitions at all,
  and no transition ever returns a refund to an earlier state

## Separation of duties (FR-041)

`refund-lifecycle.test.ts` walks the whole policy table and asserts that every
approve/reject/complete step requires `finance.refunds.approve`, that **no** step
is satisfied by `finance.payments.record`, and that cancelling one's own request
is the only step available on the record permission.

At the service level: a user with only `refunds.record` cannot approve or
complete; a user with only `refunds.approve` cannot record a request; the payment
permission satisfies neither; and a refused decision leaves the refund in its
previous state.

Every negative outcome demands a reason — rejection with no reason, or with only
whitespace, is refused by the service, and the UI's reject control keeps its
confirm button disabled until a reason is typed, so a blank one is never sent.

## UI

`refund-form.test.tsx` (18 cases):

- the ceiling and the related receipt number are shown before an amount is typed
- an over-ceiling amount is refused with the available figure named
- zero, negative, and future-dated refunds are refused
- a `role="note"` states that recording a refund documents the balance effect and
  that the transfer happens outside this module — a finance user must not believe
  money left the account because a row appeared in a queue
- decision buttons are **derived from the transition policy**, not hardcoded per
  status, so a policy change reaches the UI without an edit: approve/reject on a
  requested refund, complete only once approved, nothing at all on a terminal one
- a user without the approval permission sees no decision controls

The queue lives at `/student-finance/refunds` — a route the dashboard already
linked to before it existed — rendered as cards rather than a table because each
row carries its own decision controls.

## Success criteria

- **SC-001** balances stay consistent across payments and refunds — PASS
- **SC-010** only completed refunds affect the balance — PASS
- **SC-012** one timeline event on request, one on completion — PASS

## Gates

`npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test`
(134 files, 913 tests) all pass.
