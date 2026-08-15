# Quickstart: Validating Student Finance

Runnable validation for the module. Every scenario proves a rule the spec names, and each one fails loudly if the implementation drifts. This is a validation guide — implementation belongs in `tasks.md`.

## Prerequisites

- Node.js 22, PostgreSQL reachable via `DATABASE_URL`
- A `STUDENTS_ENROLLMENT_PORT` provider. Until module 008 ships, the test double at `test/doubles/students-enrollment.double.ts` is the only implementation, so **the running server cannot serve real finance traffic yet** — the scenarios below run against the double.

```bash
npm install && npx prisma migrate dev && npm run seed
```

The seed must create the `FINANCE_CHARGE_PURPOSE` group (tuition, registration-fee, card-fee, certificate-fee, exam-fee, training-fee, additional-fee) and the `FINANCE_PAYMENT_METHOD` group (cash, bank-transfer, card, cheque). The 16 `finance.*` permission keys are already in `prisma/seeds/permission-catalog.ts`.

## Run the suites

```bash
npm run build && npm run lint && npm test && npm run test:e2e
```

Build and lint are quality gates 3 and 4 in the constitution; a `strict` failure or a new `any` blocks the feature regardless of test results.

## Scenario 1 — Raise, edit, and issue (US1)

```bash
npm test -- test/e2e/student-finance/invoice-lifecycle.e2e-spec.ts
```

Proves: raising from an enrollment creates one draft invoice per purpose with a unique `INV-YYYY-NNNNN` number and version 1; **repeating the identical raise returns the same invoice IDs and allocates no new number** (the `(enrollmentId, purpose)` unique index, not an application check); a draft edit recomputes `finalAmount` from the reduction policy; editing a non-draft invoice returns `invoice-immutable` with `fromStatus` and `allowed[]`; issuing writes the issued snapshot once and appends a status-history row; and a second write to any `issued*` column is rejected **by the database trigger**, not only by the service.

Expect: the idempotent re-raise returns HTTP 200 with identical IDs, and the direct SQL update of an issued column raises a Postgres exception.

## Scenario 2 — Payments and derived balances (US2)

```bash
npm test -- test/e2e/student-finance/payment-recording.e2e-spec.ts
npm test -- test/unit/student-finance/finance-balance.policy.spec.ts
```

Proves every server-side re-validation in the payment table of the HTTP contract, and that `netPaid`, `remaining`, and the `partially-paid`/`paid` statuses come from `finance_invoice_balance` rather than any column.

The load-bearing assertion: submit a payment whose amount was valid when the client read the invoice but is stale by the time it arrives. It must be refused with `payment-exceeds-balance` and the **true** remaining amount, because the balance is re-read inside the transaction.

Then confirm no mutation path exists:

```bash
curl -X PATCH localhost:3000/api/v1/finance/payments/<id>   # expect 404 route not found
curl -X DELETE localhost:3000/api/v1/finance/payments/<id>  # expect 404 route not found
```

## Scenario 3 — Installment plans (US3)

```bash
npm test -- test/unit/student-finance/installment-allocation.policy.spec.ts
npm test -- test/e2e/student-finance/installment-plan.e2e-spec.ts
```

Proves allocation sums exactly to the invoice total for indivisible cases — the property test drives totals from 1 to 100,000 minor units against counts 1–12 and asserts `sum(installments) === total` with the remainder on the final sequence. Also proves `installments-not-permitted` for a training course, count bounds per offering kind, `plan-has-payments` on regeneration after a payment, and that `paidAmount`, `remaining`, and `status` are derived.

## Scenario 4 — Discounts and scholarships (US4)

```bash
npm test -- test/e2e/student-finance/reductions.e2e-spec.ts
```

