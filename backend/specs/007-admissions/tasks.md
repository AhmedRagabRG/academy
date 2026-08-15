# Tasks: Admissions

**Input**: Design documents from `/specs/007-admissions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included because the approved plan requires unit, PostgreSQL integration/migration/concurrency, E2E contract/security/upload, and scale validation for a production-ready security-sensitive workflow.

**Organization**: Tasks are grouped by the six independently testable user stories from the specification. Tests within each story are written first and must fail for the intended reason before implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no dependency on another incomplete task in the same phase
- **[Story]**: Maps the task to a specification user story
- Every task includes an exact repository-relative file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the Admissions feature shell and align the approved contract before persistence work begins.

- [x] T001 Create the Admissions directory/test skeleton from the plan in `src/modules/admissions/`, `test/unit/admissions/`, `test/integration/admissions/`, and `test/e2e/admissions/`
- [x] T002 Amend the admission archive row in `docs/api-data-requirements.html` so archive/cancellation requires a reason and no `cancelled` state or endpoint is introduced
- [x] T003 [P] Add the closed Admissions permission catalogue and deterministic descriptions to `prisma/seeds/permission-catalog.ts`
- [x] T004 [P] Define Admissions event names and redacted event payload types in `src/modules/admissions/events/admissions.events.ts`
- [x] T005 [P] Define domain enums, snapshot types, readiness findings, list projections, and safe timeline metadata in `src/modules/admissions/types/admissions.types.ts`
- [x] T006 Create the initial `AdmissionsModule` provider/export shell in `src/modules/admissions/admissions.module.ts` and register it after Program Batches in `src/app.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create persistence, constraints, public boundaries, shared errors, and transaction-safe primitives required by every user story.

**⚠️ CRITICAL**: No user story implementation begins until this phase passes migration, architecture, and type checks.

### Foundational Tests

- [x] T007 [P] Add migration text/live constraint coverage for all Admissions tables, indexes, ownership checks, and append-only triggers in `test/integration/admissions/admissions-migration.spec.ts`
- [x] T008 [P] Add permission seed idempotency and exact-key coverage in `test/integration/admissions/admissions-permissions.spec.ts`
- [x] T009 [P] Add architecture boundary checks that forbid Prisma outside repositories, foreign repository imports, filesystem access, and `any` in `test/integration/admissions/admissions-architecture.spec.ts`

### Foundational Implementation

- [x] T010 Extend `prisma/schema.prisma` with Applicant, Admission, assignments/current pointers, selection/eligibility revisions, financial revisions, policy snapshots/requirements, documents/versions/decisions, approval snapshots, lifecycle/timeline, durable request keys, and reference counters
- [x] T011 Create the Admissions PostgreSQL migration with checks, indexes, current-child ownership constraints, durable idempotency uniqueness, reference allocation support, and append-only triggers in `prisma/migrations/20260803_admissions/migration.sql`
- [x] T012 [P] Define typed Catalog, Program Batches, Organization, IAM employee, Storage, and future Students port tokens/contracts in `src/modules/admissions/types/admissions-reference.port.ts` and `src/modules/admissions/types/admissions-enrollment.port.ts`
- [x] T013 [P] Add the bounded employee-resolution public port and Identity adapter without exposing repositories in `src/modules/identity/types/employee-reference.port.ts` and `src/modules/identity/employees/employee-reference.service.ts`
- [x] T014 [P] Implement closed Admissions validation/conflict/scope/upload/dependency exceptions in `src/core/exceptions/admissions.exceptions.ts` and map relevant Prisma constraint codes in `src/database/prisma-error.mapper.ts`
- [x] T015 [P] Implement reusable exact admission Money conversion/calculation helpers, including registration-fee treatment of file-opening costs, in `src/modules/admissions/admissions/admission-financial.policy.ts`
- [x] T016 [P] Implement applicant Arabic/digit/phone/national-ID normalization and configured age/graduation rules in `src/modules/admissions/applicants/applicant.policy.ts`
- [x] T017 [P] Implement product/batch pairing, branch eligibility, consequence, and selection assessment rules in `src/modules/admissions/admissions/admission-selection.policy.ts`
- [x] T018 Implement transaction-aware Applicant and Admission aggregate repositories with compare-and-swap primitives, current-pointer ownership, immutable history inserts, and reference allocation in `src/modules/admissions/applicants/applicant.repository.ts` and `src/modules/admissions/admissions/admission.repository.ts`
- [x] T019 [P] Implement response mapping, phone masking, permission-filtered sections/actions, canonical Money serialization, and safe timeline projections in `src/modules/admissions/mappers/admission.mapper.ts`
- [x] T020 [P] Create idempotent Admissions development fixtures for applicants, all offering kinds, assignments, and document requirements in `prisma/seeds/admissions.ts`
- [x] T021 Register Admissions seeds after Program Batches and verify repeat ordering in `prisma/seed.ts`
- [x] T022 Wire all reference adapters, repositories, storage token, event bus, and enrollment export in `src/modules/admissions/admissions.module.ts`
- [x] T023 Run the foundational migration, seed-twice, Prisma generation/validation, architecture, and strict TypeScript gates and record fixes in `test/integration/admissions/admissions-migration.spec.ts`

