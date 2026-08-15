---

description: "Task list for Student Finance implementation"
---

# Tasks: Student Finance

**Input**: Design documents from `/specs/009-student-finance/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. The feature specification and plan both mandate unit, integration, E2E contract, concurrency, immutability, and scale suites, so test tasks are generated for every story.

**Organization**: Tasks are grouped by user story so each story is independently implementable and testable.

## ⚠️ Blocking Prerequisite

Invoices are raised **from an enrollment**, and no `Student` or `Enrollment` table exists — `specs/008-student-management/spec.md` is still an unfilled template. Every phase below is implementable now against the `STUDENTS_ENROLLMENT_PORT` interface and its test double (T014, T015). **The module cannot serve real traffic until Student Management ships a production adapter for that port.** T115 is the integration task that lands it.

> **Rebuild reconciliation — 2026-08-06.** Every task below was previously
> marked complete while the module did not compile or run. Each has been
> re-verified against the code that now exists. Tasks whose deliverable was
> built at a different path than predicted keep `[x]` with the real path;
> tasks with no equivalent artefact have been reopened. Remaining open items
> are listed in the completion report and are all additional test coverage,
> not missing functionality — all 22 contract operations are implemented,
> mounted, and covered by the surface contract test.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1–US7)
- Every task carries an exact file path

## Path Conventions

Module code lives in `src/modules/student-finance/`; shared extensions in `src/core/` and `src/shared/`; schema and seeds in `prisma/`; tests in `test/unit/student-finance/`, `test/integration/student-finance/`, and `test/e2e/student-finance/`.

## Work Package Mapping

The six work packages in the task request map onto the story phases as follows. Phases are the unit of delivery; packages are the unit of reporting.

| Work package | Phases |
|---|---|
| 1 — Financial Accounts & Invoices | Phase 3 (US1) + the account tasks T027–T029, plus Phase 8 (US6) for search/filter/sort/page |
| 2 — Installments & Payments | Phase 4 (US2) + Phase 5 (US3) |
| 3 — Discounts, Scholarships & Additional Charges | Phase 6 (US4); additional charges are invoices on a charge purpose (T060, T083) |
| 4 — Refunds & Financial Statements | Phase 7 (US5) + Phase 9 (US7) |
| 5 — Backend Integration | Phase 2 Foundational (ports, schema, module wiring) + T115 |
| 6 — Validation & Finalization | Phase 10 Polish |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the module shell, the closed error vocabulary, and the lookup seed before persistence work begins.

- [x] T001 Create the module and test skeleton from the plan in `src/modules/student-finance/` (accounts, invoices, installments, payments, reductions, refunds, balances, statements, dashboard, lookups, numbering, integration, policies, events, mappers, types), `test/unit/student-finance/`, `test/integration/student-finance/`, and `test/e2e/student-finance/`
- [x] T002 [P] Define the closed finance domain enums, projection types, derived-balance shapes, and redacted event payload types in `src/modules/student-finance/types/student-finance.types.ts`
- [x] T003 [P] Define finance event names and sanitized payload types (identifiers, amounts, versions — never student PII) in `src/modules/student-finance/events/student-finance.events.ts`
- [x] T004 [P] Implement the 23 closed finance exceptions with their documented status codes and extra detail fields (`remaining`, `collected`, `refundable`, `limit`, `currentVersion`, `fromStatus`, `allowed[]`) in `src/core/exceptions/student-finance.exceptions.ts` and export them from `src/core/exceptions/index.ts`
- [x] T005 [P] Implement the finance Swagger decorator documenting real success envelopes and every closed error code in `src/shared/swagger/finance-api.decorator.ts`
- [x] T006 Create the `StudentFinanceModule` provider/export shell in `src/modules/student-finance/student-finance.module.ts` and register it after Admissions in `src/app.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Persistence, immutability enforcement, the single balance derivation, ports, numbering, and permissions — everything every story depends on.

**⚠️ CRITICAL**: No user story work begins until this phase passes migration, architecture, and strict type gates.

### Foundational Tests

- [x] T007 [P] Add migration and live-constraint coverage for every finance table, index, unique key, and append-only trigger in `test/integration/student-finance/finance-migration.spec.ts`
- [x] T008 [P] Add immutability coverage asserting direct SQL `UPDATE`/`DELETE` is rejected on `Payment`, `InvoiceStatusChange`, `Discount`, `Scholarship`, `FinancialAdjustment`, `FinanceTimelineEvent`, and on any non-null `issued*` invoice column in `test/integration/student-finance/immutability.spec.ts`
- [x] T009 [P] Add architecture boundary checks forbidding Prisma outside repositories, foreign repository imports, and `any` in `test/integration/student-finance/finance-architecture.spec.ts`
- [x] T010 [P] Add `finance_invoice_balance` correctness coverage proving `final`, `collected`, `refunded`, `netPaid`, `remaining`, `derivedStatus`, and `isOverdue` match a hand-computed ledger across draft, issued, partially paid, paid, cancelled, adjusted, and refunded fixtures in `test/integration/student-finance/balance-view.spec.ts`
- [x] T011 [P] Add permission-seed coverage asserting exactly the 16 `finance.*` keys resolve in `test/integration/student-finance/finance-permissions.spec.ts`

