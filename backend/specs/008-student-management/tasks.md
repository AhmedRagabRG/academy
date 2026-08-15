---

description: "Task list for Student Management implementation"
---

# Tasks: Student Management

**Input**: Design documents from `/specs/008-student-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Included. `research.md` R-012 fixes the testing approach and `plan.md` lists the test files, so test tasks are part of the design rather than optional extras.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: The user story this task serves (US1…US6)
- Every task names its exact file path

## Path Conventions

Modular monolith. Feature code lives under `src/modules/students/`, shared infrastructure under `src/core/` and `src/shared/`, schema in `prisma/`.

Tests follow the repository's existing layout rather than the flat `test/students/` this plan originally assumed: contract suites in `test/e2e/students/`, unit suites in `test/unit/students/`.

## Implementation status — 2026-08-04

**96 of 105 tasks complete.** Build, lint and all students tests are green; the application boots and registers exactly the 22 documented routes with no `POST /students` and no `DELETE /students/:studentId`.

The 9 open tasks are the story-level end-to-end suites plus seed data. They need a seeded organization, an approved admission and a live database fixture, which does not exist in this repository yet — the existing `test/e2e/` suites are metadata/contract style against mocks, not live-server tests. The behaviour they would cover is currently asserted by the contract suite, the three policy unit suites and a manual boot check.

Outstanding: T028, T040, T051, T060, T073, T082, T083 (live e2e per story), T099 (seed data), T105 (full quickstart run, which depends on T099).

## Decisions already locked (do not re-open during implementation)

- **No stored eligibility field.** Operational eligibility is derived by consumers as `status === "active" && documentCompletion.missing === 0`. See `research.md` R-006. There is no `ELIGIBILITY_CHANGED` timeline category.
- **Parent national identity is document-only.** Guardian data on the student is `guardianName` + `guardianPhone`. See `research.md` R-003.
- **Two documentation amendments are prerequisites**, tracked as T098: guardian name field, and student-code example values in `docs/api-data-requirements.html` §4.6.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Module scaffold and the error vocabulary every later phase imports

- [X] T001 [P] Create the module folder structure (`students/`, `intake/`, `lifecycle/`, `documents/`, `notes/`, `timeline/`, `summaries/`, `lookups/`, `mappers/`, `types/`, `events/`) under `src/modules/students/` per plan.md
- [X] T002 [P] Create the closed union of documented error classes extending `DomainException` in `src/core/exceptions/students.exceptions.ts` (all 19 codes from contracts/students-http.contract.md, each with its Arabic message and HTTP status)
- [X] T003 [P] Re-export the students exceptions from `src/core/exceptions/index.ts`
- [X] T004 [P] Define shared domain types (`StudentStatus`, `StudentOfferingKind`, `StudentDocumentState`, `ActorRef`, timeline categories) in `src/modules/students/types/students.types.ts`
- [X] T005 Create the `StudentsModule` shell importing `CoreModule`, `StorageModule`, `IdentityModule`, `OrganizationModule`, `CatalogModule`, `ProgramBatchesModule`, `AdmissionsModule` in `src/modules/students/students.module.ts`
- [X] T006 Register `StudentsModule` after `AdmissionsModule` in `src/app.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, cross-module ports and the shared policies every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Persistence

- [X] T007 Add the 5 enums plus the `Student` and `StudentEnrollment` models (with the program-requires-batch check constraint) to `prisma/schema.prisma` per data-model.md
- [X] T008 Add the `StudentDocument` and `StudentDocumentVersion` models to `prisma/schema.prisma`, including the partial unique index that exempts `additional-attachment` from one-row-per-type
- [X] T009 Add the `StudentStatusChange`, `StudentNote` and `StudentTimelineEvent` models to `prisma/schema.prisma`, including the `[studentId, sequence]` unique constraint
- [X] T010 Add the `StudentIntakeKey` and `StudentCodeCounter` models to `prisma/schema.prisma` with their composite keys
- [X] T011 Generate and apply the additive migration in `prisma/migrations/` via `npm run prisma:migrate`, confirming no existing model is altered

