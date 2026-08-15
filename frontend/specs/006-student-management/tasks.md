---

description: "Task list for Student Management implementation"
---

# Tasks: Student Management

**Input**: Design documents from `/specs/006-student-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/student-management-contracts.md](./contracts/student-management-contracts.md), [quickstart.md](./quickstart.md)

**Validation**: Every phase includes typecheck, lint, business-rule, RTL, responsive, and accessibility validation as required by the constitution. Automated tests are included because [plan.md](./plan.md#testing-strategy) defines an explicit unit/contract/integration/e2e strategy and the spec's acceptance scenarios cannot otherwise be proven.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and demonstrated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: Which user story the task belongs to (US1–US9)
- Every task names its exact file path

## Path Conventions

Academy ERP web app in an npm/Turborepo workspace:

- Feature module: `apps/web/src/features/students/`
- Routes: `apps/web/src/app/(workspace)/students/`
- Shared app components: `apps/web/src/shared/components/`
- Tests: `apps/web/tests/{unit,integration,contract}/students/`
- End-to-end: `apps/web/playwright/{journeys,accessibility,helpers}/`

## Delivery Task Mapping

How the six requested delivery tasks map onto the story-organized phases below:

| Requested delivery task | Phases |
| --- | --- |
| Task 1 — Build Student Management | Phase 3 (US1 intake + mock services), Phase 4 (US2 list/search/filter/pagination), Phase 7 (US5 status, activate, archive) |
| Task 2 — Build the Student Workspace | Phase 5 (US3 overview, personal, academic, enrollments), Phase 6 (US4 maintain information) |
| Task 3 — Build Documents & Notes | Phase 8 (US6 documents), Phase 9 (US7 notes + attachments viewer) |
| Task 4 — Build Timeline & Financial Summary | Phase 10 (US8 timeline), Phase 11 (US9 financial summary) |
| Task 5 — Build Frontend Integration | Phase 1 (setup, routing, navigation) and Phase 2 (types, schemas, mock services, shared components, states) |
| Task 6 — Validation & Finalization | Phase 12 (RTL, responsive, accessibility, type safety, consistency, cleanup) |

> ⚠️ **Scope note on notes**: the delivery request lists "Edit note" and "Delete note", which spec FR-020/FR-021 do not currently cover. These are included in Phase 9 as tasks T126–T128, implemented as a non-destructive revision plus archive (never a permanent delete) so they stay consistent with FR-040 audit readiness. T129 amends the spec to match. Confirm this reading before implementing Phase 9, or drop T126–T128 to stay strictly within the approved spec.

---

## Phase 1: Setup (Student Module Skeleton)

**Purpose**: Establish the module boundary, route skeleton, copy, permissions, and navigation contribution.

- [X] T001 Create the Students feature directories (`components/`, `config/`, `data/`, `forms/`, `hooks/`, `schemas/`, `screens/`, `services/`, `types/`, `utils/`) and the public barrel boundary in `apps/web/src/features/students/index.ts`
- [X] T002 [P] Create the Students route segment skeleton and Server Component route notes in `apps/web/src/app/(workspace)/students/README.md`
- [X] T003 [P] Define centralized Arabic interface copy plus stable status, area, and action keys in `apps/web/src/features/students/config/students-copy.ts`
- [X] T004 [P] Define the fifteen Students permission keys and area/action mappings from the contracts in `apps/web/src/features/students/config/students-permissions.ts`
- [X] T005 [P] Define the permission-aware Students navigation contribution in `apps/web/src/features/students/config/navigation.ts`
- [X] T006 Register the Students navigation entry and a `students` icon through `apps/web/src/shared/config/foundation-navigation.ts` and `apps/web/src/shared/config/icon-registry.ts`
- [X] T007 [P] Add Students permission keys, authorized branches, and organization-wide capability to the mock employee context in `apps/web/src/features/auth/data/auth-fixtures.ts`
- [X] T008 [P] Create story validation evidence placeholders in `specs/006-student-management/validation/foundation.md`

**Checkpoint**: The module boundary, navigation entry, permissions, and Arabic copy exist and typecheck.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Typed domain, pure policies, authoritative schemas, deterministic mock services, cache keys, and the two promoted shared components.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Types and contracts

- [X] T009 Define branded identifiers, `Money`, `ActorRef`, `LookupOption`, `AuditContext`, `Paginated`, `Cursor`, `StudentStatus`, `OfferingKind`, and `DocumentState` in `apps/web/src/features/students/types/common.ts`
- [X] T010 Define `Student`, `StudentIdentity`, `StudentAssignment`, `StudentSystemInfo`, `StudentEnrollment`, `StudentDocument`, `StudentDocumentVersion`, `StudentDocumentType`, `StudentNote`, `StudentTimelineEvent`, `StudentStatusChange`, and `StudentFinancialSummary` per [data-model.md](./data-model.md#entities) in `apps/web/src/features/students/types/domain.ts`
- [X] T011 Define `StudentSummary`, `StudentDetail`, `StudentContextSummary`, `StudentRef`, `StudentAreaPermissions`, and `EnrollmentIntakeInput` projections in `apps/web/src/features/students/types/projections.ts`
- [X] T012 Define `StudentListQuery`, `StudentTimelineQuery`, and every intent-specific command (`UpdateProfileCommand`, `ChangeStatusCommand`, `BulkChangeStatusCommand`, `UploadDocumentCommand`, `ReplaceDocumentCommand`, `ArchiveDocumentCommand`, `AddNoteCommand`, `EnrollFromAdmissionCommand`) with `expectedVersion` where required in `apps/web/src/features/students/types/commands.ts`
- [X] T013 [P] Define the `StudentsError` type and every `StudentsErrorCode` variant from the contracts, with no generic fallback code, in `apps/web/src/features/students/services/students-error.ts`

### Dependency ports

- [X] T014 [P] Define the Student-owned `AdmissionEnrollmentReader`, `OrganizationDirectoryReader`, `AcademicOfferingReader`, `BatchDirectoryReader`, and `StudentFinanceReader` ports in `apps/web/src/features/students/services/students-dependency-readers.ts`
- [X] T015 Implement adapters over the public `features/admissions`, `features/organization-settings`, `features/academic-catalog`, and `features/program-batches` exports, importing no feature internals, in `apps/web/src/features/students/services/students-dependency-adapters.ts`
- [X] T016 [P] Implement the default `StudentFinanceReader` returning `{ state: "unavailable", reason: "finance-module-absent" }` plus a deterministic populated mock adapter in `apps/web/src/features/students/services/mock-student-finance-reader.ts`

### Pure policies

- [X] T017 [P] Implement the `studentTransitionPolicy` table with per-transition permission and reason requirements per [data-model.md](./data-model.md#state-transitions) in `apps/web/src/features/students/utils/student-lifecycle.ts`
- [X] T018 [P] Implement the program⇔batch enrollment invariant and enrollment display rules in `apps/web/src/features/students/utils/enrollment-rules.ts`
- [X] T019 [P] Implement identifier/phone normalization, minor-age and guardian rules, and graduation-year plausibility in `apps/web/src/features/students/utils/student-identity-rules.ts`
- [X] T020 [P] Implement document type applicability, version selection, archive state, and `uploadAttemptId` retry resolution in `apps/web/src/features/students/utils/student-documents.ts`
- [X] T021 [P] Implement timeline merge, `(occurredAt, sequence)` ordering, and cursor encode/decode in `apps/web/src/features/students/utils/student-timeline.ts`
- [X] T022 [P] Implement list-query normalization (Arabic variant and digit folding, whitespace collapse, filter dedupe, page clamping, stable serialization) in `apps/web/src/features/students/utils/student-list-query.ts`
- [X] T023 [P] Implement organization/branch scope intersection, permission checks, and list-projection redaction in `apps/web/src/features/students/utils/students-scope.ts`
- [X] T024 [P] Implement decimal-string money formatting and configured-precision arithmetic in `apps/web/src/features/students/utils/student-money.ts`
- [X] T025 [P] Implement the intake idempotency key derived from `approvalSnapshotId` and the student-code allocation pattern in `apps/web/src/features/students/utils/student-intake-rules.ts`

### Authoritative schemas

- [X] T026 [P] Implement the authoritative profile Zod schema covering every rule in the [validation table](./data-model.md#studentidentity), including the conditional guardian-phone and alternative-identity rules, in `apps/web/src/features/students/schemas/student-profile-schema.ts`
- [X] T027 [P] Implement the document upload/replace Zod schema for configured mime types and size limits in `apps/web/src/features/students/schemas/student-document-schema.ts`
- [X] T028 [P] Implement the note content Zod schema (trimmed, 1–2000 chars, non-empty) in `apps/web/src/features/students/schemas/student-note-schema.ts`
- [X] T029 [P] Implement the status-change Zod schema enforcing reason-required transitions in `apps/web/src/features/students/schemas/student-status-schema.ts`

### Mock service layer

- [X] T030 Define the `StudentsService` interface with every read and command from the [contracts](./contracts/student-management-contracts.md#students-service-facade), and **no create-by-hand or delete operation**, in `apps/web/src/features/students/services/students-service.ts`
- [X] T031 [P] Create deterministic student fixtures covering all five statuses, all three offering kinds, students with zero and multiple enrollments, minors, students without a national identifier, and all document states in `apps/web/src/features/students/data/students-fixtures.ts`
- [X] T032 [P] Create configurable lookup fixtures (branches, departments, grades, qualifications, employees, statuses, document types, identity rules, image policy, currency, precision) in `apps/web/src/features/students/data/students-lookups.ts`
- [X] T033 [P] Create the 20,000-record deterministic scale generator in `apps/web/src/features/students/data/students-scale-fixtures.ts`
- [X] T034 Implement the asynchronous mock adapter with scope enforcement, permission checks, optimistic version conflicts, immutable history append, and cloned projections in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T035 [P] Implement the scenario controller for latency, failure, permission, branch-scope, conflict, and finance-availability modes in `apps/web/src/features/students/services/mock-scenario-controller.ts`
- [X] T036 [P] Implement scope-fingerprinted, per-area normalized query keys and the invalidation map in `apps/web/src/features/students/services/students-query-keys.ts`

### Shared components and states

- [X] T037 Create the shared route-segment `TabNavigation` component with `tablist`/`tab` link semantics, roving tabindex, and RTL-correct arrow/Home/End keys in `apps/web/src/shared/components/layout/tab-navigation.tsx`
- [X] T038 Create the shared presentational `Timeline` component with ordered-list semantics, non-color status encoding, logical-property RTL mirroring, and a load-more affordance in `apps/web/src/shared/components/data-display/timeline.tsx`
- [X] T039 [P] Define per-area loading, empty, retryable-error, unavailable, and forbidden state components over the existing shared states in `apps/web/src/features/students/components/student-area-states.tsx`
- [X] T040 Verify state ownership boundaries — TanStack Query for all async state, the existing employee-context store for scope, no new Zustand store, RHF for form state — and record the verification in `specs/006-student-management/validation/architecture.md`

**Checkpoint**: The module has typed boundaries, pure policies, authoritative schemas, deterministic mock storage, safe errors, cache keys, and both shared components.

---

## Phase 3: User Story 1 — Receive Students from Successful Admissions (Priority: P1) 🎯 MVP foundation

**Goal**: A student record exists only as the idempotent result of an approved admission's confirmed enrollment; no manual create or delete path exists anywhere.

**Independent Test**: Submit an approved admission through the intake port and confirm exactly one student with a unique code appears; resubmit it and confirm no duplicate; submit a non-approved admission and confirm refusal; confirm no create or delete affordance exists in the module.

### Tests for User Story 1

- [X] T041 [P] [US1] Contract test asserting `StudentsService` exposes no create-by-hand and no delete operation in `apps/web/tests/contract/students/students-service-surface.test.ts`
- [X] T042 [P] [US1] Contract test for intake refusal on non-approved, not-ready, and stale-version admissions in `apps/web/tests/contract/students/student-intake-refusal.test.ts`
- [X] T043 [P] [US1] Contract test for intake idempotency on repeated and concurrent submission of the same `approvalSnapshotId` in `apps/web/tests/contract/students/student-intake-idempotency.test.ts`
- [X] T044 [P] [US1] Contract test for student-code uniqueness and `duplicate-student-code` under concurrent intake in `apps/web/tests/contract/students/student-code-uniqueness.test.ts`
- [X] T045 [P] [US1] Unit test for the intake idempotency key and code-allocation pattern in `apps/web/tests/unit/students/student-intake-rules.test.ts`

### Implementation for User Story 1

- [X] T046 [US1] Implement `EnrollmentIntakeInput` mapping from the Admissions `EnrollmentReadinessSummary` projection in `apps/web/src/features/students/services/student-intake-mapper.ts`
- [X] T047 [US1] Implement `studentIntakePort.enrollFromAdmission` with permission check, readiness validation, idempotent reservation, and typed refusals in `apps/web/src/features/students/services/student-intake-port.ts`
- [X] T048 [US1] Implement atomic first-success materialization — code allocation, `Student` with `active` status, first `StudentEnrollment` enforcing the batch invariant, seeded `missing` document records, initial `StudentStatusChange` with `fromStatus = null` — in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T049 [US1] Persist the `admission-submitted`, `admission-approved`, `student-created`, and `enrollment-added` timeline events at intake in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T050 [US1] Implement appending a new enrollment to an existing student when a different approved admission resolves to the same applicant in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T051 [US1] Export `studentIntakePort`, `StudentRef`, and the consumer-safe types through the public barrel in `apps/web/src/features/students/index.ts`
- [X] T052 [US1] Verify no create route, create button, or delete affordance exists across `apps/web/src/app/(workspace)/students/` and `apps/web/src/features/students/components/`
- [X] T053 [US1] Record intake evidence — idempotency, refusals, uniqueness, no-create/no-delete — in `specs/006-student-management/validation/us1-intake.md`

**Checkpoint**: Students originate only from approved admissions, intake is idempotent, and the module offers no manual create or delete.

---

## Phase 4: User Story 2 — Find Students Across the Organization (Priority: P1) 🎯 MVP

**Goal**: Authorized employees locate students through search, combined filters, sorting, and pagination, scoped to their organization, branches, and role.

**Independent Test**: Search every supported field, combine every filter, sort and page through the 20,000-record fixture, then repeat under a branch-scoped employee and confirm out-of-scope students are unreachable by list and by direct URL.

### Tests for User Story 2

- [X] T054 [P] [US2] Unit test for list-query normalization, Arabic variant folding, filter dedupe, and page clamping in `apps/web/tests/unit/students/student-list-query.test.ts`
- [X] T055 [P] [US2] Unit test for branch-scope intersection and list redaction in `apps/web/tests/unit/students/students-scope.test.ts`
- [X] T056 [P] [US2] Contract test for scoped list, export permission, and out-of-scope direct access in `apps/web/tests/contract/students/students-list-scope.test.ts`
- [X] T057 [P] [US2] Integration test for search, combined filters, sorting, pagination reset, and empty state in `apps/web/tests/integration/students/students-list.test.tsx`

### Implementation for User Story 2

- [X] T058 [P] [US2] Implement the `StudentSummary` list projection excluding national identifier, address, documents, notes, and finance in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T059 [US2] Implement service-side search, filtering, sorting, and pagination over the scale fixture in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T060 [P] [US2] Implement the `useStudentsList` TanStack Query hook with normalized keys, cancellation, and placeholder-data paging in `apps/web/src/features/students/hooks/use-students-list.ts`
- [X] T061 [P] [US2] Implement memoized student table columns with status badge and RTL-isolated code, phone, and date cells in `apps/web/src/features/students/components/student-columns.tsx`
- [X] T062 [US2] Implement the students toolbar with the shared search bar and filter bar for branch, department, product, batch, status, and customer service employee in `apps/web/src/features/students/components/students-toolbar.tsx`
- [X] T063 [US2] Implement the students list screen over the shared data table with row selection and export in `apps/web/src/features/students/screens/students-screen.tsx`
- [X] T064 [US2] Add loading, empty-with-clear-filters, retryable error, and forbidden states to the list screen in `apps/web/src/features/students/screens/students-screen.tsx`
- [X] T065 [US2] Add the list route with metadata and breadcrumbs in `apps/web/src/app/(workspace)/students/page.tsx`
- [X] T066 [P] [US2] Add route-level boundaries in `apps/web/src/app/(workspace)/students/loading.tsx` and `apps/web/src/app/(workspace)/students/error.tsx`
- [X] T067 [US2] Measure and record 20,000-record search/filter/sort/page timings against SC-004 in `specs/006-student-management/validation/performance.md`

**Checkpoint**: Students are discoverable at scale under exact permission and branch scope. Combined with Phase 3, this is the minimum demoable increment.

---

## Phase 5: User Story 3 — Open the Student Workspace (Priority: P1)

**Goal**: A single student presents personal, academic, system, enrollment, document, note, timeline, and financial context, with every area owning its own state independently.

**Independent Test**: Open students with populated and empty related data, force one area to fail, and remove one area's permission — confirm the remaining areas stay usable throughout.

### Tests for User Story 3

- [X] T068 [P] [US3] Unit test for the program⇔batch enrollment invariant and archived-offering label retention in `apps/web/tests/unit/students/enrollment-rules.test.ts`
- [X] T069 [P] [US3] Contract test for `StudentDetail` composition, area permissions, and enrollment read-only surface in `apps/web/tests/contract/students/student-detail.test.ts`
- [X] T070 [P] [US3] Integration test for per-area independence — one area failing or forbidden while others succeed — in `apps/web/tests/integration/students/student-workspace-areas.test.tsx`
- [X] T071 [P] [US3] Integration test for tab navigation, active state, and RTL keyboard traversal in `apps/web/tests/integration/students/student-tab-navigation.test.tsx`

### Implementation for User Story 3

- [X] T072 [US3] Implement the `get(studentId)` read returning `StudentDetail` with document completion, available status actions, and area permissions in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T073 [P] [US3] Implement the `useStudentDetail` and `useStudentEnrollments` hooks with independent query keys in `apps/web/src/features/students/hooks/use-student-detail.ts`
- [X] T074 [P] [US3] Implement the workspace header with student summary, status badge, and read-only system information in `apps/web/src/features/students/components/student-workspace-header.tsx`
- [X] T075 [US3] Implement the permission-filtered workspace tab items over the shared `TabNavigation` in `apps/web/src/features/students/components/student-workspace-tabs.tsx`
- [X] T076 [P] [US3] Implement the personal information section (name, phones, national identifier or alternative reason, address, birth date, qualification, graduation year, profile image) in `apps/web/src/features/students/components/student-personal-section.tsx`
- [X] T077 [P] [US3] Implement the academic information section (registration branch, study branch, department, academic grade, customer service employee) in `apps/web/src/features/students/components/student-academic-section.tsx`
- [X] T078 [US3] Implement the read-only enrollment list showing product, batch where applicable, enrollment date, and status, with no create/edit/remove action, in `apps/web/src/features/students/components/student-enrollments-section.tsx`
- [X] T079 [US3] Implement the workspace overview screen composing header, personal, academic, enrollment, and financial sections in `apps/web/src/features/students/screens/student-overview-screen.tsx`
- [X] T080 [US3] Add the workspace layout and overview route with metadata and breadcrumbs in `apps/web/src/app/(workspace)/students/[studentId]/layout.tsx` and `apps/web/src/app/(workspace)/students/[studentId]/page.tsx`
- [X] T081 [US3] Add overview boundaries in `apps/web/src/app/(workspace)/students/[studentId]/loading.tsx` and `apps/web/src/app/(workspace)/students/[studentId]/error.tsx`

**Checkpoint**: The workspace presents the complete student picture with independently resilient areas.

---

## Phase 6: User Story 4 — Maintain Student Information (Priority: P1)

**Goal**: Authorized employees correct maintainable information while protected admission-derived facts stay uneditable and concurrent edits refuse rather than overwrite.

**Independent Test**: Edit every maintainable field with valid and invalid values, confirm protected fields cannot be altered, force a conflict, and confirm input survives a recoverable failure.

### Tests for User Story 4

- [X] T082 [P] [US4] Unit test for identifier/phone normalization, minor guardian rules, and graduation-year plausibility in `apps/web/tests/unit/students/student-identity-rules.test.ts`
- [X] T083 [P] [US4] Unit test for the profile schema including the conditional guardian and alternative-identity rules in `apps/web/tests/unit/students/student-profile-schema.test.ts`
- [X] T084 [P] [US4] Contract test for `updateProfile` permissions, version conflict, and archived read-only refusal in `apps/web/tests/contract/students/student-update-profile.test.ts`
- [X] T085 [P] [US4] Integration test for first-error focus, dirty-state protection, conflict recovery, and input preservation in `apps/web/tests/integration/students/student-editor.test.tsx`

### Implementation for User Story 4

- [X] T086 [US4] Implement `updateProfile` with permission, scope, `expectedVersion`, archived read-only enforcement, and a single `profile-updated` timeline event in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T087 [P] [US4] Implement the `useStudentMutations` hook with targeted invalidation and Sonner progress/success/failure feedback in `apps/web/src/features/students/hooks/use-student-mutations.ts`
- [X] T088 [P] [US4] Implement the personal information form section over shared form fields in `apps/web/src/features/students/forms/student-personal-fields.tsx`
- [X] T089 [P] [US4] Implement the assignment form section with active-and-in-scope lookup options in `apps/web/src/features/students/forms/student-assignment-fields.tsx`
- [X] T090 [P] [US4] Implement the protected system-information display block rendering non-editable code, admission reference, admission date, and enrollment date in `apps/web/src/features/students/forms/student-protected-fields.tsx`
- [X] T091 [US4] Implement the sectioned RHF/Zod editor with error summary, first-error focus, dirty guard, and conflict notice in `apps/web/src/features/students/screens/edit-student-screen.tsx`
- [X] T092 [US4] Add the edit route rendering locked read-only guidance for archived students in `apps/web/src/app/(workspace)/students/[studentId]/edit/page.tsx`
- [X] T093 [US4] Record editing evidence — validation refusals, protected fields, conflict, input preservation — in `specs/006-student-management/validation/us4-profile.md`

**Checkpoint**: Profile maintenance is safe, validated, protected, and conflict-aware.

---

## Phase 7: User Story 5 — Govern the Student Lifecycle (Priority: P1)

**Goal**: Status transitions follow one authoritative policy enforced identically by the service and the UI, with immutable history and non-destructive archival.

**Independent Test**: Attempt every allowed and disallowed transition under permitted and unpermitted contexts, activate an archived student, and confirm failures leave no trace.

### Tests for User Story 5

- [X] T094 [P] [US5] Unit test for transition-table completeness, permission mapping, and reason requirements in `apps/web/tests/unit/students/student-lifecycle.test.ts`
- [X] T095 [P] [US5] Contract test for allowed/refused transitions, missing permissions, and archived-not-deleted retention in `apps/web/tests/contract/students/student-status-change.test.ts`
- [X] T096 [P] [US5] Contract test for per-record bulk status outcomes including mixed applied/refused results in `apps/web/tests/contract/students/student-bulk-status.test.ts`
- [X] T097 [P] [US5] Integration test for status dialogs, reason capture, refusal messaging, and archived read-only enforcement in `apps/web/tests/integration/students/student-lifecycle.test.tsx`

### Implementation for User Story 5

- [X] T098 [US5] Implement `changeStatus` with policy evaluation, permission and reason enforcement, `expectedVersion`, one `StudentStatusChange`, and one `status-changed` timeline event in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T099 [US5] Implement `bulkChangeStatus` evaluating each student independently and returning per-record outcomes in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T100 [P] [US5] Implement the `availableStatusActions` projection derived from the policy and the acting employee's permissions in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T101 [P] [US5] Implement the `useStudentLifecycle` hook with invalidation of detail, list, status history, and timeline in `apps/web/src/features/students/hooks/use-student-lifecycle.ts`
- [X] T102 [US5] Implement the status transition dialog with reason capture, focus management, and refusal explanation in `apps/web/src/features/students/components/student-status-dialog.tsx`
- [X] T103 [P] [US5] Implement the archive and activate actions with confirmation and post-action state refresh in `apps/web/src/features/students/components/student-archive-actions.tsx`
- [X] T104 [P] [US5] Implement the bulk status outcome report distinguishing applied and refused records in `apps/web/src/features/students/components/student-bulk-outcome.tsx`
- [X] T105 [US5] Record lifecycle evidence — allowed and refused transitions, permission refusals, archived retention, no-trace failures — in `specs/006-student-management/validation/us5-lifecycle.md`

**Checkpoint**: All five P1 stories are complete. The module is demonstrable end to end for browsing, viewing, editing, and governing students.

---

## Phase 8: User Story 6 — Manage Student Documents (Priority: P2)

**Goal**: Documents upload, replace with versioning, preview, download, and archive without ever deleting or duplicating on retry.

**Independent Test**: Upload valid and invalid files per type, replace and archive documents, retry an interrupted upload, and confirm archived documents stay retrievable.

### Tests for User Story 6

- [X] T106 [P] [US6] Unit test for document applicability, version selection, archive state, and retry resolution in `apps/web/tests/unit/students/student-documents.test.ts`
- [X] T107 [P] [US6] Contract test for upload/replace/archive permissions, version retention, and the absence of any delete operation in `apps/web/tests/contract/students/student-documents.test.ts`
- [X] T108 [P] [US6] Integration test for file rejection cases, replacement history, and retry-without-duplicate in `apps/web/tests/integration/students/student-documents.test.tsx`

### Implementation for User Story 6

- [X] T109 [US6] Implement `listDocuments`, `uploadDocument`, `replaceDocument`, `archiveDocument`, and `documentHistory` with append-only versions in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T110 [P] [US6] Implement the `useStudentDocuments` hook with upload progress and targeted invalidation in `apps/web/src/features/students/hooks/use-student-documents.ts`
- [X] T111 [P] [US6] Implement the document type card showing present, missing, and archived states in `apps/web/src/features/students/components/student-document-card.tsx`
- [X] T112 [US6] Implement upload and replace over the shared `file-dropzone` with schema-driven format and size refusal in `apps/web/src/features/students/components/student-document-upload.tsx`
- [X] T113 [P] [US6] Implement preview and download over the shared `file-preview` component with per-action permission checks in `apps/web/src/features/students/components/student-document-actions.tsx`
- [X] T114 [P] [US6] Implement the archive-document dialog with reason capture and non-destructive confirmation copy in `apps/web/src/features/students/components/student-document-archive-dialog.tsx`
- [X] T115 [P] [US6] Implement the document version history view in `apps/web/src/features/students/components/student-document-history.tsx`
- [X] T116 [US6] Implement the documents screen composing type groups, actions, and area states in `apps/web/src/features/students/screens/student-documents-screen.tsx`
- [X] T117 [US6] Add the documents route and boundaries in `apps/web/src/app/(workspace)/students/[studentId]/documents/{page,loading,error}.tsx`
- [X] T118 [US6] Record document evidence — rejections, versioning, archive retention, retry safety — in `specs/006-student-management/validation/us6-documents.md`

**Checkpoint**: Documents are fully manageable and non-destructive.

---

## Phase 9: User Story 7 — Record Internal Notes (Priority: P2)

**Goal**: Permission-gated internal notes with preserved authorship and no empty content.

**Independent Test**: Add notes as two employees, confirm ordering and attribution, submit empty content, and confirm an employee without note permission cannot read them.

### Tests for User Story 7

- [X] T119 [P] [US7] Unit test for the note content schema including whitespace-only refusal in `apps/web/tests/unit/students/student-note-schema.test.ts`
- [X] T120 [P] [US7] Contract test for note permission gating, ordering, and preserved authorship for inactive authors in `apps/web/tests/contract/students/student-notes.test.ts`
- [X] T121 [P] [US7] Integration test for note authoring, refusal messaging, and forbidden-area behavior in `apps/web/tests/integration/students/student-notes.test.tsx`

### Implementation for User Story 7

- [X] T122 [US7] Implement `listNotes` and `addNote` with permission gating, newest-first ordering, and exclusion from list projections and the context summary in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T123 [P] [US7] Implement the `useStudentNotes` hook with notes-only invalidation in `apps/web/src/features/students/hooks/use-student-notes.ts`
- [X] T124 [P] [US7] Implement the note composer and note list with author, time, and RTL-safe content rendering in `apps/web/src/features/students/components/student-notes-panel.tsx`
- [X] T125 [US7] Implement the notes screen and route with boundaries in `apps/web/src/features/students/screens/student-notes-screen.tsx` and `apps/web/src/app/(workspace)/students/[studentId]/notes/{page,loading,error}.tsx`

> ⚠️ T126–T128 extend spec FR-020/FR-021. Confirm before implementing, or skip them to stay within the approved spec.

- [X] T126 [US7] Add `editNote` as a non-destructive revision preserving original author and creation time, with `students.notes.manage` and an `editedAt`/`editedBy` record, in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T127 [US7] Add `archiveNote` as a soft archive with no permanent delete, consistent with FR-040 audit readiness, in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T128 [US7] Add edit and archive affordances with confirmation and revision indication to `apps/web/src/features/students/components/student-notes-panel.tsx`
- [ ] T129 [US7] Amend spec FR-020/FR-021 and User Story 7 to cover note revision and archival, then update the contracts service list in `specs/006-student-management/spec.md` and `specs/006-student-management/contracts/student-management-contracts.md`

**Checkpoint**: Internal notes are authored, attributed, permission-gated, and retention-safe.

---

## Phase 10: User Story 8 — Review the Student Activity Timeline (Priority: P2)

**Goal**: One attributable, chronologically stable event per successful operation, readable for long histories.

**Independent Test**: Perform a series of operations, confirm exactly one event each, force a failure and confirm no event, then page a long history and confirm stable ordering.

### Tests for User Story 8

- [X] T130 [P] [US8] Unit test for timeline merge ordering, `(occurredAt, sequence)` tiebreak, and cursor stability in `apps/web/tests/unit/students/student-timeline.test.ts`
- [X] T131 [P] [US8] Contract test asserting exactly one event per successful command and none per failed command in `apps/web/tests/contract/students/student-timeline-events.test.ts`
- [X] T132 [P] [US8] Integration test for incremental loading and preserved chronological order across pages in `apps/web/tests/integration/students/student-timeline.test.tsx`

### Implementation for User Story 8

- [X] T133 [US8] Implement `listTimeline` with category filtering, keyset cursor pagination, and stable ordering in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T134 [US8] Verify every state-changing command appends exactly one event inside the same operation across `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T135 [P] [US8] Implement the `useStudentTimeline` infinite-query hook with cursor paging and cancellation in `apps/web/src/features/students/hooks/use-student-timeline.ts`
- [X] T136 [P] [US8] Implement the category-to-Arabic-copy and icon mapping, including reserved future financial and academic categories, in `apps/web/src/features/students/components/student-timeline-mapping.ts`
- [X] T137 [US8] Implement the timeline screen over the shared `Timeline` component with load-more, empty, and error states in `apps/web/src/features/students/screens/student-timeline-screen.tsx`
- [X] T138 [US8] Add the timeline route and boundaries in `apps/web/src/app/(workspace)/students/[studentId]/timeline/{page,loading,error}.tsx`
- [X] T139 [US8] Record timeline evidence — one-event-per-success, none-per-failure, stable paging — in `specs/006-student-management/validation/us8-timeline.md`