**Checkpoint**: Admissions persistence and integration boundaries are ready; user stories can now be implemented without cross-module data access.

---

## Phase 3: User Story 1 — Create a Complete Admission Draft (Priority: P1) 🎯 MVP

**Goal**: Create or reuse a validated applicant and atomically produce a complete draft admission with mandatory assignments, eligible selection, immutable price/policy snapshots, document placeholders, unique reference, and initial history.

**Independent Test**: Create one admission for each offering kind, verify Program/batch pairing and all initial rows, then exercise duplicate resolutions, invalid references, idempotent retry, and injected rollback.

### Tests for User Story 1

- [x] T024 [P] [US1] Add unit tests for applicant identity, minor/guardian, alternative identity, graduation, normalization, and duplicate-resolution DTO rules in `test/unit/admissions/applicant-policy.spec.ts` and `test/unit/admissions/admission-create-dto.spec.ts`
- [x] T025 [P] [US1] Add unit tests for product/batch/branch pairing and initial exact financial calculation in `test/unit/admissions/admission-selection-policy.spec.ts` and `test/unit/admissions/admission-financial-policy.spec.ts`
- [x] T026 [P] [US1] Add PostgreSQL integration tests for create/reuse/exception, reference/idempotency races, full aggregate atomicity, and post-commit event behavior in `test/integration/admissions/admission-create.spec.ts`
- [x] T027 [P] [US1] Add E2E contract tests for `POST /admissions/duplicates` and `POST /admissions`, including envelopes, permissions, validation, CSRF, and forbidden server-owned fields in `test/e2e/admissions/admission-create.e2e-spec.ts`

### Implementation for User Story 1

- [x] T028 [P] [US1] Implement nested applicant and duplicate-resolution DTOs with strict validation in `src/modules/admissions/admissions/dto/applicant-input.dto.ts` and `src/modules/admissions/admissions/dto/duplicate-resolution.dto.ts`
- [x] T029 [P] [US1] Implement mandatory assignment, selection, discount, and create-command DTOs in `src/modules/admissions/admissions/dto/create-admission.dto.ts`
- [x] T030 [US1] Implement indexed duplicate candidate lookup and explicit use-existing/create-exception resolution in `src/modules/admissions/applicants/applicant.repository.ts` and `src/modules/admissions/applicants/applicant.service.ts`
- [x] T031 [US1] Implement admission creation orchestration across reference allocation, applicant, assignment, eligibility, financial revision, document policy snapshot/placeholders, lifecycle/timeline, and durable request key in `src/modules/admissions/admissions/admission.service.ts`
- [x] T032 [US1] Implement duplicate and create endpoints with `admissions.create`, current caller, Swagger, and bare response payloads in `src/modules/admissions/admissions/admission.controller.ts`
- [x] T033 [US1] Map created aggregates to the exact full-detail contract and emit sanitized post-commit creation events in `src/modules/admissions/mappers/admission.mapper.ts` and `src/modules/admissions/events/admissions.events.ts`
- [x] T034 [US1] Run the US1 unit/integration/E2E tests and validate the complete MVP scenario against section 3–4 of `specs/007-admissions/quickstart.md`