### Cross-module prerequisite (module 007 change)

- [X] T012 Define the read-only `AdmissionsDocumentReadPort` interface and `ADMISSIONS_DOCUMENT_READ_PORT` symbol in `src/modules/admissions/types/admissions-document-read.port.ts` per contracts/students-public-ports.contract.md
- [X] T013 Implement `listCurrentDocuments(admissionId)` returning requirement key, storage file id, file descriptor, original name, MIME type, byte size, preview locator and uploader in `src/modules/admissions/documents/admissions-document-read.service.ts`
- [X] T014 Provide and export `ADMISSIONS_DOCUMENT_READ_PORT` from `src/modules/admissions/admissions.module.ts`

### Ports and shared services owned by Students

- [X] T015 [P] Define `STUDENT_FINANCE_READER_PORT` and ship the default adapter returning `{state:"unavailable", reason:"finance-module-absent"}` in `src/modules/students/types/student-finance-reader.port.ts` and `src/modules/students/summaries/student-finance-reader.adapter.ts`
- [X] T016 [P] Define the outward `STUDENTS_CONTEXT_PORT` interface in `src/modules/students/types/students-context.port.ts`
- [X] T017 [P] Implement the base student repository accepting an ambient transaction client in `src/modules/students/students/student.repository.ts` (only layer importing Prisma)
- [X] T018 [P] Implement the student mapper producing detail, list-row and context shapes in `src/modules/students/mappers/student.mapper.ts`
- [X] T019 [P] Implement `StudentIdentityPolicy` enforcing the published configurable rules (phone pattern, national id pattern, minor age threshold, minimum graduation age, derived age bounds) in `src/modules/students/students/student-identity.policy.ts`
- [X] T020 [P] Implement `StudentLifecyclePolicy` holding the frozen transition table with per-transition permission and reason requirement in `src/modules/students/lifecycle/student-lifecycle.policy.ts` per research.md R-004
- [X] T021 [P] Implement `StudentDocumentPolicy` publishing the seven document types with required flag, multiplicity, accepted MIME types and byte limits in `src/modules/students/documents/student-document.policy.ts` per research.md R-009
- [X] T022 [P] Implement `StudentCodeService` allocating `{academicYear}-{branchCode}-{sequence}` atomically from `StudentCodeCounter` in `src/modules/students/students/student-code.service.ts` per research.md R-002
- [X] T023 [P] Implement `StudentPolicy` covering branch scoping, the distinct out-of-scope refusal, archived-read-only and the protected-field set in `src/modules/students/students/student.policy.ts`
- [X] T024 [P] Define the domain event payloads in `src/modules/students/events/students.events.ts`
- [X] T025 Implement the timeline appender allocating `sequence` from `Student.timelineSequence` inside the caller's transaction in `src/modules/students/timeline/student-timeline.service.ts`
- [X] T026 Implement the lookups service assembling branches, departments, grades, qualifications, employees, offerings, batches, statuses, document types, identity rules, image policy, currency and precision in `src/modules/students/lookups/students-lookups.service.ts`
- [X] T027 Implement `GET /students/lookups` with its permission guard and Swagger response in `src/modules/students/lookups/students-lookups.controller.ts`

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - Convert an Approved Admission into a Student (Priority: P1) 🎯 MVP

**Goal**: An approved, enrollment-ready admission becomes exactly one student with an allocated code, a frozen enrollment, copied documents and an initial lifecycle entry — and never a second one on retry.

**Independent Test**: Hand off approved admissions of each offering kind, retry the identical handoff, and verify one student per approval snapshot with a unique code, active status, frozen enrollment, copied documents, protected admission data and the initial lifecycle entry.

### Tests for User Story 1

