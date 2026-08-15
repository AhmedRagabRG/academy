# Feature Specification: Student Finance

**Feature Branch**: `[007-student-finance]`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Manage all student financial operations — invoices, installment plans, payments and receipts, discounts, scholarships, refunds, financial balances, and financial history — as the financial layer between Student Management and a future Accounting module."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Raise Invoices from an Enrollment (Priority: P1)

A student's financial obligation begins as one or more invoices raised against a specific enrollment, using the commercial terms agreed during admission. Finance staff review a draft invoice and issue it; once issued, its figures are fixed.

**Why this priority**: Every balance, installment, payment, and report in the module derives from an invoice. Nothing else can be built or tested without one.

**Independent Test**: Raise invoices for a program, a diploma, and a course enrollment, issue one, and verify that an issued invoice's totals can no longer be edited and that re-processing the same enrollment produces no duplicate.

**Acceptance Scenarios**:

1. **Given** an enrollment with agreed commercial terms, **When** invoices are raised for it, **Then** each invoice carries an invoice number, the student, the enrollment, the academic product, the batch where applicable, an issue date, a due date, a total amount, applicable reductions, a final amount, and a Draft status.
2. **Given** a Draft invoice, **When** an authorized user edits amounts, dates, or reductions, **Then** the changes are retained and the final amount is recalculated.
3. **Given** a complete Draft invoice, **When** an authorized user issues it, **Then** it becomes Issued and its total, reductions, and final amount become immutable.
4. **Given** an Issued invoice, **When** any user attempts to change its totals, **Then** the change is refused and the reason is explicit.
5. **Given** an enrollment that has already produced invoices, **When** the same enrollment is processed again, **Then** the existing invoices are reused and no duplicate is created.
6. **Given** an invoice with no recorded payment, **When** an authorized user cancels it with a reason, **Then** it becomes Cancelled, stops contributing to the student's balance, and remains readable.
7. **Given** an invoice with at least one recorded payment, **When** cancellation is attempted, **Then** it is refused until the payments are refunded.

---

### User Story 2 - Review the Student Financial Profile (Priority: P1)

Authorized staff open one student and see the complete financial picture: total fees, paid amount, remaining balance, outstanding installments, awarded scholarships, applied discounts, and the derived financial status.

**Why this priority**: The profile is the module's primary read surface and the contract Student Management already expects.

**Independent Test**: Open students with no invoices, part-paid invoices, fully paid invoices, and overdue installments, and verify every figure and the derived status against the underlying records.

**Acceptance Scenarios**:

1. **Given** a student with invoices, **When** the financial profile is opened, **Then** total fees, paid amount, remaining balance, outstanding installment count, scholarships, discounts, currency, and financial status are presented.
2. **Given** a student with no financial records, **When** the profile is opened, **Then** an empty state is shown with zero balances explicitly attributed to the absence of invoices, not to missing data.
3. **Given** payments, reductions, and refunds recorded against a student, **When** the profile is recalculated, **Then** remaining balance equals final invoiced amounts minus net payments, and never disagrees with the underlying records.
4. **Given** a student with at least one installment past its due date and unpaid, **When** the status is derived, **Then** the status is Overdue.
5. **Given** a student whose invoices are all fully settled, **When** the status is derived, **Then** the status is No Outstanding Balance.
6. **Given** an employee without financial permission, **When** the profile is requested, **Then** access is refused with an explicit forbidden outcome and no figures are disclosed.

---

### User Story 3 - Record Payments and Issue Receipts (Priority: P1)

A finance user records a payment against an invoice, optionally against a specific installment, choosing a configured payment method. The system issues a uniquely numbered receipt and updates every affected balance.

**Why this priority**: Collecting and attributing money is the module's core operational act.

**Independent Test**: Record full, partial, and over-limit payments across payment methods, and verify receipt numbering, balance updates, invoice status transitions, and refusal of any payment exceeding the remaining balance.

**Acceptance Scenarios**:

1. **Given** an Issued invoice with a remaining balance, **When** an authorized user records a valid payment, **Then** a uniquely numbered receipt is created carrying the student, invoice, installment where applicable, payment method, payment date, amount, and notes.
2. **Given** a payment that settles part of an invoice, **When** it is recorded, **Then** the invoice becomes Partially Paid and the remaining balance decreases by exactly the payment amount.
3. **Given** a payment that settles the full remaining balance, **When** it is recorded, **Then** the invoice becomes Paid.
4. **Given** a payment amount greater than the invoice's remaining balance, **When** it is recorded, **Then** it is refused and no receipt, balance change, or status change occurs.
5. **Given** a payment attributed to a specific installment, **When** it is recorded, **Then** that installment's paid amount and status update, and the invoice totals stay consistent with the sum of its installments.
6. **Given** a zero, negative, or non-numeric amount, or a payment method that is not configured or is inactive, **When** recording is attempted, **Then** it is refused with field-specific guidance.
7. **Given** a recorded payment, **When** any user attempts to edit or delete it, **Then** the attempt is refused; corrections are made through a refund.

---

### User Story 4 - Build and Follow Installment Plans (Priority: P1)

An authorized user attaches an installment plan to an invoice, choosing the number of installments and their schedule. Each installment then carries its own due date, amount, and payment status.

**Why this priority**: Installment collection is the normal commercial arrangement for programs and the basis of the overdue and outstanding figures.

**Independent Test**: Generate plans with varying counts and schedules against invoices with amounts that do not divide evenly, verify the installment amounts sum exactly to the invoice final amount, and verify per-installment statuses as payments land.

**Acceptance Scenarios**:

1. **Given** an invoice eligible for installments, **When** a plan is generated with a chosen count and schedule, **Then** installments are created with sequential numbers, due dates, and amounts.
2. **Given** an invoice final amount that does not divide evenly by the installment count, **When** the plan is generated, **Then** the installment amounts still sum exactly to the invoice final amount at the configured currency precision, with the remainder absorbed by a single deterministic installment.
3. **Given** a plan on an unissued invoice, **When** an authorized user changes the count or schedule, **Then** the plan is regenerated and unpaid installments are replaced.
4. **Given** a plan with at least one paid or partly paid installment, **When** regeneration is attempted, **Then** it is refused so recorded collections are never orphaned.
5. **Given** an installment whose due date has passed and which is not fully paid, **When** its status is derived, **Then** it is Overdue.
6. **Given** an academic product type whose configuration does not permit installments, **When** a plan is requested for its invoice, **Then** it is refused with the reason.

---

### User Story 5 - Apply Approved Discounts (Priority: P2)

An authorized user records a manual discount against an invoice, capturing its type, value, reason, and approver, within the limits the organization configures.

**Why this priority**: Discounts are a common commercial concession but the module is operable without them.

**Independent Test**: Apply percentage and fixed-amount discounts within and beyond the configured limit, before and after issuance, and verify the effect on the invoice and on future balances.

**Acceptance Scenarios**:

1. **Given** a Draft invoice, **When** an authorized user applies a discount with its type, value, reason, and approver, **Then** the invoice final amount is recalculated and the discount is retained with its approval information.
2. **Given** a discount value exceeding the configured limit or exceeding the invoice total, **When** it is applied, **Then** it is refused and the invoice is unchanged.
3. **Given** a discount that would make the final amount negative, **When** it is applied, **Then** it is refused.
4. **Given** an Issued invoice, **When** a discount is applied, **Then** the issued invoice's figures are not rewritten; the reduction is recorded as an adjustment that reduces the unpaid balance and future installments only.
5. **Given** an adjustment reducing the balance below the amount already paid, **When** it is applied, **Then** it is refused and the user is directed to a refund instead.
6. **Given** a user without discount approval permission, **When** a discount is applied, **Then** it is refused and nothing is recorded.

---

### User Story 6 - Award and Apply Scholarships (Priority: P2)

An authorized user awards a scholarship to a student, expressed as a percentage or a fixed amount with its reason and approval information, covering full or partial tuition.

**Why this priority**: Scholarships materially change what a student owes, but invoicing and collection work without them.

**Independent Test**: Award percentage and fixed-amount scholarships covering partial and full tuition, and verify the effect on affected invoices, on balances, and on the student profile.

**Acceptance Scenarios**:

1. **Given** an eligible student, **When** an authorized user awards a scholarship with its name, percentage or amount, reason, and approval information, **Then** it is recorded and appears on the student's financial profile.
2. **Given** a scholarship covering full tuition, **When** it is applied, **Then** the affected balance reduces to zero without becoming negative.
3. **Given** a percentage outside the range zero to one hundred, or a fixed amount exceeding the applicable tuition, **When** it is applied, **Then** it is refused with specific guidance.
4. **Given** an Issued invoice, **When** a scholarship is applied, **Then** the issued figures are preserved and the reduction affects the unpaid balance and future installments only.
5. **Given** both a discount and a scholarship applying to the same invoice, **When** the final amount is derived, **Then** the reductions combine according to one documented order of application and never produce a negative amount.
6. **Given** a user without scholarship approval permission, **When** a scholarship is awarded, **Then** it is refused and nothing is recorded.

---

### User Story 7 - Process Refunds Against Payments (Priority: P2)

An authorized user records a refund against a specific existing payment, capturing the amount, reason, and refund date, and follows it through its own approval status.

**Why this priority**: Refunds correct collected money and are the only sanctioned way to reverse a payment, but they are lower volume than collection.

**Independent Test**: Refund full and partial amounts against payments, attempt to exceed the payment amount and to refund twice, and verify balances and statuses after each outcome.

**Acceptance Scenarios**:

1. **Given** an existing payment, **When** an authorized user records a refund with its amount, reason, and date, **Then** the refund is retained referencing that payment and carries its own status.
2. **Given** a refund amount exceeding the referenced payment's amount less any prior refunds, **When** it is recorded, **Then** it is refused and no balance changes.
3. **Given** a completed refund, **When** balances are recalculated, **Then** the student's paid amount decreases and the remaining balance increases by exactly the refunded amount.
4. **Given** a refund against a payment that settled an invoice, **When** it completes, **Then** the invoice returns from Paid to Partially Paid or Issued as the remaining balance dictates.
5. **Given** a refund with no referenced payment, **When** it is recorded, **Then** it is refused.
6. **Given** a recorded refund, **When** deletion is attempted, **Then** it is refused; refunds are cancelled through their own status, never removed.

---

### User Story 8 - Find and Govern Financial Records (Priority: P2)

Authorized staff locate invoices, payments, and refunds using search, filters, sorting, and pagination, seeing only records within their organization, branch, and role scope.

**Why this priority**: Finance teams work from queues and reconciliations, which requires reliable discovery once record volume grows.

**Independent Test**: Search and combine every supported filter across a large record set, verify stable pagination and sorting, and compare results under organization-wide and branch-scoped users.

**Acceptance Scenarios**:

1. **Given** financial records, **When** a user searches by invoice number, receipt number, student name, or student code, **Then** matching permitted records are returned.
2. **Given** branch, student, product, invoice status, payment status, payment method, and date-range filters, **When** filters are combined, **Then** results satisfy every selected condition simultaneously.
3. **Given** a date-range filter, **When** it is applied, **Then** only records whose relevant date falls inside the inclusive range are returned, and an inverted range is refused.
4. **Given** a branch-scoped user, **When** list, detail, or export access is attempted, **Then** only records within that user's authorized branches are reachable, including by direct record address.
5. **Given** a changed filter, search term, or sort order, **When** the current page is no longer valid, **Then** pagination clamps to a valid page without discarding the remaining filters.
6. **Given** a filter combination matching nothing, **When** results are returned, **Then** an empty state explains the situation and offers a way to adjust the filters.

---

### User Story 9 - Review the Financial Timeline (Priority: P3)

Authorized staff review a chronological history of everything that has happened to a student's finances, from invoice creation through installment generation, payments, reductions, and refunds.

**Why this priority**: The timeline explains how a balance arrived at its current value and prepares the record for audit, but it reports rather than drives operations.

**Independent Test**: Perform a series of financial operations and verify that each produces exactly one correctly ordered, attributable event, and that failed operations produce none.

**Acceptance Scenarios**:

1. **Given** a student with financial history, **When** the timeline is viewed, **Then** invoice creation, issuance, installment generation, payments received, discounts applied, scholarships applied, and refunds issued appear in chronological order with their actors and times.
2. **Given** any successful financial operation, **When** it completes, **Then** exactly one corresponding timeline event is recorded.
3. **Given** a financial operation that fails, **When** the timeline is viewed, **Then** no event was recorded for it.
4. **Given** a long financial history, **When** the timeline is viewed, **Then** events remain readable through ordered incremental loading without losing chronological order.
5. **Given** an event referencing an invoice, payment, or refund, **When** it is viewed, **Then** the affected record is identifiable to permitted users.

---