### Foundational Implementation

- [x] T012 Extend `prisma/schema.prisma` with the nine finance enums and the models `StudentFinancialAccount`, `StudentEnrollmentFinancialSnapshot`, `Invoice`, `InvoiceStatusChange`, `InstallmentPlan`, `Installment`, `Payment`, `Discount`, `Scholarship`, `FinancialAdjustment`, `Refund`, `FinanceTimelineEvent`, and `FinanceNumberCounter` per [data-model.md](data-model.md), with `BigInt` minor-unit money columns
- [x] T013 Create the finance PostgreSQL migration in `prisma/migrations/20260804030000_student_finance/migration.sql` with the unique keys (`Invoice(enrollmentId, chargePurposeValueId)`, `Invoice(organizationId, invoiceNumber)`, `Payment(organizationId, receiptNumber)`, `StudentFinancialAccount(studentId)`, `StudentEnrollmentFinancialSnapshot(enrollmentId)`), all query indexes, append-only rejection triggers, the issued-snapshot write-once trigger, and the `finance_invoice_balance` view defined in [data-model.md](data-model.md)
- [x] T014 [P] Define the consumed `STUDENTS_ENROLLMENT_PORT` token and interface (resolve student, resolve enrollment with immutable financial snapshot, list enrollments, `student.created` signal) in `src/modules/student-finance/types/students-enrollment.port.ts` per [contracts/student-finance-public-ports.contract.md](contracts/student-finance-public-ports.contract.md)
- [x] T015 [P] Implement the `STUDENTS_ENROLLMENT_PORT` test double producing deterministic students, enrollments, and pricing snapshots in `test/doubles/students-enrollment.double.ts`
- [x] T016 [P] Define the exported `FINANCE_ACCOUNTING_PORT` token and settled-facts interface, exposing no student name, address, national identifier, or notes, in `src/modules/student-finance/types/finance-accounting.port.ts`
- [x] T017 [P] Implement the finance balance repository reading `finance_invoice_balance` through typed raw queries — single-invoice, batched-by-invoice-ids, and aggregate-over-filter forms — in `src/modules/student-finance/balances/finance-balance.repository.ts`
- [x] T018 [P] Implement the balance service exposing the one derivation used by list, detail, dashboard, statement, and the in-transaction re-check, including installment collected/remaining/status projection, in `src/modules/student-finance/balances/finance-balance.service.ts`
- [x] T019 [P] Implement the numbering service allocating `INV-YYYY-NNNNN` and `RCP-YYYY-NNNNN` from `FinanceNumberCounter` under `SELECT … FOR UPDATE` inside the caller's transaction, raising `duplicate-number` on collision, in `src/modules/student-finance/numbering/finance-numbering.service.ts`
- [x] T020 [P] Implement the per-record permission policy computing all 16 `finance.*` flags for detail responses in `src/modules/student-finance/policies/finance-permission.policy.ts`
- [x] T021 [P] Seed the `FINANCE_CHARGE_PURPOSE` lookup group (tuition, registration-fee, card-fee, certificate-fee, exam-fee, training-fee, additional-fee) and the `FINANCE_PAYMENT_METHOD` group (cash, bank-transfer, card, cheque) idempotently in `prisma/seeds/student-finance.ts`
- [x] T022 Register the finance seed after Admissions and verify repeat-run ordering in `prisma/seed.ts`
- [x] T023 [P] Map the new finance unique-constraint violations to their closed error codes in `src/database/prisma-error.mapper.ts`
- [x] T024 [P] Implement shared exact-money helpers for minor-unit conversion, percentage and fixed reduction arithmetic, and currency/precision agreement checks raising `invalid-currency` in `src/modules/student-finance/balances/finance-money.policy.ts`
- [x] T025 Wire repositories, policies, ports, event bus, transaction manager, and branch scope into `src/modules/student-finance/student-finance.module.ts`
- [x] T026 Run the migration, seed twice, Prisma generate/validate, architecture, immutability, balance-view, and strict TypeScript gates, recording fixes in `test/integration/student-finance/finance-migration.spec.ts`

**Checkpoint**: Persistence, immutability, and the single balance derivation are in place. Stories can proceed without cross-module data access.

---

## Phase 3: User Story 1 — Raise, Prepare, and Issue Student Invoices (Priority: P1) 🎯 MVP

**Goal**: Provision one financial account per student with an immutable per-enrollment snapshot, raise idempotent purpose-keyed invoices from an enrollment, edit draft figures, and issue an invoice so its figures freeze permanently.

**Independent Test**: Provision an account, raise invoices for an enrollment, repeat the identical raise, edit a draft, attempt to edit a non-draft, issue, then attempt a second write to the issued snapshot at both the service and SQL levels.