- [ ] T028 [P] [US1] End-to-end intake test covering creation, idempotent retry, refusals and batch rule in `test/students/students-intake.e2e-spec.ts`
- [X] T029 [P] [US1] Contract test asserting `POST /api/v1/students` and `DELETE /api/v1/students/:studentId` return 404 in `test/students/students-forbidden-surface.e2e-spec.ts`

### Implementation for User Story 1

- [X] T030 [US1] Create the `EnrollmentIntakeInput` DTO with `class-validator` rules in `src/modules/students/intake/dto/student-intake.dto.ts`
- [X] T031 [US1] Implement the idempotency lookup and insert against `StudentIntakeKey` keyed on `approvalSnapshotId` in `src/modules/students/intake/student-intake.repository.ts` per research.md R-010
- [X] T032 [US1] Implement the intake service core — read readiness through `ADMISSIONS_ENROLLMENT_PORT`, refuse `admission-not-ready` and `admission-version-stale`, allocate the student code, create the student at version 1 — in `src/modules/students/intake/student-intake.service.ts`
- [X] T033 [US1] Create the enrollment inside the intake transaction with pinned versions and frozen offering/batch labels and codes, enforcing the program-requires-batch rule, in `src/modules/students/intake/student-intake.service.ts`
- [X] T034 [US1] Copy admission documents through `ADMISSIONS_DOCUMENT_READ_PORT`, mapping requirement keys to student type keys, skipping unmapped keys, reusing `storageFileId`, in `src/modules/students/intake/student-intake.service.ts` per research.md R-001
- [X] T035 [US1] Append the initial `StudentStatusChange` with `fromStatus: null` and the system actor in `src/modules/students/intake/student-intake.service.ts`
- [X] T036 [US1] Append the `student-created`, `admission-converted`, `enrollment-added` and per-document timeline events within the same transaction in `src/modules/students/intake/student-intake.service.ts`
- [X] T037 [US1] Implement `POST /students/intake` with the `students.intake` guard and a 201 `StudentDetail` response in `src/modules/students/intake/student-intake.controller.ts`
- [X] T038 [US1] Call `acknowledgeEnrollment` on `ADMISSIONS_ENROLLMENT_PORT` after the student transaction commits, so a failure there never orphans a student, in `src/modules/students/intake/student-intake.service.ts`
- [X] T039 [US1] Emit `student.created` and `student.admission-converted` through `DomainEventBus` after commit in `src/modules/students/intake/student-intake.service.ts`

**Checkpoint**: Students can be created from approved admissions and the forbidden surface is proven absent — MVP is demoable

---

## Phase 4: User Story 2 - Find, Open, and Export Student Records (Priority: P2)

**Goal**: Authorized employees search, filter, sort and page students inside their branch scope, open a full detail record, and export results — with no sensitive data in list views.

**Independent Test**: Seed a large population across branches, departments, offerings, batches, statuses and employees, exercise every documented query, inspect redaction and detail completeness, verify out-of-scope refusal, and export an authorized set.

### Tests for User Story 2

- [ ] T040 [P] [US2] End-to-end list test covering redaction, folding, scoping, over-range paging and page-size clamping in `test/students/students-list.e2e-spec.ts`

### Implementation for User Story 2

