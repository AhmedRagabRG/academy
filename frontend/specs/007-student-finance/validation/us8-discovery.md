# Validation: US8 — Find Financial Records Reliably

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US8-1 search and filters compose across all four queues | `finance-list-scope.test.ts`, `date-range-filters.test.ts` |
| US8-2 date ranges are inclusive on both edges | `date-range-filters.test.ts` — "date ranges include both edges" |
| US8-3 an inverted range is refused, not silently empty | "an inverted range is refused rather than silently empty" — all four queues |
| US8-4 every queue is limited to the user's branch scope | "every queue is scoped to the acting user's branches" |
| US8-5 export preserves scope and needs its own permission | "export follows the same rules as the list it exports" |
| US8-6 an empty queue distinguishes no-matches from no-data | `finance-queues.test.tsx` |

## The off-by-one the tests found

Filtering invoices with `to: "2026-01-15"` excluded an invoice issued at
**09:00 on 15 January**. A date-only bound was being compared as the instant of
its midnight, so the last day of every range silently dropped its own rows — the
kind of error nobody notices until a reconciliation disagrees by one day's takings.

`isWithinRange` now treats a date-only upper bound as extending to the end of that
day, while an explicit timestamp still means that exact instant. Both readings are
pinned by unit tests ("date-only bounds cover the whole day", 7 cases) and through
the service by contract tests, including a single-day range that must match any
time on that day.

## Scope is enforced, not decorated

- each of the four queues returns only in-scope rows, and a scope can only ever
  narrow — no scoped read ever returns a row the organization-wide read did not
- a user with no authorized branches gets an empty queue and a total of `0`,
  rather than an error that would reveal that rows exist
- direct access to an out-of-scope invoice is refused, and so is a command
  against it
- a student profile outside the scope reports `hasNoRecords` with zero totals
  rather than leaking aggregate figures for records the user cannot see
- organization isolation is checked **before** branch membership, so a matching
  branch id in another organization is still refused (`finance-scope.test.ts`)

The scope fingerprint that keys every query differs across organizations, branch
sets, and permission sets, and is independent of the order those arrive in — so
two scopes can never read each other's cached results, and the same scope never
misses its cache because a list was ordered differently.

## Export

`finance.export` is a distinct permission: the view permission alone does not
satisfy it. Export applies the same scope and the same filters as the list it
mirrors — asserted by comparing the exported line count against the listed row
count for the same query.

## UI

`finance-queues.test.tsx` (19 cases) covers the shared toolbar and date control:

- filter options come from lookups, never a hardcoded list, so a new branch,
  status, or payment method reaches the toolbar as data
- clearing a group returns it to **no filter**, not to "match nothing"
- an active-filter count is shown, with one control that clears everything
- the date control states that both ends are included, because a user who assumes
  an exclusive upper bound widens the range by a day and double-counts
- an inverted range is reported in the control with `role="alert"` and
  `aria-invalid`, and is omitted from the query rather than sent to a service
  that would refuse it
- paging clamps above the last page, below the first, and on an empty result
- an empty queue shows "no matches, clear filters" when filters are active and a
  plain empty state otherwise

The toolbar is wired into invoices (status, branch, product, issue-date),
payments (method, branch, payment-date), installments (status, due-date), and
refunds (status, branch, refund-date), each with a clear-filters action in both
the toolbar and the empty state.

## Performance

`tests/unit/student-finance/finance-list-scale.test.ts` measures p95 over 20
samples for plain paging, search, combined filtering, sorting by amount, deep
paging, the payments and installments queues, a single student's profile, and
export — all against 50,000 invoices through the real service path, with a
2-second budget per SC-010.

Measured and recorded in [performance.md](performance.md). Every case is well
inside the budget — the slowest is 259 ms against 2,000 ms.

The run found two real defects that were invisible at fixture scale: the payments
queue was O(payments × invoices) at 9.5 s per call, and sorting by amount derived
a balance per comparison at 2.3 s. Both are fixed and documented there.

## Success criteria

- **SC-011** filters compose and never contradict each other — PASS
- **SC-013** scope is enforced on every list, read, command, and export — PASS
- **SC-010** 50,000-invoice p95 under 2s — PASS (slowest case 259 ms)

## Gates

`npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test` all pass.