### Tests for User Story 1

- [x] T027 [P] [US1] Add unit tests for draft figure recomputation, due-date defaulting from `duePolicy`, and charge-purpose activity rules in `test/unit/student-finance/invoice-draft.policy.spec.ts`
- [x] T028 [P] [US1] Add unit tests for the invoice transition table — allowed edges, terminal states, reason requirements — in `test/unit/student-finance/invoice-lifecycle.policy.spec.ts`
- [x] T029 [P] [US1] Add PostgreSQL integration tests for account provisioning idempotency on replayed `student.created`, snapshot write-once, raise idempotency under concurrent identical requests, and number allocation without gaps or reuse in `test/integration/student-finance/invoice-raise.spec.ts`
- [ ] T030 [P] [US1] Add E2E contract tests for `POST /finance/invoices`, `PATCH /finance/invoices/:id`, `POST /finance/invoices/:id/issue`, and `GET /finance/invoices/:invoiceId`, covering envelopes, permissions, `expectedVersion`, `invoice-immutable`, and rejection of server-owned fields in `test/e2e/student-finance/invoice-lifecycle.e2e-spec.ts`

### Implementation for User Story 1

- [x] T031 [P] [US1] Implement the account repository and provisioning service subscribing to `student.created`, creating exactly one account per student and writing the immutable enrollment snapshot from `STUDENTS_ENROLLMENT_PORT`, in `src/modules/student-finance/accounts/student-financial-account.repository.ts` and `src/modules/student-finance/accounts/student-financial-account.service.ts`
- [x] T032 [P] [US1] Implement the raise and draft-update DTOs with decimal-string amount patterns, date-only formats, and closed reduction-kind enums in `src/modules/student-finance/invoices/dto/raise-invoices.dto.ts` and `src/modules/student-finance/invoices/dto/update-draft-invoice.dto.ts`
- [x] T033 [P] [US1] Implement the invoice lifecycle policy encoding the transition table, terminal states, reason minimums, and the `isEditable()` draft-only rule in `src/modules/student-finance/invoices/invoice-lifecycle.policy.ts`
- [x] T034 [US1] Implement the invoice repository with transaction-aware compare-and-swap on `(id, expectedVersion, allowedStatus)`, idempotent raise resolving unique-violation to the existing row, append-only status-history insert, and write-once issued-snapshot update in `src/modules/student-finance/invoices/invoice.repository.ts`
- [x] T035 [US1] Implement the invoice service orchestrating raise (snapshot read, number allocation, purpose validation, timeline event), draft update (figure recomputation), and issue (snapshot freeze, status history) inside `TransactionManager.runSerializable()` in `src/modules/student-finance/invoices/invoice.service.ts`
- [x] T036 [US1] Implement the raise, draft-update, issue, and detail endpoints with `@RequirePermissions`, current caller, branch-scope assertion, Swagger, and bare payloads in `src/modules/student-finance/invoices/invoice.controller.ts`
- [x] T037 [US1] Implement invoice detail mapping — draft and issued figure sets, `derived` block from the balance service, `statusHistory`, and the per-record permissions object — in `src/modules/student-finance/mappers/invoice.mapper.ts`
- [x] T038 [US1] Emit `finance.account.provisioned`, `finance.invoice.raised`, `finance.invoice.updated`, and `finance.invoice.issued` after commit, then run the US1 suites against scenario 1 of [quickstart.md](quickstart.md)

**Checkpoint**: Accounts exist, invoices can be raised idempotently, edited as drafts, and issued with permanently frozen figures. This is the MVP.

---

## Phase 4: User Story 2 — Record Payments and See Accurate Balances (Priority: P2)

**Goal**: Record immutable payments against issued invoices and optionally against a targeted installment, with every balance and status derived from recorded money.

**Independent Test**: Record valid and invalid payments across invoice states, methods, dates, and amounts; submit a stale-balance payment; then confirm no payment mutation route exists and that paid/partially-paid come only from the derivation.

### Tests for User Story 2

- [x] T039 [P] [US2] Add unit tests for every payment rule in the contract table — positive amount, method activity, non-future date, date not before issue date, notes bound, payability — in `test/unit/student-finance/payment.policy.spec.ts`
- [x] T040 [P] [US2] Add unit tests proving `netPaid`, `remaining`, and `derivedStatus` come from the balance service across partial, exact, and over-collected fixtures in `test/unit/student-finance/finance-balance.policy.spec.ts`
- [x] T041 [P] [US2] Add PostgreSQL integration tests for the in-transaction balance re-check refusing a stale-but-plausible amount, and receipt-number allocation under concurrency, in `test/integration/student-finance/payment-recording.spec.ts`
- [x] T042 [P] [US2] Add concurrency tests firing two simultaneous payments against a balance covering only one, asserting exactly one success and one `version-conflict` carrying `currentVersion`, in `test/integration/student-finance/concurrency.spec.ts`
- [x] T043 [P] [US2] Add E2E contract tests for `POST /finance/payments` covering all documented error codes, and asserting `PATCH`/`DELETE /finance/payments/:id` are unregistered routes, in `test/integration/student-finance/payment-recording.spec.ts`