- [X] T041 [US2] Create the list query DTO extending `PageQueryDto` with search, six filter arrays, `sortBy` and `sortOrder` in `src/modules/students/students/dto/list-students.dto.ts`
- [X] T042 [US2] Implement the paginated list query applying branch scope, filters, sorting, the 100 page-size cap and archived exclusion unless explicitly requested in `src/modules/students/students/student.repository.ts`
- [X] T043 [US2] Maintain the indexed folded `searchName` column on every write and fold search terms identically at query time in `src/modules/students/students/student.repository.ts` per research.md R-008
- [X] T044 [US2] Produce the list row projection with `phoneHint` masked to the last four digits and no national id, address, document, note, timeline or finance data in `src/modules/students/mappers/student.mapper.ts`
- [X] T045 [US2] Compute `enrollmentCount` and the primary offering and batch labels server-side in `src/modules/students/students/student.service.ts`
- [X] T046 [US2] Assemble the detail response with enrollments, status history, `availableStatusActions` and the fully populated 15-flag permissions object via `RecordPermissionsHelper` in `src/modules/students/students/student.service.ts`
- [X] T047 [US2] Compute `documentCompletion` (`requiredTypes`, `present`, `missing`, `archived`) from the published type policy in `src/modules/students/documents/student-document.service.ts`
- [X] T048 [US2] Implement CSV export applying the caller's query, scope, permission and redaction rules, responding `text/csv; charset=utf-8` with a BOM, in `src/modules/students/students/student-export.service.ts`
- [X] T049 [US2] Implement `GET /students`, `GET /students/:studentId` and `GET /students/export` with their permission guards and Swagger shapes in `src/modules/students/students/student.controller.ts`
- [X] T050 [US2] Implement `GET /students/:studentId/enrollments` as a bounded closed set in `src/modules/students/students/student.controller.ts`

**Checkpoint**: Students are discoverable and openable, with redaction and scoping enforced

---

## Phase 5: User Story 3 - Maintain the Student Profile (Priority: P3)

**Goal**: Authorized employees correct contact, personal, guardian and assignment data, while service-owned and admission-carried values stay immutable and concurrent editors cannot silently overwrite each other.

**Independent Test**: Update every editable field with valid and invalid values, submit stale versions, attempt each protected field, and attempt an update on an archived student.

### Tests for User Story 3

- [ ] T051 [P] [US3] End-to-end profile test covering validation, label resolution, protected fields, version conflict and archived-read-only in `test/students/students-profile.e2e-spec.ts`

### Implementation for User Story 3

- [X] T052 [US3] Create the profile update DTO with `class-validator` rules for identity and assignment, including `guardianName`, in `src/modules/students/students/dto/update-student-profile.dto.ts`
- [X] T053 [US3] Enforce the identity policy on update — conditional guardian phone for minors, conditional alternative identity reason, graduation year bounds — in `src/modules/students/students/student.service.ts`
- [X] T054 [US3] Re-resolve every display label from its identifier through the organization and employee ports and ignore submitted label values in `src/modules/students/students/student.service.ts` per research.md R-011
- [X] T055 [US3] Reject changes to student code, status, all five system fields, status history, archival and audit fields in `src/modules/students/students/student.policy.ts`
- [X] T056 [US3] Refuse profile, document and note mutations on an archived student with `archived-read-only` in `src/modules/students/students/student.policy.ts`
- [X] T057 [US3] Enforce `expectedVersion` and raise `version-conflict` carrying `currentVersion` as a first-class field in `src/modules/students/students/student.service.ts`
- [X] T058 [US3] Append the `profile-updated` timeline event and emit `student.profile-updated` and `student.guardian-updated` after commit in `src/modules/students/students/student.service.ts`
- [X] T059 [US3] Implement `PATCH /students/:studentId`, accepting `identity.profileImageUrl` as a reference produced by the shared upload endpoint, in `src/modules/students/students/student.controller.ts`

**Checkpoint**: Profiles are maintainable with full protection of server-owned data

---

## Phase 6: User Story 4 - Own and Maintain Student Documents (Priority: P4)

**Goal**: Students own their documents after intake — upload, replace and archive against the published types with append-only versions and server-computed completion, independent of the admission.

**Independent Test**: Upload each published type, exercise every rejection path, replace and archive, repeat an upload with the same attempt identifier, and verify ordering, history, completion and independence from admission documents.

### Tests for User Story 4

- [ ] T060 [P] [US4] End-to-end document test covering upload, idempotent retry, replace, archive, every file failure and ordering in `test/students/students-documents.e2e-spec.ts`

### Implementation for User Story 4

