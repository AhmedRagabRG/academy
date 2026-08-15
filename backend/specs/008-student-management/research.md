# Phase 0 Research: Student Management

Every unknown surfaced by the spec, the plan input, or the codebase, resolved before design. No `NEEDS CLARIFICATION` remains.

---

## R-001 — How does intake obtain admission documents?

**Decision**: Add a second method to a new `ADMISSIONS_DOCUMENT_READ_PORT` exported by `AdmissionsModule`:
`listCurrentDocuments(admissionId): Promise<AdmissionDocumentSnapshot[]>`, returning for each document its `requirementKey`, `storageFileId`, `fileDescriptor`, `originalName`, `mimeType`, `byteSize`, `previewLocator`, `uploadedAt` and `uploadedBy`. Students maps `requirementKey` → its own `typeKey` and writes a `StudentDocument` + `StudentDocumentVersion` per entry inside the intake transaction.

**Rationale**: The existing `EnrollmentHandoff` (`src/modules/admissions/types/admissions-enrollment.port.ts:28`) carries only `verifiedDocumentVersionIds` — bare identifiers with no file metadata. Copying requires the metadata, and Principle II forbids Students reading `AdmissionDocument` tables. A port keeps the dependency direction correct and typed.

**Alternatives considered**: Widening `EnrollmentHandoff` to embed documents — rejected because readiness is polled by the UI and would then carry a large payload on every check. Re-uploading by hand (spec Option B) — declined by the owner.

**Storage note**: the copy reuses the same `storageFileId`; it does **not** duplicate bytes on disk. Independence is at the *record* level — later admission activity creates new admission versions and never mutates the student's row. `StorageService.remove` is therefore never called by admission document withdrawal, which is already true today.

---

## R-002 — Student code format and collision safety

**Decision**: `{academicYear}-{branchCode}-{sequence}`, e.g. `2027-CAI-00001`. Sequence is 5-digit zero-padded, allocated per `(organizationId, academicYear, branchId)` from a `StudentCodeCounter` table using an atomic upsert-and-increment inside the intake transaction. `branchCode` is the **registration** branch's code.

**Rationale**: Mirrors the proven `AdmissionReferenceCounter` pattern (`prisma/schema.prisma:1141`), which already solves collision safety under concurrency with a composite primary key and a row-level increment. A `@@unique([organizationId, studentCode])` constraint is the backstop; a unique-violation retry maps to `duplicate-student-code`.

**Academic year resolution**: for a Professional Program, use the enrolled batch's academic year. For a Professional Diploma or Training Course there is no batch, so use the organization's active `AcademicYear` at intake time. Both paths resolve through ports, never a direct read.

**Deviation flagged**: the contract's §4.6 examples show `STD-2026-00001`. Recorded in the plan's Complexity Tracking as a required documentation amendment.

---

## R-003 — Guardian information shape

**Decision**: `identity.guardianName` (optional, trimmed, 3…120) and `identity.guardianPhone` (conditional — required when derived age < `minorAgeThreshold`). Parent national identity is **not** a student field; it stays the `parent-national-id` document type.

**Rationale**: This is exactly spec clarification Q2 Option C as answered by the owner. It keeps a single source of truth for the parent's ID — the scanned document — rather than an unverified typed duplicate that no validation could reconcile against the image.

**Conflict noted**: the `/speckit-plan` input reintroduced "Parent National ID" as a stored field. The ratified spec governs the plan, so the Option C decision stands. Flipping it later means one nullable column, one DTO field and one doc amendment.

---

## R-004 — Enforcing the lifecycle transition table

**Decision**: A single `StudentLifecyclePolicy` holding the transition table as a frozen readonly map keyed `from → to`, with each entry carrying its required permission key and whether a reason is mandatory. The service asks the policy; the policy never touches Prisma or the request.

