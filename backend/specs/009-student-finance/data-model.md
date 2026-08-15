# Data Model: Student Finance

All identifiers are UUIDs, timestamps are UTC `Timestamptz`, calendar dates are date-only, and persisted roots carry positive integer versions. Money is stored as `BigInt` minor units with sibling `currency` and `precision` columns; no float or decimal type appears in a money column. External identifiers (student, enrollment, offering, batch, branch, employee, lookup value) are validated through ports; Student Finance queries no foreign repository.

## Enums

- `InvoiceStatus`: `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`. `PARTIALLY_PAID` and `PAID` are **derivation outputs only** — they are never written by a transition. No `OVERDUE` member (see [research.md](research.md) R10).
- `InstallmentStatus`: `PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`. Derived, never stored.
- `RefundStatus`: `REQUESTED`, `APPROVED`, `COMPLETED`, `REJECTED`, `CANCELLED`. Stored.
- `FinancialStatus`: `NO_OUTSTANDING_BALANCE`, `PARTIAL_BALANCE`, `OVERDUE`, `COMPLETED`. Derived, never stored.
- `ReductionKind`: `PERCENTAGE`, `AMOUNT`.
- `ScholarshipCoverage`: `FULL_TUITION`, `PARTIAL_TUITION`.
- `ScheduleBasis`: `MONTHLY`, `CUSTOM`.
- `ReductionSourceKind`: `DISCOUNT`, `SCHOLARSHIP`.
- `FinanceEventCategory`: `INVOICE_CREATED`, `INVOICE_ISSUED`, `INVOICE_CANCELLED`, `INSTALLMENT_PLAN_GENERATED`, `PAYMENT_RECEIVED`, `DISCOUNT_APPLIED`, `SCHOLARSHIP_APPLIED`, `ADJUSTMENT_RECORDED`, `REFUND_REQUESTED`, `REFUND_COMPLETED`.
- `FinanceSequenceKind`: `INVOICE`, `RECEIPT`.

## StudentFinancialAccount

One account per student, created automatically when the student is created.

Fields: organization ID; student ID (**unique**); student code; normalized student name for search; currency; precision; status; version; created and updated actor and time.

Rules:

- Exactly one row per student, enforced by a unique index on `studentId`, not by an application check.
- Provisioned by the `student.created` domain event through `STUDENTS_ENROLLMENT_PORT`; Finance never inserts a student row.
- Holds **no** balance, charge total, or reduction total column. Outstanding balance, total charges, collected amount, and financial status are derived on read (see `finance_invoice_balance`).
- Never deleted. An archived student's account remains readable.

Indexes: unique `(studentId)`, `(organizationId, normalizedStudentName)`.

## StudentEnrollmentFinancialSnapshot

The immutable financial snapshot copied forward from the Admissions approval snapshot at enrollment. One row per enrollment.

Fields: account ID; enrollment ID (**unique**); offering ID; offering kind; optional batch ID; branch ID; source financial revision ID; source kind; tuition minor units; registration fees minor units; discount already applied at admission (mode, percentage scaled, amount minor); required amount minor units; currency; precision; snapshot time; source actor.

Rules:

- Written exactly once at enrollment. No update path exists in any repository, and a trigger rejects `UPDATE` and `DELETE`.
- Later catalog or batch pricing changes never reach this row — this is what makes "future pricing changes never modify existing student accounts" structural rather than procedural.
- Invoice raising reads the required amount from here, never from a live catalog or batch read.

Indexes: unique `(enrollmentId)`, `(accountId)`.

## Invoice

The versioned charge aggregate. An additional charge is an invoice on a non-tuition charge purpose.

Fields: organization ID; invoice number (**unique per organization**); account ID; student ID; student code; normalized student name; enrollment ID; branch ID; offering ID; offering label; offering kind; optional batch ID and batch label; charge purpose lookup value ID; optional issue date; due date; currency; precision; `draftTotalMinor`, `draftDiscountTotalMinor`, `draftScholarshipTotalMinor`, `draftFinalMinor`; nullable `issuedTotalMinor`, `issuedDiscountTotalMinor`, `issuedScholarshipTotalMinor`, `issuedFinalMinor`; status; optional cancelled time and cancel reason; version; created and updated actor and time.

Rules:

