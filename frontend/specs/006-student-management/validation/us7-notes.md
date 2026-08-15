# Validation: US7 — Record Internal Notes

**Status**: PASS | **Verified**: 2026-07-31

| Scenario | Evidence (`tests/contract/students/student-notes.test.ts`) |
| --- | --- |
| US7-1 stores author, time, and content | "stores author, creation time, and content" |
| US7-2 empty and whitespace-only refused | "refuses empty and whitespace-only content" |
| US7-3 ordered newest first with attribution | "orders notes newest first" |
| US7-4 invisible without note permission | "withholds notes entirely without students.notes.view" |
| US7-5 authorship preserved for an inactive author | "preserves authorship for an author who is no longer active" |

Notes never appear in the list projection or the consumer context summary —
"never returns note content in the list projection or context summary".

## Scope extension — edit and archive

The delivery request listed "Edit note" and "Delete note", which spec FR-020/FR-021
do not cover. They are implemented **non-destructively** so they stay consistent with
FR-040 audit readiness:

- `editNote` is a revision: original author and `createdAt` are preserved, and
  `editedAt`/`editedBy` are recorded.
- `archiveNote` is a soft archive: the note leaves the active list but is never
  deleted.

Both require `students.notes.manage`. Covered by the "note revision and archival"
suite (4 cases).

**Open item**: spec FR-020/FR-021 and User Story 7 still describe add-only notes.
Task T129 (amend the spec to match) is not yet done — the behaviour is built and
tested, but the spec has not been updated to authorize it. Confirm the reading first.
