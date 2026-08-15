# Research: Student Finance

Phase 0 output. Every Technical Context unknown is resolved here; no `NEEDS CLARIFICATION` remains.

## R1 — Deriving balances without storing them, at list and dashboard scale

**Decision**: A PostgreSQL view, `finance_invoice_balance`, projecting one row per invoice with `final_minor`, `net_paid_minor`, `remaining_minor`, `collected_minor`, and `derived_status`. It aggregates payments, completed refunds, and post-issuance adjustments against the effective figure set (issued snapshot when issued, draft otherwise). Every read path joins this view: the list for filtering and the documented `remaining` sort, the detail read, the dashboard `SUM`, the statement, and the in-transaction balance re-check before a payment or reduction.

**Rationale**: `remaining` is a documented invoice sort field and the dashboard must total every matching invoice. Both need the derived value inside SQL. A view is a stored query, not stored data — it cannot drift by construction, so it satisfies "no second source of truth" while making derivation set-based. One derivation definition also removes the risk of the list, the detail, and the dashboard disagreeing.

**Alternatives considered**:
- *Derive in TypeScript per request*: cannot sort or total without loading the full filtered set. This is the §9.11 defect the contract explicitly calls out — a page-capped sum presented as an organization-wide total.
- *Materialized view*: needs refreshing, so it becomes stale data with a refresh policy — the drift the contract forbids, reintroduced with extra operational surface.
- *Denormalized balance columns maintained by triggers*: fastest to read, but it is a stored derived value. A single failed or out-of-order trigger produces a balance that disagrees with the payments, and it cannot be audited by recomputation.

**Consequences**: Repositories read the view through typed raw queries (view columns are not Prisma models). Indexes on `Payment(invoiceId)`, `Refund(paymentId, status)`, and `FinancialAdjustment(invoiceId)` carry the aggregation. The scale test at 50,000 invoices and 100,000 payments validates the two-second target and is the gate on this decision.

## R2 — Exact money arithmetic

**Decision**: Persist `BigInt` minor units plus `currency` and `precision` columns, exactly as `AdmissionFinancialRevision` already does. Convert to and from the wire `Money` decimal string only in mappers, using the existing `src/shared/utils/money.util.ts` helpers. Refuse to combine values whose currency or precision disagree with `invalid-currency`.

**Rationale**: The constitution requires integer minor-unit arithmetic and forbids float serialization anywhere. Reusing the established column shape keeps Admissions snapshots and Finance invoices directly comparable when the enrollment snapshot is copied forward.

**Alternatives considered**: Prisma `Decimal` — arithmetic is correct but it invites accidental float coercion in JavaScript and diverges from the existing money convention in the schema.

## R3 — Installment amount allocation

**Decision**: Integer allocation in minor units. Each installment receives `floor(total / count)`; the final installment receives that plus the full remainder. An invariant assertion verifies the sum equals the total exactly before the transaction commits.

**Rationale**: The contract specifies "equal parts with the remainder on the last installment, and the sum must equal the total exactly". Integer division with a single remainder placement makes the invariant structural rather than something to test for after the fact.

**Alternatives considered**: Distributing the remainder across the earliest installments spreads rounding but contradicts the documented behaviour, so the client and server would compute different schedules.

## R4 — Idempotent invoice raising

**Decision**: A database unique index on `(enrollmentId, chargePurposeValueId)`. The raise operation attempts the insert; on unique violation it reads and returns the existing invoice. Both paths return the same response shape, so a retry is indistinguishable from the first call.

**Rationale**: The contract names `(enrollmentId, purpose)` as the natural idempotency key. Enforcing it in the database rather than by a pre-read check removes the read-then-write race that lets two concurrent raises both pass the check.

**Alternatives considered**: An `AdmissionRequestKey`-style durable idempotency-key table — correct, but unnecessary here because the contract gives a natural key. Reserve that pattern for operations without one.

## R5 — Invoice and receipt numbering

**Decision**: A `FinanceNumberCounter` table keyed on `(organizationId, sequenceKind, year)`, incremented under `SELECT … FOR UPDATE` inside the allocating transaction, formatted as `INV-2026-00001` / `RCP-2026-00001` from the lookup-published prefix, year, and width. A unique index on the resulting number turns any residual collision into `duplicate-number`.