**Checkpoint**: The full student history is visible, attributable, and stably ordered.

---

## Phase 11: User Story 9 — Review the Financial Summary (Priority: P3)

**Goal**: A read-only financial overview that is honest about absence and offers no financial action.

**Independent Test**: View the summary with available, unavailable, error, and forbidden finance context, and confirm no financial action exists anywhere in the module.

### Tests for User Story 9

- [X] T140 [P] [US9] Contract test for the three-state `StudentFinancialSummaryResult` and the unavailable default in `apps/web/tests/contract/students/student-finance-reader.test.ts`
- [X] T141 [P] [US9] Integration test for available, unavailable, source-error, and forbidden rendering in `apps/web/tests/integration/students/student-financial-summary.test.tsx`

### Implementation for User Story 9

- [X] T142 [US9] Implement `getFinancialSummary` delegating to `StudentFinanceReader` with permission gating and no zero-value fallback in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T143 [P] [US9] Implement the `useStudentFinancialSummary` hook with its own query key and no cross-module invalidation in `apps/web/src/features/students/hooks/use-student-financial-summary.ts`
- [X] T144 [US9] Implement the read-only financial summary card showing total fees, paid amount, remaining balance, active installments, and currency with RTL-isolated money in `apps/web/src/features/students/components/student-financial-summary.tsx`
- [X] T145 [US9] Implement distinguishable unavailable, source-error, timeout, and forbidden states with retry in `apps/web/src/features/students/components/student-financial-summary.tsx`
- [X] T146 [US9] Verify no payment, refund, adjustment, installment, invoicing, or schedule action exists anywhere under `apps/web/src/features/students/`
- [X] T147 [US9] Record finance evidence — populated, unavailable, forbidden, and no-action verification — in `specs/006-student-management/validation/us9-financial.md`

