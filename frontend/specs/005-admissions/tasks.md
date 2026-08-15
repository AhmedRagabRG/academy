# Tasks: Admissions

**Input**: Design documents from `/specs/005-admissions/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/admissions-contracts.md](./contracts/admissions-contracts.md), [quickstart.md](./quickstart.md)

**Validation**: Automated unit, contract, integration, Playwright, accessibility, RTL, responsive, permission, scale, lint, typecheck, and build validation are included because the specification defines measurable acceptance outcomes and the constitution treats these behaviors as functional requirements.

**Organization**: Tasks are grouped by user story so each slice can be implemented and validated independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets different files and does not depend on an incomplete task in the same phase
- **[Story]**: Maps the task to User Story 1–6 from [spec.md](./spec.md)
- Every checklist item contains an exact repository path

---

## Phase 1: Setup (Admissions Module Skeleton)

**Purpose**: Establish the feature-owned directories, public boundary, navigation contribution, and validation evidence structure.

- [x] T001 Create the Admissions feature directories and barrel boundary in `apps/web/src/features/admissions/index.ts`
- [x] T002 [P] Create the Admissions route segment skeleton and Server Component route notes in `apps/web/src/app/(workspace)/admissions/README.md`
- [x] T003 [P] Define centralized Arabic interface copy and stable status/action keys in `apps/web/src/features/admissions/config/admissions-copy.ts`
- [x] T004 [P] Define the permission-aware Admissions navigation contribution in `apps/web/src/features/admissions/config/navigation.ts`
- [x] T005 Register the Admissions navigation contribution and icon through `apps/web/src/shared/config/foundation-navigation.ts` and `apps/web/src/shared/config/icon-registry.ts`
- [x] T006 [P] Create story-specific validation evidence placeholders in `specs/005-admissions/validation/foundation.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the typed, configurable, service-owned foundation required by every Admissions journey.

**⚠️ CRITICAL**: No user-story implementation begins until this phase is complete.

- [x] T007 Define branded identifiers, date/money values, localized references, pagination, actor context, and versions in `apps/web/src/features/admissions/types/common.ts`
- [x] T008 Define Applicant, Admission, assignment, selection, document, finance, lifecycle, readiness, summary/detail, and consumer projections in `apps/web/src/features/admissions/types/domain.ts`
- [x] T009 Define explicit list queries and intent-specific create/update/selection/document/finance/transition/bulk commands in `apps/web/src/features/admissions/types/commands.ts`
- [x] T010 [P] Define all implemented Admissions permission keys and section/action mappings in `apps/web/src/features/admissions/config/admissions-permissions.ts`
- [x] T011 [P] Add organization ID, effective Admissions permissions, organization-wide capability, and authorized branch IDs to the mock employee context in `apps/web/src/features/auth/data/auth-fixtures.ts`
- [x] T012 [P] Define the Admissions-owned organization, offering, and batch dependency reader ports in `apps/web/src/features/admissions/services/admissions-dependency-readers.ts`
- [x] T013 Expose consumer-safe branches, employees, sources, grades, qualifications, identity/document policies, currency, and historical labels in `apps/web/src/features/organization-settings/index.ts`
- [x] T014 Expose a stable-kind admission offering lookup and pricing/policy revision projection in `apps/web/src/features/academic-catalog/index.ts`
- [x] T015 Enrich the public Program Batch admission-eligibility projection with identity, both branch roles, evaluation context, seats, currency, and financial revision terms in `apps/web/src/features/program-batches/index.ts`
- [x] T016 Implement adapters from the three public dependency boundaries to Admissions-owned readers in `apps/web/src/features/admissions/services/admissions-dependency-adapters.ts`
- [x] T017 Define the transport-neutral Admissions service read/command facade with AbortSignal support and no delete operation in `apps/web/src/features/admissions/services/admissions-service.ts`
- [x] T018 [P] Define safe discriminated Admissions errors, field/section mappings, retryability, conflicts, and redaction rules in `apps/web/src/features/admissions/services/admissions-error.ts`
- [x] T019 [P] Define normalized scoped query-key factories and targeted invalidation helpers in `apps/web/src/features/admissions/services/admissions-query-keys.ts`
- [x] T020 [P] Create configurable lookup, identity policy, document policy, offering, batch, permission, and historical-label fixtures behind the service boundary in `apps/web/src/features/admissions/data/admissions-lookups.ts`
- [x] T021 Create seeded Applicants, Admissions, selection/finance revisions, documents, decisions, lifecycle events, and approval snapshots covering every status in `apps/web/src/features/admissions/data/admissions-fixtures.ts`
- [x] T022 [P] Create deterministic latency, empty, forbidden, scope, duplicate, validation, stale, dependency, upload, readiness, partial-bulk, and unexpected scenario controls in `apps/web/src/features/admissions/services/mock-scenario-controller.ts`
- [x] T023 Implement authenticated organization/branch scope intersection and projection-level PII redaction in `apps/web/src/features/admissions/utils/admissions-scope.ts`
- [x] T024 Implement the base asynchronous cloned in-memory adapter, version store, history stores, and scenario dispatch in `apps/web/src/features/admissions/services/mock-admissions-service.ts`
- [x] T025 Add the Admissions provider-facing service singleton and public consumer DTO exports in `apps/web/src/features/admissions/index.ts`

