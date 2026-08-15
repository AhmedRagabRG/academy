---

description: "Task list for Student Finance implementation"
---

# Tasks: Student Finance

**Input**: Design documents from `/specs/007-student-finance/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/student-finance-contracts.md](./contracts/student-finance-contracts.md), [quickstart.md](./quickstart.md)

**Validation**: Every phase includes typecheck, lint, business-rule, RTL, responsive, and accessibility validation as required by the constitution. Automated tests are included because [plan.md](./plan.md#testing-strategy) defines an explicit unit/contract/integration/e2e strategy, and because monetary correctness (SC-001 through SC-008) cannot be demonstrated any other way.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and demonstrated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: Which user story the task belongs to (US1–US10)
- Every task names its exact file path

## Path Conventions

- Feature module: `apps/web/src/features/student-finance/`
- Routes: `apps/web/src/app/(workspace)/student-finance/` and `apps/web/src/app/(workspace)/students/[studentId]/finance/`
- Shared additions: `apps/web/src/shared/`
- Cross-module (additive only): `apps/web/src/features/students/`
- Tests: `apps/web/tests/{unit,integration,contract}/student-finance/`
- End-to-end: `apps/web/playwright/{journeys,accessibility,helpers}/`

## Delivery Task Mapping

How the six requested delivery tasks map onto the story-organized phases below:

| Requested delivery task | Phases |
| --- | --- |
| Task 1 — Financial Workspace & Student Profiles | Phase 4 (US2 profile, summary cards, balances, status), Phase 11 (US9 timeline), plus the finance dashboard in Phase 3 |
| Task 2 — Invoice Management | Phase 3 (US1 create, edit, issue, cancel, detail, list), Phase 10 (US8 search, filtering, pagination at scale) |
| Task 3 — Installments, Discounts & Scholarships | Phase 6 (US4 installments), Phase 7 (US5 discounts), Phase 8 (US6 scholarships) |
| Task 4 — Payments & Refunds | Phase 5 (US3 payments and receipts), Phase 9 (US7 refunds), Phase 11 (US9 financial timeline) |
| Task 5 — Frontend Integration | Phase 1 (setup, routing, navigation) and Phase 2 (money module, types, schemas, mock services, shared components, states) |
| Task 6 — Validation & Finalization | Phase 13 (RTL, responsive, accessibility, type safety, consistency, cleanup) |

> **Two cross-module changes are required** and appear as explicit tasks: T047–T048 add a shared workspace-tab registry that `features/students` reads, and T170–T172 add the finance-reader registration point to `features/students`. Both are additive, both are justified in [plan.md](./plan.md#complexity-tracking), and neither changes Student Management's behaviour when unused. Review those five tasks before starting Phase 2.

---

## Phase 1: Setup (Module Skeleton)

**Purpose**: Establish the module boundary, route skeleton, copy, permissions, and navigation contribution.

- [X] T001 Create the Student Finance feature directories (`components/`, `config/`, `data/`, `forms/`, `hooks/`, `schemas/`, `screens/`, `services/`, `types/`, `utils/`) and the public barrel in `apps/web/src/features/student-finance/index.ts`
- [X] T002 [P] Create the route segment skeleton and Server Component route notes in `apps/web/src/app/(workspace)/student-finance/README.md`
- [X] T003 [P] Define centralized Arabic interface copy plus stable status, area, and action keys in `apps/web/src/features/student-finance/config/finance-copy.ts`
- [X] T004 [P] Define Arabic copy for every `FinanceErrorCode` with no generic fallback in `apps/web/src/features/student-finance/config/finance-error-copy.ts`
- [X] T005 [P] Define the sixteen Student Finance permission keys and area/action mappings from the contracts in `apps/web/src/features/student-finance/config/finance-permissions.ts`
- [X] T006 [P] Define the permission-aware Student Finance navigation contribution in `apps/web/src/features/student-finance/config/navigation.ts`
- [X] T007 Register the navigation entry and a `finance` icon through `apps/web/src/shared/config/foundation-navigation.ts` and `apps/web/src/shared/config/icon-registry.ts`
- [X] T008 [P] Add the sixteen Student Finance permission keys to the mock role in `apps/web/src/features/auth/data/auth-fixtures.ts`
- [X] T009 [P] Create story validation evidence placeholders in `specs/007-student-finance/validation/foundation.md`
- [X] T010 [P] Record the money-handling rule (integer minor units, no float on money) as a module note in `apps/web/src/features/student-finance/README.md`

**Checkpoint**: The module boundary, navigation entry, permissions, and Arabic copy exist and typecheck.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Money engine, typed domain, pure policies, authoritative schemas, deterministic mock services, cache keys, and shared additions.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. Monetary correctness depends entirely on T011–T014.

### Shared money engine

- [X] T011 Implement `Money` value mechanics — `toMinor`, `fromMinor`, `makeMoney`, `parseAmount` — using integer minor units with no floating-point operator on any money value, in `apps/web/src/shared/utils/money.ts`
- [X] T012 Implement `add`, `subtract`, `multiplyByPercentage`, `compare`, `min`, `max`, `isZero`, `isNegative`, and mixed-currency rejection in `apps/web/src/shared/utils/money.ts`
- [X] T013 Implement `allocate(total, count)` distributing the remainder to the final part, asserting the parts sum exactly to the input before returning, in `apps/web/src/shared/utils/money.ts`
- [X] T014 [P] Implement Arabic `Intl.NumberFormat` currency formatting with cached formatters in `apps/web/src/shared/utils/money.ts`
- [X] T015 [P] Unit test the money engine — conversion, rounding, arithmetic, mixed-currency rejection, allocation exact-sum across many counts and uneven amounts — in `apps/web/tests/unit/student-finance/money.test.ts`

### Types and contracts

- [X] T016 Define branded identifiers, `Money`, `ActorRef`, `LookupOption`, `AuditContext`, `Paginated`, `Cursor`, and every status union in `apps/web/src/features/student-finance/types/common.ts`
- [X] T017 Define `Invoice`, `InvoiceFigures`, `InstallmentPlan`, `Installment`, `Payment`, `Discount`, `Scholarship`, `FinancialAdjustment`, `Refund`, and `FinanceTimelineEvent` per [data-model.md](./data-model.md#entities) in `apps/web/src/features/student-finance/types/domain.ts`
- [X] T018 Define `InvoiceSummary`, `PaymentSummary`, `InstallmentSummary`, `RefundSummary`, `InvoiceDetail`, `StudentFinancialProfile`, `FinanceAreaPermissions`, and `AccountingContext` in `apps/web/src/features/student-finance/types/projections.ts`
- [X] T019 Define every list query, the timeline query, and every intent-specific command with `expectedVersion` where required in `apps/web/src/features/student-finance/types/commands.ts`
- [X] T020 [P] Define `FinanceError` and every `FinanceErrorCode` variant from the contracts in `apps/web/src/features/student-finance/services/finance-error.ts`

### Pure policies

- [X] T021 [P] Implement the reduction-ordering policy — scholarship against the tuition base, then discount against the remainder — with non-negative and non-below-collected floors in `apps/web/src/features/student-finance/utils/finance-reductions.ts`
- [X] T022 [P] Implement installment schedule generation and amount allocation over the shared `allocate` in `apps/web/src/features/student-finance/utils/finance-installments.ts`
- [X] T023 [P] Implement balance derivation — `invoiceFinal`, `netPaid`, `invoiceRemaining`, `studentTotals` — as pure functions over records in `apps/web/src/features/student-finance/utils/finance-balance.ts`
- [X] T024 [P] Implement invoice, installment, and student financial status derivation against an injected `now` in `apps/web/src/features/student-finance/utils/finance-status.ts`
- [X] T025 [P] Implement invoice and receipt numbering allocation with collision avoidance in `apps/web/src/features/student-finance/utils/finance-numbering.ts`
- [X] T026 [P] Implement the invoice lifecycle transition policy with per-transition permission and precondition rules in `apps/web/src/features/student-finance/utils/finance-lifecycle.ts`
- [X] T027 [P] Implement the refund status transition policy including the separate approve step in `apps/web/src/features/student-finance/utils/refund-lifecycle.ts`
- [X] T028 [P] Implement list-query normalization including Arabic and digit folding, filter dedupe, page clamping, inclusive date ranges, and inverted-range refusal in `apps/web/src/features/student-finance/utils/finance-list-query.ts`
- [X] T029 [P] Implement organization/branch scope intersection, permission checks, and list-projection redaction in `apps/web/src/features/student-finance/utils/finance-scope.ts`
- [X] T030 [P] Implement timeline merge, `(occurredAt, sequence)` ordering, and cursor encode/decode in `apps/web/src/features/student-finance/utils/finance-timeline.ts`
- [X] T031 [P] Implement the invoicing idempotency key derived from `(enrollmentId, purpose)` in `apps/web/src/features/student-finance/utils/finance-intake-rules.ts`

### Authoritative schemas

- [X] T032 [P] Implement the draft-invoice Zod schema covering amounts, dates, and currency consistency in `apps/web/src/features/student-finance/schemas/invoice-schema.ts`
- [X] T033 [P] Implement the installment-plan Zod schema covering count bounds, schedule basis, and first due date in `apps/web/src/features/student-finance/schemas/installment-schema.ts`
- [X] T034 [P] Implement the payment Zod schema enforcing positive amount, remaining-balance ceiling, active method, and date bounds per [data-model.md](./data-model.md#payment) in `apps/web/src/features/student-finance/schemas/payment-schema.ts`
- [X] T035 [P] Implement the discount and scholarship Zod schemas enforcing percentage range, configured limits, and the non-negative floor, reusing the reduction policy in `apps/web/src/features/student-finance/schemas/reduction-schema.ts`
- [X] T036 [P] Implement the refund Zod schema enforcing the refundable ceiling against prior refunds in `apps/web/src/features/student-finance/schemas/refund-schema.ts`

### Dependency ports and mock service

- [X] T037 [P] Define the Finance-owned `StudentDirectoryReader`, `AdmissionTermsReader`, `OrganizationFinanceReader`, `OfferingPricingReader`, and `BatchPricingReader` ports in `apps/web/src/features/student-finance/services/finance-dependency-readers.ts`
- [X] T038 Implement adapters over the public `@/features/students`, `@/features/admissions`, `@/features/organization-settings`, `@/features/academic-catalog`, and `@/features/program-batches` exports, importing no feature internals, in `apps/web/src/features/student-finance/services/finance-dependency-adapters.ts`
- [X] T039 Define the `StudentFinanceService` interface with every read and command from the [contracts](./contracts/student-finance-contracts.md#student-finance-service-facade), and **no delete on any entity and no payment update**, in `apps/web/src/features/student-finance/services/student-finance-service.ts`
- [X] T040 [P] Create configurable lookup fixtures — payment methods, discount and scholarship policy, installment eligibility, numbering patterns, due policy, currency, precision — in `apps/web/src/features/student-finance/data/finance-lookups.ts`
- [X] T041 [P] Create deterministic fixtures covering students with no invoices, draft/issued/part-paid/paid/cancelled invoices, even and uneven amounts, overdue installments at the boundary, pre- and post-issuance reductions, and payments with and without refunds, in `apps/web/src/features/student-finance/data/finance-fixtures.ts`
- [X] T042 [P] Create the 50,000-invoice deterministic scale generator in `apps/web/src/features/student-finance/data/finance-scale-fixtures.ts`
- [X] T043 Implement the mock adapter store with **per-entity indexes built from the start** (`byStudent`, `byInvoice`, `byEnrollment`, `byPayment`), invalidated on every write, in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T044 Implement scope enforcement, permission checks, optimistic version conflicts, cloned projections, and the injected clock in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T045 [P] Implement the scenario controller for latency, failure, permission, branch-scope, conflict, clock, finance-availability, and scale modes in `apps/web/src/features/student-finance/services/mock-scenario-controller.ts`
- [X] T046 [P] Implement scope-fingerprinted per-area query keys and the invalidation map, including the cross-module student financial-summary key, in `apps/web/src/features/student-finance/services/finance-query-keys.ts`

### Shared additions

- [X] T047 Create the shared student workspace-tab registry with `StudentWorkspaceTab` and an aggregation point in `apps/web/src/shared/config/student-workspace-tabs.ts`
- [X] T048 Make Student Management build its workspace tabs from the shared registry instead of a hardcoded list, preserving its existing permission filtering, in `apps/web/src/features/students/components/student-workspace-tabs.tsx`
- [X] T049 Create the shared currency input field — RHF-bound, configured precision, Arabic-Indic digit folding, LTR value inside RTL layout, decimal-string output — in `apps/web/src/shared/components/forms/currency-field.tsx`
- [X] T050 [P] Define per-area loading, empty, retryable-error, unavailable, and forbidden state components in `apps/web/src/features/student-finance/components/finance-area-states.tsx`
- [X] T051 [P] Implement the money display component that isolates bidi and announces the currency to assistive technology in `apps/web/src/features/student-finance/components/money-value.tsx`
- [X] T052 Verify state ownership boundaries — TanStack Query for async state, existing employee-context store for scope, no new Zustand store, RHF for form state — and record it in `specs/007-student-finance/validation/architecture.md`

**Checkpoint**: The money engine is proven exact, the domain is typed, policies are pure, mock storage is indexed, and both shared additions are in place.

---

## Phase 3: User Story 1 — Raise Invoices from an Enrollment (Priority: P1) 🎯 MVP

**Goal**: Invoices exist against enrollments, are editable while Draft, freeze at issuance, and cancel only when no money has been collected.

**Independent Test**: Raise invoices for program, diploma, and course enrollments; issue one and confirm its figures are frozen; re-process an enrollment and confirm no duplicate; cancel a clean invoice and confirm a paid one refuses.

### Tests for User Story 1

- [X] T053 [P] [US1] Unit test the invoice lifecycle transition table, permissions, and preconditions in `apps/web/tests/unit/student-finance/finance-lifecycle.test.ts`
- [X] T054 [P] [US1] Unit test the invoicing idempotency key derivation in `apps/web/tests/unit/student-finance/finance-intake-rules.test.ts`
- [X] T055 [P] [US1] Unit test numbering allocation, format, and collision avoidance in `apps/web/tests/unit/student-finance/finance-numbering.test.ts`
- [X] T056 [P] [US1] Contract test asserting the service exposes no delete on any entity and no payment update in `apps/web/tests/contract/student-finance/finance-service-surface.test.ts`
- [X] T057 [P] [US1] Contract test for invoicing idempotency on repeated and concurrent enrollment processing in `apps/web/tests/contract/student-finance/invoice-idempotency.test.ts`
- [X] T058 [P] [US1] Contract test for issued-figure immutability under later reductions, payments, and refunds in `apps/web/tests/contract/student-finance/invoice-immutability.test.ts`
- [X] T059 [P] [US1] Contract test for cancellation blocked by existing payments and for cancelled invoices leaving the balance while staying readable in `apps/web/tests/contract/student-finance/invoice-cancellation.test.ts`

### Implementation for User Story 1

- [X] T060 [US1] Implement `raiseInvoices` mapping admission-agreed terms into draft figures, idempotent on `(enrollmentId, purpose)`, in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T061 [US1] Implement `updateDraftInvoice`, `issueInvoice` freezing `issuedSnapshot`, and `cancelInvoice` with its payment guard in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T062 [P] [US1] Implement the `useInvoices`, `useInvoice`, and invoice mutation hooks with targeted invalidation in `apps/web/src/features/student-finance/hooks/use-invoices.ts`
- [X] T063 [P] [US1] Implement memoized invoice table columns with status badge and bidi-isolated numbers, amounts, and dates in `apps/web/src/features/student-finance/components/invoice-columns.tsx`
- [X] T064 [US1] Implement the invoice list screen over the shared data table in `apps/web/src/features/student-finance/screens/invoices-screen.tsx`
- [X] T065 [US1] Implement the create-invoice screen with enrollment selection and live final-amount derivation in `apps/web/src/features/student-finance/screens/create-invoice-screen.tsx`
- [X] T066 [US1] Implement the invoice detail screen with figures, issuance, and cancellation actions in `apps/web/src/features/student-finance/screens/invoice-detail-screen.tsx`
- [X] T067 [US1] Add the invoice routes and boundaries in `apps/web/src/app/(workspace)/student-finance/invoices/{page,loading,error}.tsx`, `create/page.tsx`, and `[invoiceId]/{page,loading,error}.tsx`
- [X] T068 [US1] Record invoice evidence — idempotency, immutability, cancellation guard, numbering — in `specs/007-student-finance/validation/us1-invoices.md`

**Checkpoint**: Invoices are raisable, editable, issuable, and cancellable under the correct guards. This is the minimum demoable increment.

---

## Phase 4: User Story 2 — Review the Student Financial Profile (Priority: P1)

**Goal**: One student's complete financial picture, with every figure reconciling exactly against its records.

**Independent Test**: Open students with no invoices, part-paid, fully paid, and overdue records; independently sum the underlying records and confirm exact agreement with every displayed figure.

### Tests for User Story 2

- [X] T069 [P] [US2] Unit test balance derivation across every combination of invoices, adjustments, payments, and refunds in `apps/web/tests/unit/student-finance/finance-balance.test.ts`
- [X] T070 [P] [US2] Unit test invoice, installment, and student status derivation including the overdue boundary against a fixed clock in `apps/web/tests/unit/student-finance/finance-status.test.ts`
- [X] T071 [P] [US2] Contract test asserting the profile figures equal an independent sum of the records in `apps/web/tests/contract/student-finance/student-financial-profile.test.ts`
- [X] T072 [P] [US2] Integration test for the profile's populated, zero-records, and forbidden states in `apps/web/tests/integration/student-finance/financial-profile.test.tsx`

### Implementation for User Story 2

- [X] T073 [US2] Implement `getStudentFinancialProfile` aggregating totals, outstanding installments, reductions, per-enrollment breakdown, and derived status in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T074 [P] [US2] Implement the `useStudentFinancialProfile` hook in `apps/web/src/features/student-finance/hooks/use-financial-profile.ts`
- [X] T075 [P] [US2] Implement financial summary cards over the shared stat card, announcing each amount with its currency, in `apps/web/src/features/student-finance/components/financial-summary-cards.tsx`
- [X] T076 [P] [US2] Implement the financial status badge with non-colour-only encoding in `apps/web/src/features/student-finance/components/financial-status-badge.tsx`
- [X] T077 [P] [US2] Implement the per-enrollment balance breakdown in `apps/web/src/features/student-finance/components/enrollment-balances.tsx`
- [X] T078 [US2] Implement the per-student financial workspace screen composing summary, balances, and section navigation in `apps/web/src/features/student-finance/screens/student-finance-workspace-screen.tsx`
- [X] T079 [US2] Contribute the finance workspace tab through the shared registry in `apps/web/src/features/student-finance/config/workspace-tab.ts`
- [X] T080 [US2] Add the contributed workspace route and boundaries in `apps/web/src/app/(workspace)/students/[studentId]/finance/{page,loading,error}.tsx`
- [X] T081 [US2] Implement the finance dashboard screen with outstanding, overdue, and collection summaries in `apps/web/src/features/student-finance/screens/finance-dashboard-screen.tsx` plus routes in `apps/web/src/app/(workspace)/student-finance/{page,loading,error}.tsx`

**Checkpoint**: Every student has a reconciled financial profile reachable from both the finance area and the student workspace.

---

## Phase 5: User Story 3 — Record Payments and Issue Receipts (Priority: P1)

**Goal**: Money is collected, attributed, and receipted, and can never exceed what is owed.

**Independent Test**: Record partial, full, and over-limit payments across methods; fire two concurrent payments that are individually valid but jointly excessive; confirm exactly one succeeds and no balance goes negative.

### Tests for User Story 3

- [X] T082 [P] [US3] Unit test the payment schema — positive amount, balance ceiling, installment ceiling, active method, date bounds — in `apps/web/tests/unit/student-finance/payment-schema.test.ts`
- [X] T083 [P] [US3] Contract test for over-limit refusal producing no receipt, no balance change, and no status change in `apps/web/tests/contract/student-finance/payment-limits.test.ts`
- [X] T084 [P] [US3] Contract test for concurrent payments never overdrawing a balance in `apps/web/tests/contract/student-finance/payment-concurrency.test.ts`
- [X] T085 [P] [US3] Contract test for receipt-number uniqueness including concurrent allocation in `apps/web/tests/contract/student-finance/receipt-numbering.test.ts`
- [X] T086 [P] [US3] Contract test asserting payments cannot be edited or deleted in `apps/web/tests/contract/student-finance/payment-immutability.test.ts`
- [X] T087 [P] [US3] Integration test for the payment form's limits, method gating, and refusal messaging in `apps/web/tests/integration/student-finance/payment-form.test.tsx`

### Implementation for User Story 3

- [X] T088 [US3] Implement `recordPayment` re-reading the remaining balance **inside** the operation, allocating the receipt number, and updating derived statuses in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T089 [US3] Implement per-invoice command serialization so concurrent payments cannot interleave in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T090 [US3] Implement `listPayments` with its narrow projection in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T091 [P] [US3] Implement the `usePayments` and `useRecordPayment` hooks with invalidation of invoice, installments, profile, timeline, and the student financial-summary key in `apps/web/src/features/student-finance/hooks/use-payments.ts`
- [X] T092 [P] [US3] Implement the payment form over the shared currency field with live remaining-balance feedback in `apps/web/src/features/student-finance/forms/payment-form.tsx`
- [X] T093 [P] [US3] Implement the payment method selector restricted to active configured methods in `apps/web/src/features/student-finance/forms/payment-method-field.tsx`
- [X] T094 [US3] Implement the record-payment dialog with focus management, first-error focus, and input preservation on failure in `apps/web/src/features/student-finance/components/record-payment-dialog.tsx`
- [X] T095 [P] [US3] Implement the receipt detail panel showing receipt number, method, date, amount, and actor in `apps/web/src/features/student-finance/components/receipt-details.tsx`
- [X] T096 [P] [US3] Implement memoized payment table columns in `apps/web/src/features/student-finance/components/payment-columns.tsx`
- [X] T097 [US3] Implement the payments queue screen and routes in `apps/web/src/features/student-finance/screens/payments-screen.tsx` and `apps/web/src/app/(workspace)/student-finance/payments/{page,loading,error}.tsx`
- [X] T098 [US3] Record payment evidence — over-limit refusal, concurrency, receipt uniqueness, immutability — in `specs/007-student-finance/validation/us3-payments.md`

**Checkpoint**: Collection is safe, attributable, receipted, and impossible to over-collect.

---

## Phase 6: User Story 4 — Build and Follow Installment Plans (Priority: P1)

**Goal**: Invoices split into schedules whose amounts always sum exactly to the final amount.

**Independent Test**: Generate plans of 3, 4, 7, and 12 installments against amounts that do not divide evenly and confirm exact sums every time; pay one installment and confirm regeneration is refused.

### Tests for User Story 4

- [X] T099 [P] [US4] Unit test schedule generation, due-date spacing, and allocation exact-sum across many counts and uneven amounts in `apps/web/tests/unit/student-finance/finance-installments.test.ts`
- [X] T100 [P] [US4] Contract test for regeneration refused once any installment carries a payment in `apps/web/tests/contract/student-finance/installment-regeneration.test.ts`
- [X] T101 [P] [US4] Contract test for installment eligibility driven by configuration rather than hardcoded product types in `apps/web/tests/contract/student-finance/installment-eligibility.test.ts`
- [X] T102 [P] [US4] Integration test for the plan generator's preview, refusal states, and overdue rendering in `apps/web/tests/integration/student-finance/installment-plan.test.tsx`

### Implementation for User Story 4

- [X] T103 [US4] Implement `generateInstallmentPlan` with eligibility check, allocation, and the paid-installment regeneration guard in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T104 [US4] Implement `listInstallments` with derived per-installment status in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T105 [P] [US4] Implement the `useInstallments` and `useGenerateInstallmentPlan` hooks in `apps/web/src/features/student-finance/hooks/use-installments.ts`
- [X] T106 [P] [US4] Implement the plan generator form with count, schedule basis, first due date, and a live schedule preview in `apps/web/src/features/student-finance/forms/installment-plan-form.tsx`
- [X] T107 [P] [US4] Implement the installment schedule table showing sequence, due date, amount, paid, and status in `apps/web/src/features/student-finance/components/installment-schedule.tsx`
- [X] T108 [P] [US4] Implement the installment status badge with overdue emphasis and non-colour-only encoding in `apps/web/src/features/student-finance/components/installment-status-badge.tsx`
- [X] T109 [P] [US4] Implement memoized installment table columns in `apps/web/src/features/student-finance/components/installment-columns.tsx`
- [X] T110 [US4] Implement the installments queue screen and routes in `apps/web/src/features/student-finance/screens/installments-screen.tsx` and `apps/web/src/app/(workspace)/student-finance/installments/{page,loading,error}.tsx`
- [X] T111 [US4] Mount the schedule and plan generator inside the invoice detail screen in `apps/web/src/features/student-finance/screens/invoice-detail-screen.tsx`
- [X] T112 [US4] Record installment evidence — exact sums, regeneration guard, overdue boundary — in `specs/007-student-finance/validation/us4-installments.md`

**Checkpoint**: All four P1 stories are complete. Invoicing, profiles, collection, and scheduling work end to end.

---

## Phase 7: User Story 5 — Apply Approved Discounts (Priority: P2)

**Goal**: Discounts reduce what is owed, within limits, without ever rewriting an issued invoice.

**Independent Test**: Apply percentage and fixed discounts before and after issuance; confirm the issued figures are untouched post-issuance and that an adjustment below the collected amount is refused.

### Tests for User Story 5

- [X] T113 [P] [US5] Unit test the reduction-ordering policy, configured limits, and both floors in `apps/web/tests/unit/student-finance/finance-reductions.test.ts`
- [X] T114 [P] [US5] Contract test that a post-issuance discount creates an adjustment and leaves `issuedSnapshot` untouched in `apps/web/tests/contract/student-finance/discount-adjustments.test.ts`
- [X] T115 [P] [US5] Contract test that discount approval requires its own permission, distinct from recording a payment, in `apps/web/tests/contract/student-finance/discount-permissions.test.ts`
- [X] T116 [P] [US5] Integration test that the editor preview and the saved final amount are always identical in `apps/web/tests/integration/student-finance/discount-form.test.tsx`

### Implementation for User Story 5

- [X] T117 [US5] Implement `applyDiscount` branching on invoice status — draft figures versus post-issuance adjustment — in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T118 [US5] Implement the below-collected refusal with a pointer to the refund flow in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T119 [P] [US5] Implement the `useApplyDiscount` hook with invalidation in `apps/web/src/features/student-finance/hooks/use-reductions.ts`
- [X] T120 [P] [US5] Implement the discount form with kind, value, reason, live limit feedback, and the shared currency field in `apps/web/src/features/student-finance/forms/discount-form.tsx`
- [X] T121 [US5] Implement the apply-discount dialog with approval confirmation and focus management in `apps/web/src/features/student-finance/components/apply-discount-dialog.tsx`
- [X] T122 [P] [US5] Implement the discount history panel showing value, reason, approver, and time in `apps/web/src/features/student-finance/components/discount-history.tsx`
- [X] T123 [P] [US5] Implement the adjustment list distinguishing pre-issuance reductions from post-issuance adjustments in `apps/web/src/features/student-finance/components/adjustment-list.tsx`
- [X] T124 [US5] Record discount evidence — limits, floors, immutability, approval permission — in `specs/007-student-finance/validation/us5-discounts.md`

**Checkpoint**: Discounts are governed, bounded, and never destructive of history.

---

## Phase 8: User Story 6 — Award and Apply Scholarships (Priority: P2)

**Goal**: Scholarships reduce tuition by percentage or amount, covering full or partial tuition, under their own approval.

**Independent Test**: Award percentage and fixed scholarships covering partial and full tuition; confirm the balance reaches zero without going negative and that combining with a discount produces the documented order's result.

### Tests for User Story 6

- [X] T125 [P] [US6] Unit test scholarship validation — percentage range, amount ceiling, coverage — in `apps/web/tests/unit/student-finance/scholarship-schema.test.ts`
- [X] T126 [P] [US6] Contract test for full-tuition coverage reducing the balance to exactly zero without going negative in `apps/web/tests/contract/student-finance/scholarship-coverage.test.ts`
- [X] T127 [P] [US6] Contract test for the documented discount-plus-scholarship ordering producing one deterministic result in `apps/web/tests/contract/student-finance/reduction-ordering.test.ts`
- [X] T128 [P] [US6] Integration test for the scholarship form and its approval gating in `apps/web/tests/integration/student-finance/scholarship-form.test.tsx`

### Implementation for User Story 6

- [X] T129 [US6] Implement `awardScholarship` with approval permission, coverage handling, and enrollment scoping in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T130 [P] [US6] Implement the `useAwardScholarship` hook in `apps/web/src/features/student-finance/hooks/use-reductions.ts`
- [X] T131 [P] [US6] Implement the scholarship form with name, kind, value, coverage, and reason in `apps/web/src/features/student-finance/forms/scholarship-form.tsx`
- [X] T132 [US6] Implement the award-scholarship dialog with approval confirmation in `apps/web/src/features/student-finance/components/award-scholarship-dialog.tsx`
- [X] T133 [P] [US6] Implement the scholarship history panel with approval information in `apps/web/src/features/student-finance/components/scholarship-history.tsx`
- [X] T134 [US6] Record scholarship evidence — coverage, floors, ordering, approval permission — in `specs/007-student-finance/validation/us6-scholarships.md`

**Checkpoint**: Scholarships and discounts coexist deterministically without breaching any floor.

---

## Phase 9: User Story 7 — Process Refunds Against Payments (Priority: P2)

**Goal**: Collected money can be reversed against a specific payment, bounded, separately approved, and never deleted.

**Independent Test**: Refund partial and full amounts, attempt to exceed the payment less prior refunds, complete a refund and confirm the invoice status returns to what the balance dictates.

### Tests for User Story 7

- [X] T135 [P] [US7] Unit test the refund status transition policy including the separate approve step in `apps/web/tests/unit/student-finance/refund-lifecycle.test.ts`
- [X] T136 [P] [US7] Contract test for the refundable ceiling against prior non-cancelled refunds in `apps/web/tests/contract/student-finance/refund-limits.test.ts`
- [X] T137 [P] [US7] Contract test that only a completed refund moves the balance, and that the invoice status returns accordingly in `apps/web/tests/contract/student-finance/refund-balance-effect.test.ts`
- [X] T138 [P] [US7] Contract test that refunds cannot be deleted and that approval requires its own permission in `apps/web/tests/contract/student-finance/refund-governance.test.ts`
- [X] T139 [P] [US7] Integration test for the refund form's ceiling feedback and status flow in `apps/web/tests/integration/student-finance/refund-form.test.tsx`

### Implementation for User Story 7

- [X] T140 [US7] Implement `requestRefund` with the refundable-ceiling check against prior refunds in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T141 [US7] Implement `decideRefund` and `completeRefund` with their separate permissions and balance restoration in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T142 [US7] Implement `listRefunds` with its narrow projection in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T143 [P] [US7] Implement the `useRefunds`, `useRequestRefund`, and `useDecideRefund` hooks in `apps/web/src/features/student-finance/hooks/use-refunds.ts`
- [X] T144 [P] [US7] Implement the refund form with amount, reason, date, and live refundable-ceiling feedback in `apps/web/src/features/student-finance/forms/refund-form.tsx`
- [X] T145 [P] [US7] Implement the refund status badge and decision actions in `apps/web/src/features/student-finance/components/refund-status-actions.tsx`
- [X] T146 [US7] Implement the refunds queue screen and routes in `apps/web/src/features/student-finance/screens/refunds-screen.tsx` and `apps/web/src/app/(workspace)/student-finance/refunds/{page,loading,error}.tsx`
- [X] T147 [US7] Record refund evidence — ceiling, completion effect, no-delete, separate approval — in `specs/007-student-finance/validation/us7-refunds.md`

**Checkpoint**: Reversal is bounded, governed, and auditable.

---

## Phase 10: User Story 8 — Find and Govern Financial Records (Priority: P2)

**Goal**: Every queue is searchable, filterable, sortable, and paginated at scale, strictly within the user's scope.

**Independent Test**: Combine every filter across the 50,000-invoice fixture, verify inclusive and inverted date ranges, and compare results under organization-wide and branch-scoped users.

### Tests for User Story 8

- [X] T148 [P] [US8] Unit test list-query normalization, Arabic and digit folding, filter dedupe, page clamping, and inverted-range refusal in `apps/web/tests/unit/student-finance/finance-list-query.test.ts`
- [X] T149 [P] [US8] Unit test branch-scope intersection and list redaction in `apps/web/tests/unit/student-finance/finance-scope.test.ts`
- [X] T150 [P] [US8] Contract test for scoped lists, export permission, and out-of-scope direct access across all four queues in `apps/web/tests/contract/student-finance/finance-list-scope.test.ts`
- [X] T151 [P] [US8] Contract test for inclusive date-range boundaries on issue date and due date in `apps/web/tests/contract/student-finance/date-range-filters.test.ts`
- [X] T152 [P] [US8] Integration test for combined filters, empty state, and clamped pagination in `apps/web/tests/integration/student-finance/finance-queues.test.tsx`

### Implementation for User Story 8

- [X] T153 [US8] Implement service-side search, combined filtering, sorting, and pagination over the indexed store for all four queues in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T154 [US8] Implement `exportInvoices` preserving scope and requiring `finance.export` in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T155 [P] [US8] Implement the shared finance filter toolbar with branch, student, product, status, method, and date-range controls in `apps/web/src/features/student-finance/components/finance-toolbar.tsx`
- [X] T156 [P] [US8] Implement the date-range filter control with inclusive semantics and inverted-range feedback in `apps/web/src/features/student-finance/components/date-range-filter.tsx`
- [X] T157 [US8] Wire search, filters, sorting, pagination, and export into the invoices, payments, installments, and refunds screens in `apps/web/src/features/student-finance/screens/`
- [X] T158 [P] [US8] Add empty-with-clear-filters, retryable error, and forbidden states to every queue in `apps/web/src/features/student-finance/screens/`
- [X] T159 [US8] Measure and record 50,000-invoice search, filter, sort, and paging timings against SC-010 in `specs/007-student-finance/validation/performance.md`
- [X] T160 [US8] Record discovery evidence — filter composition, date ranges, scope, export — in `specs/007-student-finance/validation/us8-discovery.md`

**Checkpoint**: Finance teams can work their queues reliably at production volume.

---

## Phase 11: User Story 9 — Review the Financial Timeline (Priority: P3)

**Goal**: Every financial event is recorded once, ordered, attributable, and pageable.

**Independent Test**: Perform each financial operation and confirm exactly one ordered event; force each to fail and confirm none.

### Tests for User Story 9

- [X] T161 [P] [US9] Unit test timeline ordering, tiebreak, and cursor stability in `apps/web/tests/unit/student-finance/finance-timeline.test.ts`
- [X] T162 [P] [US9] Contract test asserting exactly one event per successful command and none per failed command, across every command in `apps/web/tests/contract/student-finance/finance-timeline-events.test.ts`
- [X] T163 [P] [US9] Integration test for incremental loading and preserved order across pages in `apps/web/tests/integration/student-finance/finance-timeline.test.tsx`

### Implementation for User Story 9

- [X] T164 [US9] Implement `listTimeline` with category filtering and keyset cursor paging in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T165 [US9] Verify every state-changing command appends exactly one event inside the same operation in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T166 [P] [US9] Implement the `useFinanceTimeline` infinite-query hook in `apps/web/src/features/student-finance/hooks/use-finance-timeline.ts`
- [X] T167 [P] [US9] Implement the category-to-copy, icon, and amount mapping in `apps/web/src/features/student-finance/components/finance-timeline-mapping.ts`
- [X] T168 [US9] Implement the financial timeline section over the shared `Timeline` component with load-more, empty, and error states in `apps/web/src/features/student-finance/components/finance-timeline-section.tsx`
- [X] T169 [US9] Record timeline evidence — one-event-per-success, none-per-failure, stable paging — in `specs/007-student-finance/validation/us9-timeline.md`

**Checkpoint**: Every balance can be explained by its history.

---

## Phase 12: User Story 10 — Serve Financial Context to Other Modules (Priority: P3)

**Goal**: Student Management shows real figures instead of "unavailable", and Accounting has a stable read surface.

**Independent Test**: Open a student workspace in Student Management and confirm real figures matching this module's records; open a student with no records and confirm an explicit zero-balance result, not unavailable.

### Tests for User Story 10

- [X] T170 [P] [US10] Contract test that the finance reader returns figures equal to this module's records, and `available` with zero figures for a student with no records in `apps/web/tests/contract/student-finance/finance-reader-adapter.test.ts`
- [X] T171 [P] [US10] Contract test for `forbidden` and `unavailable` mapping, and for scope refusal matching interactive reads, in `apps/web/tests/contract/student-finance/finance-reader-states.test.ts`
- [X] T172 [P] [US10] Contract test for `AccountingContext` minimality — settled facts and identities only, no student personal data — in `apps/web/tests/contract/student-finance/accounting-context.test.ts`

### Implementation for User Story 10

- [X] T173 [US10] Add the additive finance-reader registration point with a fallback to the existing default in `apps/web/src/features/students/services/student-finance-registry.ts`
- [X] T174 [US10] Resolve the finance reader through the registry instead of the hardcoded default in `apps/web/src/features/students/services/students-dependency-adapters.ts` and `apps/web/src/features/students/services/mock-scenario-controller.ts`
- [X] T175 [US10] Implement `studentFinanceReaderAdapter` mapping profile totals onto Student Management's result union, distinguishing zero from unavailable, in `apps/web/src/features/student-finance/services/student-finance-reader-adapter.ts`
- [X] T176 [US10] Register the adapter once at the app composition root in `apps/web/src/shared/providers/module-registry.ts`
- [X] T177 [US10] Implement `getAccountingContext` returning settled facts and identities only in `apps/web/src/features/student-finance/services/mock-student-finance-service.ts`
- [X] T178 [US10] Verify no import of `@/features/student-finance` exists anywhere under `apps/web/src/features/students/`
- [X] T179 [US10] Verify every balance-affecting command invalidates the Student Management financial-summary key so both surfaces always agree, in `apps/web/src/features/student-finance/services/finance-query-keys.ts`
- [X] T180 [US10] Record integration evidence — matching figures, zero-versus-unavailable, no dependency cycle — in `specs/007-student-finance/validation/us10-integration.md`

**Checkpoint**: All ten user stories are independently functional and the module is integrated.

---

## Phase 13: Polish & Cross-Cutting Validation

**Purpose**: Constitution compliance, consistency, and finalization.

- [X] T181 Verify the public barrel exports only the documented surface and that no other feature imports finance internals in `apps/web/src/features/student-finance/index.ts`
- [X] T182 Verify Student Finance reads sibling modules only through its own ports, with no fixture, schema, hook, or component imports across boundaries, in `apps/web/src/features/student-finance/services/finance-dependency-adapters.ts`
- [X] T183 [P] Verify no floating-point operator touches a money value anywhere under `apps/web/src/features/student-finance/` and `apps/web/src/shared/utils/money.ts`
- [X] T184 [P] Verify Server Component defaults, client-boundary minimality, route-segment code splitting, and bundle impact; record findings in `specs/007-student-finance/validation/performance.md`
- [X] T185 [P] Verify Arabic copy completeness and RTL-native behavior across queues, invoice detail, schedules, forms, dialogs, and the timeline; record findings in `specs/007-student-finance/validation/rtl-accessibility.md`
- [X] T186 [P] Verify bidi isolation and currency announcement for every monetary value, invoice number, receipt number, date, and percentage under `apps/web/src/features/student-finance/`
- [X] T187 [P] Verify desktop, laptop, and tablet behavior plus 200% zoom for every finance route; record findings in `specs/007-student-finance/validation/responsive.md`
- [X] T188 [P] Verify keyboard traversal, dialog focus trapping, first-error focus in every monetary form, live announcement of balance and status changes, and non-colour status encoding; record findings in `specs/007-student-finance/validation/rtl-accessibility.md`
- [X] T189 [P] Verify every permission-denied and out-of-scope state renders forbidden rather than empty across all eight routes under `apps/web/src/app/(workspace)/student-finance/`
- [X] T190 [P] Verify payment methods, currency, precision, discount and scholarship policy, installment eligibility, numbering, and due policy remain service-supplied and are hardcoded nowhere under `apps/web/src/features/student-finance/`
- [X] T191 [P] Verify segregation of duties — recording a payment, approving a discount, approving a scholarship, and approving a refund each require distinct permissions — in `apps/web/src/features/student-finance/config/finance-permissions.ts`
- [X] T192 [P] Verify AI, tenant, audit, workflow, and backend extension boundaries; record findings in `specs/007-student-finance/validation/future-readiness.md`
- [X] T193 [P] Add the end-to-end journeys in `apps/web/playwright/journeys/student-finance-invoices.spec.ts`, `student-finance-collection.spec.ts`, and `student-finance-integration.spec.ts`
- [X] T194 [P] Add axe and keyboard suites in `apps/web/playwright/accessibility/student-finance-a11y.spec.ts` and `apps/web/playwright/accessibility/student-finance-keyboard.spec.ts`
- [X] T195 [P] Add shared Playwright helpers for finance fixtures, scenarios, and scoped contexts in `apps/web/playwright/helpers/student-finance.ts`
- [X] T196 Remove dead code, unify component naming with sibling features, and confirm no duplicated UI implementation under `apps/web/src/features/student-finance/`
- [X] T197 Migrate `apps/web/src/features/students/utils/student-money.ts` onto the shared money module and delete the duplicate, keeping Student Management's tests green
- [~] T198 Run `npm run typecheck && npm run lint && npm run test && npm run build` and `npm run test:e2e` from the repository root `package.json`, resolving every failure
- [ ] T199 Execute every scenario in [quickstart.md](./quickstart.md) and record the results in `specs/007-student-finance/validation/constitution.md`
- [X] T200 Confirm the whole Student Management suite still passes after the two cross-module changes, in `apps/web/tests/{unit,integration,contract}/students/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks every user story**. T011–T015 (money) block everything monetary, which is nearly all of it.
- **User Stories (Phases 3–12)**: All depend on Phase 2
- **Polish (Phase 13)**: Depends on every story that will ship