- [X] T061 [US4] Create the upload, replace and archive DTOs including `typeKey`, `uploadAttemptId` and `expectedVersion` in `src/modules/students/documents/dto/student-document.dto.ts`
- [X] T062 [US4] Implement the document repository with append-only version writes and current-version pointer updates in `src/modules/students/documents/student-document.repository.ts`
- [X] T063 [US4] Implement upload through `STORAGE_SERVICE`, re-validating MIME type and byte size against the published per-type limits regardless of client checks, in `src/modules/students/documents/student-document.service.ts`
- [X] T064 [US4] Resolve a repeated `uploadAttemptId` to the stored version instead of creating a duplicate in `src/modules/students/documents/student-document.service.ts`
- [X] T065 [US4] Implement replace, appending a new current version while every earlier version stays retrievable, in `src/modules/students/documents/student-document.service.ts`
- [X] T066 [US4] Implement archive, setting state and optional reason, retaining versions and refusing further modification with `document-archived`, in `src/modules/students/documents/student-document.service.ts`
- [X] T067 [US4] Distinguish `file-unreadable` (zero-byte), `unsupported-file-type` and `file-too-large`, leaving no usable current version after a failure, in `src/modules/students/documents/student-document.service.ts`
- [X] T068 [US4] Order document listings required-types-first then alphabetically by Arabic label in `src/modules/students/mappers/student.mapper.ts`
- [X] T069 [US4] Allow several concurrent documents for `additional-attachment` while every other type versions in place in `src/modules/students/documents/student-document.service.ts`
- [X] T070 [US4] Implement `GET /students/:studentId/documents` and `GET /students/:studentId/documents/:documentId/versions` in `src/modules/students/documents/student-document.controller.ts`
- [X] T071 [US4] Implement the upload, replace and archive routes with `students.documents.manage`, appending timeline events and emitting document domain events, in `src/modules/students/documents/student-document.controller.ts`

**Checkpoint**: Documents are student-owned, versioned and independent of Admissions

---

## Phase 7: User Story 5 - Govern the Student Lifecycle (Priority: P5)

**Goal**: Status moves only along the permitted transition table, with the right permission and reason, individually or in bulk, and every transition permanently recorded.

**Independent Test**: Attempt every permitted and forbidden status pair with and without reasons and permissions, exercise correction out of terminal statuses and reactivation from archived, and submit a bulk change mixing valid and invalid items.

### Tests for User Story 5

- [X] T072 [P] [US5] Unit test walking the complete transition matrix including every forbidden pair in `test/students/student-lifecycle.policy.spec.ts`
- [ ] T073 [P] [US5] End-to-end lifecycle test covering permissions, reasons, correction, reactivation and bulk partial success in `test/students/students-lifecycle.e2e-spec.ts`

### Implementation for User Story 5

- [X] T074 [US5] Create the status change and bulk status DTOs in `src/modules/students/lifecycle/dto/student-status.dto.ts`
- [X] T075 [US5] Implement the status service resolving each transition through `StudentLifecyclePolicy` and enforcing its specific permission in `src/modules/students/lifecycle/student-status.service.ts`
- [X] T076 [US5] Enforce the reason requirement per transition and the 500-character maximum, raising `reason-required` in `src/modules/students/lifecycle/student-status.service.ts`
- [X] T077 [US5] Refuse any pair absent from the table with `invalid-status-transition` carrying `fromStatus`, `toStatus` and `allowed[]` in `src/modules/students/lifecycle/student-status.service.ts`
- [X] T078 [US5] Append the immutable `StudentStatusChange` with source and result versions, set archival fields on archive, and bump `Student.version` in `src/modules/students/lifecycle/student-status.service.ts`
- [X] T079 [US5] Compute `availableStatusActions` from the current status intersected with the caller's permissions in `src/modules/students/lifecycle/student-status.service.ts`
- [X] T080 [US5] Implement bulk status returning one outcome row per requested student with its refusal code, never rolling back applied items, in `src/modules/students/lifecycle/student-status.service.ts`
- [X] T081 [US5] Implement `PATCH /students/:studentId/status` and `POST /students/bulk-status`, appending timeline events and emitting `student.status-changed` and `student.archived`, in `src/modules/students/lifecycle/student-status.controller.ts`