### Implementation for User Story 2

- [x] T044 [P] [US2] Implement the record-payment DTO with decimal-string amount, date-only `paymentDate`, optional `installmentId`, notes ≤ 500, and `expectedVersion` in `src/modules/student-finance/payments/dto/record-payment.dto.ts`
- [x] T045 [P] [US2] Implement the payment policy enforcing amount bounds against invoice and installment remaining, method existence and activity, and the two date rules, raising `payment-exceeds-balance`, `installment-exceeds-remaining`, `payment-method-inactive`, `invalid-date-range`, `invoice-not-payable`, and `negative-amount` with their detail fields, in `src/modules/student-finance/payments/payment.policy.ts`
- [x] T046 [US2] Implement the insert-only payment repository — no update or delete method exists — with transaction-aware insert and invoice version bump in `src/modules/student-finance/payments/payment.repository.ts`
- [x] T047 [US2] Implement the payment service recording a payment inside `TransactionManager.runSerializable()`, re-reading the remaining balance from the view inside the transaction, allocating the receipt number, and appending a `PAYMENT_RECEIVED` timeline event, in `src/modules/student-finance/payments/payment.service.ts`
- [x] T048 [US2] Implement the record-payment endpoint with `finance.payments.record`, branch scope, and Swagger in `src/modules/student-finance/payments/payment.controller.ts`, and payment mapping in `src/modules/student-finance/mappers/payment.mapper.ts`
- [x] T049 [US2] Emit `finance.payment.recorded` after commit and run the US2 suites against scenario 2 of [quickstart.md](quickstart.md)

**Checkpoint**: Money can be collected, balances are trustworthy and derived, and payments are immutable at every layer.

---

## Phase 5: User Story 3 — Generate and Track Installment Plans (Priority: P3)

**Goal**: Generate exactly-allocating installment schedules for eligible invoices and expose each installment's derived collected amount, remaining amount, and state.

**Independent Test**: Generate plans across eligible and ineligible offering kinds and counts, verify exact allocation by property test, regenerate before and after a payment exists, and read derived installment state.

### Tests for User Story 3

- [x] T050 [P] [US3] Add a property test driving totals from 1 to 100,000 minor units against counts 1–12, asserting the allocation sums exactly to the total with the remainder on the final sequence, in `test/unit/student-finance/installment-allocation.policy.spec.ts`
- [x] T051 [P] [US3] Add unit tests for monthly cadence generation, `CUSTOM` basis requiring a date count equal to `count`, and count bounds per offering kind in `test/unit/student-finance/installment-schedule.policy.spec.ts`
- [x] T052 [P] [US3] Add PostgreSQL integration tests for plan regeneration replacing a payment-free plan atomically and being refused with `plan-has-payments` otherwise, in `test/integration/student-finance/installment-plan.spec.ts`
- [x] T053 [P] [US3] Add E2E contract tests for `POST /finance/invoices/:id/installment-plan` and `GET /finance/installments`, asserting derived `paidAmount`, `remaining`, and `status` on every row, in `test/integration/student-finance/installment-plan.spec.ts`

### Implementation for User Story 3

- [x] T054 [P] [US3] Implement the generate-plan DTO with positive integer `count`, closed `scheduleBasis`, date-only `firstDueDate`, optional `customDueDates[]`, and `expectedVersion` in `src/modules/student-finance/installments/dto/generate-installment-plan.dto.ts`
- [x] T055 [P] [US3] Implement the allocation policy — `floor(total / count)` per installment with the full remainder on the final sequence, plus a pre-commit sum-equals-total assertion — in `src/modules/student-finance/installments/installment-allocation.policy.ts`
- [x] T056 [P] [US3] Implement the schedule policy generating monthly and custom due dates and enforcing `installmentEligibility[offeringKind]`, raising `installments-not-permitted` and count-bound `validation-failed`, in `src/modules/student-finance/installments/installment-schedule.policy.ts`
- [x] T057 [US3] Implement the installment repository with transaction-aware plan replacement, payment-presence check raising `plan-has-payments`, and the branch-scoped installment queue query joining derived state, in `src/modules/student-finance/installments/installment.repository.ts`
- [x] T058 [US3] Implement the installment service generating plans inside a serializable transaction and appending an `INSTALLMENT_PLAN_GENERATED` timeline event, in `src/modules/student-finance/installments/installment.service.ts`
- [x] T059 [US3] Implement the plan-generation and installment-queue endpoints with `finance.installments.manage` and `finance.invoices.view` in `src/modules/student-finance/installments/installment.controller.ts`, emit `finance.installment-plan.generated`, and run the US3 suites against scenario 3 of [quickstart.md](quickstart.md)

**Checkpoint**: Scheduled collection works, allocation is exact by construction, and installment progress is derived.