### User Story 10 - Serve Financial Context to Other Modules (Priority: P3)

Student Management's financial summary stops reporting "unavailable" and starts showing real figures, and a stable, permission-scoped read surface is available for future Accounting and Reporting.

**Why this priority**: This is the module's integration outcome, but it depends on every preceding story being correct.

**Independent Test**: Request a student's financial summary through the existing Student Management contract and verify it returns real figures matching this module's records, and that out-of-scope and unpermitted requests behave exactly as they do for interactive reads.

**Acceptance Scenarios**:

1. **Given** a student with financial records, **When** Student Management requests the financial summary, **Then** total fees, paid amount, remaining balance, active installment count, currency, and an as-of time are returned, matching this module's records exactly.
2. **Given** a student with no financial records, **When** the summary is requested, **Then** an explicit zero-balance result is returned rather than an unavailable result.
3. **Given** this module being unreachable, **When** the summary is requested, **Then** an explicit unavailable result is returned and no zeroes are presented as facts.
4. **Given** an out-of-scope or unpermitted request, **When** the summary is requested, **Then** it is refused exactly as an interactive read would be.
5. **Given** the accounting-facing read surface, **When** it is requested, **Then** it exposes settled financial facts and their identities without exposing unrestricted student personal data.

### Edge Cases