**Checkpoint**: All nine user stories are independently functional.

---

## Phase 12: Polish & Cross-Cutting Validation

**Purpose**: Constitution compliance, consistency, and finalization across every story.

- [X] T148 Implement `getContextSummary` returning the permission-scoped consumer projection with no note content, document URLs, address, or national identifier in `apps/web/src/features/students/services/mock-students-service.ts`
- [X] T149 [P] Contract test for `StudentContextSummary` stability, minimality, and forbidden behavior in `apps/web/tests/contract/students/student-context-summary.test.ts`
- [X] T150 Verify the public barrel exports only the documented surface and that no other feature imports student internals in `apps/web/src/features/students/index.ts`
- [X] T151 Verify Students imports Admissions, Organization, Catalog, and Batch facts only through its own reader ports, with no fixture, schema, hook, or component imports across module boundaries, in `apps/web/src/features/students/services/students-dependency-adapters.ts`
- [X] T152 [P] Verify Server Component defaults, client-boundary minimality, route-segment code splitting, and bundle impact; record findings in `specs/006-student-management/validation/performance.md`
- [X] T153 [P] Verify Arabic copy completeness and RTL-native behavior across list, workspace, editor, documents, notes, timeline, and dialogs; record findings in `specs/006-student-management/validation/rtl-accessibility.md`
- [X] T154 [P] Verify bidi isolation of student codes, national identifiers, phones, dates, and money in every surface they appear in `apps/web/src/features/students/`
- [X] T155 [P] Verify desktop, laptop, and tablet behavior plus 200% zoom for every route; record findings in `specs/006-student-management/validation/responsive.md`
- [X] T156 [P] Verify keyboard traversal, roving tab focus, dialog focus trapping, first-error focus, live announcements, semantics, and non-color status encoding; record findings in `specs/006-student-management/validation/rtl-accessibility.md`
- [X] T157 [P] Verify every permission-denied and out-of-scope state renders forbidden rather than empty across all six routes under `apps/web/src/app/(workspace)/students/`
- [X] T158 [P] Verify branches, departments, grades, qualifications, statuses, document types, identity rules, currency, and precision remain service-supplied and are hardcoded nowhere under `apps/web/src/features/students/`
- [X] T159 [P] Verify AI, tenant, audit, workflow, and backend extension boundaries; record findings in `specs/006-student-management/validation/future-readiness.md`
- [X] T160 [P] Add the end-to-end journeys in `apps/web/playwright/journeys/student-management.spec.ts`, `apps/web/playwright/journeys/student-workspace.spec.ts`, and `apps/web/playwright/journeys/student-lifecycle.spec.ts`
- [X] T161 [P] Add axe and keyboard suites in `apps/web/playwright/accessibility/student-management-a11y.spec.ts` and `apps/web/playwright/accessibility/student-management-keyboard.spec.ts`
- [X] T162 [P] Add shared Playwright helpers for student fixtures, scenarios, and scoped contexts in `apps/web/playwright/helpers/students.ts`
- [X] T163 Remove dead code, unify component naming with sibling features, and confirm no duplicated UI implementation across `apps/web/src/features/students/`
- [X] T164 Run `npm run typecheck && npm run lint && npm run test && npm run build` and `npm run test:e2e` from the repository root `package.json`, resolving every failure
- [ ] T165 Execute every scenario in [quickstart.md](./quickstart.md) and record the results in `specs/006-student-management/validation/constitution.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks every user story**
- **User Stories (Phases 3–11)**: All depend on Phase 2; then proceed in parallel if staffed, or sequentially in priority order
- **Polish (Phase 12)**: Depends on every story that will ship

### User Story Dependency Graph

```text
Phase 1 Setup
   └─> Phase 2 Foundational  (blocking)
          ├─> Phase 3  US1 Intake (P1)  ──┐
          ├─> Phase 4  US2 Find (P1)   ◄──┤ US2 needs students to exist; use fixtures to test alone
          ├─> Phase 5  US3 Workspace (P1)
          ├─> Phase 6  US4 Maintain (P1)
          ├─> Phase 7  US5 Lifecycle (P1)
          ├─> Phase 8  US6 Documents (P2)
          ├─> Phase 9  US7 Notes (P2)
          ├─> Phase 10 US8 Timeline (P2)
          └─> Phase 11 US9 Finance (P3)
                 └─> Phase 12 Polish