- Raised only from an enrollment, for one active charge purpose. Unique index on `(enrollmentId, chargePurposeValueId)` makes the raise idempotent in the database.
- `draftFinalMinor` is always recomputed by the reduction policy from `draftTotalMinor` and the applicable reductions; it is never accepted from a client.
- Draft figures are editable only while status is `DRAFT`. Any write to a non-draft invoice raises `invoice-immutable`.
- The four `issued*` columns are written exactly once at issuance. A trigger rejects any `UPDATE` that changes a non-null issued column.
- Transitions: `DRAFT → ISSUED`, `DRAFT → CANCELLED`, `ISSUED → CANCELLED`, `PARTIALLY_PAID → CANCELLED`. `PAID` and `CANCELLED` are terminal. Cancellation requires a reason of at least 3 characters and is refused with `invoice-has-payments` when any payment exists.
- `PARTIALLY_PAID` and `PAID` are never written by a transition — they come from the balance view.
- Version increments once per aggregate mutation, including payment recording and reduction application.
- No delete. Cancellation is the only reversal.

Indexes: unique `(organizationId, invoiceNumber)`, unique `(enrollmentId, chargePurposeValueId)`, `(organizationId, branchId, status)`, `(studentId)`, `(dueDate)`, `(issueDate)`, `(offeringId)`, `(batchId)`, `(normalizedStudentName)`.

## InvoiceStatusChange

Append-only status history.

Fields: invoice ID; nullable from-status; to-status; optional reason; actor ID and name; occurred time; resulting invoice version.

Rules: insert-only; `UPDATE` and `DELETE` rejected by trigger. Unique `(invoiceId, resultInvoiceVersion)` prevents a duplicate entry for one mutation.

## InstallmentPlan

Fields: invoice ID (**unique** — one active plan per invoice); count; schedule basis; first due date; generated time; generating actor.

Rules:

- Generation is refused with `installments-not-permitted` when the offering kind's `allowsPlan` is false, and with `validation-failed` when count is outside `1 … maxCount` for that kind.
- Regeneration is refused with `plan-has-payments` when any installment of the existing plan carries a payment; otherwise the prior plan and its installments are replaced within the transaction.
- `CUSTOM` basis requires `customDueDates` whose length equals `count`.

## Installment

Fields: plan ID; invoice ID; sequence; due date; amount minor units.

Rules:

- Amounts allocate as `floor(total / count)` each with the full remainder on the final sequence. The sum is asserted equal to the invoice total before commit.
- Collected amount, remaining amount, and status are **derived** from payments and the due date — never stored, never accepted from a client.

Indexes: unique `(planId, sequence)`, `(invoiceId)`, `(dueDate)`.

## Payment

Immutable. No update or delete path exists at any layer.

Fields: organization ID; receipt number (**unique per organization**); student ID; invoice ID; optional installment ID; branch ID; payment method lookup value ID; payment date; amount minor units; currency; precision; optional notes (≤ 500 characters); recorded time; recording actor ID and name.

Rules validated in-service against current state:

- Amount is a positive decimal string; a non-positive value raises `negative-amount`.
- Amount may not exceed the invoice remaining balance read from the view **inside the transaction** → `payment-exceeds-balance` with `remaining`.
- When an installment is targeted, the amount may not exceed that installment's remaining → `installment-exceeds-remaining` with `remaining`.
- The method must exist and be `ACTIVE` → `payment-method-inactive`. Inactive methods stay joinable so historical payments keep their label.
- Payment date may not be in the future and may not precede the invoice issue date → `invalid-date-range`.
- The invoice must be `ISSUED` or `PARTIALLY_PAID` → `invoice-not-payable`.
- Any mutation attempt → `payment-immutable`. Corrections go through a refund.

Indexes: unique `(organizationId, receiptNumber)`, `(invoiceId)`, `(installmentId)`, `(studentId)`, `(paymentDate)`, `(methodId)`, `(branchId)`.

## Discount

Fields: invoice ID; kind; value (percentage `0..100` scaled integer, or amount minor units); reason (≥ 3 characters); approving actor ID and name; approval time.

Rules: append-only. Value may not exceed the published `discountPolicy.maxPercentage` (50) or `maxAmount` (10,000.00) → `reduction-exceeds-limit` with `limit`. A reduction that would push the balance below the collected amount → `reduction-below-collected` with `collected`. Requires `finance.discounts.approve`. After issuance, the reduction is recorded as a `FinancialAdjustment` instead of altering the issued snapshot.

## Scholarship

Fields: student ID; nullable enrollment ID; name (≥ 2 characters); kind; value; coverage; reason (≥ 3 characters); approving actor ID and name; approval time.

Rules: append-only. A null enrollment ID applies the scholarship to every enrollment of the student. Value may not exceed `scholarshipPolicy.maxPercentage` (100) → `reduction-exceeds-limit`. Coverage constrains which charge purposes the scholarship may reduce. Requires `finance.scholarships.approve`.

## FinancialAdjustment

A reduction recorded **after** issuance, so the issued snapshot is never rewritten.