- An enrollment is processed for invoicing twice, or two invoicing requests for the same enrollment arrive concurrently.
- An invoice number or receipt number collides, or numbering is requested concurrently by two users.
- The academic product or batch referenced by an invoice is archived, rescheduled, or repriced after issuance.
- A student is withdrawn, suspended, graduated, or archived while carrying an outstanding balance.
- An enrollment is added to a student who already has invoices, producing a second concurrent balance.
- An invoice final amount does not divide evenly by the installment count, or an installment amount rounds to zero.
- A payment is recorded against a Cancelled invoice, a fully paid invoice, or an already settled installment.
- A payment is dated in the future, or before the invoice issue date.
- Two users record a payment against the same remaining balance simultaneously, or edit the same invoice concurrently.
- A discount and a scholarship together exceed the invoice total, or a reduction is applied after the amount has already been collected.
- A refund is recorded against a payment that has already been fully refunded, or against a payment on a cancelled invoice.
- A payment method is deactivated after payments were recorded against it.
- Currency or currency precision configuration changes after invoices exist.
- Search input contains Arabic name variants, Arabic-Indic digits, invoice or receipt numbers, or mixed-direction text.
- A date-range filter is inverted, spans a time-zone boundary, or covers a period with no records.
- A branch-scoped user's authorized branches change so a previously visible invoice leaves their scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized users to raise, view, edit, issue, and cancel invoices; permanent deletion of any financial record MUST NOT be available.
- **FR-002**: Every invoice MUST reference exactly one student and one enrollment, and MUST retain the academic product and the batch where the enrollment carries one.
- **FR-003**: Each invoice MUST retain an invoice number unique across the organization, issue date, due date, total amount, applied reductions, final amount, currency, and status.
- **FR-004**: Invoice numbers and receipt numbers MUST be allocated by the system, MUST be unique, and MUST NOT be user-editable.
- **FR-005**: The supported invoice lifecycle MUST be Draft, Issued, Partially Paid, Paid, and Cancelled, with transitions following an explicit policy that requires the exact action permission.
- **FR-006**: Raising invoices for an enrollment MUST be idempotent: repeated or concurrent processing of the same enrollment MUST reuse the existing invoices rather than duplicating them.
- **FR-007**: An issued invoice's total amount, reductions, and final amount MUST be immutable; later commercial changes MUST be recorded as adjustments rather than rewriting the issued figures.
- **FR-008**: An invoice carrying any recorded payment MUST NOT be cancellable until those payments are refunded.
- **FR-009**: Cancelled invoices MUST stop contributing to student balances while remaining readable for historical review.
- **FR-010**: An invoice MAY carry an installment plan defining the number of installments, the schedule, due dates, and per-installment amounts.
- **FR-011**: Installment amounts MUST sum exactly to the invoice final amount at the configured currency precision, with any rounding remainder absorbed by one deterministic installment.
- **FR-012**: Each installment MUST retain its sequence number, due date, amount, paid amount, and derived payment status.
- **FR-013**: Whether an academic product type permits installment plans MUST be configurable; the system MUST NOT hardcode that programs, diplomas, or courses do or do not support them.
- **FR-014**: Regenerating an installment plan MUST be refused once any installment carries a recorded payment.
- **FR-015**: Authorized users MUST be able to record payments carrying receipt number, student, invoice, installment where applicable, payment method, payment date, amount, and notes.
- **FR-016**: Payment methods MUST come from configurable organizational data, and only active methods MUST be selectable.
- **FR-017**: A payment amount MUST be greater than zero and MUST NOT exceed the invoice's remaining balance, or the targeted installment's remaining amount when one is specified.
- **FR-018**: Recording a payment MUST update the invoice status, the installment status where applicable, and the student's balance atomically and consistently.
- **FR-019**: Recorded payments MUST NOT be editable or deletable; corrections MUST be made through refunds.
- **FR-020**: Authorized users MUST be able to record manual discounts carrying type, value, reason, and approver, subject to configurable limits.
- **FR-021**: Authorized users MUST be able to award scholarships carrying name, percentage or fixed amount, reason, and approval information, applicable to full or partial tuition.
- **FR-022**: Discounts and scholarships MUST NOT produce a negative final amount or a balance below the amount already collected.
- **FR-023**: When reductions apply to an already issued invoice, they MUST reduce the unpaid balance and future installments only, never the recorded historical figures.
- **FR-024**: The order in which discounts and scholarships combine MUST be explicit, deterministic, and applied consistently everywhere a final amount is derived.
- **FR-025**: Authorized users MUST be able to record refunds referencing exactly one existing payment, carrying amount, reason, refund date, and status.
- **FR-026**: A refund amount MUST NOT exceed the referenced payment's amount less any refunds already recorded against it.
- **FR-027**: A completed refund MUST decrease the student's paid amount and increase the remaining balance by exactly the refunded amount, and MUST return the affected invoice to the status its balance dictates.
- **FR-028**: Refunds MUST NOT be deletable; they MUST be reversible only through their own status.
- **FR-029**: Each student MUST have a financial profile presenting total fees, paid amount, remaining balance, outstanding installment count, scholarships, discounts, currency, and derived financial status.
- **FR-030**: Student financial status MUST be derived from the underlying records rather than set manually, and MUST support No Outstanding Balance, Partial Balance, Overdue, and Completed.
- **FR-031**: A student MUST be considered Overdue when any unpaid installment or invoice has passed its due date.
- **FR-032**: All monetary values MUST be handled at the configured currency precision without loss, and totals MUST reconcile exactly with the records they summarize.
- **FR-033**: Currency and currency precision MUST come from configurable organizational data, and every amount MUST carry its currency.
- **FR-034**: The system MUST maintain a chronological financial timeline covering invoice creation, invoice issuance, installment generation, payments received, discounts applied, scholarships applied, refunds issued, and invoice cancellation.
- **FR-035**: Every successful financial operation MUST produce exactly one attributable timeline event with actor and time; failed operations MUST produce none.
- **FR-036**: The system MUST support search across invoice number, receipt number, student name, and student code.
- **FR-037**: Financial lists MUST support combined branch, student, product, invoice status, payment status, payment method, and date-range filters plus sorting and pagination.
- **FR-038**: Date-range filters MUST be inclusive, MUST refuse an inverted range, and MUST apply to the date relevant to the record type being listed.
- **FR-039**: Search, filtering, sorting, pagination, row selection, applicable bulk actions, and export MUST preserve organization, branch, and permission scope.
- **FR-040**: Direct record access and every view, create, edit, issue, cancel, payment, discount, scholarship, refund, and export action MUST be independently permission-aware.
- **FR-041**: Discount approval, scholarship approval, and refund approval MUST each require their own permission, distinct from the permission to record a payment.
- **FR-042**: Concurrent updates MUST detect stale records and require refresh or deliberate reconciliation rather than silently overwriting another user's work, and concurrent payments MUST NOT drive a balance below zero.
- **FR-043**: Every user-triggered operation MUST expose progress, success, and actionable failure feedback; every data surface MUST define loading, empty, unavailable, forbidden, and retryable error states.
- **FR-044**: The system MUST preserve unsaved user input after recoverable validation or service failures.
- **FR-045**: Financial records MUST retain created and updated actor and time context and immutable invoice, payment, reduction, refund, and approval history for future audit logging.
- **FR-046**: The module MUST satisfy the financial-summary contract Student Management already consumes, returning total fees, paid amount, remaining balance, active installment count, currency, and an as-of time.
- **FR-047**: A student with no financial records MUST yield an explicit zero-balance summary, distinguishable from an unavailable summary.
- **FR-048**: The module MUST expose a stable, permission-scoped accounting-facing read surface of settled financial facts and their identities, without exposing unrestricted student personal data.

