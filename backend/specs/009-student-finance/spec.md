# Feature Specification: Student Finance

**Feature Branch**: `[009-student-finance]`

**Created**: 2026-08-04

**Status**: Ready for planning

**Input**: User description: "Manage the complete financial lifecycle of enrolled students — tuition invoices, installment plans, payments, discounts, scholarships, refunds, balances, and financial statements — as the single source of truth for student-related financial operations, integrating with Admissions, Student Management, Academic Catalog, and Program Batches."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Raise, Prepare, and Issue Student Invoices (Priority: P1)

An authorized finance employee raises invoices for an enrolled student's enrollment, adjusts the still-editable draft figures and due date, and issues the invoice so its financial figures become permanently frozen.

**Why this priority**: Nothing else in the module can exist without an issued invoice — payments, installments, reductions, and balances all attach to one.

**Independent Test**: Raise invoices for an enrollment, repeat the same request, edit a draft, attempt to edit a non-draft, issue an invoice, and verify the frozen figures, unique invoice number, version increment, and recorded history.

**Acceptance Scenarios**:

1. **Given** an enrolled student's enrollment and one or more charge purposes, **When** an authorized employee raises invoices, **Then** one draft invoice is created per purpose with a unique organization-scoped invoice number, the enrollment's copied financial figures, version 1, and a creation history entry.
2. **Given** invoices already raised for the same enrollment and purpose, **When** the same request is repeated, **Then** the existing invoices are returned unchanged and no duplicate invoice or invoice number is created.
3. **Given** a draft invoice and its current version, **When** an authorized employee changes the total amount, due date, or attached reduction, **Then** the derived reduction totals and final amount are recomputed exactly and the record is updated atomically.
4. **Given** an invoice that is no longer a draft, **When** any field edit is attempted, **Then** the write is refused as immutable and the current status and permitted actions are returned.
5. **Given** a draft invoice, **When** an authorized employee issues it, **Then** the status becomes issued, an issue date is set, the figures are written once into an immutable issued snapshot, and an append-only status-history entry records the actor and time.
6. **Given** an additional charge such as an exam or certificate fee, **When** an invoice is raised on that active charge purpose and its draft amount is set before issuance, **Then** it behaves as any other invoice for payments, reductions, balances, and statements.
7. **Given** an unknown or deactivated charge purpose, **When** an invoice is raised on it, **Then** the request is refused, while invoices already raised on a since-deactivated purpose remain fully readable with their purpose label.
8. **Given** a stale expected version, an out-of-scope invoice, or a missing permission, **When** any write is attempted, **Then** no change is persisted and the corresponding conflict, scope, or permission outcome is returned.

---

### User Story 2 - Record Payments and See Accurate Balances (Priority: P2)

A finance employee records a student payment against an issued invoice — optionally against a specific installment — using a configured payment method, and immediately sees the invoice's collected and remaining amounts recomputed from the recorded money.

**Why this priority**: Collecting money and reporting a trustworthy balance is the module's core operational purpose.

**Independent Test**: Record valid and invalid payments across invoice states, installments, methods, dates, and amounts, then verify that the collected total, remaining balance, and paid/partially-paid state are computed from records only and never stored or client-supplied.

**Acceptance Scenarios**:

1. **Given** an issued or partially paid invoice with a remaining balance, **When** an authorized employee records a valid payment, **Then** a payment with a unique receipt number, recorder, method, date, amount, and optional notes is created and the invoice's derived balance and status reflect it immediately.
2. **Given** a payment amount greater than the invoice's server-recomputed remaining balance, **When** recording is attempted, **Then** it is refused and the true remaining amount is returned.
3. **Given** a targeted installment, **When** the amount exceeds that installment's remaining amount, **Then** recording is refused and the installment's remaining amount is returned.
4. **Given** a draft or cancelled invoice, an unknown or inactive payment method, a future payment date, or a payment date before the invoice issue date, **When** recording is attempted, **Then** it is refused with the specific reason and no payment is created.
5. **Given** an existing payment, **When** any update or deletion is attempted, **Then** it is refused as immutable and the caller is directed to the refund workflow.
6. **Given** recorded payments totalling the final amount, **When** the invoice is read, **Then** its derived status is paid; **Given** a partial total, **Then** its derived status is partially paid — in both cases without a stored status decision.