| From | To | Permission | Reason |
|---|---|---|---|
| active | suspended | `students.status.manage` | required |
| active | graduated | `students.status.manage` | optional |
| active | withdrawn | `students.status.manage` | required |
| active | archived | `students.archive` | required |
| suspended | active | `students.status.manage` | optional |
| suspended | withdrawn | `students.status.manage` | required |
| suspended | archived | `students.archive` | required |
| graduated | archived | `students.archive` | optional |
| graduated | active | `students.status.correct` | required |
| withdrawn | archived | `students.archive` | optional |
| withdrawn | active | `students.status.correct` | required |
| archived | active | `students.activate` | optional |

Any pair absent from the table raises `invalid-status-transition` carrying `allowed[]`. Reason max length 500.

**Rationale**: Principle XIX — adding a status later means adding table rows, not editing control flow. Principle VII — permission per transition is data, not an inline conditional.

---

## R-005 — Timeline cursor pagination

**Decision**: Opaque base64 cursor encoding `{seq}`. Ordering is `(occurredAt DESC, sequence DESC)` with `sequence` a monotonic per-student counter allocated at append time. Page query is `WHERE studentId = ? AND sequence < ?` ordered by sequence descending, limit + 1 to detect a next page.

**Rationale**: The contract fixes this shape (`?limit=25&cursor=eyJzZXEiOjQyfQ`) and states sequence is part of the cursor. A pure timestamp cursor duplicates or skips rows when several events share a millisecond — exactly what intake produces, since student-created, enrollment-added and several document-uploaded events all commit together.

**Allocation**: sequence comes from a per-student counter column incremented in the same transaction as the event insert, so it never gaps within a committed write and never collides.

---

## R-006 — Academic eligibility: stored field or derived projection?

**Decision**: **Derived, not stored.** No `eligibilityStatus` column, no eligibility enum, no `Eligibility Changed` timeline event. Operational eligibility is read from the existing server-computed `documentCompletion = {requiredTypes, present, missing, archived}`, already exposed on the student detail and on `context-summary`, combined with `status === "active"`.

**Rationale**: The plan input asked for an eligibility status ("Eligible", "Pending Documents") consumed by future academic modules. Three reasons to reject the stored form:

1. **Principle III** — it is not in `docs/api-data-requirements.html` §4.6. Inventing a field and a timeline category is a silent contract divergence.
2. **Principle XX** — the only stated consumer is a future academic module that does not exist. Its real eligibility rule is unknown, so any enum chosen now is a guess.
3. **Derivable truth drifts.** `documentCompletion.missing === 0` *is* "eligible" under the stated rule. A stored flag must be recomputed on every document upload, replace, archive and policy change; miss one path and the flag lies while the counter is right.

**What this preserves**: the plan input's actual requirements are all met — students are still created with incomplete documents (intake never gates on completeness), completion is still tracked per student, and academic modules still get a stable read surface via `context-summary.documentCompletion`.

**Revisit when**: the first academic module lands with a written eligibility rule. At that point the rule has a real owner and can be specified, contract-amended and stored deliberately if a projection is genuinely too slow.

---

## R-007 — Financial summary while Student Finance does not exist

**Decision**: Define `STUDENT_FINANCE_READER_PORT` in Students with the three-state return `{state:"available",summary} | {state:"unavailable",reason} | {state:"forbidden"}`. Ship a default adapter returning `{state:"unavailable", reason:"finance-module-absent"}`. Module 009 later provides the real implementation against the same symbol.

**Rationale**: Principle XVI — the placeholder sits behind the same interface as the real reader, so no service changes when Finance lands. The contract already defines `finance-module-absent` as a legitimate reason, so this is a specified state rather than a stub. Returns HTTP 200, never a 5xx, and never zeros.

**Permission interaction**: absent `students.finance.view` returns `{state:"forbidden"}` — checked before the port is called, so an unauthorized caller cannot infer whether Finance is up.

---

## R-008 — Arabic search folding and phone redaction

**Decision**: Reuse the existing shared normalization helper applied by Admissions rather than writing a second one — fold `آ أ إ ٱ → ا`, `ى → ي`, `ة → ه`, strip diacritics, fold Arabic-Indic digits to ASCII. Persist a `searchName` column holding the folded full name, maintained on write, and index it. Search terms are folded identically at query time.