**Checkpoint**: The Admissions module has typed public boundaries, configurable dependency adapters, exact permissions/scope, deterministic mock storage, safe errors, and cache keys.

---

## Phase 3: User Story 1 — Register and Maintain an Applicant (Priority: P1) 🎯 MVP

**Goal**: Register a person as an Applicant with one separate Draft Admission, resume/edit it, resolve duplicates safely, and archive without deletion.

**Independent Test**: Register valid applicant/assignment information, save and reopen the Draft, update fields, exercise invalid/minor/duplicate/concurrent cases, and archive with retained history while confirming no Student or delete operation exists.

### Tests for User Story 1

- [x] T026 [P] [US1] Add applicant normalization, national-ID/phone, birth/graduation, minor/guardian, and duplicate-candidate unit tests in `apps/web/tests/unit/admissions/applicant-rules.test.ts`
- [x] T027 [P] [US1] Add applicant/admission schema tests for draft-safe validation and alternative identity evidence in `apps/web/tests/unit/admissions/applicant-schema.test.ts`
- [ ] T028 [P] [US1] Add service contract tests for create, update, expected versions, duplicate resolution, active-target uniqueness, archive, scope, and absence of delete in `apps/web/tests/contract/admissions/applicant-management-contract.test.ts`
- [ ] T029 [P] [US1] Add integration tests for section permissions, field errors, dirty-value preservation, duplicate dialog, stale reconciliation, and archive reason in `apps/web/tests/integration/admissions/applicant-editor.test.tsx`
- [ ] T030 [P] [US1] Add desktop/laptop/tablet registration, refresh, edit, duplicate, and archive journey coverage in `apps/web/playwright/journeys/admissions-management.spec.ts`

### Implementation for User Story 1

- [x] T031 [P] [US1] Implement identity/contact normalization, duplicate scoring, minor policy, and date plausibility rules in `apps/web/src/features/admissions/utils/applicant-rules.ts`
- [x] T032 [P] [US1] Implement the authoritative Applicant and Draft Admission Zod schemas in `apps/web/src/features/admissions/schemas/applicant-schema.ts`
- [x] T033 [US1] Implement createDraft, updateDraft, duplicate resolution, active-target uniqueness, and archiveApplicant service behavior in `apps/web/src/features/admissions/services/mock-admissions-service.ts`
- [x] T034 [P] [US1] Build shared Admissions page, permission boundary, query state, bidi value, and section primitives in `apps/web/src/features/admissions/components/admissions-page.tsx`
- [x] T035 [P] [US1] Build personal identity, parent/guardian, qualification, address, birth, notes, and profile-image fields in `apps/web/src/features/admissions/forms/applicant-information-section.tsx`
- [x] T036 [P] [US1] Build branch, employee, manager, source, department, and grade assignment fields using the shared Dropdown in `apps/web/src/features/admissions/forms/admission-assignment-section.tsx`
- [x] T037 [P] [US1] Build accessible duplicate candidate and justified-exception resolution UI in `apps/web/src/features/admissions/components/duplicate-applicant-dialog.tsx`
- [x] T038 [P] [US1] Build the archive confirmation/reason interaction without permanent deletion in `apps/web/src/features/admissions/components/archive-applicant-dialog.tsx`
- [x] T039 [US1] Compose the single RHF Draft editor with FormProvider, error summary, first-error focus, and unsaved-change handling in `apps/web/src/features/admissions/forms/admission-editor.tsx`
- [x] T040 [US1] Add create/update/archive mutations, precise invalidation, Sonner feedback, and stale-version reconciliation hooks in `apps/web/src/features/admissions/hooks/use-admission-mutations.ts`
- [x] T041 [US1] Build create and edit orchestration screens with preserved recoverable input in `apps/web/src/features/admissions/screens/create-admission-screen.tsx` and `apps/web/src/features/admissions/screens/edit-admission-screen.tsx`
- [x] T042 [US1] Build Applicant and Draft Admission detail presentation with audit context and permission redaction in `apps/web/src/features/admissions/screens/admission-detail-screen.tsx`
- [x] T043 [US1] Add Server Component create/detail/edit routes and segment loading/error boundaries in `apps/web/src/app/(workspace)/admissions/create/page.tsx`, `apps/web/src/app/(workspace)/admissions/[admissionId]/page.tsx`, and `apps/web/src/app/(workspace)/admissions/[admissionId]/edit/page.tsx`