**Checkpoint**: A complete, secure, idempotent draft can be created and independently inspected in persistence; this is the MVP.

---

## Phase 4: User Story 2 — Find, Review, and Maintain Admissions (Priority: P2)

**Goal**: Provide branch-scoped list/detail/export and draft maintenance with PII redaction, stable pagination, field-sensitive permissions, applicant archival, and optimistic concurrency.

**Independent Test**: Seed mixed-scope admissions, validate every canonical search/filter/sort/page and list redaction, retrieve permission-filtered details, update a draft, archive an applicant, and reject stale/non-draft/out-of-scope actions.

### Tests for User Story 2

- [x] T035 [P] [US2] Add unit tests for list query coercion, scalar filters, stable sort allowlist, page limits, phone masking, and section redaction in `test/unit/admissions/admission-query.spec.ts` and `test/unit/admissions/admission-mapper.spec.ts`
- [x] T036 [P] [US2] Add integration tests for indexed Arabic search, filters, scope, pagination, detail projection, draft update atomicity, version races, and applicant archive in `test/integration/admissions/admission-query-update.spec.ts`
- [x] T037 [P] [US2] Add E2E tests for list/detail/update/applicant archive and UTF-8 BOM export contracts and permissions in `test/e2e/admissions/admission-management.e2e-spec.ts`

### Implementation for User Story 2

- [x] T038 [P] [US2] Implement canonical list/search/filter/sort/pagination and export query DTOs in `src/modules/admissions/admissions/dto/list-admissions.dto.ts`
- [x] T039 [P] [US2] Implement protected draft update and reason-required applicant archive DTOs in `src/modules/admissions/admissions/dto/update-admission.dto.ts` and `src/modules/admissions/applicants/dto/archive-applicant.dto.ts`
- [x] T040 [US2] Implement indexed list/count/detail/export projections with branch scope and deterministic ID tie-breakers in `src/modules/admissions/admissions/admission.repository.ts`
- [x] T041 [US2] Implement list/detail/export, field-sensitive draft update, private-note timeline signaling, and applicant archival services in `src/modules/admissions/admissions/admission.service.ts` and `src/modules/admissions/applicants/applicant.service.ts`
- [x] T042 [US2] Add list/export/detail/update and applicant archive endpoints with exact permissions and Swagger response shapes in `src/modules/admissions/admissions/admission.controller.ts` and `src/modules/admissions/applicants/applicant.controller.ts`
- [x] T043 [US2] Implement streaming UTF-8 BOM CSV projection without unauthorized PII leakage in `src/modules/admissions/admissions/admission-export.service.ts`
- [x] T044 [US2] Run US2 tests and the 10,000-record query/redaction/export scenarios from sections 5–6 of `specs/007-admissions/quickstart.md`

**Checkpoint**: Operational admission management is independently usable without exposing sensitive list data or permitting unsafe edits.

---

## Phase 5: User Story 3 — Revise Selection and Financial Preparation (Priority: P3)

**Goal**: Change academic selection with explicit consequence acknowledgement and update discounts through immutable, exact financial revisions while preserving all historical pricing.

**Independent Test**: Change a draft/review-correctable admission between eligible offerings, verify policy/financial consequences and histories, then test exact discount boundaries, source changes, stale versions, and later Catalog/Batch price changes.

### Tests for User Story 3