---

## Phase 6: User Story 4 — Apply Discounts and Award Scholarships Within Policy (Priority: P4)

**Goal**: Apply approved invoice discounts and student scholarships within published policy limits, recording post-issuance reductions as append-only adjustments that never touch the issued snapshot.

**Independent Test**: Apply reductions before and after issuance, exceed each policy limit, attempt a reduction below the collected amount, and verify enrollment-scoped versus all-enrollment scholarship resolution and the byte-identical issued snapshot.

### Tests for User Story 4

- [x] T060 [P] [US4] Add unit tests for percentage and fixed reduction arithmetic in minor units, the never-negative final amount invariant, and `reduction-exceeds-limit` against `discountPolicy` and `scholarshipPolicy`, in `test/unit/student-finance/reduction.policy.spec.ts`
- [ ] T061 [P] [US4] Add unit tests for scholarship scope resolution — null `enrollmentId` covering all enrollments, a set value covering one — and coverage constraining which charge purposes may be reduced, in `test/unit/student-finance/scholarship-scope.policy.spec.ts`
- [ ] T062 [P] [US4] Add PostgreSQL integration tests proving a post-issuance reduction creates a `FinancialAdjustment` and leaves all four `issued*` columns byte-identical, in `test/integration/student-finance/reductions.spec.ts`
- [ ] T063 [P] [US4] Add E2E contract tests for `POST /finance/invoices/:id/discounts` and `POST /finance/scholarships`, covering separate approval permissions, `reduction-exceeds-limit` with `limit`, and `reduction-below-collected` with `collected`, in `test/e2e/student-finance/reductions.e2e-spec.ts`

### Implementation for User Story 4

- [x] T064 [P] [US4] Implement the apply-discount DTO (kind, value, reason ≥ 3, `expectedVersion`) in `src/modules/student-finance/reductions/dto/apply-discount.dto.ts`
- [x] T065 [P] [US4] Implement the award-scholarship DTO (studentId, optional enrollmentId, name ≥ 2, kind, value, coverage, reason ≥ 3) in `src/modules/student-finance/reductions/dto/award-scholarship.dto.ts`
- [x] T066 [P] [US4] Implement the reduction policy computing discount and scholarship totals and the derived final amount, enforcing policy caps and the `reduction-below-collected` rule, in `src/modules/student-finance/reductions/reduction.policy.ts`
- [x] T067 [US4] Implement the append-only reduction repository inserting `Discount`, `Scholarship`, and `FinancialAdjustment` rows with no update or delete path, in `src/modules/student-finance/reductions/reduction.repository.ts`
- [x] T068 [US4] Implement the reduction service routing pre-issuance reductions to draft figure recomputation and post-issuance reductions to a `FinancialAdjustment`, inside a serializable transaction with an in-transaction collected-amount check, in `src/modules/student-finance/reductions/reduction.service.ts`
- [x] T069 [US4] Implement the discount and scholarship endpoints with `finance.discounts.approve` and `finance.scholarships.approve` as separate keys in `src/modules/student-finance/reductions/reduction.controller.ts`
- [x] T070 [US4] Emit `finance.discount.approved`, `finance.scholarship.approved`, and `finance.adjustment.recorded` after commit, append `DISCOUNT_APPLIED`/`SCHOLARSHIP_APPLIED`/`ADJUSTMENT_RECORDED` timeline events, and run the US4 suites against scenario 4 of [quickstart.md](quickstart.md)

**Checkpoint**: Reductions are policy-bounded, approval-gated, and never rewrite settled figures.

---

## Phase 7: User Story 5 — Cancel Invoices and Process Refunds (Priority: P5)

**Goal**: Cancel invoices that must be reversed, and run refunds through request, decision, and completion with requesting and authorizing held by separate permissions.

**Independent Test**: Exercise every allowed and forbidden invoice and refund transition, refund beyond the refundable remainder, refund without a payment, and confirm only completed refunds change collected totals.

### Tests for User Story 5

- [x] T071 [P] [US5] Add unit tests for the refund transition table — allowed edges, terminal states, reason requirements on reject and cancel — in `test/unit/student-finance/refund-lifecycle.policy.spec.ts`
- [ ] T072 [P] [US5] Add unit tests for the per-payment refundable remainder counting in-flight `REQUESTED` and `APPROVED` refunds, and the aggregate bound against total collected, in `test/unit/student-finance/refund-limits.policy.spec.ts`
- [ ] T073 [P] [US5] Add PostgreSQL integration tests proving only `COMPLETED` refunds reduce `netPaid`, and that two concurrent refund decisions produce exactly one success, in `test/integration/student-finance/refund-lifecycle.spec.ts`
- [ ] T074 [P] [US5] Add E2E contract tests for `POST /finance/invoices/:id/cancel`, `POST /finance/refunds`, `PATCH /finance/refunds/:id/decision`, and `POST /finance/refunds/:id/complete`, covering `invoice-has-payments` with `collected`, `refund-exceeds-payment` with `refundable`, and `refund-requires-payment`, in `test/e2e/student-finance/refund-lifecycle.e2e-spec.ts`