---

### User Story 3 - Generate and Track Installment Plans (Priority: P3)

A finance employee generates a scheduled installment plan for an eligible invoice, either on a monthly cadence or on explicit custom dates, and tracks each installment's obligation, collected amount, and derived state.

**Why this priority**: Instalment scheduling is how most tuition is actually collected, but it depends on an issued invoice and feeds payment targeting.

**Independent Test**: Generate plans across eligible and ineligible offering kinds and counts, verify exact amount allocation, regenerate before and after a payment exists, and verify each installment's derived collected, remaining, and overdue state.

**Acceptance Scenarios**:

1. **Given** an invoice for an offering kind that permits plans and a count within that kind's maximum, **When** a plan is generated, **Then** sequenced installments are created whose amounts sum exactly to the invoice total, with any indivisible remainder placed on the final installment.
2. **Given** a monthly schedule basis and a first due date, **When** the plan is generated, **Then** due dates follow the monthly cadence; **Given** a custom basis with explicit dates, **Then** the supplied dates are used and their count must match the installment count.
3. **Given** an offering kind that does not permit installment plans, or a count outside the permitted range, **When** generation is attempted, **Then** it is refused and no partial plan is created.
4. **Given** an existing plan where at least one installment already carries a payment, **When** regeneration is attempted, **Then** it is refused and the existing plan and payments remain intact.
5. **Given** an installment, **When** it is read, **Then** its collected amount, remaining amount, and state (pending, partially paid, paid, overdue) are computed from payments and the due date, never stored.

---

### User Story 4 - Apply Discounts and Award Scholarships Within Policy (Priority: P4)

An authorized approver applies a percentage or fixed-amount discount to an invoice, or awards a student a scholarship scoped to one enrollment or to all of them, with an approval trail and enforced policy limits.

**Why this priority**: Reductions materially change what a student owes and require separate authority from recording money.

**Independent Test**: Apply reductions before and after issuance, exceed each policy limit, attempt a reduction that would drop the balance under money already collected, and verify approval trails and post-issuance adjustment behaviour.

**Acceptance Scenarios**:

1. **Given** a draft invoice and a reduction within policy, **When** an authorized approver applies a discount, **Then** the reduction totals and final amount are recomputed by the reduction policy and the discount records its kind, value, reason, approver, and approval time.
2. **Given** an issued or later invoice, **When** an authorized approver applies a reduction, **Then** it is recorded as an append-only financial adjustment carrying a positive reduction amount and the issued snapshot is never rewritten.
3. **Given** a student and an approved scholarship, **When** it is awarded, **Then** it records its name, kind, value, coverage, reason, approver, and approval time, applies to the specified enrollment or to all enrollments when none is given, and reduces the affected outstanding balances.
4. **Given** a value above the discount percentage limit, the discount amount limit, or the scholarship percentage limit, **When** the reduction is submitted, **Then** it is refused and the applicable limit is returned.
5. **Given** a reduction that would push the outstanding balance below the amount already collected, **When** it is submitted, **Then** it is refused and the collected amount is returned.
6. **Given** a reason shorter than the required minimum, a scholarship name shorter than the required minimum, or a caller without the matching approval permission, **When** the reduction is submitted, **Then** it is refused and nothing is recorded.

---

### User Story 5 - Cancel Invoices and Process Refunds (Priority: P5)

Finance staff cancel an invoice that must be reversed, and separately request, approve or reject, and finally complete a refund against a specific recorded payment — with requesting and authorizing held by different permissions.

**Why this priority**: Reversal is the only correction path in an append-only ledger, and it is the module's principal internal financial control.

**Independent Test**: Exercise every allowed and forbidden invoice and refund transition, refund more than is refundable, refund without a payment, and verify that only completed refunds change collected totals.

**Acceptance Scenarios**:

1. **Given** a draft invoice, **When** an authorized employee cancels it with a reason, **Then** it becomes cancelled, stops contributing to balances and totals, and remains fully readable.
2. **Given** an issued or partially paid invoice that carries at least one payment, **When** cancellation is attempted, **Then** it is refused and the collected amount is returned.
3. **Given** a fully paid or already cancelled invoice, **When** any transition is attempted, **Then** it is refused because the status is terminal.
4. **Given** an existing payment, **When** an authorized employee requests a refund for an amount at most the payment's refundable remainder, with a reason and a non-future refund date, **Then** a requested refund is created.
5. **Given** a requested refund, **When** the authorizing employee approves or rejects it, **Then** the decision, actor, and time are recorded, and rejection requires a reason; approval and recording are enforced through separate permissions.
6. **Given** an approved refund, **When** it is completed, **Then** the collected total decreases by the refunded amount; **Given** a requested, approved, rejected, or cancelled refund, **Then** it has no effect on the collected total.
7. **Given** a refund amount above the payment's refundable remainder, or a refund without an existing payment, **When** it is requested, **Then** it is refused and the refundable amount is returned where applicable.

---

### User Story 6 - Find, Filter, and Export Finance Records (Priority: P6)

Finance staff work through four separate queues — invoices, payments, installments, and refunds — searching, filtering, sorting, and paging within their branch scope, and export the invoice queue under the same filters.

**Why this priority**: Daily collection work is queue-driven, but it depends on records existing first.

**Independent Test**: Seed records across branches, students, offerings, methods, statuses, and dates; exercise every documented search field, filter, sort field, and date-range field per queue; page past the end; invert a date range; and export with a filter applied.

**Acceptance Scenarios**:

1. **Given** finance records across branches, students, offerings, statuses, methods, and dates, **When** a supported search or filter is applied to a queue, **Then** only matching in-scope records are returned in a stable paginated order.
2. **Given** Arabic text or Arabic-Indic digits in a search term, **When** the search runs, **Then** it matches using the same normalization the client applies.
3. **Given** a page beyond the last page of results, **When** it is requested, **Then** an empty result set with correct totals is returned rather than an error.
4. **Given** a date range whose end precedes its start, **When** it is applied, **Then** the request is refused as an invalid range.
5. **Given** a filtered invoice queue, **When** an authorized employee exports it, **Then** the export applies the identical filters, branch scope, and permission rules as the list.
6. **Given** a caller whose scope excludes a record, **When** the queue or a detail is requested, **Then** the record is not disclosed and a detail request is refused as out of scope rather than as a generic permission failure.

---

### User Story 7 - Read Statements, Totals, and the Accounting Handoff (Priority: P7)

Staff open a student's read-only financial statement and chronological finance timeline, review organization-level collection totals for the current filters, and expose a settled-facts read for the future Accounting module.

**Why this priority**: These are read-only projections over everything the previous stories produce, and they carry the module's future integration boundary.

**Independent Test**: Build a student with charges, payments, reductions, and refunds; read the statement, timeline, and dashboard totals; confirm that totals cover every matching record rather than a page; and confirm the accounting read exposes no personal data.

**Acceptance Scenarios**:

1. **Given** a student with invoices, payments, discounts, scholarships, and refunds, **When** the financial statement is read, **Then** it returns total charges, collected amount, remaining balance, outstanding installment count, active scholarships and discounts, an overall financial state, and a per-enrollment breakdown — all derived and read-only.
2. **Given** a student with no finance records at all, **When** the statement or dashboard summary is read, **Then** the response explicitly reports that there are no records rather than presenting zero amounts as a fact.
3. **Given** a student's financial history, **When** the finance timeline is read, **Then** chronological immutable events for invoice creation, issuance and cancellation, plan generation, payment receipt, discount and scholarship application, adjustment recording, and refund request and completion are returned in stable cursor-paged order and can be filtered by category.
4. **Given** invoice queue filters, **When** the dashboard summary is read, **Then** the invoiced, collected, outstanding, and unsettled-invoice figures are computed server-side over every matching in-scope invoice, exclude cancelled invoices, and use the identical filter implementation as the invoice list.
5. **Given** any money-changing operation, **When** it succeeds, **Then** the previously reported summary figures are no longer served as current.
6. **Given** the accounting integration read, **When** it is requested, **Then** it returns settled invoice, payment, and refund facts and identifiers only, with no student name, address, national identifier, or notes.