```

Every story is independently testable against the Phase 2 fixtures. US8's timeline is richest after US4, US5, and US6 exist, but it is testable alone using fixture events.

### Independent Test Criteria

| Story | Independently verified by |
| --- | --- |
| US1 | Intake produces exactly one student, is idempotent, refuses non-approved admissions, and exposes no create/delete path |
| US2 | Search, combined filters, sorting, and pagination behave correctly at 20,000 records under organization-wide and branch-scoped contexts |
| US3 | Every workspace area renders its own loading, empty, error, unavailable, and forbidden state without affecting the others |
| US4 | Valid edits persist, invalid edits are refused per field, protected fields stay uneditable, and conflicts refuse without data loss |
| US5 | Every allowed transition applies with history, every disallowed or unpermitted one is refused, and archived students remain readable and restorable |
| US6 | Upload, replace, preview, download, and archive behave correctly, versions persist, and retries never duplicate |
| US7 | Notes store author, time, and content, order newest first, refuse empty content, and stay invisible without permission |
| US8 | Each successful operation adds exactly one ordered event, failures add none, and long histories page stably |
| US9 | The summary renders read-only when available, explicitly unavailable when absent, forbidden without permission, and exposes no financial action |

### Within Each User Story

- Tests are written first and must fail before implementation
- Service and policy behavior lands before the screens that consume it
- Screens land before route wiring
- Validation evidence is recorded before the story checkpoint is claimed

### Parallel Opportunities

- Phase 1: T002, T003, T004, T005, T007, T008 run in parallel
- Phase 2: all of T013–T033 marked [P] run in parallel after T009–T012; T034 requires T017–T033
- Phases 3–11: after Phase 2, all nine stories can be staffed in parallel
- Phase 12: T149, T152–T162 run in parallel

---

## Parallel Examples

### Phase 2 — pure policies

```bash
Task: "Transition policy in apps/web/src/features/students/utils/student-lifecycle.ts"
Task: "Enrollment invariant in apps/web/src/features/students/utils/enrollment-rules.ts"
Task: "Identity rules in apps/web/src/features/students/utils/student-identity-rules.ts"
Task: "Document rules in apps/web/src/features/students/utils/student-documents.ts"
Task: "Timeline ordering in apps/web/src/features/students/utils/student-timeline.ts"
Task: "List query normalization in apps/web/src/features/students/utils/student-list-query.ts"
```

### User Story 2 — tests

```bash
Task: "List query unit test in apps/web/tests/unit/students/student-list-query.test.ts"
Task: "Scope unit test in apps/web/tests/unit/students/students-scope.test.ts"
Task: "List scope contract test in apps/web/tests/contract/students/students-list-scope.test.ts"
Task: "List integration test in apps/web/tests/integration/students/students-list.test.tsx"
```

### User Story 6 — components

```bash
Task: "Document card in apps/web/src/features/students/components/student-document-card.tsx"
Task: "Document actions in apps/web/src/features/students/components/student-document-actions.tsx"
Task: "Archive dialog in apps/web/src/features/students/components/student-document-archive-dialog.tsx"
Task: "Version history in apps/web/src/features/students/components/student-document-history.tsx"
```

---

## Implementation Strategy

### Minimum demoable increment — US1 + US2

US1 is the foundational slice, but its own independent test ("verify exactly one student appears") requires a surface to observe it on. The smallest shippable demo is therefore Phases 1–4.

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**blocks everything**)
3. Complete Phase 3: US1 — intake, idempotency, no create/delete
4. Complete Phase 4: US2 — list, search, filters, pagination, scope
5. **STOP and VALIDATE** against quickstart Scenarios 1 and 2
6. Demo: administrators can see students that arrived from Admissions

### Incremental delivery

1. Setup + Foundational → foundation ready
2. + US1 + US2 → students exist and are discoverable (demo)
3. + US3 → the workspace is browsable (demo)
4. + US4 → information is maintainable (demo)
5. + US5 → the lifecycle is governed — **all P1 stories complete**
6. + US6 + US7 → documents and notes (demo)
7. + US8 → history is visible
8. + US9 → financial context is visible
9. + Phase 12 → constitution validation and finalization

### Parallel team strategy

1. The team completes Phases 1–2 together — this is the critical path
2. Then split: Developer A takes US1 + US2, Developer B takes US3 + US4, Developer C takes US5 + US6, Developer D takes US7 + US8 + US9
3. Stories integrate independently through the service facade and shared components

---

## Notes

- [P] means different files with no dependency on incomplete work
- [Story] labels map tasks to spec user stories for traceability
- Every story must be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- No task may introduce a manual student-create path, a permanent delete, an enrollment command, or a financial action