**Checkpoint**: Applicant registration and Draft maintenance work independently as the MVP, with safe duplicate handling, exact permissions, recoverable forms, archival history, and no Student creation.

---

## Phase 4: User Story 2 — Select an Eligible Academic Offering (Priority: P1)

**Goal**: Select exactly one supported offering, require an eligible batch for Professional Programs, forbid batches for Diploma/Course, and safely recalculate dependent state.

**Independent Test**: Select each offering kind, exercise eligible/ineligible/mismatched/full/closed batches and branches, confirm dependent resets, and prove eligibility is re-evaluated at selection, submission, and approval.

### Tests for User Story 2

- [x] T044 [P] [US2] Add discriminated selection, parent match, batch requirement/forbiddance, and eligibility reason unit tests in `apps/web/tests/unit/admissions/academic-selection.test.ts`
- [ ] T045 [P] [US2] Add dependency-reader consumer contract tests for stable offering kinds and complete batch eligibility context in `apps/web/tests/contract/admissions/academic-dependencies-contract.test.ts`
- [ ] T046 [P] [US2] Add service contract tests for selection revisions, confirmation consequences, branch scope, and repeated eligibility evaluation in `apps/web/tests/contract/admissions/academic-selection-contract.test.ts`
- [ ] T047 [P] [US2] Add integration tests for program/batch conditional controls, disabled reasons, Diploma/Course clearing, and dependency reset confirmation in `apps/web/tests/integration/admissions/academic-selection.test.tsx`
- [ ] T048 [P] [US2] Add Playwright journeys for all offering kinds and changing batch eligibility in `apps/web/playwright/journeys/admissions-academic-selection.spec.ts`

### Implementation for User Story 2

- [x] T049 [P] [US2] Implement the discriminated academic selection and dependency-reset Zod schemas in `apps/web/src/features/admissions/schemas/academic-selection-schema.ts`
- [x] T050 [P] [US2] Implement offering-kind rules, dependency consequence calculation, and stable eligibility reason mapping in `apps/web/src/features/admissions/utils/academic-selection.ts`
- [x] T051 [US2] Implement organization/catalog/batch eligibility orchestration at selection, submission, and approval in `apps/web/src/features/admissions/services/admission-eligibility-service.ts`
- [x] T052 [US2] Implement append-only AcademicSelectionRevision and EligibilityAssessment writes in `apps/web/src/features/admissions/services/mock-admissions-service.ts`
- [x] T053 [P] [US2] Build the offering selector using stable kinds and the shared Dropdown in `apps/web/src/features/admissions/forms/academic-offering-field.tsx`
- [x] T054 [P] [US2] Build eligible batch selection with lifecycle/window/seat/branch reason presentation in `apps/web/src/features/admissions/forms/program-batch-field.tsx`
- [x] T055 [P] [US2] Build the exact dependency consequence confirmation dialog in `apps/web/src/features/admissions/components/academic-selection-change-dialog.tsx`
- [x] T056 [P] [US2] Build the non-color academic eligibility findings summary and live status region in `apps/web/src/features/admissions/components/admission-eligibility-summary.tsx`
- [x] T057 [US2] Integrate academic selection and dependency recalculation into the composed editor in `apps/web/src/features/admissions/forms/admission-editor.tsx`
- [x] T058 [US2] Add selection/eligibility queries, mutation invalidation, cancellation, and retry behavior in `apps/web/src/features/admissions/hooks/use-admission-eligibility.ts`
- [x] T059 [US2] Present academic revision identity, current eligibility, and historical labels in `apps/web/src/features/admissions/screens/admission-detail-screen.tsx`
- [x] T060 [US2] Record US2 contract, integration, responsive, and eligibility evidence in `specs/005-admissions/validation/us2-academic-selection.md`

**Checkpoint**: Academic selection works independently for Program+Batch, Diploma, and Course, with explicit consequences and repeatable eligibility checks.

---

## Phase 5: User Story 3 — Collect and Verify Required Documents (Priority: P1)

**Goal**: Present configurable requirement slots, upload/preview/version files, verify or reject exact versions, and block approval until required evidence is verified.

**Independent Test**: Upload valid/invalid/interrupted files, replace a verified version, inspect immutable history, verify/reject with exact permissions, and confirm every unresolved required item blocks approval.

### Tests for User Story 3

- [x] T061 [P] [US3] Add requirement applicability, MIME/extension/size, version replacement, and approval completeness unit tests in `apps/web/tests/unit/admissions/document-rules.test.ts`
- [ ] T062 [P] [US3] Add service contract tests for idempotent upload, interrupted retry, append-only versions, exact-version decisions, withdrawal, policy changes, and approved evidence in `apps/web/tests/contract/admissions/document-management-contract.test.ts`
- [ ] T063 [P] [US3] Add integration tests for document view/manage/verify separation, slot states, preview, replacement reset, dialogs, history, and live feedback in `apps/web/tests/integration/admissions/document-management.test.tsx`
- [ ] T064 [P] [US3] Add Playwright upload/preview/reject/verify/replace and keyboard journey coverage in `apps/web/playwright/journeys/admissions-documents.spec.ts`

