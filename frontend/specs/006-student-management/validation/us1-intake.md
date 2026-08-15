# Validation: US1 — Receive Students from Successful Admissions

**Feature**: Student Management | **Verified**: 2026-07-31 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US1-1 approved admission produces exactly one student with a unique code, admission reference, dates, and `active` status | `tests/contract/students/student-intake-idempotency.test.ts` — "creates exactly one student on first success" |
| US1-2 non-approved / not-ready / stale admission creates nothing | `tests/contract/students/student-intake-refusal.test.ts` — three cases, each asserting the student count is unchanged |
| US1-3 resubmitting the same enrollment outcome reuses the existing student | `student-intake-idempotency.test.ts` — "returns the same student…", "resolves concurrent submissions…", "creates no duplicate timeline events…" |
| US1-4 no manual create and no permanent delete anywhere | `tests/contract/students/students-service-surface.test.ts` — four surface assertions |
| US1-5 admission-derived information present and attributable | `services/mock-students-service.ts` `materializeFromAdmission` persists `admission-submitted`, `admission-approved`, `student-created`, `enrollment-added` |

## Functional requirements

- **FR-001** no create-by-hand, no delete — asserted on the service surface; no `create` route segment exists under `app/(workspace)/students/`
- **FR-002** every student carries a stable admission reference — `StudentSystemInfo.admissionId` / `approvalSnapshotId`
- **FR-003** idempotent on the approval snapshot — `intakeIdempotencyKey` + `store.intakeIndex`
- **FR-007** student code unique, duplicates refused — `tests/contract/students/student-code-uniqueness.test.ts` (3 cases incl. concurrent intake)
- **FR-013** program⇔batch invariant enforced at intake — `student-intake-idempotency.test.ts` "refuses a program without a batch and a course carrying one"

## Success criteria

- **SC-001** 100% of students trace to an approved admission; no manual create or delete path — PASS
- **SC-002** codes unique across repeated and concurrent submission — PASS

## Boundary check

`studentIntakePort` reads Admissions through `AdmissionEnrollmentReader` and writes
only Student aggregates. Admissions is never mutated; recording the returned
`StudentRef` is that module's decision.

## Test run

```
tests/unit/students, tests/contract/students
5 files, 24 tests passed
```