### User Story Dependency Graph

```text
Phase 1 Setup
   └─> Phase 2 Foundational  (blocking; money engine first)
          ├─> Phase 3  US1 Invoices (P1)      ◄── everything monetary builds on invoices
          ├─> Phase 4  US2 Profile (P1)
          ├─> Phase 5  US3 Payments (P1)
          ├─> Phase 6  US4 Installments (P1)
          ├─> Phase 7  US5 Discounts (P2)
          ├─> Phase 8  US6 Scholarships (P2)
          ├─> Phase 9  US7 Refunds (P2)       ◄── richest after US3 exists
          ├─> Phase 10 US8 Discovery (P2)
          ├─> Phase 11 US9 Timeline (P3)
          └─> Phase 12 US10 Integration (P3)  ◄── depends on US2 profile totals
                 └─> Phase 13 Polish
```

Every story is independently testable against the Phase 2 fixtures. US7 is most meaningful once US3 exists but is testable alone against fixture payments; US10 needs US2's profile totals.

### Independent Test Criteria

| Story | Independently verified by |
| --- | --- |
| US1 | Invoices raise idempotently, edit while Draft, freeze at issuance, and cancel only without payments |
| US2 | Every profile figure equals an independent sum of the underlying records, and status matches at the overdue boundary |
| US3 | Over-limit payments refused, concurrent payments never overdraw, receipts unique, payments immutable |
| US4 | Installment amounts sum exactly for uneven amounts, regeneration blocked once paid, overdue derived correctly |
| US5 | Discounts respect limits and both floors; post-issuance discounts create adjustments and leave issued figures intact |
| US6 | Scholarships cover full and partial tuition without going negative; combined ordering is deterministic |
| US7 | Refunds bounded by the payment less prior refunds; only completion moves balances; no delete |
| US8 | Combined filters, inclusive date ranges, scope, and pagination behave correctly at 50,000 invoices |
| US9 | One event per successful command, none per failure, stable cursor ordering |
| US10 | Student Management shows matching figures, zero for no records, unavailable when the service fails, with no dependency cycle |