### Edge Cases

- An invoice whose due date has passed with a remaining balance must present as overdue without introducing a stored overdue invoice status; the stored overdue state belongs to installments and to the student's overall financial state.
- Cancelled invoices are excluded from every balance and dashboard figure but still count towards deciding whether a student or filter has any records at all.
- Combining amounts whose currencies or precisions disagree must be refused rather than silently coerced.
- Percentage and fixed-amount reductions must never produce a negative final amount, and installment allocation must sum to the total exactly with no rounding drift.
- Concurrent writes using the same expected version permit at most one success; the loser receives the current version.
- A repeated raise request for the same enrollment and purpose resolves to the existing invoices instead of creating duplicates or consuming a new invoice number.
- An inactive payment method must remain resolvable for display on historical payments while being rejected on new payments.
- A refund partially consumes its payment; repeated refunds against the same payment are bounded by the remaining refundable amount.
- A payment recorded against an invoice with an installment plan but without a targeted installment applies to the invoice balance and must not corrupt any installment's derived state.
- Archived or historically inactive students, enrollments, offerings, batches, and branches remain readable in finance history but cannot be selected for new charges.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose invoices, installment plans and installments, payments, discounts, scholarships, financial adjustments, and refunds for enrolled students, and MUST NOT provide a delete operation on any of them.
- **FR-002**: Invoices MUST be raised only from an existing enrollment for one or more declared charge purposes, and the operation MUST be idempotent on the enrollment and purpose pair.
- **FR-003**: Each invoice MUST carry an organization-scoped unique invoice number generated by the system from the configured numbering policy, and MUST reject a number collision.
- **FR-004**: Each invoice MUST record the student, enrollment, branch, offering, offering kind, optional batch, purpose, due date, currency, precision, status, version, creator, and last modifier.
- **FR-005**: Invoice financial figures MUST comprise a total amount, discount total, scholarship total, and a final amount, where the final amount is always derived by the reduction policy and never accepted from a client.
- **FR-006**: Invoice figures MUST be editable only while the invoice is a draft; any write to a non-draft invoice MUST be refused with the current status and the permitted actions.
- **FR-007**: Issuing an invoice MUST set the issue date and write the immutable issued snapshot exactly once, and no later operation may modify that snapshot.
- **FR-008**: Invoice status MUST support draft, issued, partially paid, paid, and cancelled, where partially paid and paid are always derived from recorded money and are never settable.
- **FR-009**: Invoice transitions MUST be limited to draft → issued, draft → cancelled, issued → cancelled, and partially paid → cancelled; paid and cancelled MUST be terminal; cancellation MUST require a reason and MUST be refused when the invoice carries payments.
- **FR-010**: Invoice status changes MUST append an immutable status-history entry recording the previous status, new status, actor, and time.
- **FR-011**: Overdue MUST be presented for an invoice as a derived condition of a passed due date with a remaining balance, MUST be a stored state only for installments, and MUST appear as a value of the student's overall financial state.
- **FR-012**: Payments MUST be immutable once recorded: the system MUST NOT expose any operation that updates or deletes a payment, and corrections MUST go through the refund workflow.
- **FR-013**: Each payment MUST carry an organization-scoped unique receipt number, the student, invoice, optional targeted installment, branch, payment method, payment date, exact amount, optional notes bounded to 500 characters, and the recording actor and time.
- **FR-014**: Recording a payment MUST re-validate server-side that the amount is a positive decimal, does not exceed the recomputed invoice remaining balance, does not exceed the targeted installment's remaining amount, uses a known and active payment method, has a non-future payment date that is not before the invoice issue date, and targets a payable invoice.
- **FR-015**: Payment methods MUST be supplied by the organization's configurable lookups, MUST expose their active state, and MUST remain resolvable for display after being deactivated.
- **FR-016**: Installment plans MUST record their invoice, installment count, schedule basis, first due date, generation actor, and generation time, and each installment MUST record its plan, invoice, sequence, due date, and amount.
- **FR-017**: Installment amounts MUST be allocated so that they sum exactly to the invoice total, placing any indivisible remainder on the final installment.
- **FR-018**: Plan generation MUST be refused when the offering kind does not permit plans, when the count is outside the permitted range for that offering kind, or when any existing installment already carries a payment.
- **FR-019**: An installment's collected amount, remaining amount, and state MUST be derived from payments and the due date, and MUST never be stored or accepted from a client.
- **FR-020**: Discounts MUST be recorded against an invoice with a kind, value, reason of at least three characters, approving actor, and approval time, and MUST be enforced against the configured maximum percentage and maximum amount.
- **FR-021**: Scholarships MUST be recorded against a student with an optional enrollment scope, a name of at least two characters, a kind, value, coverage, reason, approving actor, and approval time, and MUST be enforced against the configured maximum percentage.
- **FR-022**: A scholarship without an enrollment scope MUST apply to all of the student's enrollments; a scholarship with an enrollment scope MUST apply only to that enrollment.
- **FR-023**: A reduction applied after issuance MUST be recorded as an append-only financial adjustment carrying its source kind, source identifier, positive reduction amount, reason, approving actor, and creation time.
- **FR-024**: Any reduction that would push an outstanding balance below the amount already collected MUST be refused, returning the collected amount.
- **FR-025**: Refunds MUST reference an existing payment and MUST record the invoice, student, amount, reason of at least three characters, refund date, status, requester and request time, and where applicable the deciding actor, decision time, and completion time.
- **FR-026**: Refund amounts MUST be positive and MUST NOT exceed the referenced payment's amount less refunds already recorded against it.
- **FR-027**: Refund status MUST support requested, approved, completed, rejected, and cancelled; transitions MUST be limited to requested → approved, requested → rejected, requested → cancelled, approved → completed, and approved → cancelled; completed, rejected, and cancelled MUST be terminal; rejection and cancellation MUST require a reason.
- **FR-028**: Only a completed refund MUST reduce the collected total; refunds in any other state MUST NOT affect any balance.
- **FR-029**: Requesting a refund and authorizing a refund MUST be governed by separate permissions so that the requester need not be the authorizer.
- **FR-030**: The final amount after adjustments, the collected total, the remaining balance, installment collected amounts and states, and the partially paid and paid invoice statuses MUST all be computed on demand from records and MUST NOT be persisted as a second source of truth.
- **FR-031**: Cancelled invoices MUST be excluded from every balance and summary figure while remaining fully readable and while still counting towards whether any records exist.
- **FR-032**: A student's read-only financial statement MUST return total charges, collected amount, remaining balance, outstanding installment count, active scholarships, applied discounts, an overall financial state of no outstanding balance, partial balance, overdue, or completed, a per-enrollment breakdown, an explicit no-records indicator, and an as-of time.
- **FR-033**: The finance timeline MUST be an append-only chronological record covering invoice creation, issuance and cancellation, plan generation, payment receipt, discount and scholarship application, adjustment recording, and refund request and completion, MUST be cursor-paginated, and MUST support filtering by event category.
- **FR-034**: The dashboard summary MUST compute the invoiced, collected, and outstanding totals and the count of not-fully-settled invoices over every invoice matching the caller's filters and branch scope, MUST exclude cancelled invoices, MUST use the same filter implementation as the invoice list, and MUST NOT be derived by a client from a page of results.
- **FR-035**: The accounting integration read MUST expose only settled invoice, payment, and refund facts and identifiers, and MUST NOT expose a student name, address, national identifier, or notes.
- **FR-036**: Every list MUST support the documented search fields, filters, sort fields, date-range field, and pagination for its queue, and the invoice list MUST additionally support export under identical filters, scope, and permissions.
- **FR-036a**: The invoice queue MUST support filtering by branch, student, offering, batch, and status, where a batch filter matches an invoice's batch and never matches an invoice that has no batch, and the export and dashboard summary MUST accept the identical filter set.
- **FR-037**: Search MUST apply the same Arabic text and digit normalization the client applies, a page beyond the last page MUST return an empty successful result with correct totals, and an inverted date range MUST be refused.
- **FR-038**: Every write MUST require expected-version conflict protection, MUST be atomic across all affected records, and MUST return the current version on conflict.
- **FR-039**: Every read and write MUST enforce the documented `finance.*` permission set and the caller's branch scope, and every detail response MUST return a computed per-record permissions object covering viewing, invoice creation, update, issuance, cancellation, installment management, payment viewing and recording, discount and scholarship approval, refund viewing, recording and approval, timeline viewing, and export.
- **FR-040**: A detail request for a record outside the caller's branch scope MUST be refused as out of scope, distinctly from a generic permission failure.
- **FR-041**: Validation, conflict, immutability, policy-limit, balance, date, currency, permission, scope, not-found, duplicate-number, and unavailable failures MUST each be distinguishable by a dedicated outcome, MUST carry the documented supporting detail such as the current version, remaining amount, collected amount, refundable amount, or applicable limit, and MUST NOT expose internal storage details.
- **FR-042**: Monetary values MUST be exact decimals with an explicit currency and precision, arithmetic MUST be performed in integer minor units, and combining values whose currency or precision disagree MUST be refused.
- **FR-043**: The module MUST expose bounded lookup choices for payment methods, charge purposes, branches, offerings, batches, invoice statuses, refund statuses, installment eligibility per offering kind, discount policy, scholarship policy, numbering policy, due-date policy, currency, and precision, and MUST mark inactive choices as unselectable while keeping them resolvable.
- **FR-044**: Every successful create, transition, approval, adjustment, refund decision, and payment MUST emit audit-ready event data after persistence succeeds, carrying the actor, target, operation, and resulting state.
- **FR-045**: Additional student charges beyond tuition and registration fees MUST be represented as invoices raised on their own declared charge purpose, with the amount set on the draft before issuance.
- **FR-046**: Charge purposes MUST be a configurable organization lookup group whose values carry a stable code, label, and active state, seeded with tuition, registration fee, card fee, certificate fee, exam fee, and training fee. Only active purposes MUST be selectable when raising an invoice, inactive purposes MUST remain resolvable for display on historical invoices, and the selectable set MUST be published through the finance lookups read.
- **FR-047**: Adding a new charge purpose MUST require only a lookup change and MUST NOT require modifying any existing finance business rule.
- **FR-048**: Late-payment penalties, organization accounting, expense management, payroll, banking integration, and online payment gateways MUST remain outside this feature.

