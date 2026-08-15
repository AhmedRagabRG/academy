# Quickstart: Student Management Validation

Runnable checks that prove the feature works end to end. Implementation detail belongs in `tasks.md`; this file is the validation guide.

## Prerequisites

- PostgreSQL running (`docker compose up -d db`)
- `.env` configured from `.env.test.example`
- Admissions module reachable, with at least one **approved, enrollment-ready** admission
- The `ADMISSIONS_DOCUMENT_READ_PORT` published by Admissions — see [contracts/students-public-ports.contract.md](./contracts/students-public-ports.contract.md)

## Setup

```bash
npm install
```

```bash
npm run prisma:migrate
```

```bash
npm run seed
```

The seed already contains all 15 `students.*` permission keys (`prisma/seeds/permission-catalog.ts`), so no permission work is needed before testing.

## Build and quality gates

Run these before claiming the feature is done — they are constitution gates 3, 4 and 9.

```bash
npm run build
```

```bash
npm run lint
```

## Test suites

```bash
npm test
```

```bash
npm run test:e2e
```

## Validation scenarios

Each maps to a spec user story. Expected outcomes are stated as observable results, not implementation steps.

### 1. Intake creates exactly one student (US1)

- `POST /api/v1/students/intake` with an approved admission's readiness payload → **201**, status `active`, version 1, a server-allocated `studentCode` shaped `2027-CAI-00001`, one enrollment, and a `statusHistory` entry with `fromStatus: null`.
- Documents present on the admission appear as student-owned documents; `documentCompletion` reflects them.
- **Repeat the identical call** → the same `id` and `studentCode`, still version 1, with no second enrollment, lifecycle entry or document version.
- Intake against a non-approved admission → `admission-not-ready`. Against a stale `admissionVersion` → `admission-version-stale`. A program without a batch, or a diploma with one → `enrollment-batch-rule-violated`. No partial record in any case.

### 2. Forbidden surface stays absent (US1)

- `POST /api/v1/students` → **404**
- `DELETE /api/v1/students/:studentId` → **404**

### 3. List redaction and scoping (US2)

- `GET /api/v1/students` → every row carries `phoneHint` masked to the last four digits and **no** `nationalId`, `address`, documents, notes, timeline or finance.
- Search an Arabic name written with `أ` when stored with `ا`, and with Arabic-Indic digits → the same record is returned.
- `?page=9999` → **200** with `data: []` and correct `meta`, not a 4xx.
- `?pageSize=500` → clamped to 100.
- Request a student outside the caller's branches → `out-of-scope`, not `forbidden`.
- No `statuses` filter → archived students absent. `?statuses=archived` → they appear.

### 4. Profile update protections (US3)

- Valid update with the current `expectedVersion` → **200**, version advances, a `profile-updated` timeline event appears.
- Submit `registrationBranchLabel: "wrong"` alongside a valid `registrationBranchId` → the stored label is the resolved one, not the submitted string.
- Attempt to change `studentCode`, `status`, any `system.*` field or an audit field → those values are unchanged.
- Stale `expectedVersion` → `version-conflict` **409** with `currentVersion` as a first-class field.
- Update an archived student → `archived-read-only` **409**.
- A student under `minorAgeThreshold` with no `guardianPhone` → `validation-failed` with a field-level finding.

### 5. Documents (US4)

- Upload a valid file per published type → new current version, metadata stored, timeline event recorded.
- Repeat with the same `uploadAttemptId` → resolves to the stored version, no duplicate.
- Zero-byte file → `file-unreadable`. Wrong MIME → `unsupported-file-type`. Oversized → `file-too-large` **413**.
- Replace → new current version, earlier versions still retrievable.
- Archive → `state: "archived"`, versions retained; a further modification → `document-archived`.
- Document list ordering → required types first, then Arabic-label alphabetical.
- Change the admission's documents afterwards → the student's documents are unchanged.

### 6. Lifecycle (US5)

- Walk every pair in the transition table in `research.md` R-004 — each permitted pair succeeds with its required permission and reason, each absent pair returns `invalid-status-transition` with `allowed[]`.
- Reason-required transition without a reason → `reason-required`.
- `graduated → active` without `students.status.correct` → refused; with it → succeeds.
- `archived → active` without `students.activate` → refused.
- `POST /students/bulk-status` mixing a valid and an invalid item → **200** with one row per item, `applied` and `refused` respectively; the applied one is **not** rolled back.

### 7. Notes, timeline, summaries (US6)

- Create a note → stored with author; `Student.version` **unchanged**.
- Whitespace-only content → `note-content-empty`.
- Deactivate the author, re-read notes → name still present, `active: false`.
- Page the timeline across events sharing one millisecond → no duplicate and no skipped event across pages.
- `?categories=status-changed` → only those events.
- `GET /financial-summary` with Finance absent → **200** `{state:"unavailable", reason:"finance-module-absent"}` — never zeros, never a 5xx.
- Without `students.finance.view` → `{state:"forbidden"}`.
- `GET /context-summary` → contains no note content, document file, address or `nationalId`.

## Done when

Every scenario above passes, `npm run build` and `npm run lint` are clean, and the two documentation amendments in the plan's Complexity Tracking have landed in `docs/api-data-requirements.html`.