### Implementation for User Story 3

- [x] T065 [P] [US3] Implement document requirement applicability, file validation, current-state derivation, and completeness rules in `apps/web/src/features/admissions/utils/admission-documents.ts`
- [x] T066 [P] [US3] Implement authoritative upload/replace/withdraw/verification command schemas in `apps/web/src/features/admissions/schemas/admission-document-schema.ts`
- [x] T067 [US3] Implement requirement snapshot, metadata/blob stub, idempotent upload, version, decision, withdrawal, and policy-refresh stores in `apps/web/src/features/admissions/services/mock-admissions-service.ts`
- [x] T068 [P] [US3] Extend shared FileDropzone/FilePreview for visible focus, live progress/retry, and requirement-level errors without admission business logic in `apps/web/src/shared/components/file-upload/file-dropzone.tsx`
- [x] T069 [P] [US3] Build requirement slot cards with required/optional and missing/pending/verified/rejected states in `apps/web/src/features/admissions/components/admission-document-card.tsx`
- [x] T070 [P] [US3] Build preview, replace, withdraw, verify, and reject actions with accessible names and exact permissions in `apps/web/src/features/admissions/components/admission-document-actions.tsx`
- [x] T071 [P] [US3] Build focus-managed verification/rejection/replacement dialogs with required reasons in `apps/web/src/features/admissions/components/document-decision-dialog.tsx`
- [x] T072 [P] [US3] Build pageable document version and immutable verification history in `apps/web/src/features/admissions/components/document-history.tsx`
- [x] T073 [US3] Build the document requirement section on shared upload primitives in `apps/web/src/features/admissions/forms/admission-documents-section.tsx`
- [x] T074 [US3] Implement document list/history queries and upload/replace/withdraw/verify mutations with progress, retry, and targeted invalidation in `apps/web/src/features/admissions/hooks/use-admission-documents.ts`
- [x] T075 [US3] Integrate document state and requirement counts into editor/detail/readiness orchestration in `apps/web/src/features/admissions/forms/admission-editor.tsx` and `apps/web/src/features/admissions/screens/admission-detail-screen.tsx`
- [x] T076 [US3] Enforce documents.view/manage/verify redaction and scope in all document service projections and commands in `apps/web/src/features/admissions/services/mock-admissions-service.ts`
- [x] T077 [US3] Add document-specific loading, empty, forbidden, interrupted, retryable, and unavailable states in `apps/web/src/features/admissions/components/admission-document-state.tsx`
- [x] T078 [US3] Record US3 upload, versioning, verification, accessibility, and mock-storage limitations in `specs/005-admissions/validation/us3-documents.md`

**Checkpoint**: Required documents are independently collectable and verifiable with version-safe history; replacement cannot inherit an old decision and incomplete evidence blocks approval.

---

## Phase 6: User Story 5 — Review, Decide, and Prepare Enrollment (Priority: P1)

**Goal**: Submit, review, return, approve, reject, archive, and expose a minimal Approved enrollment-readiness snapshot without creating Students or Enrollments.

**Independent Test**: Exercise every allowed/prohibited transition, reason, permission, readiness blocker, stale version, immutable event/snapshot, and consumer projection across all lifecycle states.

### Tests for User Story 5

- [x] T079 [P] [US5] Add exact lifecycle transition, permission, reason, terminal state, and readiness unit tests in `apps/web/tests/unit/admissions/admission-lifecycle.test.ts`
- [x] T080 [P] [US5] Add approval snapshot and enrollment-readiness projection unit tests in `apps/web/tests/unit/admissions/admission-readiness.test.ts`
- [ ] T081 [P] [US5] Add service contract tests for atomic transitions, expected versions, one-event success, no-event failure, review ownership, archival gates, and immutable approval in `apps/web/tests/contract/admissions/admission-lifecycle-contract.test.ts`
- [ ] T082 [P] [US5] Add consumer contract tests proving future Enrollment/Finance receive stable minimal snapshots without documents or notes in `apps/web/tests/contract/admissions/admissions-consumer-contract.test.ts`
- [ ] T083 [P] [US5] Add integration tests for available actions, confirmation focus, blocker links, exact action permissions, locked states, timeline, and stale decisions in `apps/web/tests/integration/admissions/admission-review.test.tsx`
- [ ] T084 [P] [US5] Add Playwright submit/review/return/reject/approve/archive and non-approved readiness journeys in `apps/web/playwright/journeys/admissions-review.spec.ts`

### Implementation for User Story 5