### Key Entities

- **Invoice**: The versioned charge aggregate binding a student, enrollment, branch, offering, optional batch, and purpose to editable draft figures, a frozen issued snapshot, a status, and append-only status history.
- **Invoice Figures**: An exact-money set of total amount, discount total, scholarship total, and policy-derived final amount, held once as the editable draft and once as the immutable issued snapshot.
- **Installment Plan**: The generation record for an invoice's schedule, holding the count, schedule basis, first due date, and generating actor and time.
- **Installment**: A sequenced scheduled obligation with a due date and exact amount, whose collected amount, remaining amount, and state are always derived.
- **Payment**: An immutable receipt of money against an invoice and optionally a specific installment, recording the method, date, exact amount, notes, and recording actor and time.
- **Discount**: An approved invoice-level reduction with a kind, value, reason, and approval trail.
- **Scholarship**: An approved student-level reduction scoped to one enrollment or to all, with a name, kind, value, coverage, reason, and approval trail.
- **Financial Adjustment**: An append-only post-issuance reduction referencing its originating discount or scholarship, holding a positive reduction amount, reason, and approval trail.
- **Refund**: A controlled reversal request against one payment, carrying an amount, reason, refund date, lifecycle status, and the separate requesting and authorizing actors.
- **Finance Timeline Event**: An immutable, sequenced, category-tagged record of a material financial action, with actor, subject reference, optional amount, and summary.
- **Student Financial Statement**: A read-only derived projection of a student's charges, collections, reductions, refunds, outstanding installments, financial state, and per-enrollment breakdown.
- **Finance Lookups & Policies**: The bounded configuration set governing payment methods, installment eligibility per offering kind, discount and scholarship limits, numbering, and due dates.