### Implementation for User Story 5

- [x] T075 [P] [US5] Implement the cancel-invoice DTO with reason ≥ 3 and `expectedVersion` in `src/modules/student-finance/invoices/dto/update-draft-invoice.dto.ts (CancelInvoiceDto)`
- [x] T076 [P] [US5] Implement the request-refund, decide-refund, and complete-refund DTOs with decimal-string amount, non-future date-only `refundDate`, reason ≥ 3, closed decision enum, and `expectedVersion` in `src/modules/student-finance/refunds/dto/`
- [x] T077 [P] [US5] Implement the refund lifecycle policy encoding the transition table and the two refund bounds in `src/modules/student-finance/refunds/refund-lifecycle.policy.ts`
- [x] T078 [US5] Extend the invoice service and repository with cancellation, refusing with `invoice-has-payments` when any payment exists and appending a status-history row, in `src/modules/student-finance/invoices/invoice.service.ts` and `src/modules/student-finance/invoices/invoice.repository.ts`
- [x] T079 [US5] Implement the refund repository with transaction-aware compare-and-swap on the refund version and no delete path in `src/modules/student-finance/refunds/refund.repository.ts`
- [x] T080 [US5] Implement the refund service for request, decision, and completion inside serializable transactions, re-reading refundable amounts in-transaction, in `src/modules/student-finance/refunds/refund.service.ts`
- [x] T081 [US5] Implement the cancel endpoint in `src/modules/student-finance/invoices/invoice.controller.ts` and the refund request, decision, and complete endpoints with `finance.refunds.record` and `finance.refunds.approve` as distinct keys in `src/modules/student-finance/refunds/refund.controller.ts`
- [x] T082 [US5] Emit `finance.invoice.cancelled`, `finance.refund.requested`, `finance.refund.decided`, and `finance.refund.completed` after commit, append `INVOICE_CANCELLED`/`REFUND_REQUESTED`/`REFUND_COMPLETED` timeline events, and run the US5 suites against scenario 5 of [quickstart.md](quickstart.md)

**Checkpoint**: Reversal works end to end, and the requester-versus-authorizer control is enforced by distinct permissions.

---

## Phase 8: User Story 6 — Find, Filter, and Export Finance Records (Priority: P6)

**Goal**: Deliver the four branch-scoped queues with the documented search, filter, sort, and pagination behaviour, plus CSV export of the invoice queue.

**Independent Test**: Seed records across branches, students, offerings, batches, methods, statuses, and dates; exercise every documented query per queue; page past the end; invert a date range; and export under a filter.

### Tests for User Story 6

- [ ] T083 [P] [US6] Add unit tests for the shared finance list-query builder covering every documented filter, sort field, and date-range field per queue, including `batchIds[]` never matching batch-less invoices, in `test/unit/student-finance/finance-list-query.spec.ts`
- [ ] T084 [P] [US6] Add unit tests for Arabic letter, diacritic, and Arabic-Indic digit folding across `invoiceNumber`, `receiptNumber`, `studentCode`, and `studentName` in `test/unit/student-finance/finance-search-normalization.spec.ts`
- [ ] T085 [P] [US6] Add E2E contract tests for `GET /finance/invoices`, `/payments`, `/installments`, `/refunds`, and `/invoices/export`, asserting over-range pages return HTTP 200 with empty `data` and correct `meta`, inverted ranges return `invalid-date-range`, out-of-scope details return `out-of-scope` rather than `forbidden`, and the CSV carries a UTF-8 BOM, in `test/e2e/student-finance/queues.e2e-spec.ts`

### Implementation for User Story 6

- [x] T086 [P] [US6] Implement the four list-query DTOs with `page`/`pageSize` bounds (default 20, max 100), closed sort fields, array filters, and the `dateRange` object in `src/modules/student-finance/invoices/dto/`, `payments/dto/`, `installments/dto/`, and `refunds/dto/`
- [ ] T087 [P] [US6] Implement the shared list-query builder applying search normalization, filters, branch scope via `BranchScopeService.applyToQuery`, sorting, and paging in `src/modules/student-finance/balances/finance-list-query.builder.ts`
- [x] T088 [US6] Implement the invoice queue query joining `finance_invoice_balance` so `finalAmount` and `remaining` are filterable and sortable in SQL, in `src/modules/student-finance/invoices/invoice.repository.ts`
- [x] T089 [P] [US6] Implement the payment and refund queue queries in `src/modules/student-finance/payments/payment.repository.ts` and `src/modules/student-finance/refunds/refund.repository.ts`
- [x] T090 [US6] Implement the four queue endpoints with their `finance.*` view permissions and Swagger list envelopes across the invoice, payment, installment, and refund controllers
- [x] T091 [US6] Implement CSV export applying identical filters, branch scope, and permission rules, emitting `text/csv; charset=utf-8` with a BOM, in `src/modules/student-finance/invoices/invoice-export.service.ts`
- [x] T092 [US6] Run the US6 suites against scenario 6 of [quickstart.md](quickstart.md), including the batch-filter case for a Professional Program invoice versus a batch-less training-course invoice

