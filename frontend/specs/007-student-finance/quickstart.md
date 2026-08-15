# Quickstart: Validate Student Finance

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/student-finance-contracts.md](./contracts/student-finance-contracts.md)

A validation and run guide. It proves the feature works end to end once implemented; implementation steps belong in `tasks.md`.

## Prerequisites

- Node.js 20+ and npm 10.9.3
- `npm install` from the repository root
- No backend, database, or payment gateway is required — everything runs through the deterministic mock adapter

Fixtures seed students with no invoices, draft invoices, issued invoices, part-paid and fully paid invoices, cancelled invoices, invoices with and without installment plans, amounts that divide evenly and unevenly, overdue installments at and past the boundary, pre-issuance and post-issuance reductions, scholarships covering full and partial tuition, and payments with and without refunds. `financeScenarios` toggles latency, failure, permission, branch-scope, conflict, clock, and scale modes.

## Run and Quality Gates

```bash
npm run dev
```

Then open `http://localhost:3000/student-finance`.

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

```bash
npm run test:e2e
```

Only this feature's suites:

```bash
npm run test -w web -- student-finance
```

All four gates plus both Playwright suites must pass with no skipped finance specs.

---

## Scenario 1: Raise, Issue, and Freeze an Invoice

Covers US1, FR-001 – FR-009, SC-004, SC-005.

1. Raise invoices for a program enrollment, a diploma enrollment, and a course enrollment. Confirm each carries a unique invoice number, the student, the enrollment, the product, the batch where applicable, dates, totals, and Draft status.
2. Edit a Draft invoice's amounts, dates, and reductions. Confirm the final amount recalculates.
3. Issue the invoice. Confirm it becomes Issued and its total, reductions, and final amount are frozen.
4. Attempt to change an Issued invoice's totals. Confirm refusal with an explicit reason.
5. Process the same enrollment again, then twice concurrently. Confirm no duplicate invoice and the same numbers.
6. Cancel an invoice with no payments, with a reason. Confirm it becomes Cancelled, leaves the balance, and stays readable.
7. Record a payment on another invoice, then attempt to cancel it. Confirm refusal until the payment is refunded.

**Expected**: numbers are unique, issued figures are immutable, invoicing is idempotent, cancellation respects collected money.

## Scenario 2: The Student Financial Profile

Covers US2, FR-029 – FR-032, SC-001, SC-008.

1. Open a student with invoices. Confirm total fees, paid, remaining, outstanding installments, scholarships, discounts, currency, and status.
2. Open a student with no financial records. Confirm an empty state that attributes the zero to having no invoices, not to missing data.
3. Independently sum the underlying records and compare against every displayed figure. Confirm exact agreement.
4. Advance the injected clock past an unpaid installment's due date. Confirm the status becomes Overdue at the boundary, not before.
5. Settle every invoice for a student. Confirm No Outstanding Balance.
6. Open the profile as a user without `finance.view`. Confirm a forbidden state and that no figures are disclosed.

**Expected**: every figure reconciles with its records, and the overdue boundary is exact.

## Scenario 3: Record Payments and Issue Receipts

Covers US3, FR-015 – FR-019, SC-003, SC-006.

1. Record a partial payment against an Issued invoice. Confirm a unique receipt number, Partially Paid status, and a balance reduced by exactly the amount.
2. Record a payment settling the remainder. Confirm the invoice becomes Paid.
3. Attempt a payment exceeding the remaining balance. Confirm refusal with no receipt, no balance change, and no status change.
4. Attempt zero, negative, and non-numeric amounts, and an inactive payment method. Confirm field-specific refusals.
5. Attempt a payment against a Draft, a Paid, and a Cancelled invoice. Confirm each is refused.
6. Attribute a payment to a specific installment. Confirm the installment updates and the invoice totals still reconcile with the sum of its installments.
7. Attempt to edit and to delete a recorded payment. Confirm both are refused.
8. Fire two payments concurrently, each valid alone but together exceeding the balance. Confirm exactly one succeeds and the balance never goes negative.

**Expected**: money is never over-collected, receipts are unique, payments are immutable.

## Scenario 4: Installment Plans

Covers US4, FR-010 – FR-014, SC-002.

1. Generate plans of 3, 4, 7, and 12 installments against invoices whose amounts do not divide evenly. Confirm the installment amounts sum **exactly** to the final amount every time.
2. Confirm installments carry sequential numbers, due dates, and amounts.
3. Regenerate a plan on an unissued invoice. Confirm unpaid installments are replaced.
4. Pay one installment, then attempt regeneration. Confirm refusal.
5. Advance the clock past an unpaid installment's due date. Confirm it becomes Overdue.
6. Request a plan for a product type configured to disallow instalments. Confirm refusal with the reason.

**Expected**: no rounding remainder is ever lost, and recorded collections are never orphaned.

## Scenario 5: Discounts and Scholarships

Covers US5, US6, FR-020 – FR-024, SC-005, SC-007.