### API Contract Alignment *(mandatory when the feature exposes HTTP endpoints)*

- **Documented endpoints covered**: `GET /api/v1/finance/invoices`, `GET /api/v1/finance/invoices/export`, `GET /api/v1/finance/invoices/:invoiceId`, `POST /api/v1/finance/invoices`, `PATCH /api/v1/finance/invoices/:invoiceId`, `POST /api/v1/finance/invoices/:id/issue`, `POST /api/v1/finance/invoices/:id/cancel`, `POST /api/v1/finance/invoices/:id/installment-plan`, `POST /api/v1/finance/invoices/:id/discounts`, `GET /api/v1/finance/payments`, `POST /api/v1/finance/payments`, `GET /api/v1/finance/installments`, `GET /api/v1/finance/refunds`, `POST /api/v1/finance/refunds`, `PATCH /api/v1/finance/refunds/:id/decision`, `POST /api/v1/finance/refunds/:id/complete`, `POST /api/v1/finance/scholarships`, `GET /api/v1/finance/students/:studentId/profile`, `GET /api/v1/finance/students/:studentId/timeline`, `GET /api/v1/finance/lookups`, `GET /api/v1/finance/dashboard/summary`, `GET /api/v1/finance/accounting-context`.
- **Requirements document sections**: `docs/api-data-requirements.html` §3 shared contracts (envelope, pagination, money, identifiers, idempotency, permissions, branch scoping, error envelope), §4.7 Student Finance, §5.6 route mapping, and §8 consolidated error catalogue.
- **Prohibited surface asserted by contract test**: no delete on any finance entity, no update or delete on a payment, and no write to an issued snapshot.
- **Contract gaps resolved**:
  - A persisted per-student "financial account" is not introduced. The contract mandates that balances have no second source of truth, so the account is the derived student financial statement read, and its immutable pricing snapshot lives in the enrollment (from the Admissions approval snapshot) and in each invoice's issued snapshot.
  - `overdue` is not added to the invoice status union. It is a derived presentation for invoices, a stored installment state, and a value of the student's overall financial state.
  - Additional student charges use the documented raise-by-purpose mechanism plus draft amount editing rather than a separate fee entity, which has no documented surface.
  - The permitted charge-purpose vocabulary was unenumerated; it is now an approved contract amendment making purpose a configurable organization lookup group (see below).
  - The invoice list had no batch filter; `batchIds[]` is now an approved contract amendment on the list, export, and dashboard summary.
  - Late-payment penalties have no documented surface and are excluded from this feature.
  - "Received by" on a payment maps to the documented recording actor; "payment number" maps to the documented receipt number.
  - The read-only student statement is served by the documented student financial profile read together with the cursor-paginated finance timeline; no separate statement endpoint is invented.
