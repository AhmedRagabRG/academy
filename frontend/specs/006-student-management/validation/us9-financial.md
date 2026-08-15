# Validation: US9 — Review the Financial Summary

**Status**: PASS | **Verified**: 2026-07-31

| Scenario | Evidence |
| --- | --- |
| US9-1 read-only figures when available | `student-finance-reader.test.ts` — "returns figures only in the available state"; `student-workspace-areas.test.tsx` — "renders read-only figures when available" |
| US9-2 no financial action anywhere | `students-service-surface.test.ts` — "exposes no financial action"; `student-workspace-areas.test.tsx` — "offers no financial action of any kind" |
| US9-3 explicit unavailable state with retry, never zeroes | `student-finance-reader.test.ts` — "never represents absence as zero"; `student-workspace-areas.test.tsx` — "states why data is missing instead of showing zeroes" |
| US9-4 forbidden without permission | both files — "returns forbidden rather than unavailable without students.finance.view" |

## The three-state result

`StudentFinancialSummaryResult` is a discriminated union — `available` (carries
figures), `unavailable` (carries a reason), `forbidden`. Only the `available` variant
has numbers, so "no data" is **not representable** as zero. Source error, timeout,
and absent-module are distinguishable and rendered with different messages.

Totals are decimal strings at the configured precision;
"keeps totals consistent to the configured precision" asserts paid + remaining =
total and that remaining is never negative.

The wired default returns `finance-module-absent`, which is the honest answer until
Student Finance exists.