- [x] T045 [P] [US3] Add unit tests for consequence sets, re-eligibility reason aggregation, discount modes, exact minor-unit arithmetic, and file-opening-fee folding in `test/unit/admissions/admission-revision-policy.spec.ts`
- [x] T046 [P] [US3] Add integration tests for append-only selection/financial revisions, current pointers, source snapshots, concurrent revision numbers, and trigger denial in `test/integration/admissions/admission-revisions.spec.ts`
- [x] T047 [P] [US3] Add E2E contract/permission tests for selection, financials, and financial-history endpoints in `test/e2e/admissions/admission-revisions.e2e-spec.ts`

### Implementation for User Story 3

- [x] T048 [P] [US3] Implement dedicated selection-change and financial-update DTOs with expectedVersion and consequence validation in `src/modules/admissions/admissions/dto/admission-revision.dto.ts`
- [x] T049 [US3] Implement selection re-evaluation, source-version pinning, document-policy consequence planning, and immutable selection revision insertion in `src/modules/admissions/admissions/admission-selection.service.ts`
- [x] T050 [US3] Implement exact discount derivation, immutable financial revision insertion, current-pointer switch, and financial history retrieval in `src/modules/admissions/admissions/admission-financial.service.ts`
- [x] T051 [US3] Add selection, financial update, and financial-history routes with academic/finance permissions and conflict mapping in `src/modules/admissions/admissions/admission.controller.ts`
- [x] T052 [US3] Emit safe selection/finance timeline and post-commit audit events without monetary detail in `src/modules/admissions/events/admissions.events.ts` and `src/modules/admissions/admissions/admission.repository.ts`
- [x] T053 [US3] Run US3 tests and exact pricing/selection-history scenarios from sections 7–8 of `specs/007-admissions/quickstart.md`

**Checkpoint**: Academic and financial commitments are independently revisable without retroactively mutating any existing snapshot.

---

## Phase 6: User Story 4 — Collect and Verify Required Documents (Priority: P4)

**Goal**: Upload, replace, withdraw, inspect, verify/reject, and policy-refresh admission documents with signature/size validation, durable idempotency, immutable versions/decisions, and storage compensation.

**Independent Test**: Exercise valid and invalid PDF/JPEG/PNG files, retries, replacement, withdrawal, verification, rejection, version history, policy reconciliation, storage/DB failure compensation, permissions, and readiness state.

### Tests for User Story 4

- [x] T054 [P] [US4] Add unit tests for requirement limits, AdmissionDocumentState derivation, rejection reasons, version selection, and refresh reconciliation in `test/unit/admissions/admission-document-policy.spec.ts`
- [X] T055 [P] [US4] Add integration tests for durable upload idempotency, version/current-pointer races, decisions, append-only enforcement, policy refresh, and storage compensation in `test/integration/admissions/admission-documents.spec.ts`
- [X] T056 [P] [US4] Add multipart E2E tests for document list/upload/replace/withdraw/verify/versions/refresh-policy, signatures, limits, permissions, and errors in `test/e2e/admissions/admission-documents.e2e-spec.ts`

### Implementation for User Story 4

- [x] T057 [P] [US4] Implement multipart metadata, withdrawal, verification, and policy-refresh DTOs in `src/modules/admissions/documents/dto/admission-document.dto.ts`
- [x] T058 [US4] Implement transaction-aware requirement/document/version/decision repository operations and durable idempotency lookup in `src/modules/admissions/documents/admission-document.repository.ts`
- [x] T059 [US4] Implement storage-first upload/replace with signature checks and compensation, withdrawal, verification, history, and derived state in `src/modules/admissions/documents/admission-document.service.ts`
- [x] T060 [US4] Implement stable-key document policy snapshot/reconciliation while retaining satisfying versions in `src/modules/admissions/documents/admission-document-policy.service.ts`
- [x] T061 [US4] Add all canonical document endpoints with upload interceptors, size bounds, document permissions, and Swagger multipart/error shapes in `src/modules/admissions/documents/admission-document.controller.ts`
- [x] T062 [US4] Register document providers/controller and storage configuration in `src/modules/admissions/admissions.module.ts`
- [X] T063 [US4] Run US4 tests and document lifecycle/compensation scenarios from section 9 of `specs/007-admissions/quickstart.md`