- **Approved contract amendment (recorded in `docs/api-data-requirements.html` § "Student Finance — approved contract amendment")**:
  - `GET /api/v1/finance/invoices` accepts `batchIds[]` with the same semantics as `offeringIds[]`; invoices without a batch never match a non-empty batch filter. The export and dashboard summary accept the same filter, preserving filter parity.
  - Invoice `purpose` is a configurable Organization Lookup group with stable codes, Arabic labels, and active flags, seeded as tuition, registration-fee, card-fee, certificate-fee, exam-fee, and training-fee. The idempotency key remains the enrollment and purpose pair, and the selectable purposes are published through the finance lookups read.
- **Contract gaps open**: none.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A finance employee can raise, adjust, and issue a tuition invoice for an enrolled student in under three minutes.
- **SC-002**: 100% of repeated raise requests for the same enrollment and purpose return the existing invoices and create no duplicate invoice or invoice number.
- **SC-003**: 100% of edit attempts against a non-draft invoice, and 100% of update or delete attempts against a payment, are refused with no change persisted.
- **SC-004**: 100% of issued invoices retain their issued snapshot unchanged after every later reduction, payment, refund, or cancellation.
- **SC-005**: In an audit of any set of finance records, the reported final amount, collected total, remaining balance, and derived statuses match a recomputation from the underlying records exactly, with zero rounding drift and zero stored duplicates.
- **SC-006**: 100% of payments exceeding the server-recomputed invoice or installment remaining amount are refused, including when the client submitted a stale balance.
- **SC-007**: 100% of generated installment plans have amounts summing exactly to the invoice total.
- **SC-008**: 100% of reductions above a configured policy limit, and 100% of reductions that would drop a balance below the collected amount, are refused with the limit or collected amount returned.
- **SC-009**: 100% of refunds above the referenced payment's refundable remainder are refused, and only completed refunds change any reported collected total.
- **SC-010**: 100% of cancelled invoices are excluded from the four dashboard figures while remaining readable and still counting towards the no-records determination.
- **SC-011**: Dashboard totals equal the totals of the full filtered set, verified against a data set exceeding 10 pages of invoices under the same filters.
- **SC-012**: List and export results and detail reads disclose no record outside the caller's branch scope, and the accounting integration read exposes no student name, address, national identifier, or notes.
- **SC-013**: Every successful money-changing operation produces exactly one corresponding immutable timeline event and one audit-ready event.
- **SC-014**: Concurrent writes against the same record with the same expected version produce at most one success, and every loser receives the current version.
- **SC-015**: With at least 50,000 invoices and 100,000 payments, 95% of queue searches, filters, and page changes visibly complete within two seconds under normal operating conditions.
- **SC-016**: At least 95% of authorized users complete the primary raise, issue, record-payment, plan, and refund tasks on the first attempt using the returned guidance.
- **SC-017**: Introducing a new charge purpose requires only a lookup configuration change, with zero changes to invoice, payment, reduction, refund, or balance rules.
- **SC-018**: Filtering the invoice queue, the export, and the dashboard summary by the same batch returns figures covering exactly the same invoice set.

