# Validation: US5 — Apply Approved Discounts

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US5-1 a discount before issuance changes the invoice's own figures | `discount-adjustments.test.ts` — "recalculates the draft final amount" |
| US5-2 a discount after issuance leaves the issued invoice untouched | "leaves the issued snapshot byte-for-byte unchanged" |
| US5-3 the reduction still lowers what the student owes | "reduces the remaining balance the student still owes" |
| US5-4 a discount above the configured limit is refused | "refuses a discount above the configured limit" |
| US5-5 a reduction below the collected amount is refused | "refuses a reduction that would drop the balance below what was collected" |
| US5-6 approving a discount needs its own authority | `discount-permissions.test.ts` — the whole file |
| US5-7 value, reason, approver and time are recorded | "records the discount with its approval information" |

## The contradiction in the spec, resolved

The spec asks for two things that cannot both be literal: *"historical invoices never
change after issuance"* and *"reductions affect future balances"*. Both hold here
because a post-issuance reduction is never an edit — it is a `FinancialAdjustment`
recorded against the invoice (research R3, spec FR-007 + FR-023).

The proof is not a comment but an assertion: `JSON.stringify(issuedSnapshot)` is
compared before and after, so any future change that rewrites an issued figure —
including one made indirectly through a shared object reference — fails the test.

Derived final amount = `issuedSnapshot.finalAmount − Σ adjustments`, asserted
directly, and asserted again after two accumulated adjustments.

## Two floors, both enforced

1. **Never negative** — `resolveReduction` clamps to the base, and
   `computeFigures` clamps the final amount to zero. Asserted by "never produces
   a negative final amount" and by the preview case "never previews a negative
   amount" against a reduction far larger than the balance.
2. **Never below what was collected** — reducing an invoice below the money
   already taken is not a discount, it is a refund, and the refusal says so:
   *"…استخدم الاسترداد بدلًا من ذلك."* The test asserts the message names
   الاسترداد rather than merely asserting an error code, because the pointer to
   the right flow is the useful part of the refusal.

A refused reduction leaves the invoice byte-identical: same figures, same
adjustment count, same version, and no timeline event
("leaves the invoice untouched when a reduction is refused", "adds no event when
a discount is refused").

## SC-004: the preview is the saved figure

`tests/integration/student-finance/discount-form.test.tsx` (21 cases) renders the
dialog, reads the previewed final amount out of the DOM, then puts the same values
through the real service and compares the two — across five reduction values
(including `7.5%` and `0.01`), on draft and issued invoices, on a draft carrying a
scholarship, and on an issued invoice already carrying an adjustment.

This caught two real defects rather than confirming an assumption:

- **A discount erased a scholarship.** Pre-issuance, `applyDiscount` recomputed
  the draft with `undefined` as the scholarship argument, so applying a discount
  to a draft that had a scholarship silently added the scholarship's value back
  to the amount owed. The scholarship on the draft is now carried through, and
  the test asserts `scholarshipTotal` survives.
- **Validation and application disagreed on the base.** The limit was checked
  against the current final amount while the reduction was applied against the
  total, so on an invoice with an existing discount the two diverged. `discountBase`
  is now computed once — the tuition base after any scholarship pre-issuance, the
  current balance post-issuance — and used for validation, application, and the
  UI preview alike.

## Approval is a distinct authority

`finance.discounts.approve` is not implied by any adjacent permission. The test
grants each neighbouring key **in turn** — `payments.record`, `invoices.create`,
`invoices.update`, `invoices.issue`, `invoices.cancel`, `installments.manage`,
`scholarships.approve`, `refunds.record`, `refunds.approve`, `export` — and asserts
the discount is still refused for every one of them. One case goes further: the
same user records a payment successfully and is then refused the discount, so the
separation is demonstrated on a user who demonstrably *has* real financial
authority (spec FR-041).

`InvoiceDetail.permissions.discountsApprove` reports exactly what the service
enforces, and stays independent of `scholarshipsApprove`.

## UI

- The dialog previews **current base → discount value → resulting amount** using
  the same `computeFigures` the service runs.
- The configured maximum appears in the field label, so the limit is visible
  before it is violated.
- An out-of-range value and a below-collected value are both refused in the form
  with a `role="alert"` naming the reason; `onConfirm` is never called.
- A blank reason is refused — no placeholder is ever substituted.
- On an issued invoice a `role="note"` explains that the reduction will be
  recorded as an adjustment and will not change the invoice's figures; on a draft
  that notice is absent, because there the invoice itself changes.
- Focus moves to the first field on open, to the first invalid field on refusal,
  and back to the trigger on close.
- History is split in two: `DiscountHistory` lists each discount with value,
  reason, approver and time; `AdjustmentList` shows post-issuance adjustments
  separately, under a heading stating the issued figures did not change.

## Success criteria

- **SC-004** the previewed amount equals the saved amount in 100% of tested
  combinations — PASS
- **SC-009** issued invoice figures never change after issuance — PASS
- **SC-012** exactly one timeline event per applied discount, none per refusal — PASS

## Gates

`npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test` all pass —
counts in the run recorded at the end of Phase 7.