**Checkpoint**: Documents satisfy a snapshotted policy with complete immutable evidence and no permanent file-version deletion.

---

## Phase 7: User Story 5 — Review and Decide an Admission (Priority: P5)

**Goal**: Enforce submit/review/approve/reject/return/archive transitions, readiness, reviewer ownership, approval snapshots, partial-success bulk actions, immutable lifecycle, and complete safe timeline history.

**Independent Test**: Traverse every allowed/refused lifecycle edge, aggregate all readiness findings, race reviewers/transitions, verify reasons and permissions, inspect immutable histories, and archive a cancellation without introducing a cancelled state.

### Tests for User Story 5

- [x] T064 [P] [US5] Add unit tests for lifecycle matrix, archive/reject/return reasons, reviewer ownership, submit/approve readiness, available actions, and safe timeline metadata in `test/unit/admissions/admission-lifecycle-policy.spec.ts`
- [X] T065 [P] [US5] Add integration tests for transition compare-and-swap, review races, approval snapshot one-time ownership, lifecycle/timeline immutability, and bulk per-item transactions in `test/integration/admissions/admission-lifecycle.spec.ts`
- [X] T066 [P] [US5] Add E2E tests for status/bulk/readiness/lifecycle permissions, errors, partial HTTP 200, approval, return, rejection, and reason-required archival in `test/e2e/admissions/admission-lifecycle.e2e-spec.ts`

### Implementation for User Story 5

- [x] T067 [P] [US5] Implement status, bulk-status, and readiness query DTOs with closed statuses/actions and required reason rules in `src/modules/admissions/admissions/dto/admission-lifecycle.dto.ts`
- [x] T068 [US5] Implement one shared submit/approve readiness evaluator covering identity, assignments, live eligibility, finance, and stage-specific documents in `src/modules/admissions/readiness/admission-readiness.service.ts`
- [x] T069 [US5] Implement lifecycle/active-reviewer policy, exact permission mapping, available actions, and terminal archive/enrolled rules in `src/modules/admissions/admissions/admission.policy.ts`
- [x] T070 [US5] Implement atomic status transitions, one-time approval snapshot, lifecycle/timeline insertion, reviewer acquisition/clearance, and post-commit events in `src/modules/admissions/admissions/admission-lifecycle.service.ts`
- [x] T071 [US5] Implement bounded independent per-item bulk transition orchestration and result ordering in `src/modules/admissions/admissions/admission-lifecycle.service.ts`
- [x] T072 [US5] Add status, bulk-status, readiness, and lifecycle endpoints with exact action permissions and closed errors in `src/modules/admissions/admissions/admission.controller.ts`
- [X] T073 [US5] Run US5 tests and readiness/reviewer/lifecycle/archive/timeline scenarios from sections 10–11 of `specs/007-admissions/quickstart.md`

**Checkpoint**: The full admission decision workflow is enforced with one immutable audit trail and cancellation safely represented by archival.

---

## Phase 8: User Story 6 — Prepare an Approved Admission for Enrollment (Priority: P6)

**Goal**: Expose a stable approved enrollment-readiness snapshot and an idempotent internal acknowledgement boundary for future Student Management without creating Student records.

**Independent Test**: Request readiness for incomplete/non-approved/approved admissions, consume one approval snapshot twice with the same reference, reject a different reference/stale version, and verify one enrolled transition with no Student persistence access.

### Tests for User Story 6

- [x] T074 [P] [US6] Add unit tests for enrollment-readiness reason projection and acknowledgement idempotency rules in `test/unit/admissions/admission-enrollment-readiness.spec.ts`
- [X] T075 [P] [US6] Add integration tests for immutable approval handoff resolution, repeated acknowledgement, conflicting external reference, and enrolled transition atomicity in `test/integration/admissions/admission-enrollment-port.spec.ts`
- [X] T076 [P] [US6] Add E2E permission/redaction/contract tests for `GET /admissions/:id/enrollment-readiness` in `test/e2e/admissions/admission-enrollment-readiness.e2e-spec.ts`

