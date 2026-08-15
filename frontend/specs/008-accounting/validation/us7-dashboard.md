# Validation: US7 — See the Organization's Expense Picture

**Feature**: Accounting | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US7-1 each count equals the equivalent filtered list | `dashboard-parity.test.ts` |
| US7-2 a scoped user sees figures covering only their branches | `dashboard-scope.test.ts` |
| US7-3 an organization with no records says so rather than showing zeroes | `dashboard-empty.test.ts` |

## SC-005: one source, not two

Every figure is produced by the **same filter-and-count path** the lists use.
There is no separate aggregation code, because two code paths computing the same
number will disagree eventually — and a dashboard that disagrees with the list
beneath it destroys trust in both.

Parity is asserted per bucket, and again **after state changes**: submitting a
draft, then approving and paying a request, each re-checked against the lists. A
further case proves the four buckets plus draft and cancelled account for every
request exactly once, so nothing is double-counted or missed.

The breakdowns are checked the same way: each branch's count and total equal what
its filtered list reports, and the breakdowns cover every request.

## Money stays exact

Totals are decimal strings at the configured precision, summed through the shared
money module. One case sums a fractional seeded amount (1250.50) and compares
against the list's own sum — float addition would show its fingerprint there.

The monthly total is genuinely scoped to a month: July and June differ, an empty
month is zero, and the default month comes from the **injected clock** rather than
the real one, so the figure is deterministic in tests.

## Scope narrows the dashboard exactly as it narrows the lists

A scoped user sees only their branches in the breakdown and smaller totals than an
organization-wide user. Asking for another branch cannot widen it. A user with no
branches gets zeroes across the board with empty breakdowns — and
`hasNoRecords: true`, which is the point below.

`accounting.dashboard.view` is its own permission, and the projection reports the
acting user's permission set so quick actions can be gated without a second read.

## FR-045: no records is a fact, not a set of zeroes

A dashboard showing bare zeroes implies the organization **spent nothing**, when
it may simply have **recorded nothing**. `hasNoRecords` distinguishes them, and
the screen shows an explanation instead of the cards in that case.

One case guards the distinction from the other side: a month with no expenses
reports `monthlyTotal: 0` but `hasNoRecords: false`, because the organization does
have records — just not that month.

## UI

`dashboard.test.tsx` (13 cases). Each breakdown renders a **chart and a table**:
the chart is the quick read, the table is the accessible one. Every figure is
readable as text, the table carries a `<caption>` naming it, and the chart is
`aria-hidden` — a chart alone would make these numbers unavailable to a screen
reader.

Quick actions are **hidden** rather than disabled when the permission is absent,
and the whole panel renders nothing when no action is permitted.

Empty breakdowns show an empty state rather than an empty chart.

## Success criteria

- **SC-005** every dashboard figure equals the equivalent filtered list, in 100%
  of tested combinations — PASS

## Gates

`npm run typecheck` and `npm run lint` (0 errors) pass. The Accounting suites are
at 46 files, 598 tests.
