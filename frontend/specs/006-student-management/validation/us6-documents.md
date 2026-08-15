# Validation: US6 — Manage Student Documents

**Status**: PASS | **Verified**: 2026-07-31

| Scenario | Evidence (`tests/contract/students/student-documents.test.ts` unless noted) |
| --- | --- |
| US6-1 present, missing, and archived distinguished per type | "presents every configured type, distinguishing present, missing, and archived" |
| US6-2 accepted file recorded with full metadata | "uploads an accepted file with full metadata" |
| US6-3 unsupported / oversized / empty / unreadable refused without damage | "refuses an unsupported type, an oversized file, and an empty file"; "leaves an existing document untouched when an upload is refused" |
| US6-4 replacement versions forward, previous retrievable | "versions a replacement and keeps the previous version retrievable" |
| US6-5 preview and download permission-gated | "separates view permission from manage permission" |
| US6-6 archive leaves the active set, never deletes | "archives without deleting, keeping every version"; no delete operation exists on the facade |
| US6-7 retried upload creates no duplicate | "never creates a duplicate when an interrupted upload is retried" |

## Defect found and fixed

The retry check originally ran **after** the optimistic-version assert. A genuine
retry carries the version the client held *before* the first upload landed, so every
real retry was rejected as a conflict — defeating `uploadAttemptId` entirely.

Fixed by checking idempotency before the version assert in both `uploadDocument` and
`replaceDocument`: a duplicate attempt is the same write, not a conflicting one.

Unit coverage: `tests/unit/students/student-documents.test.ts` (17 cases) pins file
validation, version numbering, retry resolution, archival, completion counts, and
required-first ordering.
