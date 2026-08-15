# Validation: Performance (T067)

**Feature**: Student Management | **Measured**: 2026-07-31 | **Status**: PASS

## SC-004 — list interactions across 20,000 students

Target: results within **2 000 ms at the 95th percentile**. Measured through the same
`StudentsService` path the UI uses, against the deterministic scale fixture
(`data/students-scale-fixtures.ts`, 20,000 students), 30 samples per interaction.

| Interaction | p50 | p95 | max | Budget | Result |
| --- | --- | --- | --- | --- | --- |
| Plain page load | 22.5 ms | **30.9 ms** | 112.0 ms | 2000 ms | PASS |
| Search by name | 30.1 ms | **39.0 ms** | 41.4 ms | 2000 ms | PASS |
| Combined filters (status + branch + department) | 4.8 ms | **6.7 ms** | 7.2 ms | 2000 ms | PASS |
| Offering filter (crosses enrollments) | 11.3 ms | **15.8 ms** | 17.2 ms | 2000 ms | PASS |
| Sort by full name (Arabic collation) | 78.8 ms | **109.3 ms** | 157.1 ms | 2000 ms | PASS |
| Deep pagination (page 500) | 27.8 ms | **41.6 ms** | 139.8 ms | 2000 ms | PASS |

Regression guard: `tests/unit/students/student-list-scale.test.ts` (7 assertions,
each enforcing the 2 000 ms p95 budget).

## Defect found and fixed during measurement

The first run of the scale suite did not finish within 120 seconds.

**Cause.** `matchesFilters` called `enrollmentsOf(student.id)` for every candidate,
and `enrollmentsOf` scanned the whole enrollment array. At 20,000 students that is
O(n²) — roughly 400 M comparisons per list call.

**Fix** (`services/mock-students-service.ts`):

1. Added lazily-built `Map<StudentId, …>` indexes for enrollments, documents, and
   timeline events, invalidated on every write.
2. Made the academic filters look up enrollments only when an offering or batch
   filter is actually set.

The whole scale suite now runs in ~3.6 s.

This is exactly the class of defect the scale fixture exists to catch: it was
invisible at the 7-record seed size and would have surfaced only in production.

## Narrow list projection

`StudentSummary` carries 14 fields and deliberately excludes national identifier,
address, documents, notes, timeline, and finance. Asserted by
`student-list-scale.test.ts` — "never loads documents, notes, or timeline into a
list row".

## Client boundary

- List, workspace, and each area are separate route segments, so each code-splits.
- Table columns are module-level constants (`components/student-columns.tsx`), never
  rebuilt per render.
- Reads accept `AbortSignal`; `useStudentsList` uses `placeholderData` so paging does
  not flash a loading state.
- Query keys carry the scope fingerprint, so a scope change cannot serve stale rows.
