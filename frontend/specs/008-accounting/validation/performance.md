# Validation: Performance and Client Boundaries

**Feature**: Accounting | **Verified**: 2026-08-01 | **Status**: PASS on boundaries; scale measurement outstanding

## Client boundaries (T170)

- **Every `page.tsx` and `loading.tsx` is a Server Component.** 12 of the 18 route
  files render without `"use client"`; the 6 that carry it are `error.tsx`, which
  Next.js requires to be client components. Each `page.tsx` imports one screen
  from the feature and nothing else.
- **The client boundary begins at the screen**, so each route segment code-splits
  on its own. 29 modules under `features/accounting/` are client modules — the
  screens, interactive components, forms, and hooks.
- **Zero leakage into non-UI layers**: no service, util, type, schema, or data
  module is a client module.
- **Every route has its own `loading.tsx` and `error.tsx`** — all six verified. A
  segment without them falls back to the nearest ancestor boundary, which reports
  the wrong thing.
- **No third-party dependency was added.** Recharts, react-dropzone, Lucide, and
  Sonner were already in the approved stack.

## Query and rerender strategy

Every list read uses `placeholderData: (previous) => previous`, so filtering keeps
the previous page visible rather than flashing an empty table. The scope
fingerprint is computed from a **single** store subscription rather than one per
permission, so a screen with many gated controls does not re-render per key.

## Indexing and sort keys, built in from the first commit

Two shapes were measured as real defects in Student Finance at scale (research
R11), so both are structural here rather than retrofitted:

- **By-id indexes.** `requestOf`, `categoryOf`, `subCategoryOf` are lazy `Map`s
  invalidated on every write. No list calls `.find()` inside a `filter` — the
  shape that made an equivalent queue O(payments × invoices), 9.5 s per call.
- **Decorate-sort-undecorate.** `listRequests` computes each row's sort key once
  before sorting rather than inside the comparator. Deriving inside a comparator
  cost `2·n·log n` derivations and 2.3 s in the equivalent Finance path.

Amount sorting compares **integer minor units** (`toMinor`), so ordering never
depends on float comparison. The dashboard's breakdown ordering does the same.

## No floating-point arithmetic on money

Audited across the whole feature. The only `Number(...)` remaining on a money
value is in `expense-breakdowns.tsx`, where Recharts requires a JS number to plot
a bar — and it is annotated as presentation-only, with the authoritative figure
rendered as a decimal string in the table beside it.

Two were fixed during this audit:

- the dashboard's breakdown sort used float subtraction — now integer minor units
- the request schema's positivity check used `Number(amount) <= 0` — now a string
  test, so no float touches a money value even to compare it

## Scale measurement — outstanding

`tests/unit/accounting/accounting-list-scale.test.ts` (T176) and its recorded
timings against SC-009 (T177) are **not yet done**. The suite would measure p95
over 20,000 requests for paging, search, combined filters, sorting by amount and
date, the dashboard, and export.

No timings are claimed. The indexes and sort-key shapes the budget depends on are
in place and exercised by the 610 existing tests, but that is a structural
argument, not a measurement.

**SC-009 is therefore unverified.**