Proves policy caps return `reduction-exceeds-limit` with `limit`; a reduction below money already collected returns `reduction-below-collected` with `collected`; **a reduction applied after issuance creates a `FinancialAdjustment` and leaves the issued snapshot byte-identical**; a scholarship without `enrollmentId` reduces every enrollment while one with it reduces only that enrollment; and the separate approval permissions are enforced.

## Scenario 5 — Cancellation and refunds (US5)

```bash
npm test -- test/e2e/student-finance/refund-lifecycle.e2e-spec.ts
```

Proves every allowed and forbidden invoice and refund transition; `invoice-has-payments` on cancelling a paid-against invoice with `collected`; the per-payment refundable bound including in-flight requests; the aggregate bound against total collected; and that **only a `completed` refund changes `netPaid`** — a requested or approved refund must leave every reported balance untouched.

## Scenario 6 — Queues, scope, and export (US6)

```bash
npm test -- test/e2e/student-finance/queues.e2e-spec.ts
```

Proves each queue's documented search fields, filters, sort fields, and date-range field; Arabic and Arabic-Indic digit folding; an over-range page returning HTTP 200 with empty `data` and correct `meta`; an inverted range returning `invalid-date-range`; export applying identical filters, scope, and permissions with a UTF-8 BOM; and a scoped caller receiving `out-of-scope` — not `forbidden` — for a foreign-branch detail.

Batch filtering: a Professional Program invoice matches its `batchIds[]`; a training-course invoice with no batch never matches a non-empty batch filter.

## Scenario 7 — Statement, timeline, dashboard, accounting (US7)

```bash
npm test -- test/e2e/student-finance/statements.e2e-spec.ts
```

Proves the profile returns totals, outstanding installment count, active reductions, financial status, and the `perEnrollment[]` breakdown; a student with no records returns `hasNoRecords: true` rather than zero amounts; the timeline is cursor-paged with stable ordering and category filtering; and the accounting context contains **no** student name, address, national identifier, or notes — asserted by scanning the serialized response for the seeded PII values.

The dashboard assertion that matters: seed more than 10 pages of invoices under one filter, then confirm `GET /finance/dashboard/summary` equals a full-set aggregate and **not** the sum of the first page. This is the §9.11 regression guard.

## Scenario 8 — Concurrency and immutability

```bash
npm test -- test/integration/student-finance/concurrency.spec.ts
npm test -- test/integration/student-finance/immutability.spec.ts
```

Concurrency: fire two payments simultaneously against an invoice whose remaining balance covers only one, both carrying the same `expectedVersion`. Exactly one succeeds; the other returns `version-conflict` with `currentVersion`. Repeat for two concurrent draft edits and two concurrent refund decisions.

Immutability: attempt direct SQL `UPDATE` and `DELETE` against `Payment`, `InvoiceStatusChange`, `Discount`, `Scholarship`, `FinancialAdjustment`, and `FinanceTimelineEvent`. Every one must raise a Postgres trigger exception.

## Scenario 9 — Scale

```bash
npm test -- test/integration/student-finance/scale.spec.ts
```

Seed 50,000 invoices and 100,000 payments. Assert that queue search, filter, sort-by-`remaining`, and page changes complete within two seconds, and that a 20-row page issues **one** balance aggregate rather than 20. This is the gate on the `finance_invoice_balance` decision in [research.md](research.md) R1 — if it fails, the derivation strategy is wrong, not the indexes.

## Contract surface test

```bash
npm test -- test/e2e/student-finance/prohibited-surface.e2e-spec.ts
```

Enumerates the registered NestJS routes and asserts: no `DELETE` under `/finance`, no `PATCH`/`PUT` on `/finance/payments/:id`, and exactly the 22 operations in [contracts/student-finance-http.contract.md](contracts/student-finance-http.contract.md) — no more, no fewer.

## Manual smoke

```bash
npm run start:dev
```

Open `/api/docs` and confirm each finance endpoint documents its real success envelope and its closed error codes with statuses and extra detail fields — not a bare 200 with a type. That is constitution quality gate 6.