### Within Each User Story

- Tests are written first and must fail before implementation
- Service and policy behavior lands before the screens that consume it
- Screens land before route wiring
- Validation evidence is recorded before the story checkpoint is claimed

### Parallel Opportunities

- Phase 1: T002–T006 and T008–T010 run in parallel
- Phase 2: T011–T013 are sequential (same file); T014–T042 marked [P] run in parallel once types land; T043–T044 require the policies
- Phases 3–12: after Phase 2, all ten stories can be staffed in parallel
- Phase 13: T183–T195 run in parallel

---

## Parallel Examples

### Phase 2 — pure policies

```bash
Task: "Reduction ordering in apps/web/src/features/student-finance/utils/finance-reductions.ts"
Task: "Installment allocation in apps/web/src/features/student-finance/utils/finance-installments.ts"
Task: "Balance derivation in apps/web/src/features/student-finance/utils/finance-balance.ts"
Task: "Status derivation in apps/web/src/features/student-finance/utils/finance-status.ts"
Task: "Numbering in apps/web/src/features/student-finance/utils/finance-numbering.ts"
Task: "List query normalization in apps/web/src/features/student-finance/utils/finance-list-query.ts"
```

### User Story 3 — tests

```bash
Task: "Payment schema unit test in apps/web/tests/unit/student-finance/payment-schema.test.ts"
Task: "Payment limits contract test in apps/web/tests/contract/student-finance/payment-limits.test.ts"
Task: "Payment concurrency contract test in apps/web/tests/contract/student-finance/payment-concurrency.test.ts"
Task: "Receipt numbering contract test in apps/web/tests/contract/student-finance/receipt-numbering.test.ts"
```