- [x] T085 [P] [US5] Implement the pure transition table, action permission mapping, reasons, and prohibited shortcuts in `apps/web/src/features/admissions/utils/admission-lifecycle.ts`
- [x] T086 [P] [US5] Implement submit/approve readiness findings across applicant, assignment, eligibility, documents, and finance in `apps/web/src/features/admissions/utils/admission-readiness.ts`
- [x] T087 [P] [US5] Implement immutable approval and enrollment-readiness snapshot builders with privacy minimization in `apps/web/src/features/admissions/utils/admission-snapshots.ts`
- [x] T088 [US5] Implement atomic transition, lifecycle event, approval snapshot, archive, and advisory enrollment-readiness service behavior in `apps/web/src/features/admissions/services/mock-admissions-service.ts`
- [x] T089 [P] [US5] Build status, readiness, and available-action components with text-plus-color meaning in `apps/web/src/features/admissions/components/admission-readiness-panel.tsx`
- [x] T090 [P] [US5] Build focus-managed transition/reason confirmations for submit, review, return, approve, reject, and archive in `apps/web/src/features/admissions/components/admission-transition-dialog.tsx`
- [x] T091 [P] [US5] Build the semantic lifecycle timeline and immutable event detail presentation in `apps/web/src/features/admissions/components/admission-lifecycle-timeline.tsx`
- [x] T092 [P] [US5] Build the immutable approval snapshot and minimal enrollment-readiness panels in `apps/web/src/features/admissions/components/admission-approval-summary.tsx`
- [x] T093 [US5] Add readiness/history queries and transition mutations with scoped keys, pending states, Sonner, and precise invalidation in `apps/web/src/features/admissions/hooks/use-admission-lifecycle.ts`
- [x] T094 [US5] Integrate locked/correction/review/decision states and sticky responsive readiness actions into `apps/web/src/features/admissions/screens/admission-detail-screen.tsx`
- [x] T095 [US5] Export consumer-safe Approval and EnrollmentReadiness types only through `apps/web/src/features/admissions/index.ts`
- [ ] T096 [US5] Add deterministic fixtures for all statuses, readiness combinations, snapshots, histories, and stale concurrent decisions in `apps/web/src/features/admissions/data/admissions-fixtures.ts`
- [x] T097 [US5] Record US5 lifecycle, permission, snapshot, consumer, and no-Student/Enrollment evidence in `specs/005-admissions/validation/us5-review-decisions.md`

**Checkpoint**: The structured admission decision is independently complete, historically stable, permission-aware, and ready for future authoritative Enrollment without creating a Student in this phase.

---

## Phase 7: User Story 4 — Prepare Financial Information (Priority: P2)

**Goal**: Load authoritative offering/batch terms, apply one permitted discount mode, derive exact totals, retain revisions, and freeze approved financial facts.

**Independent Test**: Exercise Catalog and Batch sources, percentage/amount discounts and edge values, precision/currency errors, revision reasons, section permissions, and immutable approved terms after source price changes.

### Tests for User Story 4

- [x] T098 [P] [US4] Add decimal normalization, integer minor-unit, percentage/amount derivation, zero/full discount, and required-total unit tests in `apps/web/tests/unit/admissions/admission-finance.test.ts`
- [ ] T099 [P] [US4] Add service contract tests for Catalog/Batch source revisions, permission redaction, revisions, currency mismatch, and immutable approved finance in `apps/web/tests/contract/admissions/admission-finance-contract.test.ts`
- [ ] T100 [P] [US4] Add integration tests for finance view/manage separation, source display, discount mode, live total, field errors, and dirty preservation in `apps/web/tests/integration/admissions/admission-finance.test.tsx`
- [ ] T101 [P] [US4] Add Playwright Program/Diploma/Course finance and approved-snapshot journeys in `apps/web/playwright/journeys/admissions-finance.spec.ts`

### Implementation for User Story 4

- [x] T102 [P] [US4] Implement decimal money normalization, currency precision, discount derivation, and required amount rules in `apps/web/src/features/admissions/utils/admission-money.ts`
- [x] T103 [P] [US4] Implement authoritative financial preparation Zod schemas with discriminated discount mode in `apps/web/src/features/admissions/schemas/admission-finance-schema.ts`
- [x] T104 [US4] Implement pricing-source resolution, append-only financial revisions, reasons, and permission redaction in `apps/web/src/features/admissions/services/mock-admissions-service.ts`
- [x] T105 [P] [US4] Build read-only source price/revision context and editable discount/fee controls in `apps/web/src/features/admissions/forms/admission-finance-section.tsx`
- [x] T106 [P] [US4] Build an accessible live financial breakdown with isolated LTR money values in `apps/web/src/features/admissions/components/admission-financial-summary.tsx`
- [x] T107 [P] [US4] Build pageable immutable financial revision history in `apps/web/src/features/admissions/components/admission-financial-history.tsx`
- [x] T108 [US4] Add finance/history queries and prepareFinancials mutation with exact invalidation and Sonner feedback in `apps/web/src/features/admissions/hooks/use-admission-finance.ts`
- [x] T109 [US4] Integrate finance editing, redacted view, history, readiness, and approved snapshot display into editor/detail screens in `apps/web/src/features/admissions/forms/admission-editor.tsx` and `apps/web/src/features/admissions/screens/admission-detail-screen.tsx`
- [x] T110 [US4] Record US4 precision, permission, revision, and approved financial snapshot evidence in `specs/005-admissions/validation/us4-financials.md`