1. Apply a percentage and a fixed-amount discount to a Draft invoice. Confirm the final amount recalculates and the approval information is retained.
2. Exceed the configured discount limit, exceed the invoice total, and drive the final amount negative. Confirm each is refused and the invoice is unchanged.
3. Apply a discount to an **Issued** invoice. Confirm the issued figures are unchanged and an adjustment reduces the unpaid balance and future installments.
4. Apply an adjustment that would drop the balance below the amount already collected. Confirm refusal with a pointer to the refund flow.
5. Award percentage and fixed-amount scholarships covering partial and full tuition. Confirm the balance reduces to zero without going negative.
6. Apply a percentage outside 0–100 and an amount exceeding tuition. Confirm refusals.
7. Apply a discount and a scholarship to the same invoice. Confirm the documented order produces the same number in the editor preview and after saving.
8. Attempt each without the matching approval permission. Confirm refusal with nothing recorded.

**Expected**: reductions never rewrite history, never go negative, never drop below collected, and preview always equals saved.

## Scenario 6: Refunds

Covers US7, FR-025 – FR-028.

1. Record a partial refund against a payment. Confirm it references that payment and carries its own status.
2. Attempt a refund exceeding the payment less prior refunds. Confirm refusal with no balance change.
3. Complete a refund. Confirm paid decreases and remaining increases by exactly the refunded amount.
4. Refund a payment that had settled an invoice. Confirm the invoice returns from Paid to Partially Paid or Issued as the balance dictates.
5. Attempt a refund with no referenced payment. Confirm refusal.
6. Attempt to delete a refund. Confirm refusal; cancel it through its status instead.
7. Attempt to approve a refund without `finance.refunds.approve`. Confirm refusal, including for the user who requested it.

**Expected**: refunds are bounded, reversible only by status, and separately approved.

## Scenario 7: Queues, Search, and Scope

Covers US8, FR-036 – FR-040, SC-010, SC-011.

1. Search by invoice number, receipt number, student name, and student code, including Arabic name variants and Arabic-Indic digits.
2. Combine branch, student, product, invoice status, payment status, payment method, and date-range filters. Confirm every condition holds simultaneously.
3. Apply an inclusive date range, then an inverted one. Confirm boundary records are included and the inverted range is refused.
4. Sort and page through every queue. Confirm no overlap or gaps.
5. Change a filter while on a high page. Confirm the page clamps and the remaining filters survive.
6. Switch to a branch-scoped user. Confirm out-of-scope records disappear and direct URLs return forbidden.
7. Load the 50,000-invoice scale fixture and time search, filter, sort, and paging.

**Expected**: filters compose, scope holds on list and direct access, interactions stay under 2 seconds at p95.

## Scenario 8: Financial Timeline

Covers US9, FR-034, FR-035, SC-012.

1. Perform invoice creation, issuance, plan generation, a payment, a discount, a scholarship, and a refund. Confirm each adds exactly one ordered, attributable event.
2. Force each operation to fail. Confirm no event is added.
3. Page a long history. Confirm ordering stays stable and nothing duplicates or skips.
4. Confirm each event identifies its affected record to permitted users.

**Expected**: one event per success, none per failure, stable cursor ordering.

## Scenario 9: Integration with Student Management

Covers US10, FR-046 – FR-048, SC-013.

1. Open a student's workspace in Student Management. Confirm the financial summary now shows **real figures** instead of "finance module unavailable", and that they match this module's records exactly.
2. Open a student with no financial records. Confirm an explicit **zero-balance** result, not an unavailable one.
3. Force the finance service to fail. Confirm Student Management shows unavailable and never presents zeroes as facts.
4. Request the summary as an out-of-scope and as an unpermitted user. Confirm the same refusals as an interactive read.
5. Confirm the finance tab appears in the student workspace only for users holding `finance.view`.
6. Record a payment in the finance queue, then reload the student workspace. Confirm both surfaces show the same numbers.
7. Request the accounting-facing context. Confirm settled facts and identities only, with no student name, address, identifier, or notes.
8. Confirm `features/students` contains no import of `features/student-finance`.

**Expected**: one set of numbers everywhere, the zero-versus-unavailable distinction preserved, and no dependency cycle.

## Scenario 10: RTL, Responsive, and Accessibility

Covers SC-014, SC-015 and the constitution's RTL, responsive, and accessibility principles.

1. Confirm Arabic throughout and RTL-native layout across queues, invoice detail, installment schedules, forms, dialogs, and the timeline.
2. Confirm monetary values, invoice and receipt numbers, dates, and percentages stay correctly isolated inside Arabic text, and that amounts render with their currency.
3. Exercise every workflow at desktop, laptop, and tablet widths and at 200% zoom. Confirm no loss of functionality and no horizontal page overflow.
4. Record a payment using only the keyboard, including method selection and confirmation.
5. Confirm dialogs trap and restore focus, first-error focus works in every monetary form, and balance and status changes are announced.
6. Confirm status is never communicated by colour alone.
7. Run axe across every finance route in light and dark themes. Confirm no serious or critical violations.

**Expected**: keyboard-complete, screen-reader-coherent, RTL-native, clean under axe, with money always announced with its currency.

---

## Contract References

- Service facade, ports, error codes, query keys, Student Management wiring: [contracts/student-finance-contracts.md](./contracts/student-finance-contracts.md)
- Entities, validation, derived values, transitions, query model: [data-model.md](./data-model.md)
- Design decisions and rejected alternatives: [research.md](./research.md)
