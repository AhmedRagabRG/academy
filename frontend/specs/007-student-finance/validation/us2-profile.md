# Validation: US2 — Review the Student Financial Profile

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence (`tests/contract/student-finance/student-financial-profile.test.ts`) |
| --- | --- |
| US2-1 profile presents totals, outstanding installments, scholarships, discounts, currency, and status | `getStudentFinancialProfile` projection; rendered by `screens/student-finance-workspace-screen.tsx` |
| US2-2 a student with no records shows zeroes attributed to the absence of invoices | "returns explicit zeroes flagged as a fact, not an absence" — `hasNoRecords: true` |
| US2-3 figures never disagree with the underlying records | six reconciliation tests, below |
| US2-4 an unpaid installment past its due date yields Overdue | "reports overdue when an issued invoice has passed its due date unpaid" |
| US2-5 fully settled invoices yield No Outstanding Balance | "reports no outstanding balance when everything is settled" |
| US2-6 no permission means forbidden, with no figures disclosed | "refuses the profile without finance.view" |

## SC-001: every figure reconciles

The profile is derived, never stored, so the risk is a derivation bug rather than
drift. These tests recompute each figure **independently** from the list projection
and compare, rather than letting the derivation check itself:

1. Totals equal the sum of that student's non-cancelled invoices — run across every
   student in the fixture, not a single sample.
2. `remaining` equals `totalFees − paidAmount` for every student.
3. Cancelled invoices are excluded — asserted by showing the total *differs* from
   the sum that includes them.
4. Per-enrollment balances roll up exactly to the student totals.
5. A completed refund reduces `netPaid` by exactly the refunded amount.
6. A post-issuance adjustment reduces the derived final amount while the
   `issuedSnapshot` is unchanged.

Two further invariants are checked across every record: no total is ever negative,
and no invoice remaining is ever negative.

## The zero-versus-absent distinction

`hasNoRecords` is carried on the projection so the UI can state *why* a balance is
zero. The workspace renders a dedicated message for that case rather than showing
four zeroed cards, which would be indistinguishable from a failed load.

This is the same distinction Student Management enforces in its finance summary,
and it is preserved deliberately.

## Overdue boundary

Derived against the **injected clock**, so the boundary is testable:

- clock at `2026-08-01`, invoice due `2026-04-01` unpaid → `overdue`
- clock at `2026-03-15`, same invoice → `partial-balance`

## UI

- `FinancialSummaryCards` — description list, each amount rendered with its currency through `MoneyValue`
- `EnrollmentBalances` — per-enrollment breakdown with its own derived status
- `FinanceDashboardScreen` — collection totals derived from the same list projection the queues use, so the dashboard cannot disagree with them
- Contributed route `/students/[studentId]/finance` builds and appears in the student workspace tab list

## Workspace tab: a design correction

The tab was first implemented as a **mutable runtime registry** with
`registerStudentWorkspaceTab()`. That was replaced with static aggregation in
`shared/config/student-workspace-tabs.ts`, matching how `foundation-navigation.ts`
already aggregates per-feature navigation.

Reason: the tab list is rendered by a client component, so a runtime registry made
registration order a timing concern — the tab could be missing on first render
depending on module evaluation order. The static list has no such failure mode and
no upside was lost. Student Management still never imports the finance feature.

## Gates

`npm run typecheck`, `npm run lint` (0 errors), `npm run build` (all finance routes
plus the contributed `/students/[studentId]/finance` compiled), and `npm run test`
(117 files, 669 tests) all pass.
