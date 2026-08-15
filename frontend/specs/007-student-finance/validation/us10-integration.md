# Validation: US10 — Integrate With Student Management and Accounting

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US10-1 the student workspace shows figures equal to this module's records | `finance-reader-adapter.test.ts` — "the reader reports this module's own figures" |
| US10-2 a student with no financial records reads as zero, not as unavailable | "zero is not the same as unavailable" |
| US10-3 a refusal reads as forbidden, an outage as unavailable | `finance-reader-states.test.ts` |
| US10-4 the accounting hand-off carries settled facts and identities only | `accounting-context.test.ts` |
| US10-5 no dependency cycle between the two modules | verified below |
| US10-6 both surfaces always agree after a balance changes | "the shared cache key" |

## The dependency runs one way

Student Finance reads Student Management. If Student Management imported Student
Finance back, the two would form a cycle.

- **`grep -rn "features/student-finance" apps/web/src/features/students/` returns
  nothing.** Student Management has no reference to this module at all.
- Student Management declares a port (`StudentFinanceReader`) and a **registration
  point** (`student-finance-registry.ts`) with a fallback to its existing default.
- Student Finance implements the port in `student-finance-reader-adapter.ts`.
- `shared/providers/module-registry.ts` — which belongs to neither module — is the
  only file that imports both, and performs the registration once.

Nothing changes when no one registers: the resolver returns the wired default,
which reports the module as absent rather than presenting zeroes as facts. The
adapters resolve the reader **per call** rather than capturing it at import time,
so registration order stopped being a correctness concern — the same reasoning
that replaced the mutable workspace-tab registry with static aggregation earlier
in this feature.

## Zero, forbidden, and unavailable stay three things

This is the mapping's entire purpose, and each collapse would cause a different
kind of harm:

| Cause | Result | What collapsing it would do |
| --- | --- | --- |
| Student with no invoices | `available`, all zeroes | Reporting `unavailable` would hide a settled account behind a fake outage |
| Missing `finance.view` | `forbidden` | Reporting `unavailable` would send someone to check a healthy system |
| Source failure | `unavailable`, `source-error` | Reporting zeroes would invent a debt-free student |

All three are produced in a single test run and asserted to be distinct. The
`FinanceError` type never escapes: the port answers in Student Management's
vocabulary, and never throws.

## Both surfaces cannot disagree

The financial summary shown in the student workspace and the figures in the
finance workspace derive from the same records, so a mismatch could only come from
a stale cache. Every balance-affecting command — invoice, payment, installments,
reduction, refund — invalidates Student Management's financial-summary key.

That key is **constructed from a literal** in `finance-query-keys.ts` rather than
imported, because importing Student Management's key factory would put a
compile-time dependency exactly where the architecture forbids one. A duplicated
literal drifts, so a test pins the two together — the one place where importing
both modules at once is legitimate, since a test is not part of either module's
dependency graph.

## The accounting hand-off carries no personal data

`AccountingContext` exposes exactly seven invoice fields, six payment fields, and
five refund fields — asserted by comparing the full key set, so **adding** a field
fails the test rather than passing unnoticed. The student appears as an opaque
`studentId` and `enrollmentId`, never as a profile.

A separate case serializes the whole payload and asserts that no student name from
the fixtures appears anywhere in it — a leak through a nested object would escape
a field-name check but not this one.

The hand-off obeys the same permission and branch-scope rules as every interactive
read: it requires `finance.view`, narrows with the scope, and returns nothing for
a user with no branches.

## Success criteria

- **SC-015** the student workspace and the finance workspace never show different
  figures — PASS
- **FR-027** absence is never representable as zero — PASS
- **FR-048** the accounting context carries settled facts and identities only — PASS

## Gates

`npm run typecheck`, `npm run lint` (0 errors), `npm run build`, and
`npm run test` (144 files, 1,085 tests excluding the scale suite) all pass.