### Constitution Requirements *(mandatory for UI features)*

- **Business Workflow**: Invoicing, issuance, installment planning, collection, reduction approval, refund approval, and cancellation remain distinct, separately authorized steps. Issued figures are immutable, payments are corrected only through refunds, and no financial record is ever permanently deleted.
- **Module Boundary**: Student Finance owns invoices, installment plans, payments, reductions, refunds, financial timeline, and balance derivation within its own route area. It consumes public Student Management, Admissions, Organization, Academic Catalog, and Program Batch concepts through stable contracts, satisfies the financial-summary contract Student Management already declares, and exposes only an accounting-facing projection to future modules.
- **Dynamic Configuration**: Payment methods, currency and precision, discount limits, scholarship rules, installment eligibility per product type, numbering patterns, due-date policy, and overdue thresholds are configurable business data. Seeded examples do not become fixed application rules.
- **Arabic & RTL**: Arabic is the default interface language, and invoices, receipts, installment schedules, tables, filters, forms, dialogs, timelines, monetary values, dates, and identifiers must behave naturally in RTL with mixed-direction values isolated. Content remains ready for future languages.
- **Responsive & Accessibility**: Profile, invoice, installment, payment, reduction, refund, list, and timeline workflows must remain complete on desktop, laptop, and tablet. Every action requires keyboard access, visible focus, programmatic names, semantic grouping, announced errors and status changes, managed dialog focus, and sufficient contrast. Monetary figures must be announced with their currency.
- **UI States**: Every data surface defines loading, empty, retryable error, unavailable, forbidden, and success states. Mutations preserve input on recoverable failure and never fail silently. A zero balance is presented as a fact only when it is one.
- **Reuse**: The module uses the platform's shared page, form, table, filter, badge, tab, dialog, notification, timeline, loading, empty, and error patterns. New shared patterns are introduced only when a finance need recurs and must contain no finance business logic.
- **Frontend Boundary**: Pages orchestrate screens, the Student Finance feature owns monetary policy and validation, and presentation components render state and interactions. All temporary data stays behind finance service boundaries so a future authoritative data source can replace it without changing page behavior.
- **AI & Future Context**: Read contexts may expose permission-scoped balances, ageing, collection history, and settled financial facts for future reporting, reconciliation, and automation. Future backend authorization, tenant isolation, audit storage, financial controls, and human approval remain authoritative boundaries; no automation may approve a reduction or refund on its own.

### Key Entities