**Checkpoint**: Financial preparation works independently, calculates exact configured totals, respects separation of duties, and cannot rewrite Approved terms.

---

## Phase 8: User Story 6 — Find and Govern Admissions (Priority: P2)

**Goal**: Provide a scoped operational queue with normalized search, combined filters, stable sort/page, export, safe bulk actions, and concise RTL rows for 10,000 records.

**Independent Test**: Find known records with every supported search/filter, reload query state, page/sort/select/export, exercise partial bulk outcomes, and verify branch/organization/permission scope and 2-second interaction goals.

### Tests for User Story 6

- [x] T111 [P] [US6] Add Arabic/English query normalization, allowlisted sort, stable tie-break, page clamp, and canonical serialization unit tests in `apps/web/tests/unit/admissions/admission-list-query.test.ts`
- [x] T112 [P] [US6] Add deterministic 10,000-summary filtering/sorting/pagination and two-second service-goal unit tests in `apps/web/tests/unit/admissions/admission-list-scale.test.ts`
- [ ] T113 [P] [US6] Add list/export/bulk service contract tests for facets, PII minimization, scope, exact permissions, cancellation, and per-record partial outcomes in `apps/web/tests/contract/admissions/admission-list-contract.test.ts`
- [ ] T114 [P] [US6] Add controlled table integration tests for search, filters, chips, reset, sorting, pagination, selection reconciliation, export, all query states, and concise row identity in `apps/web/tests/integration/admissions/admissions-list.test.tsx`
- [ ] T115 [P] [US6] Add desktop/laptop/tablet discovery, deep-link, scale, export, bulk, and scope journeys in `apps/web/playwright/journeys/admissions-discovery.spec.ts`

### Implementation for User Story 6

- [x] T116 [P] [US6] Implement canonical list-query parsing/serialization and normalized Arabic/English matching in `apps/web/src/features/admissions/utils/admission-list-query.ts`
- [x] T117 [P] [US6] Generate deterministic 10,000-record narrow summaries and known search/filter targets in `apps/web/src/features/admissions/data/admissions-scale-fixtures.ts`
- [x] T118 [US6] Implement service-owned scope-first search, combined filters, stable sort, pagination, facets, clamping, cancellation, export, and per-record bulk outcomes in `apps/web/src/features/admissions/services/mock-admissions-service.ts`
- [x] T119 [P] [US6] Define memoized concise columns with grouped applicant/reference identity, bidi isolation, status, owner, updated time, selection, and permission actions in `apps/web/src/features/admissions/components/admission-columns.tsx`
- [x] T120 [P] [US6] Build the responsive shared-control filter toolbar, active chips, count, reset, export, and bulk affordances in `apps/web/src/features/admissions/components/admissions-toolbar.tsx`
- [x] T121 [US6] Add controlled list/facet/export/bulk hooks with scoped normalized keys, cancellation, and targeted invalidation in `apps/web/src/features/admissions/hooks/use-admissions-list.ts`
- [x] T122 [US6] Build the scoped shared DataTable list screen with URL-compatible state and true/filtered empty, loading, retryable, unavailable, and forbidden behavior in `apps/web/src/features/admissions/screens/admissions-screen.tsx`
- [x] T123 [US6] Add the list Server Component route and segment loading/error boundaries in `apps/web/src/app/(workspace)/admissions/page.tsx`, `apps/web/src/app/(workspace)/admissions/loading.tsx`, and `apps/web/src/app/(workspace)/admissions/error.tsx`
- [x] T124 [US6] Reconcile list selection after filters/pages and present accessible partial-bulk outcomes in `apps/web/src/features/admissions/components/admission-bulk-outcome.tsx`
- [x] T125 [US6] Enforce list/detail/export/bulk organization and branch scope from authenticated context only in `apps/web/src/features/admissions/services/mock-admissions-service.ts`
- [x] T126 [US6] Record US6 discovery, 10,000-record performance, scope, export, bulk, and table UX evidence in `specs/005-admissions/validation/us6-discovery.md`
- [x] T127 [US6] Verify the Admissions sidebar entry, breadcrumb, active state, and permission filtering through `apps/web/tests/unit/shell/admissions-navigation.test.tsx`