**Rationale**: Principle I forbids duplicating a rule. A folded, indexed column keeps the 20,000-row target reachable, where per-row runtime folding would force a sequential scan.

**Redaction**: `phoneHint` is produced by the mapper as `••••••` + last four digits. The list repository selects the phone column but the mapper never emits it; the list response DTO has no full-phone field, so redaction cannot be bypassed by a controller mistake.

---

## R-009 — Document type policy source

**Decision**: Students publishes its **own** document type table — the seven types fixed in contract §4.6 with their own required flags, multiplicity, MIME lists and byte limits — as a constant served through `GET /students/lookups`. It does not consume the Admissions document policy snapshot.

**Rationale**: The plan input says "supported document types remain identical to Admissions", but the two modules differ materially: Admissions has requirement snapshots, verification decisions and a `withdrawn` version state; Students has a flat `missing | present | archived` state and no verification. The contract fixes different limits per module. Sharing the policy would couple Students to admission policy versioning for no benefit.

**Mapping at intake**: admission `requirementKey` values map to student `typeKey` values through an explicit constant map. An admission document whose key has no student equivalent is skipped and its absence simply shows in `documentCompletion` — never silently creating an unpublished type.

| typeKey | Required | Multiple | Accepted | Max |
|---|---|---|---|---|
| `personal-photo` | yes | no | jpeg, png | 2 MB |
| `national-id` | yes | no | pdf, jpeg, png | 5 MB |
| `parent-national-id` | no | no | pdf, jpeg, png | 5 MB |
| `birth-certificate` | yes | no | pdf, jpeg, png | 5 MB |
| `qualification-certificate` | yes | no | pdf, jpeg, png | 5 MB |
| `admission-declaration` | yes | no | pdf only | 5 MB |
| `additional-attachment` | no | **yes** | pdf, jpeg, png | 10 MB |

---

## R-010 — Idempotency for intake

**Decision**: A `StudentIntakeKey` table with `@@unique([organizationId, approvalSnapshotId])` storing the resulting `studentId`. Intake first looks up the key; a hit returns the stored student and performs no writes. A miss inserts the key inside the same transaction as the student, so two concurrent intakes for one snapshot leave exactly one winner and the loser's unique violation resolves to a read.

**Rationale**: Mirrors `AdmissionRequestKey` (`prisma/schema.prisma:1126`), already proven in this codebase. Constitution "Idempotency" binds student intake to the natural key `approvalSnapshotId` specifically.

**Archived-student interaction**: a retry whose stored student was later archived still resolves to that same student — the key lookup precedes any status check, satisfying the spec edge case.

---

## R-011 — Where labels come from on profile update

**Decision**: The update DTO accepts the label fields the client submits (the frontend schema marks them required) but the service **ignores** them and re-resolves every label from its ID through `ORGANIZATION_MASTER_DATA_PORT` and `IAM_EMPLOYEE_REFERENCE_PORT`. Denormalized labels are then written to the student row for list-projection speed.

**Rationale**: Contract §4.6 states this explicitly. Trusting client labels would let a caller write a branch name that contradicts the branch ID.

**Enrollment labels are different**: `offeringLabel`, `offeringCode`, `batchLabel`, `batchCode` are frozen at intake and never re-resolved, so archiving a catalog product cannot blank a student's history.

---

## R-012 — Testing approach

**Decision**: Jest unit tests for the lifecycle policy (full transition matrix including every forbidden pair), the identity policy (boundary ages and graduation years), and the code allocator. Supertest e2e specs per user story, plus a dedicated `students-forbidden-surface.e2e-spec.ts` asserting `POST /api/v1/students` and `DELETE /api/v1/students/:id` return 404.

**Rationale**: The contract calls the absent create/delete surface a contract test, so it gets an explicit test rather than relying on nobody adding the route later.