### Implementation for User Story 6

- [x] T077 [US6] Implement enrollment-readiness projection from the immutable approval snapshot and current admission state in `src/modules/admissions/readiness/admission-readiness.service.ts`
- [x] T078 [US6] Implement `ADMISSIONS_ENROLLMENT_PORT` readiness and idempotent acknowledgement adapter without Student repository access in `src/modules/admissions/readiness/admissions-enrollment.service.ts`
- [x] T079 [US6] Add the enrollment-readiness HTTP endpoint and permission-protected Swagger response in `src/modules/admissions/admissions/admission.controller.ts`
- [x] T080 [US6] Export only the bounded enrollment port from `src/modules/admissions/admissions.module.ts` and add a cross-module contract test in `test/integration/admissions/admission-enrollment-port.spec.ts`
- [X] T081 [US6] Run US6 tests and approval/enrollment handoff scenarios from section 12 of `specs/007-admissions/quickstart.md`

**Checkpoint**: Admissions is ready for Student Management integration while preserving domain ownership and intake idempotency.

---

## Phase 9: Lookups, Documentation, and Cross-Cutting Finalization

**Purpose**: Complete the frontend lookup contract, security/observability hardening, Swagger, scale evidence, and full regression after all desired stories are implemented.

- [X] T082 [P] Add E2E contract tests for consolidated status-aware and dependent Admissions lookups in `test/e2e/admissions/admissions-lookups.e2e-spec.ts`
- [x] T083 Implement bounded branches/employees/managers/departments/lead-sources/grades/qualifications/offerings/batches/policy/currency lookup composition in `src/modules/admissions/lookups/admissions-lookups.service.ts`
- [x] T084 Add `GET /admissions/lookups` with disabledReason propagation and `admissions.view` permission in `src/modules/admissions/lookups/admissions-lookups.controller.ts`
- [x] T085 [P] Add concrete Swagger DTOs/decorators for every success, list, upload, readiness, history, bulk, CSV, and closed error shape in `src/modules/admissions/admissions/dto/admission-response.dto.ts` and `src/shared/swagger/admissions-api.decorator.ts`
- [X] T086 [P] Add safe structured domain-event and logging disclosure tests for every material action in `test/e2e/admissions/admissions-logging.e2e-spec.ts`
- [X] T087 [P] Add full permission/branch-scope/PII/CSRF/CORS/security-surface coverage in `test/e2e/admissions/admissions-security.e2e-spec.ts`
- [X] T088 [P] Add a 10,000-admission indexed query benchmark and bounded lookup evidence in `test/integration/admissions/admissions-query-performance.spec.ts`
- [x] T089 Verify all 23 operations, DTO fields, scalar filters, CSV behavior, errors, permissions, and archive-reason amendment against `docs/api-data-requirements.html` and update `specs/007-admissions/contracts/admissions-http.contract.md` only for discovered canonical corrections
- [X] T090 Run Prisma generate/validate/deploy on fresh and upgrade databases, seed twice, lint, build, unit, Admissions integration/E2E, and the full regression suite; record results in `specs/007-admissions/quickstart.md`
- [x] T091 Run architecture/disclosure scans and final controller→service→repository, transaction, versioning, append-only, storage, authorization, strict-type, and clean-code review using `specs/007-admissions/quickstart.md`
- [x] T092 Refactor verified duplication without changing contracts and complete final Swagger/API/validation/authorization sign-off in `src/modules/admissions/` and `specs/007-admissions/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story.
- **US1 / MVP (Phase 3)**: Depends on Foundation; establishes the complete Admission aggregate.
- **US2 (Phase 4)**: Depends on US1 persistence/create semantics for meaningful list/detail/update fixtures.
- **US3 (Phase 5)**: Depends on US1 revisions/current pointers; can run alongside late US2 endpoint work after repository contracts stabilize.
- **US4 (Phase 6)**: Depends on US1 policy snapshots/document placeholders; can run alongside US2/US3 after Foundation and US1.
- **US5 (Phase 7)**: Depends on US1 and readiness inputs from US3/US4; review/approval requires selection, finance, and documents.
- **US6 (Phase 8)**: Depends on US5 approval snapshots and enrolled transition.
- **Finalization (Phase 9)**: Depends on all selected user stories.

### User Story Dependency Graph

```text
Setup → Foundation → US1 (Create Draft MVP)
                         ├──→ US2 (Find/Maintain)
                         ├──→ US3 (Selection/Finance) ──┐
                         └──→ US4 (Documents) ─────────┼──→ US5 (Workflow/Approval) → US6 (Enrollment Readiness)
                                                      └──→ Finalization