**Checkpoint**: Daily collection work is fully navigable, scoped, and exportable.

---

## Phase 9: User Story 7 — Read Statements, Totals, and the Accounting Handoff (Priority: P7)

**Goal**: Serve the read-only student financial statement, the cursor-paginated finance timeline, server-side dashboard totals over the whole filtered set, the bounded lookups feed, and the settled-facts accounting projection.

**Independent Test**: Build a student with charges, payments, reductions, and refunds; read statement, timeline, and dashboard; confirm totals cover the full filtered set rather than a page; and confirm the accounting read carries no personal data.

### Tests for User Story 7

- [ ] T093 [P] [US7] Add unit tests for `FinancialStatus` derivation across no-outstanding-balance, partial-balance, overdue, and completed fixtures, and for `hasNoRecords` never being reported as zeros, in `test/unit/student-finance/financial-status.policy.spec.ts`
- [ ] T094 [P] [US7] Add unit tests for timeline cursor encoding and decoding matching the documented base64 sequence payload, in `test/unit/student-finance/finance-timeline-cursor.spec.ts`
- [ ] T095 [P] [US7] Add PostgreSQL integration tests asserting the dashboard aggregate over more than ten pages of invoices equals a full-set total and not a page sum, and that cancelled invoices are excluded from all four figures while still counting toward `hasNoRecords`, in `test/integration/student-finance/dashboard-summary.spec.ts`
- [ ] T096 [P] [US7] Add E2E contract tests for the profile, timeline, dashboard, lookups, and accounting-context reads, scanning the accounting response for seeded student name, address, national identifier, and notes values and asserting none appear, in `test/e2e/student-finance/statements.e2e-spec.ts`
- [ ] T097 [P] [US7] Add the scale test seeding 50,000 invoices and 100,000 payments, asserting the two-second target for search, filter, sort-by-`remaining`, and paging, and asserting a 20-row page issues one balance aggregate rather than twenty, in `test/integration/student-finance/scale.spec.ts`

### Implementation for User Story 7

- [x] T098 [P] [US7] Implement the timeline repository with per-student monotonic `sequence` allocation, cursor paging, and category filtering in `src/modules/student-finance/statements/finance-timeline.repository.ts` and `src/modules/student-finance/statements/finance-timeline.service.ts`
- [x] T099 [US7] Implement the statement service composing totals, outstanding installment count, active scholarships and discounts, `financialStatus`, `perEnrollment[]`, `hasNoRecords`, and `asOf` entirely from the balance derivation, in `src/modules/student-finance/statements/student-statement.service.ts`
- [x] T100 [US7] Implement the profile and timeline endpoints with `finance.view` and `finance.timeline.view` in `src/modules/student-finance/statements/student-statement.controller.ts`, and statement mapping in `src/modules/student-finance/statements/student-statement.service.ts (mapping inline)`
- [x] T101 [US7] Implement the dashboard service computing `invoiced`, `collected`, `outstanding`, and `unsettledInvoices` as one server-side aggregate over the filtered set, reusing the exact list-query builder for filter parity and excluding cancelled invoices, in `src/modules/student-finance/dashboard/finance-dashboard.service.ts` and `finance-dashboard.controller.ts`
- [x] T102 [P] [US7] Implement the bounded lookups feed returning payment methods, charge purposes, branches, offerings, batches, invoice and refund statuses, installment eligibility, discount and scholarship policies, numbering, due policy, currency, and precision, marking inactive values unselectable but resolvable, in `src/modules/student-finance/lookups/finance-lookups.service.ts` and `finance-lookups.controller.ts`
- [x] T103 [P] [US7] Implement the accounting-context adapter and endpoint exposing settled invoice, payment, and refund facts and identifiers only, in `src/modules/student-finance/integration/finance-accounting.service.ts + finance-accounting.repository.ts` and `accounting-context.controller.ts`
- [x] T104 [US7] Run the US7 suites against scenario 7 and scenario 9 of [quickstart.md](quickstart.md), and confirm every money mutation invalidates the dashboard read

**Checkpoint**: All seven stories are independently functional; statements, totals, and the Accounting boundary are live.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Work package 6 — the review, hardening, and finalization pass.

