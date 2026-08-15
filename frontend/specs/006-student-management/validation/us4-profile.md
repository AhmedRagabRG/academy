# Validation: US4 — Maintain Student Information

**Feature**: Student Management | **Verified**: 2026-07-31 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US4-1 valid updates persist with a success outcome | `tests/contract/students/student-update-profile.test.ts` — "persists maintainable values and bumps the version" |
| US4-2 invalid values refused per field with specific guidance | `tests/unit/students/student-profile-schema.test.ts` — 13 cases; "reports every invalid field at once, not just the first" |
| US4-3 protected fields visible but not editable | `tests/integration/students/student-editor.test.tsx` — "renders admission-derived facts as read-only text, not editable inputs" |
| US4-4 input preserved on recoverable failure | `EditStudentScreen` keeps RHF state on error; the conflict banner offers refresh without resetting the form |
| US4-5 concurrent save refused, not silently overwritten | `student-update-profile.test.ts` — "refuses a stale version and leaves the record untouched", "reports the current version so the UI can offer a refresh" |
| US4-6 archived student stays read-only | `student-update-profile.test.ts` — "refuses editing an archived student until it is activated"; `EditStudentScreen` renders locked guidance |

## Functional requirements

- **FR-008** protected fields — `forms/student-protected-fields.tsx` renders plain text, not disabled inputs, so nothing reads as editable
- **FR-009** validation rules — one authoritative schema in `schemas/student-profile-schema.ts`; unit-tested against `tests/unit/students/student-identity-rules.test.ts` (18 cases)
- **FR-011** assignment options restricted to active records — `forms/student-assignment-fields.tsx` disables inactive lookups
- **FR-037** stale-record detection — `expectedVersion` on every command
- **FR-039** input preservation — form state survives a failed mutation
- **FR-023** exactly one event per success, none per failure — `student-update-profile.test.ts` two cases

## Accessibility

- `StudentFormErrorSummary` announces via `role="alert"`, moves focus to the summary, then to the first invalid field.
- Each message links to its field; activating it focuses that field (`student-editor.test.tsx`).
- Conditional fields (guardian phone, alternative identity reason) appear exactly when the schema will require them, so the form never demands a field the employee cannot see.

## Success criteria

- **SC-007** 100% of invalid entries refused before saving with field-specific guidance — PASS

## Test run

```
tests/unit/students, tests/contract/students, tests/integration/students
18 files, 145 tests passed
```