**Checkpoint**: Lifecycle is enforced and fully auditable

---

## Phase 8: User Story 6 - Record Notes and Review Student History (Priority: P6)

**Goal**: Internal notes plus the timeline, lifecycle history, financial position and the compact context other modules consume.

**Independent Test**: Create, edit and archive notes including empty content, page the timeline across identical timestamps, filter by category, and read the financial summary in each of its three states.

### Tests for User Story 6

- [ ] T082 [P] [US6] End-to-end notes test covering creation, edit, whitespace refusal, archive, inactive author and unchanged student version in `test/students/students-notes.e2e-spec.ts`
- [ ] T083 [P] [US6] End-to-end timeline and summaries test covering cursor paging across identical timestamps, category filtering and all three financial states in `test/students/students-timeline.e2e-spec.ts`

### Implementation for User Story 6

- [X] T084 [US6] Create the note create and edit DTOs with trimmed content bounded 1…2000 in `src/modules/students/notes/dto/student-note.dto.ts`
- [X] T085 [US6] Implement the note repository preserving author identity and archival in `src/modules/students/notes/student-note.repository.ts`
- [X] T086 [US6] Implement note create and edit without an `expectedVersion` and without bumping `Student.version` in `src/modules/students/notes/student-note.service.ts`
- [X] T087 [US6] Refuse whitespace-only content with `note-content-empty` in `src/modules/students/notes/student-note.service.ts`
- [X] T088 [US6] Implement note archival retaining history with no permanent deletion in `src/modules/students/notes/student-note.service.ts`
- [X] T089 [US6] Resolve every `ActorRef` `active` flag at read time so deactivated authors keep their name in `src/modules/students/mappers/student.mapper.ts`
- [X] T090 [US6] Implement the note create, edit, archive and list routes with `students.notes.*` guards in `src/modules/students/notes/student-note.controller.ts`
- [X] T091 [US6] Implement the cursor-paginated timeline query ordered by `(occurredAt DESC, sequence DESC)` with limit+1 next-page detection in `src/modules/students/timeline/student-timeline.repository.ts`
- [X] T092 [US6] Implement opaque base64 cursor encoding and decoding of `{seq}` in `src/modules/students/timeline/student-timeline.service.ts` per research.md R-005
- [X] T093 [US6] Implement `GET /students/:studentId/timeline` with category filtering and `GET /students/:studentId/status-history` in `src/modules/students/timeline/student-timeline.controller.ts`
- [X] T094 [US6] Implement the financial summary returning the three-state union — resolving `forbidden` from permissions before consulting the port, never substituting zeros, always HTTP 200 — in `src/modules/students/summaries/student-summary.controller.ts`
- [X] T095 [US6] Implement the context summary service and the `STUDENTS_CONTEXT_PORT` implementation carrying no note content, document files, address or national identity in `src/modules/students/summaries/student-context.service.ts`