- **Invoice**: A financial obligation raised against one enrollment, carrying its number, dates, total, reductions, final amount, currency, status, and immutability once issued.
- **Installment Plan**: The division of one invoice's final amount into scheduled installments, with its count, schedule basis, and regeneration constraints.
- **Installment**: One scheduled portion of an invoice, carrying its sequence, due date, amount, paid amount, and derived status.
- **Payment**: An immutable record of money collected against an invoice and optionally a specific installment, carrying its receipt number, method, date, amount, notes, and actor.
- **Payment Method**: A configurable means of collection with its own active state.
- **Discount**: An approved manual reduction against an invoice, carrying its type, value, reason, approver, and approval time.
- **Scholarship**: An approved award reducing a student's tuition, carrying its name, percentage or fixed amount, reason, approval information, and coverage.
- **Financial Adjustment**: A reduction recorded after issuance that lowers the unpaid balance and future installments without altering issued figures.
- **Refund**: A record reversing part or all of one specific payment, carrying its amount, reason, date, and status.
- **Student Financial Profile**: The derived view of a student's total fees, paid amount, remaining balance, outstanding installments, reductions, currency, and financial status.
- **Financial Timeline Event**: An immutable, chronologically ordered record of a financial occurrence, carrying its category, actor, time, and affected record reference.
- **Accounting Context**: A permission-scoped read projection of settled financial facts and their identities supplied to future Accounting and Reporting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Remaining balance equals final invoiced amounts minus net payments in 100% of tested combinations of invoices, installments, payments, discounts, scholarships, and refunds.
- **SC-002**: Installment amounts sum exactly to the invoice final amount in 100% of tested counts and amounts, including amounts that do not divide evenly.
- **SC-003**: 100% of payment attempts exceeding the remaining balance, and 100% of refund attempts exceeding the referenced payment, are refused with a specific explanation and no balance change.
- **SC-004**: Invoice numbers and receipt numbers are unique across 100% of tested records, including concurrent allocation.
- **SC-005**: 100% of issued invoices retain their original total, reductions, and final amount after any later reduction, payment, or refund.
- **SC-006**: 100% of attempts to edit or delete a recorded payment, or to delete any financial record, are refused.
- **SC-007**: Monetary values are correct to the configured currency precision in 100% of tested calculations, with no rounding drift across repeated operations.
- **SC-008**: Derived financial status matches the underlying records in 100% of tested states, including overdue detection at the due-date boundary.
- **SC-009**: A trained finance user can record a payment against an existing invoice in under 2 minutes in at least 90% of observed attempts.
- **SC-010**: Users receive searched or filtered financial results within 2 seconds for at least 95% of interactions across a working set of 50,000 invoices.
- **SC-011**: No tested unauthorized direct route, branch-scope request, reduction approval, refund approval, or export reveals or changes an out-of-scope financial record.
- **SC-012**: Every successful financial operation produces exactly one attributable timeline event, and every failed operation produces none.
- **SC-013**: Student Management's financial summary returns figures matching this module's records in 100% of tested students, and returns an explicit zero-balance result rather than an unavailable result for students with no financial records.
- **SC-014**: Profile, invoice, installment, payment, reduction, refund, list, and timeline workflows complete without loss of functionality at desktop, laptop, and tablet widths and at 200% zoom.
- **SC-015**: Primary workflows have no serious or critical accessibility violations and can be completed using only a keyboard.

## Assumptions

- Existing authentication supplies the current user, organization, role permissions, and authorized branch scope; mock contexts are non-authoritative during frontend development.
- Organization & Settings supplies configurable branches, employees, roles, permissions, currency, precision, time zone, payment methods, discount limits, numbering patterns, due-date policy, and overdue thresholds.
- Student Management supplies students, their enrollments, and their academic targets through its existing public contract, and already declares the financial-summary contract this module satisfies.
- Admissions supplies the approved commercial terms captured at admission — product or batch price, registration fees, agreed reductions, and required amount — as the starting figures for the first invoice. This module does not renegotiate admission terms; it invoices them.
- Academic Catalog and Program Batches supply product and batch identity and pricing context. Invoices retain the figures recorded when they were raised, so later repricing or archival never rewrites an existing invoice.
- Invoicing is triggered by an enrollment reaching an invoiceable state. Whether that trigger is manual or automatic per product type is organization-configurable; the module accepts the trigger through a stable, idempotent contract.
- Reductions applied before issuance change the invoice's own figures; reductions applied after issuance are recorded as adjustments affecting only the unpaid balance and future installments. This reconciles the immutability rule with the rule that reductions affect future balances.
- Discounts and scholarships combine in one documented order — scholarship applied to the tuition base first, then discount applied to the remainder — with the combined reduction never exceeding the invoice total. The precise order will be confirmed against organizational policy during planning without weakening the non-negative and non-below-collected rules.
- Installment rounding places the remainder on the final installment so earlier amounts stay uniform; the deterministic choice will be confirmed during planning.
- Refund execution — moving money back to the payer — happens outside this module. Student Finance records the refund, its approval status, and its effect on balances; it performs no payment transfer.
- A student may carry several concurrent enrollments and therefore several concurrent balances. The financial profile aggregates them and can also present them per enrollment.
- Withdrawal, suspension, graduation, or archival of a student does not clear an outstanding balance; the records remain and stay visible for collection and historical reporting.
- Financial records are retained indefinitely and are never permanently deleted; cancellation and status changes are the only reversals.
- Audit logging is prepared for but not implemented in this phase; the module retains the actor, time, approval, and change context that future audit storage will consume.
- Mobile optimization, real payment-gateway integration, printed or PDF invoice and receipt documents, tax and VAT handling, multi-currency conversion, Organization Expenses, Expense Requests, Accounting Ledger, Payroll, Vendor Payments, and AI automation are outside this feature phase.