US2 ───────────────────────────────────────────────────────────────────────────→ Finalization
```

### Within Each User Story

- Write listed tests first and confirm they fail for missing behavior.
- DTOs/policies precede repositories and services.
- Repositories precede service orchestration.
- Services precede controllers.
- Run the story-specific tests and quickstart checkpoint before starting dependent stories.
- Domain events emit only after successful transaction commit.

## Parallel Opportunities

- Setup tasks T003–T005 are parallel after T001.
- Foundational tests T007–T009 and type/policy/port tasks T012–T017/T019–T020 can run in parallel around the sequential schema/migration/repository spine.
- Within every story, `[P]` test files can be authored concurrently before implementation.
- After US1, US2, US3, and US4 can have parallel workstreams; US5 waits for the selection/finance/document readiness inputs.
- Finalization tests T082/T085–T088 can run in parallel after their target surfaces exist.

## Parallel Execution Examples

### User Story 1

```text
T024 applicant/DTO unit tests
T025 selection/finance unit tests
T026 creation transaction integration tests
T027 create/duplicate E2E contract tests
```

### User Story 2

```text
T035 query/mapper unit tests
T036 query/update integration tests
T037 management/export E2E tests
T038 list DTOs and T039 update/archive DTOs
```

### User Story 3

```text
T045 revision policy unit tests
T046 revision persistence tests
T047 revision endpoint E2E tests
```

### User Story 4

```text
T054 document policy unit tests
T055 document persistence/idempotency tests
T056 multipart contract tests
```

### User Story 5

```text
T064 lifecycle/readiness unit tests
T065 lifecycle concurrency integration tests
T066 lifecycle contract E2E tests
```

### User Story 6

```text
T074 readiness/idempotency unit tests
T075 enrollment port integration tests
T076 readiness endpoint E2E tests
```

## Implementation Strategy

### MVP First — User Story 1

1. Complete Setup and Foundation.
2. Complete US1 tests, DTOs, duplicate handling, transactional create service, and endpoints.
3. Stop and validate draft creation independently for Program, Diploma, and Course.
4. Demonstrate the complete draft aggregate before adding management/revision/document/workflow surfaces.

### Incremental Delivery

1. Foundation → safe schema, ports, transactions, permissions.
2. US1 → independently creatable admission MVP.
3. US2 → operational search/detail/update/export.
4. US3 and US4 → immutable academic/financial and document evidence.
5. US5 → controlled submission/review/approval/archive lifecycle.
6. US6 → Student Management handoff readiness.
7. Finalization → lookups, Swagger, scale, security, full regression.

## Notes

- `[P]` means different files or isolated work with no dependency on an incomplete task.
- There is no permanent document delete task: “Delete” from the input is implemented as withdrawal while versions remain immutable.
- There is no separate file-opening-fee field: it remains included in registration fees per the approved contract.
- There is no cancelled status: cancellation is reason-required archival.
- Commit after each task or coherent task group and preserve unrelated working-tree changes.