## Assumptions

- Student Management (`specs/008-student-management`) supplies student identity, student code, enrollments, enrollment-level offering, batch, branch, and the immutable pricing snapshot carried forward from the Admissions approval snapshot. That spec is still an unfilled stub, so Student Finance depends on an enrollment boundary that must be specified and implemented before this feature can be built.
- Admissions prepares and pins tuition and registration-fee values but never creates invoices, payments, or balances; Student Finance is where money is first charged and collected.
- Academic Catalog and Program Batches supply offering identity, offering kind, batch identity, and the labels displayed on finance records; later catalog or batch pricing changes never alter an existing invoice.
- Identity & Access Management supplies the authenticated actor, the `finance.*` permission keys, organization membership, and the caller's authorized branch scope or organization-wide flag.
- Organization & Settings supplies the configurable payment-method lookup values, currency, precision, and the organization time zone used for date-only comparisons.
- The financial values a student owes originate from the enrollment snapshot, so the module copies rather than recalculates them at raise time.
- Charge purposes are organization-configurable master data seeded with tuition, registration fee, card fee, certificate fee, exam fee, and training fee; Organization & Settings owns the group and Student Finance only consumes it.
- Installment eligibility, maximum installment count per offering kind, discount limits, scholarship limits, numbering prefixes and width, default due days, and overdue grace days are configuration published through the finance lookups read rather than hard-coded rules.
- Invoice and receipt numbers are allocated by the service and are unique within the organization; a collision is a conflict rather than a silent renumber.
- This module has no file upload surface.
- Accounting consumes only the settled-facts integration read; Student Finance never writes to Accounting and never depends on it.
- Reporting is a future consumer of the same derived reads; no reporting endpoints are introduced here.
