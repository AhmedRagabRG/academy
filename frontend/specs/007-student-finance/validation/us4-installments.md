# Validation: US4 — Build and Follow Installment Plans

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence (`tests/contract/student-finance/installment-plans.test.ts`) |
| --- | --- |
| US4-1 a plan creates sequentially numbered installments with dates and amounts | "creates sequentially numbered installments with due dates and amounts" |
| US4-2 amounts sum exactly to the final amount even when it does not divide evenly | "sums installment amounts exactly to the invoice final amount" — run for counts 2, 3, 4, 6, 7, 12 |
| US4-3 an unpaid plan can be regenerated | "replaces unpaid installments when regenerated" |
| US4-4 regeneration is refused once an installment carries a payment | "refuses regeneration once an installment carries a payment"; "leaves the existing plan intact when regeneration is refused" |
| US4-5 an unpaid installment past its due date is Overdue | "derives overdue at the boundary against the injected clock" |
| US4-6 a product type configured to disallow plans refuses one | "refuses a plan for a product type configured to disallow instalments" |

## SC-002: the exact-sum invariant

Installment amounts must sum **exactly** to the invoice final amount at the
configured precision. This is enforced at three levels rather than asserted once:

1. `allocate()` in the shared money module asserts its own sum before returning,
   so a bug fails at the source rather than as a discrepancy discovered later.
2. `installment-plans.test.ts` verifies the invariant through the full service path
   across six different counts against an amount that does not divide evenly.
3. `finance-installments.test.ts` (Phase 2) verifies `buildSchedule` across five
   awkward totals × twelve counts.

The rounding remainder lands on the **final** installment, so every earlier amount
stays uniform — which is what a schedule shown to a student should look like.

## Eligibility is configuration, not a hardcoded rule

The spec asked for courses to be "normally paid in full but the system should
remain configurable". `installmentEligibility` in the lookups carries
`allowsPlan` and `maxCount` per product type; nothing in the service or UI encodes
"courses cannot be split".

Asserted by "exposes the eligibility policy through lookups", which reads the
policy rather than the behaviour — so flipping the configuration flips the
behaviour with no code change.

## UI

`tests/integration/student-finance/installment-plan.test.tsx` (10 cases):

- the generator **previews the real schedule** using the same `buildSchedule` the
  service uses, so previewed amounts are exactly the amounts saved, remainder
  included
- a count above the configured maximum shows a `role="alert"` naming the limit and
  disables the button
- the configured maximum appears in the field label, so the constraint is visible
  before it is violated
- when the product type disallows plans, the form is **replaced with an
  explanation** rather than rendered as a dead control that would only produce a
  refusal
- likewise when regeneration is blocked by a recorded payment
- the schedule is a semantic `table` with column headers, a row per installment
  with its derived status, and a footer restating the total
- an empty schedule shows an empty state, not a blank table

## Where the schedule lives

Mounted inside the invoice detail screen alongside the generator, and surfaced
across invoices in the `/student-finance/installments` queue with a status filter
(including overdue) — both routes compiled.

## Success criteria

- **SC-002** installment amounts sum exactly to the final amount in 100% of tested counts and amounts — PASS
- **SC-008** overdue derived correctly at the due-date boundary — PASS
- **SC-012** one timeline event per generated plan — PASS

## Gates

`npm run typecheck`, `npm run lint` (0 errors; 11 warnings, all the pre-existing
test fixture-import convention shared with admissions and students),
`npm run build` (installments route compiled), and `npm run test`
(122 files, 739 tests) all pass.
