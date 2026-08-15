# Validation: US5 — Govern the Student Lifecycle

**Feature**: Student Management | **Verified**: 2026-07-31 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US5-1 permitted transitions apply with full history | `tests/contract/students/student-status-change.test.ts` — "applies a permitted transition and records the full history entry" (asserts actor, time, prior status, resulting status, reason, both versions) |
| US5-2 archived student activates and stays historically continuous | same file — "keeps an archived student readable and restorable" |
| US5-3 disallowed transitions refused with a specific explanation | same file — "refuses a transition the policy disallows and changes nothing", "reports which transitions were allowed on refusal" |
| US5-4 unpermitted transitions refused, nothing recorded | same file — "refuses every transition without the exact permission" |
| US5-5 archived students remain readable and in historical lists | same file — "keeps archived students in list results for historical review" |
| US5-6 failed transitions produce no history entry | same file — "records no history and no timeline event when a transition fails" |

## The transition table is the single source of truth

`utils/student-lifecycle.ts` is consumed by three places that must never diverge:

1. the mock service's refusals (`changeStatus`),
2. the `availableStatusActions` projection that decides which buttons render,
3. the dialog's reason requirement (`createStudentStatusSchema`, `StudentStatusDialog`).

`tests/unit/students/student-lifecycle.test.ts` (21 cases) pins the whole table:
every status covered, exact permission per edge, reason requirements, correction
marking, self-transitions forbidden, and shortcuts forbidden.

Because the UI reads `availableStatusActions` — computed service-side from that same
table filtered by the employee's permissions — **no button can offer a transition the
service would refuse**.

## Bulk actions

`tests/contract/students/student-bulk-status.test.ts` (5 cases) asserts each record
is evaluated independently, refusals carry their own code and message, successful
records still apply alongside refused ones, and an empty selection returns an empty
result. Partial failure is never collapsed into a single outcome (FR-035).

## Accessibility

`tests/integration/students/student-lifecycle.test.tsx` (10 cases): the dialog is
`aria-modal`, moves focus inside on open, blocks confirmation until a required reason
exists, announces the missing reason through `role="alert"` with `aria-invalid`, and
disables confirmation while in flight.

## Success criteria

- **SC-008** 100% of disallowed transitions and unpermitted actions refused, producing no status change and no history entry — PASS
- **SC-011** 100% of archived students retrievable and restorable — PASS

## Test run

```
tests/unit/students, tests/contract/students, tests/integration/students
22 files, 210 tests passed
```
