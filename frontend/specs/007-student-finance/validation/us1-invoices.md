# Validation: US1 — Raise Invoices from an Enrollment

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence (`tests/contract/student-finance/invoice-lifecycle.test.ts` unless noted) |
| --- | --- |
| US1-1 invoices carry number, student, enrollment, product, batch, dates, totals, and Draft status | fixtures + `getInvoice` projection; asserted in "freezes the figures at issuance" |
| US1-2 a Draft accepts edits and recalculates the final amount | "allows editing a draft and recalculates the final amount" — 5000 − 10% = 4500 exactly |
| US1-3 issuing freezes the figures | "freezes the figures at issuance" |
| US1-4 an issued invoice refuses changes to its totals | "refuses editing an issued invoice" → `invoice-immutable` |
| US1-5 re-processing an enrollment produces no duplicate | "reuses the existing invoice…", "resolves concurrent requests…" |
| US1-6 cancelling an unpaid invoice removes it from balances and stays readable | "cancels an invoice with no payments…", "keeps a cancelled invoice readable…" |
| US1-7 cancelling an invoice with payments is refused | "refuses cancelling an invoice that carries a payment" → `invoice-has-payments` |

## The immutability guarantee, demonstrated three ways

`issuedSnapshot` is written once and never again. Three separate tests confirm it
survives the operations most likely to violate it:

1. A **post-issuance discount** leaves the snapshot untouched while still reducing
   what is owed — the concession becomes a `FinancialAdjustment` (FR-023).
2. A **payment** leaves the snapshot untouched.
3. A **direct edit** is refused outright with `invoice-immutable`.

This is the resolution of the contradiction flagged during `/speckit.specify`:
"historical invoices never change after issuance" and "reductions affect future
balances" now both hold, and are tested together.

## Service surface prohibitions

`invoice-lifecycle.test.ts` guards the facade itself so a future contributor cannot
quietly add a destructive operation:

- no delete / destroy / remove / purge / void on any entity
- no payment update, edit, or amend
- no operation that writes a snapshot
- refunds are present as the only correction path

## Numbering and concurrency

- Invoice numbers unique across every record.
- Concurrent `raiseInvoices` for one enrollment resolve to a single invoice.
- Every invoice command carries `expectedVersion`; a stale version is refused.

## UI

`tests/integration/student-finance/invoice-ui.test.tsx` (13 cases):

- money renders **with its currency** and inside `<bdi dir="ltr">` so Arabic layout
  cannot reorder digits; zero renders as a real value, not a blank
- every invoice, installment, financial, and refund status carries an Arabic label —
  status is never colour-only
- the cancel dialog is `aria-modal`, moves focus to the reason field, blocks
  confirmation until a reason exists, announces the missing reason via `role="alert"`,
  and **never submits a fabricated reason**

A first implementation reused the shared `ConfirmDialog` and defaulted the cancel
reason to placeholder copy when the user left it blank. That was replaced with a
dedicated dialog that requires the reason: a cancellation recorded with an invented
justification is worse than one that does not happen.

## Success criteria

- **SC-004** invoice numbers unique, including concurrent allocation — PASS
- **SC-005** 100% of issued invoices retain their figures after later reductions, payments, and refunds — PASS
- **SC-006** every delete and payment-edit attempt refused — PASS

## Gates

`npm run typecheck`, `npm run lint` (0 errors), `npm run build` (all three invoice
routes compiled), and `npm run test` (115 files, 639 tests) all pass.