---

## Implementation Strategy

### MVP — US1 (Phases 1–3)

Invoices are the foundation; every other figure derives from them. Phases 1–3 deliver a demoable increment on their own: raise an invoice against an enrollment, edit it, issue it, watch its figures freeze, and cancel one that has no payments — with a working list to observe it on.

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**blocks everything**; money engine first)
3. Complete Phase 3: US1
4. **STOP and VALIDATE** against quickstart Scenario 1
5. Demo: finance users can manage the invoice lifecycle

### Incremental delivery

1. Setup + Foundational → money engine proven exact
2. + US1 → invoices exist and are governed (demo)
3. + US2 → every student has a reconciled financial profile (demo)
4. + US3 → money can be collected safely (demo)
5. + US4 → **all P1 stories complete**; tuition plans work
6. + US5 + US6 → reductions are governed
7. + US7 → reversal is possible
8. + US8 → queues work at production volume
9. + US9 → history explains every balance
10. + US10 → Student Management shows real figures
11. + Phase 13 → constitution validation and finalization

### Parallel team strategy

1. The team completes Phases 1–2 together — this is the critical path, and the money engine (T011–T015) should land before anything else branches
2. Then split: Developer A takes US1 + US2, Developer B takes US3 + US4, Developer C takes US5 + US6 + US7, Developer D takes US8 + US9 + US10
3. Stories integrate through the service facade and the shared money module

---

## Notes

- [P] means different files with no dependency on incomplete work
- [Story] labels map tasks to spec user stories for traceability
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- **No task may introduce**: a delete on any financial record, an edit or delete on a payment, a write to `issuedSnapshot`, a stored balance, a floating-point operation on money, or an import of `@/features/student-finance` inside `@/features/students`
