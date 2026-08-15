# Implementation Plan: Student Finance

**Branch**: `[009-student-finance]` | **Date**: 2026-08-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-student-finance/spec.md`

## Summary

Implement Student Finance as a dedicated business module that owns one financial account per student, an immutable per-enrollment financial snapshot, purpose-keyed invoices with a frozen issued snapshot, installment plans, immutable payments, approved discounts and scholarships, post-issuance financial adjustments, a controlled refund lifecycle, an append-only finance timeline, and read-only statements, dashboard totals, and an accounting-context projection.

The module's defining rule is that **money that can be recomputed is never stored**. Charges, reductions, payments, and refunds are the base facts; final amount, collected amount, remaining balance, installment progress, the `partially-paid`/`paid` invoice statuses, and overdue are all projections over those facts. This is what makes the ledger auditable: there is no second copy of a balance that can drift from the records that produced it.

Controllers stay transport-only. Services and policies own every business rule and orchestrate typed ports into Students, Catalog, Program Batches, Organization, and IAM. Repositories alone touch Prisma. Multi-record writes run serializable with optimistic compare-and-swap on `expectedVersion`, and audit events emit only after commit.

### Reconciliation with the plan input

Three items in the plan input are delivered differently from their literal wording, because the literal form would store a value the system can already compute — the one thing the shared contract explicitly forbids ("nothing here is stored… there is no second source of truth that can drift"), and which Principle III makes non-negotiable. Each is delivered in full at the API surface:

| Plan input asks for | Delivered as | Why |
|---|---|---|
| `StudentFinancialAccount` storing Outstanding Balance | The account **is persisted**, one per student, auto-created on student creation, holding currency/precision and owning the immutable per-enrollment snapshots. `outstandingBalance` is computed on read and returned on every account and statement response. | Satisfies one-account-per-student, auto-creation, and snapshot immutability. A stored balance column would need rewriting on every payment, reduction, and refund, and would silently disagree with the ledger the first time a write partially failed. |
| `Overdue` as a stored invoice status | Stored `InvoiceStatus` keeps the documented five values; overdue is returned as a derived state on invoices, a stored state on installments, and a value of the student's overall financial status. | The frontend's invoice-status filter is a closed five-value union; a sixth stored value breaks it. Overdue is a pure function of due date and remaining balance, so storing it would require a scheduler that can contradict recorded payments. |
| `AdditionalCharge` as its own entity | An additional charge **is** an invoice raised on a non-tuition charge purpose (`card-fee`, `certificate-fee`, `exam-fee`, `training-fee`, `additional-fee`), with the amount set on the draft before issuance. | A separate charge table holding an amount that also appears on an invoice is the exact drift the contract forbids, and the raise API is already keyed on `(enrollmentId, purpose)`. Every charge then inherits payments, installments, reductions, refunds, and statements for free. |

Everything else in the plan input is implemented as written, including the charge-purpose lookup group (seeded tuition, registration-fee, card-fee, certificate-fee, exam-fee, training-fee, additional-fee), batch filtering scoped to Professional Programs, refund limits enforced both per-payment and against total collected, and read-only statements.

### Hard prerequisite

Student Finance is raised **from an enrollment**, and no `Student` or `Enrollment` table exists yet — `specs/008-student-management/spec.md` is still an unfilled template. This plan defines the exact `STUDENTS_ENROLLMENT_PORT` contract Finance requires (see [contracts/student-finance-public-ports.contract.md](contracts/student-finance-public-ports.contract.md)). Finance can be built and tested against that interface immediately, but it cannot serve real traffic until Student Management ships an implementation of it.

## Technical Context

**Language/Version**: TypeScript 5.7 strict mode, Node.js 22

**Primary Dependencies**: NestJS 11, Prisma ORM 7.9 with `@prisma/adapter-pg`, class-validator 0.15 / class-transformer 0.5, Swagger 11, RxJS 7, and the existing `TransactionManager`, `DomainEventBus`, `BranchScopeService`, `PermissionsGuard`, response-envelope interceptor, and exception filter

**Storage**: PostgreSQL. Money is `BigInt` minor units plus `currency` and `precision`, mirroring `AdmissionFinancialRevision`. Balance projections are read through a SQL view over the base tables — a view holds no rows and therefore cannot drift.

**Testing**: Jest 30 with ts-jest. Unit tests for the balance, allocation, reduction, lifecycle, and refund policies; live PostgreSQL integration tests for transactions, idempotency, numbering, triggers, and view correctness; E2E contract tests for the documented HTTP surface, the prohibited-surface assertion, permissions, and branch scoping; concurrency tests for compare-and-swap; and a scale test at 50,000 invoices and 100,000 payments.

**Target Platform**: Linux-compatible HTTP server on Node.js 22

**Project Type**: Modular REST web service

**Performance Goals**: At 50,000 invoices and 100,000 payments, 95% of queue searches, filters, and page changes complete visibly within two seconds. Balance derivation for a 20-row page costs one aggregate query, never 20. Dashboard totals are one aggregate over the filtered set, never a page sum.

**Constraints**: Exact `/api/v1/finance/*` paths and payloads; `{success,data,meta}` envelope; `page`/`pageSize` 20 default and 100 max with over-range returning empty 200; decimal-string `Money` backed by integer minor units with no float anywhere; UUID IDs; UTC ISO timestamps and date-only calendar dates with inclusive upper bounds; `expectedVersion` on every mutation with first-class `currentVersion` on conflict; natural-key idempotency on `(enrollmentId, purpose)`; Arabic UTF-8 messages and search folding; branch scoping with distinct `out-of-scope`; per-record permissions object; no delete on any entity, no payment mutation, no issued-snapshot write

**Scale/Scope**: One organization; 50,000+ invoices; 16 permission keys; 22 canonical HTTP operations across invoices, payments, installments, refunds, scholarships, statements, timeline, lookups, dashboard, export, and the accounting-context read; two consumed ports (Students, Organization) plus display-only Catalog and Batches ports, and one exported port (Accounting)

## Constitution Check

*GATE: PASS before Phase 0 and PASS after Phase 1 design.*

Source: `.specify/memory/constitution.md` v1.0.0.

| # | Gate | Principle | Status |
|---|------|-----------|--------|
| 1 | Feature is scoped to one business domain module; no cross-module DB access | I, II | **PASS** — `StudentFinanceModule` owns only finance tables. Students, Organization lookups, Catalog, Batches, and IAM are reached through typed ports; no foreign repository is imported. |
| 2 | Every endpoint matches `docs/api-data-requirements.html` | III | **PASS WITH APPROVED AMENDMENT** — the 22 operations match §4.7 exactly. The two owner-approved deltas (`batchIds[]` on the invoice list, export, and dashboard; `purpose` as a lookup group) are already written into the requirements document under "Student Finance — approved contract amendment", so code and contract do not drift. |
| 3 | Controllers hold no business logic; Controller → Service → Repository → Prisma | IV, V | **PASS** — controllers bind DTOs and guards and call one service entry point. Balance, allocation, reduction, lifecycle, and refund rules live in policies; only repositories receive the Prisma client. |
| 4 | Every request has validated DTOs; business rules live in services | VI | **PASS** — DTOs carry structural `class-validator` rules (decimal-string patterns, bounds, date formats, string lengths). Balance limits, policy caps, transition legality, and method activity are service-side because they need current state. |
| 5 | Every protected endpoint has a permission guard | VII | **PASS** — all 16 `finance.*` keys are already seeded in `prisma/seeds/permission-catalog.ts`. Routes declare keys through `@RequirePermissions`; the per-record permissions object is computed in one policy. |
| 6 | Responses use the single success/error envelope | VIII, XIII | **PASS** — controllers return bare payloads; the global interceptor and filter own the envelopes. Closed Arabic error codes extend `DomainException` in a new `student-finance.exceptions.ts`. CSV export is the documented exception. |
| 7 | Uploads go through the storage service | IX | **N/A** — §4.7 states this module has no upload surface, and none is introduced. |
| 8 | Multi-entity writes are transactional; domain events emitted for audit | X, XI | **PASS** — raise, issue, cancel, plan generation, payment recording, reductions, and refund transitions run in `TransactionManager.runSerializable()`; events publish only after commit and carry identifiers and amounts, never student PII. |
| 9 | `strict` mode holds; no new `any` | XII | **PASS** — closed unions, typed ports, `BigInt` money, and typed raw-query result shapes for the balance view. |
| 10 | Every list endpoint is paginated | XIV | **PASS** — the four queues use the documented offset format; the finance timeline uses the documented cursor form; lookups are a bounded closed set. |
| 11 | Deletion is archival | XV | **PASS** — no delete exists on any finance entity. Invoice cancellation is the reversal, refunds are the payment correction, and cancelled records remain fully readable. |
| 12 | No dependency on mock data | XVI | **PASS** — `STUDENTS_ENROLLMENT_PORT` is a real interface; the test double and the future Student Management implementation sit behind the same symbol. |
| 13 | Swagger documents real success and error shapes | XVII | **PASS** — a `finance-api.decorator.ts` mirrors the existing admissions and organization decorators and documents each closed error code with its status and extra detail field. |
| 14 | No speculative abstraction; unclear requirements were clarified | XIX, XX | **PASS** — both spec questions were answered by the owner before planning. Charge purposes and payment methods are lookup-driven, so a new fee type or method needs no control-flow change. Penalties, accounting, payroll, and gateways stay out. |

**Contract bindings re-check**: PASS. `{success,data,meta}`; `page`/`pageSize` in, `meta.limit` out; decimal-string `Money` over `BigInt` minor units; UUIDs; UTC timestamps and date-only bounds inclusive to end of day; `expectedVersion` with first-class `currentVersion`; `(enrollmentId, purpose)` natural-key idempotency; per-record permissions; branch scoping with distinct `out-of-scope`; Arabic UTF-8 with search folding; CSV with BOM; `hasNoRecords` set explicitly rather than substituting zeros.

## Architecture and Ownership

```text
HTTP controllers
  → Invoice / Payment / Installment / Reduction / Refund / Statement / Dashboard / Lookup services
    → balance, allocation, reduction, lifecycle, refund, numbering, permission policies
    → typed Students / Organization / Catalog / Batches / IAM ports
    → Student Finance repositories
      → Prisma / PostgreSQL finance tables + finance_invoice_balance view
```

- `StudentFinanceModule` owns all finance persistence, DTOs, policies, mappers, events, and projections.
- `STUDENTS_ENROLLMENT_PORT` (consumed) resolves student identity and code, enrollment identity, offering and offering kind, optional batch, branch, and the immutable pricing snapshot carried from the Admissions approval snapshot. It also delivers the student-created signal that provisions the financial account.
- `ORGANIZATION_MASTER_DATA_PORT` (existing, consumed) resolves the payment-method and charge-purpose lookup values, branches, currency, and precision, keeping inactive values resolvable for historical display.
- Catalog and Program Batches ports resolve offering and batch labels for display only; pricing always comes from the enrollment snapshot, never from a live catalog read.
- `FINANCE_ACCOUNTING_PORT` (exported) serves the settled-facts projection for the future Accounting module. It exposes no student name, address, national identifier, or notes, and leaks no repository.

## Data and Transaction Strategy

- Persist `StudentFinancialAccount` (one per student, unique on `studentId`) and `StudentEnrollmentFinancialSnapshot` (one immutable row per enrollment). The snapshot is written once at enrollment and never updated; later catalog or batch pricing changes cannot reach it.
- Persist `Invoice` with `chargePurposeValueId`, both figure sets (`draft*` columns and nullable `issued*` columns), status, and version. A unique index on `(enrollmentId, chargePurposeValueId)` makes the raise operation idempotent at the database level rather than by application check.
- Write `issued*` columns exactly once, guarded by a database trigger that rejects any `UPDATE` changing a non-null issued column. The prohibition is enforced by the database, not only by review.
- Append-only tables — `InvoiceStatusChange`, `Payment`, `Discount`, `Scholarship`, `FinancialAdjustment`, `FinanceTimelineEvent` — carry `UPDATE`/`DELETE` rejection triggers, matching the pattern already used by Admissions history tables.
- Store money as `BigInt` minor units with `currency` and `precision` columns. All arithmetic is integer. Installment allocation divides the total into equal minor-unit parts and places the remainder on the final installment, so the sum is exact by construction.
- Derive every balance through `finance_invoice_balance`, a SQL view over invoices, payments, completed refunds, and adjustments exposing `final_minor`, `net_paid_minor`, `remaining_minor`, and `derived_status`. The view is the single derivation, used identically by the list (including the documented `remaining` sort), the detail read, the dashboard aggregate, and the statement. It stores nothing.
- Allocate invoice and receipt numbers from an organization-and-year-scoped `FinanceNumberCounter` row locked inside the transaction, never `count + 1`. A collision surfaces as `duplicate-number`, never a silent renumber.
- Run every mutation through `TransactionManager.runSerializable()`, comparing `(id, expectedVersion, allowedStatus)` and incrementing the invoice version exactly once per aggregate mutation. Recording a payment or applying a reduction bumps the invoice version, because both change what the invoice detail reports.
- Re-check the remaining balance inside the transaction, from the view, before accepting a payment or a reduction. A client-supplied balance is always treated as stale.
- Emit audit-ready domain events after commit carrying actor, target identifiers, operation, amounts, and resulting version — never student names, addresses, identifiers, or notes.

## API, Validation, and Authorization Strategy

- The 22 operations are exactly those listed in [contracts/student-finance-http.contract.md](contracts/student-finance-http.contract.md). A contract test asserts the prohibited surface: no `DELETE` on any finance route, no `PATCH /finance/payments/:id`, and no route that writes an issued snapshot.
- DTO-level validation covers what is knowable without state: decimal-string amount patterns with a positive constraint, date-only formats, non-future dates, reason at least 3 characters, scholarship name at least 2, notes at most 500, installment count as a positive integer, and closed enum membership.
- Service-level validation covers what needs current state: invoice payability, remaining balance, installment remaining, payment-method activity, payment date not before issue date, offering-kind installment eligibility, existing installment payments, discount and scholarship policy caps, reduction below collected, refundable remainder per payment, aggregate refunds against total collected, and transition legality.
- Every route declares its `finance.*` key. The detail response's `permissions` object is computed by one `FinancePermissionPolicy` covering all 16 keys; it is never assembled inline in a controller or mapper.
- Branch scope is applied to every list through `BranchScopeService.applyToQuery` and asserted on every detail through `assertInScope`, which raises the distinct `out-of-scope` code rather than a generic forbidden.
- Errors are the closed §4.7 union — `not-found`, `forbidden`, `out-of-scope`, `version-conflict`, `validation-failed`, `invoice-immutable`, `invoice-not-payable`, `invoice-has-payments`, `payment-exceeds-balance`, `installment-exceeds-remaining`, `payment-method-inactive`, `payment-immutable`, `installments-not-permitted`, `plan-has-payments`, `reduction-exceeds-limit`, `reduction-below-collected`, `negative-amount`, `invalid-currency`, `invalid-date-range`, `refund-exceeds-payment`, `refund-requires-payment`, `duplicate-number`, `service-unavailable` — each with its documented status and extra detail field.

## Project Structure

### Documentation (this feature)

```text
specs/009-student-finance/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── student-finance-http.contract.md
│   └── student-finance-public-ports.contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/modules/student-finance/
├── student-finance.module.ts
├── accounts/                 # account provisioning + enrollment snapshots
│   ├── student-financial-account.service.ts
│   ├── student-financial-account.repository.ts
│   └── dto/
├── invoices/
│   ├── invoice.controller.ts
│   ├── invoice.service.ts
│   ├── invoice.repository.ts
│   ├── invoice-lifecycle.policy.ts
│   ├── invoice-export.service.ts
│   └── dto/
├── installments/
│   ├── installment.controller.ts
│   ├── installment.service.ts
│   ├── installment.repository.ts
│   ├── installment-allocation.policy.ts
│   └── dto/
├── payments/
│   ├── payment.controller.ts
│   ├── payment.service.ts
│   ├── payment.repository.ts
│   ├── payment.policy.ts
│   └── dto/
├── reductions/               # discounts, scholarships, adjustments
│   ├── reduction.controller.ts
│   ├── reduction.service.ts
│   ├── reduction.repository.ts
│   ├── reduction.policy.ts
│   └── dto/
├── refunds/
│   ├── refund.controller.ts
│   ├── refund.service.ts
│   ├── refund.repository.ts
│   ├── refund-lifecycle.policy.ts
│   └── dto/
├── balances/                 # the single derivation, shared by every read
│   ├── finance-balance.service.ts
│   └── finance-balance.repository.ts
├── statements/
│   ├── student-statement.controller.ts
│   ├── student-statement.service.ts
│   ├── finance-timeline.service.ts
│   └── finance-timeline.repository.ts
├── dashboard/
│   ├── finance-dashboard.controller.ts
│   └── finance-dashboard.service.ts
├── lookups/
│   ├── finance-lookups.controller.ts
│   └── finance-lookups.service.ts
├── numbering/
│   └── finance-numbering.service.ts
├── integration/
│   ├── accounting-context.controller.ts
│   └── finance-accounting.adapter.ts
├── policies/
│   └── finance-permission.policy.ts
├── events/
│   └── student-finance.events.ts
├── mappers/
│   ├── invoice.mapper.ts
│   ├── payment.mapper.ts
│   └── statement.mapper.ts
└── types/
    ├── student-finance.types.ts
    ├── students-enrollment.port.ts     # consumed; implemented by module 008
    └── finance-accounting.port.ts      # exported to future Accounting

src/core/exceptions/student-finance.exceptions.ts
src/shared/swagger/finance-api.decorator.ts
prisma/schema.prisma                    # finance models, enums, view, triggers
prisma/seeds/student-finance.ts         # charge-purpose + payment-method lookup groups

test/
├── unit/student-finance/               # balance, allocation, reduction, lifecycle, refund policies
├── integration/student-finance/        # transactions, idempotency, numbering, view, triggers
└── e2e/student-finance/                # contract surface, permissions, scope, prohibited routes
```

**Structure Decision**: One NestJS feature module at `src/modules/student-finance/`, sub-foldered by aggregate exactly as `src/modules/admissions/` is, with shared derivation isolated in `balances/` so that no service computes a balance its own way. Core exceptions, Swagger decorators, Prisma schema, and seeds extend the existing shared locations rather than creating module-local copies.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| A SQL view (`finance_invoice_balance`) rather than pure in-service derivation | `remaining` is a documented invoice sort field and the dashboard must total the whole filtered set, not a page. Both need the derived value inside SQL, in `ORDER BY` and `SUM`. | Deriving in TypeScript would force loading every matching invoice to sort or total it — the exact §9.11 bug the contract calls out, and it breaks at the 100-row page cap. |
| Database triggers rejecting `UPDATE`/`DELETE` on history tables and issued snapshots | Immutability is the module's core audit guarantee, and the contract asserts it as a hard surface rule. | Application-only enforcement leaves a migration, a script, or a future repository free to rewrite settled financial history. The Admissions module already sets this precedent. |
| Invoice version increments on payment and reduction writes, which are child-table inserts | The invoice detail reports derived balances, so a child insert changes what the caller last read. Optimistic concurrency must cover it or two staff can double-collect against the same remaining balance. | Versioning only direct invoice-column edits would let a stale client pass `expectedVersion` and record a payment the balance no longer permits. |