**Rationale**: This mirrors `AdmissionReferenceCounter`, which the Admissions plan already established for exactly this reason. `count + 1` is not safe under concurrency and silently reuses numbers after a cancellation.

**Alternatives considered**: A PostgreSQL sequence — concurrency-safe but does not reset per year and leaves gaps on rollback, which is visible in a financial document number.

## R6 — Enforcing immutability

**Decision**: Three layers. (1) No mutating route exists for payments or history — asserted by a contract test. (2) Repositories expose no update or delete method for append-only tables. (3) PostgreSQL triggers reject `UPDATE` and `DELETE` on `Payment`, `InvoiceStatusChange`, `Discount`, `Scholarship`, `FinancialAdjustment`, and `FinanceTimelineEvent`, and reject any `UPDATE` that changes a non-null issued-snapshot column on `Invoice`.

**Rationale**: Immutable financial history is the module's core audit guarantee. Application-level enforcement alone leaves a future migration, repair script, or repository refactor able to rewrite settled money. The Admissions module already uses rejection triggers for its history tables, so this is the house pattern rather than a new one.

**Alternatives considered**: Application-only enforcement — cheaper, but it makes the guarantee depend on every future author remembering it.

## R7 — Optimistic concurrency scope

**Decision**: `expectedVersion` targets the invoice for every operation that changes what the invoice detail reports — draft edit, issue, cancel, plan generation, payment recording, and reductions. Refund decisions and completion version the refund. The compare-and-swap is `UPDATE … WHERE id = $1 AND version = $2 AND status = ANY($3)`, and a zero row count raises `version-conflict` carrying `currentVersion`.

**Rationale**: Payments are inserts into a child table, but they change the invoice's derived balance and status. If they did not bump the invoice version, two staff members holding the same stale detail could each record a payment the remaining balance permits only once.

**Alternatives considered**: Versioning only direct invoice-column edits — simpler, but it leaves the double-collection race open, which is the highest-value concurrency bug in the module.

## R8 — Payment and reduction balance re-check

**Decision**: Read the remaining balance from `finance_invoice_balance` **inside** the serializable transaction that records the payment or reduction, and compare against the requested amount there. The client-supplied balance is never trusted.

**Rationale**: The contract is explicit: "re-checking the remaining balance server-side, since the client value can be stale." Serializable isolation plus the in-transaction read makes concurrent overpayment impossible rather than merely unlikely.

**Alternatives considered**: Advisory locks on the invoice row — serializable isolation already provides the guarantee, and adding locks would duplicate a mechanism the `TransactionManager` owns.

## R9 — Charge purposes and payment methods as lookups

**Decision**: Two `LookupGroup` rows seeded in `prisma/seeds/student-finance.ts`: `FINANCE_CHARGE_PURPOSE` (values tuition, registration-fee, card-fee, certificate-fee, exam-fee, training-fee, additional-fee) and `FINANCE_PAYMENT_METHOD` (cash, bank-transfer, card, cheque). `Invoice.chargePurposeValueId` and `Payment.methodId` are foreign keys to `LookupValue`. Only `ACTIVE` values may be selected; inactive values remain joinable so historical records keep their labels.

**Rationale**: This is the owner-approved amendment. It satisfies Principle XIX directly — adding a fee type or payment method becomes data, not a control-flow change. The `LookupGroup`/`LookupValue` models already exist with `code`, `name`, `status`, and `sortOrder`, and the seed for the existing `cash` value shows the established shape.

**Alternatives considered**: A Prisma enum — enforced at the type level but requires a migration and a code change per new fee type, which directly contradicts the plan input's "organizations may add new charge purposes without code changes".

## R10 — Overdue, and the derived invoice status

**Decision**: `derived_status` in the view returns `paid` when remaining is zero, `partially-paid` when collected is above zero and remaining is above zero, and otherwise the stored status. Overdue is returned as a separate boolean-plus-date condition on invoices (due date passed with remaining above zero), as the stored `InstallmentStatus.OVERDUE`, and as `FinancialStatus.OVERDUE` on the student statement. The stored `InvoiceStatus` enum keeps exactly the documented five values.

**Rationale**: The client's invoice-status filter is a closed five-value list; a sixth stored value would silently break it. Overdue is a pure function of due date and remaining balance, so a stored column would require a scheduler and could contradict a payment recorded between runs.