Fields: invoice ID; source kind; source ID; amount minor units (always a positive reduction); reason; approving actor ID and name; created time.

Rules: append-only, trigger-protected. Subtracted from the effective final amount by the balance view.

## Refund

Fields: payment ID; invoice ID; student ID; amount minor units; currency; precision; reason (≥ 3 characters); refund date; status; requesting actor and time; optional deciding actor and decision time; optional completion time; optional decision reason; version.

Rules:

- Requires an existing payment → `refund-requires-payment`.
- Amount is positive and may not exceed the payment's amount less refunds already `REQUESTED`, `APPROVED`, or `COMPLETED` against it → `refund-exceeds-payment` with `refundable`. Counting in-flight requests prevents two pending refunds from jointly exceeding the payment.
- Total `COMPLETED` refunds for a student may not exceed total collected.
- Refund date may not be in the future.
- Transitions: `REQUESTED → APPROVED | REJECTED | CANCELLED`, `APPROVED → COMPLETED | CANCELLED`. `COMPLETED`, `REJECTED`, and `CANCELLED` are terminal. Rejection and cancellation require a reason.
- Requesting uses `finance.refunds.record`; approving and completing use `finance.refunds.approve` — deliberately separate so the requester need not be the authorizer.
- Only `COMPLETED` refunds reduce collected amounts. Every other state is balance-neutral.

Indexes: `(paymentId, status)`, `(invoiceId)`, `(studentId)`, `(refundDate)`, `(status)`.

## FinanceTimelineEvent

Append-only, cursor-paginated student activity record.

Fields: student ID; optional invoice ID; category; occurred time; per-student monotonic `sequence`; actor ID and name; optional subject reference; optional amount minor units with currency and precision; Arabic summary.

Rules: insert-only, trigger-protected. `sequence` is allocated inside the same transaction as the event it describes. Unique `(studentId, sequence)`.

## FinanceNumberCounter

Fields: organization ID; sequence kind; year; last value.

Rules: unique `(organizationId, sequenceKind, year)`. Incremented under `SELECT … FOR UPDATE` inside the allocating transaction, never `count + 1`. Formats from the lookup-published prefix and width.

## finance_invoice_balance (SQL view — stores nothing)

One row per invoice. Columns: `invoice_id`, `final_minor`, `collected_minor`, `refunded_minor`, `net_paid_minor`, `remaining_minor`, `derived_status`, `is_overdue`.

Definition, in words:

- **Effective figures** = the issued snapshot when the invoice is issued or later, otherwise the draft figures.
- `final_minor` = effective final amount − sum of `FinancialAdjustment.amount` for the invoice.
- `collected_minor` = sum of `Payment.amount` for the invoice.
- `refunded_minor` = sum of `Refund.amount` where status is `COMPLETED`.
- `net_paid_minor` = `collected_minor − refunded_minor`.
- `remaining_minor` = `max(final_minor − net_paid_minor, 0)`.
- `derived_status` = `CANCELLED` when stored status is cancelled; `PAID` when `remaining_minor = 0` and the invoice is issued; `PARTIALLY_PAID` when `net_paid_minor > 0` and `remaining_minor > 0`; otherwise the stored status.
- `is_overdue` = invoice is issued or partially paid, `due_date < current_date`, and `remaining_minor > 0`.

Consumers: invoice list (filter and the documented `remaining` sort), invoice detail `derived` block, dashboard `SUM` over the filtered set, student statement totals, and the in-transaction balance re-check before every payment and reduction. Cancelled invoices are excluded from all dashboard and statement figures but remain readable and still count toward `hasNoRecords`.

## Lookup groups (owned by Organization, consumed here)

- `FINANCE_CHARGE_PURPOSE` — seeded `tuition`, `registration-fee`, `card-fee`, `certificate-fee`, `exam-fee`, `training-fee`, `additional-fee`. Referenced by `Invoice.chargePurposeValueId`.
- `FINANCE_PAYMENT_METHOD` — seeded `cash`, `bank-transfer`, `card`, `cheque`. Referenced by `Payment.methodId`.

Only `ACTIVE` values are selectable. Inactive values remain joinable so historical records keep their labels, and a new fee type or method is a data change with no control-flow edit.

## Derived, never stored — the complete list

`final_minor` after adjustments · `collected_minor` · `net_paid_minor` · `remaining_minor` · `Installment.paidAmount` · `Installment.remaining` · `Installment.status` · invoice `PARTIALLY_PAID` and `PAID` · invoice overdue · `StudentFinancialAccount` outstanding balance, total charges, and financial status · dashboard invoiced, collected, outstanding, and unsettled count.