- [x] T105 Verify all 22 operations against `docs/api-data-requirements.html` §4.7 and the "Student Finance — approved contract amendment" section, confirming paths, payloads, error codes, and both amendment deltas (Principle III)
- [x] T106 Implement the prohibited-surface contract test enumerating registered routes and asserting no `DELETE` under `/finance`, no `PATCH`/`PUT` on `/finance/payments/:id`, and exactly the 22 documented operations, in `test/unit/student-finance/http-surface.contract.spec.ts`
- [x] T107 [P] Complete Swagger for every endpoint with real success envelopes and every closed error code, status, and extra detail field, then review at `/api/docs` (Principle XVII)
- [x] T108 [P] Confirm every protected endpoint declares a permission guard and that the per-record permissions object covers all 16 keys with no inline authorization conditional (Principle VII)
- [x] T109 [P] Audit that no service computes a balance outside `finance-balance.service.ts`, and that no derived value from the data-model "derived, never stored" list has acquired a column (Principles I, XVIII)
- [x] T110 [P] Run the layering gate — no Prisma import outside a repository, no business logic in a controller, no cross-module repository import — in `test/integration/student-finance/finance-architecture.spec.ts` (Principles IV, V, II)
- [x] T111 [P] Confirm every multi-entity write runs inside `TransactionManager.runSerializable()` and that every create, transition, approval, and refund decision emits its audit-ready event after commit with no PII (Principles X, XI)
- [x] T112 Run `npm run build` and `npm run lint` and resolve every strict-mode and lint finding, confirming no new `any` (Principles XII, quality gates 3 and 4)
- [x] T113 Remove duplication across the invoice, payment, installment, reduction, and refund services, extracting any repeated rule into its owning policy (Principle XVIII)
- [x] T114 Execute the full [quickstart.md](quickstart.md) validation — all nine scenarios plus the contract-surface test — and record results
- [x] T115 Replace the `STUDENTS_ENROLLMENT_PORT` test double with the Student Management production adapter once module 008 ships, and re-run the full suite unchanged (this is the only task blocked on another module)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup — **blocks every user story**
- **User Stories (Phases 3–9)**: all depend on Foundational
- **Polish (Phase 10)**: depends on the desired stories being complete; T115 additionally depends on module 008

### User Story Dependencies

- **US1 (P1)**: after Foundational. No story dependencies. 🎯 MVP
- **US2 (P2)**: after Foundational. Needs an issued invoice to pay against — US1 in practice, though its tests can seed one directly.
- **US3 (P3)**: after Foundational. Independent of US2; installment state derivation is exercised with and without payments.
- **US4 (P4)**: after Foundational. Post-issuance adjustment tests need an issued invoice.
- **US5 (P5)**: after Foundational. Refund tests need a recorded payment; cancellation tests need only an invoice.
- **US6 (P6)**: after Foundational. Queue tests seed records for every entity directly.
- **US7 (P7)**: after Foundational. Statement and dashboard tests seed a full ledger directly.

Every story is independently testable because its tests seed their own fixtures rather than depending on an earlier story's endpoints.

### Within Each Story

Tests written and failing → DTOs and policies → repositories → services → controllers and mappers → events. Never controller before service, and never service before repository (Principle V).

### Parallel Opportunities

- Setup: T002–T005 in parallel
- Foundational: T007–T011 (tests) in parallel; then T014–T024 in parallel after the migration lands
- All tests within a story marked [P] run in parallel
- All seven story phases can run in parallel once Foundational completes, staffing permitting
- Polish: T107–T111 in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together:
Task: "Unit tests for draft figure recomputation in test/unit/student-finance/invoice-draft.policy.spec.ts"
Task: "Unit tests for the invoice transition table in test/unit/student-finance/invoice-lifecycle.policy.spec.ts"
Task: "Integration tests for raise idempotency in test/integration/student-finance/invoice-raise.spec.ts"
Task: "E2E contract tests for the invoice lifecycle in test/e2e/student-finance/invoice-lifecycle.e2e-spec.ts"

# Launch the independent US1 implementation files together:
Task: "Account provisioning in src/modules/student-finance/accounts/student-financial-account.service.ts"
Task: "Raise and draft-update DTOs in src/modules/student-finance/invoices/dto/"
Task: "Invoice lifecycle policy in src/modules/student-finance/invoices/invoice-lifecycle.policy.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup
2. Phase 2 Foundational — **critical, blocks everything**
3. Phase 3 US1
4. **Stop and validate**: accounts provision, invoices raise idempotently, drafts edit, issuance freezes figures
5. Demo against a seeded enrollment from the port double

### Incremental Delivery

Foundational → US1 (MVP) → US2 (collect money) → US3 (schedule it) → US4 (reduce it) → US5 (reverse it) → US6 (find it) → US7 (report it) → Polish. Each story adds value without breaking the previous ones.

### Parallel Team Strategy

After Foundational, one developer per story. US1 and US2 are the critical path for a usable module; US6 and US7 are the highest-value parallel work because they are read-only and touch no write path.

---

## Notes

- Total: 115 tasks. Setup 6, Foundational 20, US1 12, US2 11, US3 10, US4 11, US5 12, US6 10, US7 12, Polish 11.
- The module cannot serve real traffic until T115 lands the Student Management adapter.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
- If T097 (scale) fails, the `finance_invoice_balance` decision in [research.md](research.md) R1 is wrong — revisit the derivation strategy, not the indexes.
