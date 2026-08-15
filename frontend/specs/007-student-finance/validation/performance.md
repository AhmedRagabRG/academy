# Validation: Performance at Scale

**Feature**: Student Finance | **Measured**: 2026-08-01 | **Status**: PASS

## What was measured

`apps/web/tests/unit/student-finance/finance-list-scale.test.ts` — **50,000
invoices** from the deterministic scale fixture, driven through the same service
path the UI uses. Each figure is the 95th percentile over 20 samples (10 for the
profile and export cases). Budget: **2,000 ms** per SC-010.

```bash
npx vitest run tests/unit/student-finance/finance-list-scale.test.ts --reporter=verbose --disable-console-intercept
```

| Interaction | p95 | Budget | |
| --- | ---: | ---: | --- |
| Invoices — plain page | 38.1 ms | 2000 ms | PASS |
| Invoices — search | 50.9 ms | 2000 ms | PASS |
| Invoices — status + date filter | 259.2 ms | 2000 ms | PASS |
| Invoices — sort by amount | 158.0 ms | 2000 ms | PASS |
| Invoices — deep paging (page 500) | 46.0 ms | 2000 ms | PASS |
| Payments queue | 66.2 ms | 2000 ms | PASS |
| Installments queue | 20.2 ms | 2000 ms | PASS |
| Student financial profile | 27.3 ms | 2000 ms | PASS |
| Export | 174.7 ms | 2000 ms | PASS |

The suite prints these figures on every run, so a run produces evidence rather
than just a pass.

## Two real problems this found

Both were invisible at fixture scale and only appeared at 50,000 records.

### The payments queue was O(payments × invoices) — 9.5 s per call

`listPayments` joined each payment back to its invoice with
`store.invoices.find(...)` **inside the filter callback**, so every payment
scanned the entire invoice array. At 50,000 invoices a single page load took
about 9.5 seconds against a 2-second budget — nearly five times over.

Fixed with an `invoiceOf(id)` lazy `Map` index, invalidated on write like the
other per-entity indexes, and used everywhere a child record joins back to its
invoice: the payments queue, the refunds queue, refund projections, the
accounting context, and the intake idempotency check. **66.2 ms** after the fix.

This is the same class of defect that made Student Management's list path O(n²),
which is why the indexes were built in from the first commit here (research R9) —
one join had simply been missed.

### Sorting by amount derived a balance per comparison — 2.3 s

The comparator called `balanceOf()` on both sides of every comparison, so sorting
50,000 invoices performed roughly `2 · n · log n` full balance derivations, each
scanning that invoice's adjustments, payments, and refunds. Measured at
**2,333 ms**, just over budget.

Fixed by decorate-sort-undecorate: the sort key is computed once per row, then
compared numerically for money and lexically for text. **158.0 ms** after the fix.

Worth noting the first pass of this suite happened to come in just under the
budget and the second did not — a case sitting within ~15% of its limit is not
really passing, and the fix moved it to roughly 8% of the budget instead of 117%.

## Environment

macOS (Darwin 25.4.0), Node 20, Vitest 4.1.10, jsdom, run alongside no other
load. Absolute figures depend on the machine; the budget has enough headroom
(the slowest case is 13% of it) that ordinary variation will not flip the result.

## Related

- [us8-discovery.md](us8-discovery.md) — the filter and scope behaviour these
  queues implement
- [architecture.md](architecture.md) — the indexing decision (research R9)

## Client-boundary and bundle review (T184)

- **Every route segment is a Server Component.** All 13 files under
  `app/(workspace)/student-finance/` render without `"use client"`; each `page.tsx`
  imports one screen from the feature barrel and nothing else.
- **The client boundary starts at the screen**, not at the route, so each route
  segment code-splits on its own. 33 modules under `features/student-finance/`
  carry `"use client"` — the screens, the interactive components, the forms, and
  the hooks. No service, util, schema, config, or type module is a client module.
- **Every route has `loading.tsx` and `error.tsx`.** The create-invoice route was
  missing both and now has them; a route without them falls back to the nearest
  ancestor boundary, which reports the wrong thing.
- **No third-party dependency was added** for this feature. Money formatting uses
  `Intl.NumberFormat`, cached per currency-and-precision pair.