**Checkpoint**: Operational teams can independently find and govern permitted Admissions at scale without wide-table regressions, fixture access, PII leakage, or caller-controlled scope.

---

## Phase 9: Polish & Cross-Cutting Validation

**Purpose**: Reconcile all journeys, verify constitutional constraints, and prepare the complete frontend module for backend, Student, Enrollment, and Finance adapters.

- [x] T128 [P] Add deterministic integration coverage for latency, true/filtered empty, forbidden, not-found, unavailable, retry, duplicate, stale, dependency, upload, readiness, partial-bulk, and unexpected states in `apps/web/tests/integration/admissions/admissions-states.test.tsx`
- [x] T129 [P] Add direct-route, exact-action, section-redaction, organization, and branch-scope regression coverage for every implemented permission in `apps/web/tests/integration/admissions/admissions-permissions.test.tsx`
- [x] T130 [P] Add automated axe coverage for list, create, detail, edit, document, finance, dialogs, errors, and forbidden states in `apps/web/playwright/journeys/admissions-accessibility.spec.ts`
- [x] T131 [P] Add keyboard-only, first-error focus, dialog focus-return, upload, table, and lifecycle coverage in `apps/web/playwright/journeys/admissions-keyboard.spec.ts`
- [x] T132 Verify Arabic copy, Alexandria typography, RTL logical alignment, bidi isolation, light/dark themes, and 200% zoom in `specs/005-admissions/validation/rtl-accessibility.md`
- [x] T133 Verify desktop, laptop, and tablet editor/review/table/document layouts, contained overflow, action visibility, and practical touch targets in `specs/005-admissions/validation/responsive.md`
- [x] T134 Audit Server Component defaults, promise-based params, client-boundary size, memoized columns, stable keys, scoped cache keys, cancellation, and list projection size in `specs/005-admissions/validation/performance.md`
- [x] T135 Audit fixture isolation, page/service boundaries, no generic partial writes, no `any`, single authoritative validation, no raw selects, no inline styles, no native alerts, and no permanent delete in `specs/005-admissions/validation/architecture.md`
- [x] T136 Audit dynamic configuration, stable offering kinds, all permission keys, organization/tenant/branch scope, immutable audit context, workflow/AI read context, and consumer privacy in `specs/005-admissions/validation/future-readiness.md`
- [x] T137 Reconcile shared Dropdown, upload, table, dialog, badge, loading, empty, error, Sonner, Lucide, brand color, spacing, and status conventions across `apps/web/src/features/admissions/`
- [x] T138 Remove unused exports, duplicate helpers, dead scenarios, sensitive error/query-key values, direct fixture imports, and cross-feature internal imports across `apps/web/src/features/admissions/` and `apps/web/src/app/(workspace)/admissions/`
- [x] T139 Document Admissions routes, mock credentials, exact permission limitations, file-storage limitations, and future adapter/Student/Enrollment/Finance boundaries in `README.md`
- [x] T140 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` and record exact results in `specs/005-admissions/quickstart.md`
- [x] T141 Run the complete desktop/laptop/tablet Playwright matrix and record exact results in `specs/005-admissions/quickstart.md`
- [ ] T142 Execute all ten manual quickstart scenarios and record final acceptance evidence in `specs/005-admissions/quickstart.md`
- [x] T143 Re-run the Constitution Check against implementation evidence and record the outcome in `specs/005-admissions/validation/constitution.md`
- [x] T144 Update the requirement checklist with final traceability from FR-001–FR-040 and SC-001–SC-012 to tests/evidence in `specs/005-admissions/checklists/requirements.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T002, T003, T004, and T006 can run in parallel after T001 establishes ownership.
- **Foundational (Phase 2)**: Depends on Setup and blocks every story. Public dependency projections T013–T015 can proceed in parallel after reader ports T012; service T024 follows types, errors, scope, fixtures, and readers.
- **US1 Registration (Phase 3)**: First deployable MVP after Foundation.
- **US2 Academic Selection (Phase 4)**: Depends on Foundation; integrates with the Draft editor but remains testable through selection contracts and a Draft fixture.
- **US3 Documents (Phase 5)**: Depends on Foundation; requirement applicability consumes US2 selection context, but deterministic selection fixtures allow independent implementation/testing.
- **US5 Review Decisions (Phase 6)**: Depends on Foundation and consumes readiness contracts from US1/US2/US3/US4; deterministic ready/unready fixtures permit policy and UI work in parallel, but full approval acceptance waits for those slices.
- **US4 Financials (Phase 7)**: Depends on Foundation; may proceed concurrently with US2/US3 and completes the live approval gates consumed by US5.
- **US6 Discovery (Phase 8)**: Depends on Foundation; can proceed concurrently using narrow deterministic summaries.
- **Polish (Phase 9)**: Depends on every desired story and all cross-story integrations.

### User Story Dependency Graph

