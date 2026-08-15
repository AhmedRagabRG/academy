# HTTP Contract: Students

Source of truth: `docs/api-data-requirements.html` §4.6 plus the §3 shared bindings. Every route is served under `/api/v1`, wrapped by the global `{success,data}` interceptor, and guarded by a `students.*` permission key. Controllers return bare payloads.

## Forbidden surface (asserted by test)

| Route | Expected |
|---|---|
| `POST /api/v1/students` | **404** — students exist only through intake |
| `DELETE /api/v1/students/:studentId` | **404** — archival replaces deletion |

## Reads

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/students` | `students.view` | offset paginated; branch-scoped; redacted projection |
| GET | `/students/export` | `students.export` | same query; `text/csv; charset=utf-8` with BOM |
| GET | `/students/:studentId` | `students.view` | full detail + computed blocks |
| GET | `/students/:studentId/enrollments` | `students.enrollments.view` | bounded closed set |
| GET | `/students/:studentId/documents` | `students.documents.view` | required-first ordering |
| GET | `/students/:studentId/documents/:documentId/versions` | `students.documents.view` | append-only history |
| GET | `/students/:studentId/notes` | `students.notes.view` | bounded closed set |
| GET | `/students/:studentId/timeline` | `students.timeline.view` | **cursor** paginated |
| GET | `/students/:studentId/status-history` | `students.view` | bounded closed set |
| GET | `/students/:studentId/financial-summary` | `students.finance.view` | three-state union, always 200 |
| GET | `/students/:studentId/context-summary` | `students.view` | stable cross-module read |
| GET | `/students/lookups` | `students.view` | bounded lookup payload |

### List query

`search` · `branchIds[]` · `departmentIds[]` · `offeringIds[]` · `batchIds[]` · `statuses[]` · `customerServiceEmployeeIds[]` · `sortBy` (`fullName|studentCode|enrollmentDate|updatedAt|status`) · `sortOrder` · `page` · `pageSize`.

- `pageSize` default 20, max 100 enforced server-side. Over-range page → **200** with `data: []` and correct `meta`.
- Archived students are excluded unless `statuses` explicitly includes `archived`.
- Search covers `fullName`, `studentCode`, `primaryPhone`, `guardianPhone`, `nationalId`, all Arabic- and digit-folded.

### List row projection

`id` · `studentCode` · `fullName` · `phoneHint` · `registrationBranchLabel` · `studyBranchLabel` · `departmentLabel` · `primaryOfferingLabel` · `primaryBatchLabel` · `customerServiceEmployeeName` · `status` · `enrollmentCount` · `updatedAt` · `version`.

**Never present**: full phone, `nationalId`, `address`, documents, notes, timeline, financial data.

### Detail additions

`enrollments[]` · `documentCompletion` · `availableStatusActions[]` · `permissions{}` (all 15 flags, always populated) · `statusHistory[]`.

### Timeline

`?limit=25&cursor=<opaque>&categories=status-changed,document-uploaded` → `{ items: [], nextCursor }`. Ordering `(occurredAt DESC, sequence DESC)`; `sequence` is inside the cursor.

### Financial summary

```text
{ state: "available",   summary: { totalFees, paidAmount, remainingBalance, activeInstallments, asOf, sourceRevisionId } }
{ state: "unavailable", reason: "finance-module-absent" | "source-error" | "timeout" }
{ state: "forbidden" }
```

HTTP 200 in all three cases. Never a 5xx, never a summary of zeros.

## Writes

| Method | Path | Permission | Version | Idempotency |
|---|---|---|---|---|
| POST | `/students/intake` | `students.intake` | admission `expectedVersion` | `approvalSnapshotId` |
| PATCH | `/students/:studentId` | `students.update` | required | — |
| PATCH | `/students/:studentId/status` | per transition table | required | — |
| POST | `/students/bulk-status` | per transition table | per item | — |
| POST | `/students/:studentId/documents` | `students.documents.manage` | required | `uploadAttemptId` |
| POST | `/students/:studentId/documents/:documentId/replace` | `students.documents.manage` | required | `uploadAttemptId` |
| PATCH | `/students/:studentId/documents/:documentId/archive` | `students.documents.manage` | required | — |
| POST | `/students/:studentId/notes` | `students.notes.manage` | **none** | — |
| PATCH | `/students/:studentId/notes/:noteId` | `students.notes.manage` | **none** | — |
| PATCH | `/students/:studentId/notes/:noteId/archive` | `students.notes.manage` | **none** | — |

Note commands carry no `expectedVersion` and do not bump `Student.version`.

### Intake

Body is `EnrollmentIntakeInput` mapped from the Admissions readiness summary: `admissionId`, `admissionReference`, `admissionVersion`, `approvalSnapshotId`, `applicant`, `academicTarget`, `branches`, `financial`. Response **201** with the created `StudentDetail` — status `active`, version 1, server-allocated `studentCode`, initial `statusHistory` entry with `fromStatus: null`.

A repeat with the same `approvalSnapshotId` returns the existing student and writes nothing.

### Profile update

`{ input: { identity, assignment }, expectedVersion }`. Submitted label fields are accepted by the schema and **ignored** — labels are re-resolved from IDs. `guardianName` is added here (pending doc amendment).

### Status change

`{ toStatus, reason?, expectedVersion }` → full updated `StudentDetail`. Bulk form takes `{ items: [{studentId, toStatus, expectedVersion}] }` and returns one row per item with `outcome: "applied" | "refused"` plus `refusalCode` and Arabic `message`; successful items are never rolled back.

### Document upload

`multipart/form-data` with `file`, `typeKey`, `uploadAttemptId`, `expectedVersion`. Server re-validates MIME and size against the published per-type limits regardless of client checks.

## Error codes

Closed union — no generic fallback. Retryable: `service-unavailable`, `finance-unavailable`, `file-unreadable`.

| Code | HTTP | Detail fields |
|---|---|---|
| `not-found` | 404 | |
| `forbidden` | 403 | |
| `out-of-scope` | 403 | distinct from `forbidden` |
| `version-conflict` | 409 | `currentVersion` first-class |
| `validation-failed` | 422 | `fieldErrors` with client-matching dot paths |
| `invalid-status-transition` | 409 | `fromStatus`, `toStatus`, `allowed[]` |
| `reason-required` | 422 | |
| `archived-read-only` | 409 | |
| `duplicate-student-code` | 409 | |
| `admission-not-ready` | 409 | `reasons[]` |
| `admission-version-stale` | 409 | |
| `enrollment-batch-rule-violated` | 422 | |
| `unsupported-file-type` | 422 | |
| `file-too-large` | 413 | |
| `file-unreadable` | 422 | zero-byte file; retryable |
| `document-archived` | 409 | |
| `note-content-empty` | 422 | |
| `finance-unavailable` | 200/503 | prefer the union variant |
| `service-unavailable` | 503 | retryable |

All `message` values are Arabic; clients switch on `code` and never parse prose.