**Alternatives considered**: A nightly job flipping issued invoices to a stored `overdue` — this is the design the derived-status rule exists to prevent, and it makes the status wrong for the window between the payment and the next run.

## R11 — Scholarship scope resolution

**Decision**: `Scholarship.enrollmentId` is nullable. A null value means the scholarship applies to every enrollment of that student. Resolution happens in `ReductionPolicy`, which returns the applicable scholarship set for an invoice by matching `studentId` and (`enrollmentId IS NULL OR enrollmentId = invoice.enrollmentId`). Coverage (`full-tuition` / `partial-tuition`) constrains which charge purposes a scholarship may reduce.

**Rationale**: The contract states "scoped to one enrollment, or all when absent". Keeping resolution in one policy prevents the invoice read and the statement read from disagreeing about which scholarships apply.

**Alternatives considered**: Materializing a scholarship-to-invoice join table on award — faster to read, but it must be rewritten whenever a new invoice is raised for a covered student, which is a second source of truth.

## R12 — Refund limits

**Decision**: Enforce two independent bounds. Per payment: the requested amount may not exceed that payment's amount less refunds already `requested`, `approved`, or `completed` against it. Per student: total completed refunds may not exceed total collected. Both are checked in-transaction; the per-payment failure returns `refund-exceeds-payment` with `refundable`.

**Rationale**: The contract specifies the per-payment bound; the plan input adds "refunds cannot exceed total paid amounts". They are not redundant — the per-payment bound prevents over-refunding one receipt, and the aggregate bound is the ledger-level invariant. Counting in-flight requests toward the per-payment bound stops two pending requests from jointly exceeding the payment.

**Alternatives considered**: Counting only completed refunds toward the bound — allows two concurrent requests that each pass validation and jointly over-refund once both are approved.

## R13 — Cursor pagination for the finance timeline

**Decision**: Encode the cursor as base64 of the last-seen `sequence`, matching the documented `eyJzZXEiOjExfQ` shape. `sequence` is a per-student monotonic integer allocated inside the same transaction as the event. Query with `WHERE studentId = $1 AND sequence < $cursor ORDER BY sequence DESC LIMIT $limit + 1`, using the extra row to decide `nextCursor`.

**Rationale**: The contract fixes both the `{items, nextCursor}` shape and the cursor payload. A monotonic per-student sequence gives stable ordering that a timestamp cannot guarantee when several events share a millisecond.

**Alternatives considered**: Timestamp cursors — ties cause skipped or repeated events at page boundaries.

## R14 — Arabic search folding

**Decision**: Reuse `src/shared/utils/arabic-normalize.ts`. Persist normalized companion columns for the searchable text (`normalizedStudentName`, `invoiceNumber`, `receiptNumber`, `studentCode`) and match against the normalized form of the query term.

**Rationale**: The constitution fixes the folding rules and requires the server to apply the same normalization the client applies. The utility already exists and is used by Admissions, so search behaves identically across modules.

**Alternatives considered**: A PostgreSQL `unaccent`/`pg_trgm` configuration — powerful, but it would not reproduce the client's exact Arabic letter and digit folding, so the two would disagree at the edges.

## R15 — Building against an unimplemented Students module

**Decision**: Define `STUDENTS_ENROLLMENT_PORT` as a real interface in `src/modules/student-finance/types/students-enrollment.port.ts`, provided by symbol. Finance depends only on the interface. A test double satisfies it for unit, integration, and E2E runs; Student Management provides the production implementation when it ships. The account-provisioning path is driven by a `student.created` domain event carrying the student identifier, so Finance never reaches into student tables.

**Rationale**: Principle XVI requires exactly this shape — mocks behind the same interface as the real implementation, replaceable without changing a service. It lets Finance be built and fully tested now, with integration reduced to supplying one adapter later.

**Alternatives considered**:
- *Wait for module 008*: serializes two large modules for no design benefit.
- *Define Student and Enrollment tables inside Finance*: violates Principle II (module ownership) and would collide with module 008's schema.

**Risk**: The port shape is Finance's assumption about what Student Management will expose. Module 008 must adopt it, or the two must be reconciled before integration. The port contract is written to be minimal for exactly this reason.