```text
Setup → Foundation → US1 (MVP)
                   ├── US2 ──┐
                   ├── US3 ──┼── US5 full approval acceptance
                   ├── US4 ──┘
                   └── US6
All delivered stories → Polish
```

### Independent Test Criteria

- **US1**: Valid Applicant + separate Draft Admission can be created, resumed, edited, duplicate-resolved, and archived without Student creation or deletion.
- **US2**: Program requires one currently eligible matching Batch; Diploma/Course forbid Batch; consequences and repeated eligibility are explainable.
- **US3**: Requirement files validate, version, preview, verify/reject, and replace without inheriting decisions; unresolved required evidence blocks approval.
- **US4**: Catalog/Batch source terms and one discount mode derive exact configured totals; revisions and approved financial snapshot remain stable.
- **US5**: Only allowed exact-permission transitions succeed; approval atomically creates one immutable snapshot/event; only Approved exposes minimal enrollment readiness.
- **US6**: A scoped 10,000-record queue supports normalized search, all filters, stable sort/page, export, selection, and explicit partial bulk outcomes within the defined performance goal.

### Within Each User Story

- Write the listed tests first and confirm they fail for the intended missing behavior.
- Complete pure rules and schemas before service mutations.
- Complete service behavior before dependent screens/hooks.
- Use shared controls and public dependency contracts; do not import fixtures into screens.
- Finish story validation evidence before declaring its checkpoint complete.

### Parallel Opportunities

- Setup copy, navigation, route notes, and validation scaffolding can proceed independently.
- Foundational permissions, context, reader ports, errors, query keys, lookups, and scenarios target different files.
- Unit, contract, integration, and Playwright tests within each story are parallelizable.
- US2, US3, US4, and US6 can proceed in parallel after Foundation using deterministic Draft/selection fixtures.
- Component tasks marked [P] within each story target independent files after their story's types/contracts are stable.
- Cross-cutting permission, accessibility, responsive, performance, architecture, and future-readiness audits can run in parallel after feature integration.

---

## Parallel Examples

### User Story 1

```text
T026 applicant rule tests
T027 applicant schema tests
T028 applicant service contract tests
T029 applicant editor integration tests
T030 registration Playwright journeys
```

### User Story 2

```text
T049 academic selection schema
T050 academic selection rules
T053 offering selector
T054 eligible batch field
T055 dependency-change dialog
T056 eligibility summary
```

### User Story 3

```text
T065 document rules
T066 document command schema
T068 shared upload accessibility
T069 requirement card
T070 document actions
T071 decision dialogs
T072 document history
```

### User Story 5

```text
T085 lifecycle policy
T086 readiness policy
T087 snapshot builders
T089 readiness/actions UI
T090 transition dialog
T091 timeline
T092 approval/readiness summary
```

### User Story 4

```text
T102 money rules
T103 financial schema
T105 finance form section
T106 live financial summary
T107 financial history
```

### User Story 6

```text
T111 list-query unit tests
T112 scale unit tests
T113 list service contracts
T114 controlled-table integration tests
T115 discovery Playwright journeys
T116 query normalization
T117 scale fixtures
T119 columns
T120 toolbar
```

---

## Implementation Strategy

### MVP First — User Story 1

1. Complete Setup T001–T006.
2. Complete Foundation T007–T025.
3. Complete US1 T026–T043.
4. Stop and validate registration, Draft resume/edit, duplicate resolution, permissions/scope, stale versions, and archival independently.
5. Demo the MVP without claiming documents, approval, Student, or Finance execution.

### Incremental Delivery

1. Foundation + US1 → applicant registration and Draft management MVP.
2. Add US2 → valid academic targeting and repeatable eligibility.
3. Add US3 → version-safe document collection and verification.
4. Add US4 → exact financial preparation and history.
5. Complete US5 → full review/approval and future enrollment-ready snapshot.
6. Add US6 → scalable operational discovery, export, and bulk governance.
7. Complete cross-cutting validation and adapter-readiness evidence.

### Parallel Team Strategy

After Foundation, separate contributors may implement US2 academic selection, US3 documents, US4 financials, and US6 discovery concurrently. US5 lifecycle policy and UI may also begin against deterministic fixtures, but its full approval acceptance must integrate the completed eligibility, document, and finance gates.

---

## Notes

- `[P]` means different files and no incomplete same-phase dependency.
- `[US#]` preserves traceability to the specification even though P1 User Story 5 is scheduled before P2 User Story 4.
- Mock authorization and file handling prove frontend behavior only; future backend authorization, tenant isolation, private storage, malware scanning, uniqueness, and atomic seat reservation remain authoritative.
- Business labels and configuration are data; stable keys and IDs control behavior.
- No task may introduce permanent deletion, raw `<select>`, native alert/confirm/prompt, inline styles, cross-feature fixture imports, or Student/Enrollment/Payment execution.