**Checkpoint**: All six user stories are independently functional

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T096 [P] Complete Swagger decorators documenting real success and error shapes, including status and error codes, across every controller in `src/modules/students/`
- [X] T097 Verify all 22 endpoints against `docs/api-data-requirements.html` §4.6 — path, method, request shape, response shape and error codes (constitution gate 1)
- [X] T098 Apply the two authorized amendments to `docs/api-data-requirements.html` §4.6 — add the guardian name field to the profile field-rules table, detail example and update payload, and correct the student-code example values to the `2027-CAI-00001` format
- [ ] T099 [P] Add development seed data producing students across branches, statuses and offering kinds in `prisma/seeds/students.ts`
- [X] T100 Confirm a domain event is emitted after commit for every create, transition, profile change, document change, note change and archival across `src/modules/students/`
- [X] T101 [P] Add unit tests for the identity policy boundary cases — minor age threshold, graduation year bounds, national id versus alternative reason — in `test/students/student-identity.policy.spec.ts`
- [X] T102 Audit that every endpoint carries a permission guard and that branch scoping returns the distinct `out-of-scope` refusal across `src/modules/students/`
- [X] T103 Run `npm run build` and confirm `strict` passes with no new `any`, using `unknown` plus narrowing guards wherever `fileDescriptor` JSON is read
- [X] T104 Run `npm run lint` and remove duplication, keeping business rules in one owning service (constitution XVIII)
- [ ] T105 Execute every scenario in [quickstart.md](./quickstart.md) and confirm the documented outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **User Stories (Phases 3–8)**: All depend on Foundational; then parallelizable or sequential by priority
- **Polish (Phase 9)**: Depends on all desired stories

### Critical path inside Foundational

T007→T008→T009→T010→T011 are all edits to `prisma/schema.prisma`, so they are strictly sequential. T012→T013→T014 are the Admissions-side port and are the single hard external dependency: **US1 cannot start until T014 lands**. Everything from T015 to T024 is parallelizable once the migration exists.

### User Story Dependencies

- **US1 (P1)**: After Foundational. Requires T012–T014 in module 007. No dependency on other stories.
- **US2 (P2)**: After Foundational. Independently testable against seeded students, so it does not require US1.
- **US3 (P3)**: After Foundational. Reuses T046's detail assembly but is independently testable.
- **US4 (P4)**: After Foundational. Uploading is independent of intake's document copy; both write the same models.
- **US5 (P5)**: After Foundational. Fully independent.
- **US6 (P6)**: After Foundational. Timeline reads become richer once other stories write events, but pages correctly with intake events alone.

### Within Each User Story

- Tests written first and failing before implementation
- DTOs before repositories, repositories before services, services before controllers — never the reverse (constitution V)
- Timeline and event emission last within a story, after the write path is correct

### Parallel Opportunities

- T001–T004 (Setup) run together
- T015–T024 (Foundational ports and policies) run together — ten distinct files
- Every story's test tasks run together
- With six developers, all six story phases run concurrently after Phase 2

---

## Parallel Example: Foundational policies

```bash
Task: "Implement StudentIdentityPolicy in src/modules/students/students/student-identity.policy.ts"
Task: "Implement StudentLifecyclePolicy in src/modules/students/lifecycle/student-lifecycle.policy.ts"
Task: "Implement StudentDocumentPolicy in src/modules/students/documents/student-document.policy.ts"
Task: "Implement StudentCodeService in src/modules/students/students/student-code.service.ts"
Task: "Implement StudentPolicy in src/modules/students/students/student.policy.ts"
```

## Parallel Example: User Story 1

```bash
Task: "End-to-end intake test in test/students/students-intake.e2e-spec.ts"
Task: "Contract test for the forbidden surface in test/students/students-forbidden-surface.e2e-spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup
2. Phase 2 Foundational — including the Admissions port T012–T014
3. Phase 3 User Story 1
4. **STOP and VALIDATE**: run `test/students/students-intake.e2e-spec.ts` and quickstart scenarios 1 and 2
5. Demo: an approved admission becomes a student, retries are safe, and the forbidden surface is proven absent

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. + US1 → intake works (**MVP**)
3. + US2 → students are discoverable and exportable
4. + US3 → profiles are maintainable
5. + US4 → documents are managed
6. + US5 → lifecycle is enforced
7. + US6 → notes, timeline and the cross-module context surface
8. Polish → Swagger, doc amendments, audits, quickstart

### Notes

- `[P]` means different files with no incomplete dependency
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Do not add a stored eligibility field or a parent-national-id column — both were explicitly decided against; see the locked decisions at the top of this file
