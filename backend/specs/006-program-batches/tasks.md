---

description: "Implementation tasks for Program Batches"
---

# Tasks: Program Batches

**Input**: Design documents from `/specs/006-program-batches/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required by the specification and quickstart. Test tasks appear before implementation tasks in every user-story phase and must fail first.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: May run in parallel because it changes a distinct file and has no incomplete dependency.
- **[Story]**: Maps the task to a user story from `spec.md`.
- Every task names an exact repository path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the feature structure and an executable baseline.

- [X] T001 Create the Program Batches feature directory structure and placeholder barrels described by the plan under `src/modules/program-batches/`
- [X] T002 [P] Create unit, integration, and end-to-end test directory scaffolding under `test/unit/program-batches/`, `test/integration/program-batches/`, and `test/e2e/program-batches/`
- [X] T003 [P] Add Program Batches seed entry point and fixture types in `prisma/seeds/program-batches.ts`
- [X] T004 [P] Record the baseline typecheck, test, and build results in `specs/006-program-batches/quickstart.md`
- [X] T005 Add the `ProgramBatchesModule` shell in `src/modules/program-batches/program-batches.module.ts`
- [X] T006 Register `ProgramBatchesModule` without exposing routes yet in `src/app.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the persistence, contracts, errors, and dependency ports required by every user story.

**⚠️ CRITICAL**: No user-story implementation starts until this phase is complete.

- [X] T007 Define Program Batch enums and the `ProgramBatch` model in `prisma/schema.prisma`
- [X] T008 Define `BatchBranchAssignment`, `BatchFinancialRevision`, `BatchInstallmentPlan`, `BatchInstallment`, `BatchOffer`, and `BatchLifecycleEvent` models and constraints in `prisma/schema.prisma`
- [X] T009 Add the Program Batches SQL migration, including normalized program-scoped batch-code uniqueness and lifecycle-version uniqueness, in `prisma/migrations/*_program_batches/migration.sql`
- [X] T010 Add append-only database triggers denying update and delete of financial revisions, revision children, and lifecycle events in `prisma/migrations/*_program_batches/migration.sql`
- [X] T011 [P] Add migration assertions for foreign keys, uniqueness, indexes, and append-only triggers in `test/integration/program-batches/program-batches-migration.spec.ts`
- [X] T012 [P] Add exact-money scale and overflow migration tests in `test/integration/program-batches/program-batches-money-migration.spec.ts`
- [X] T013 Define domain enums, aggregate types, query filters, and view models in `src/modules/program-batches/types/program-batch.types.ts`
- [X] T014 [P] Implement batch-code and lookup-key normalization helpers in `src/modules/program-batches/types/batch-normalization.ts`
- [X] T015 [P] Define the outbound `PROGRAM_BATCHES_PUBLIC_PORT` contract in `src/modules/program-batches/types/program-batches-public.port.ts`
- [X] T016 [P] Define the inbound enrollment-count and dependency contract in `src/modules/program-batches/types/batch-reference.port.ts`
- [X] T017 Extend the catalog public port with Professional Program eligibility and stable product-reference reads in `src/modules/catalog/types/catalog-public.port.ts`
- [X] T018 Define the narrow organization defaults and master-data validation contract in `src/modules/organization/types/organization-settings.port.ts`
- [X] T019 Export the organization settings/master-data port providers from `src/modules/organization/organization.module.ts`
- [X] T020 Implement the pre-Admissions zero-enrollment dependency provider in `src/modules/program-batches/types/batch-reference.port.ts`
- [X] T021 [P] Add typed Program Batch domain exceptions and stable error codes in `src/core/exceptions/program-batch.exceptions.ts`
- [X] T022 Map Program Batch Prisma uniqueness, foreign-key, trigger, and serialization failures in `src/database/prisma-error.mapper.ts`
- [X] T023 [P] Define create, update, status-change, financial-revision, and branch-change domain events in `src/modules/program-batches/events/program-batch.events.ts`
- [X] T024 [P] Implement aggregate-to-contract mapping primitives in `src/modules/program-batches/mappers/program-batch.mapper.ts`
- [X] T025 Implement the Prisma-backed repository transaction boundary and aggregate hydration primitives in `src/modules/program-batches/batches/batch.repository.ts`
- [X] T026 Wire Prisma, dependency ports, repository, event publisher, and public-port tokens in `src/modules/program-batches/program-batches.module.ts`
- [X] T027 Add deterministic Program Batch fixtures, intake lookups, and permission seed assignments in `prisma/seeds/program-batches.ts`

**Checkpoint**: Schema, migration, ports, errors, and module wiring are ready for story work.

---

## Phase 3: User Story 1 - Create and Maintain a Program Batch (Priority: P1) 🎯 MVP

**Goal**: Authorized administrators can create and edit a batch belonging to a Professional Program while preserving immutable identity rules.

**Independent Test**: Create a valid batch beneath a Professional Program, retrieve it, update mutable basic fields, and confirm duplicate codes, ineligible product types, immutable ownership, and archived edits are rejected.

### Tests for User Story 1

> Write these tests first and verify they fail before implementing the story.

- [X] T028 [P] [US1] Add create/update DTO validation and normalization unit tests in `test/unit/program-batches/batch-command-dto.spec.ts`
- [X] T029 [P] [US1] Add repository create, hydrate, update, and optimistic-version integration tests in `test/integration/program-batches/batch-command-repository.spec.ts`
- [X] T030 [P] [US1] Add nested create, details, and update contract tests with response envelopes in `test/e2e/program-batches/batch-management.e2e-spec.ts`
- [X] T031 [P] [US1] Add duplicate-code, non-program product, cross-program ID, immutable-field, and archived-write rejection tests in `test/e2e/program-batches/batch-management-errors.e2e-spec.ts`

### Implementation for User Story 1

- [X] T032 [P] [US1] Implement create and update request DTOs with nested-route ownership and version validation in `src/modules/program-batches/batches/dto/upsert-batch.dto.ts`
- [X] T033 [P] [US1] Implement Program Batch response DTOs and Swagger schemas in `src/modules/program-batches/batches/dto/batch-response.dto.ts`
- [X] T034 [US1] Implement Professional Program eligibility, academic-year existence, intake, and immutable-field policies in `src/modules/program-batches/batches/batch.policy.ts`
- [X] T035 [US1] Implement transactional create with normalized program-scoped code reservation and initial version in `src/modules/program-batches/batches/batch.repository.ts`
- [X] T036 [US1] Implement compare-and-swap update and nested program ownership enforcement in `src/modules/program-batches/batches/batch.repository.ts`
- [X] T037 [US1] Implement create, details, and update command orchestration without controller business logic in `src/modules/program-batches/batches/batch.service.ts`
- [X] T038 [US1] Emit creation and update events only after successful commit in `src/modules/program-batches/batches/batch.service.ts`
- [X] T039 [US1] Expose `POST`, `GET :batchId`, and `PATCH :batchId` nested routes in `src/modules/program-batches/batches/batch.controller.ts`
- [X] T040 [US1] Apply authentication, `batches.create`, `batches.view`, and `batches.update` permission guards in `src/modules/program-batches/batches/batch.controller.ts`
- [X] T041 [US1] Register US1 DTOs, policy, service, controller, and repository providers in `src/modules/program-batches/program-batches.module.ts`

**Checkpoint**: The core batch aggregate is independently creatable, readable, and editable.

---

## Phase 4: User Story 2 - Find and Review Program Batches (Priority: P2)

**Goal**: Authorized users can list and inspect batches using stable search, filters, sorting, and pagination.

**Independent Test**: Seed batches across programs, years, intakes, statuses, and branches; verify filters, normalized search, deterministic ordering, page metadata, nested scoping, and details output.

### Tests for User Story 2

- [X] T042 [P] [US2] Add list query validation, filter coercion, and sort allowlist tests in `test/unit/program-batches/batch-list-query.spec.ts`
- [X] T043 [P] [US2] Add combined search/filter/sort/pagination repository tests in `test/integration/program-batches/batch-query-repository.spec.ts`
- [X] T044 [P] [US2] Add nested list and details response contract tests in `test/e2e/program-batches/batch-query.e2e-spec.ts`

### Implementation for User Story 2

- [X] T045 [P] [US2] Implement search, academic-year, intake, status, branch, sorting, and pagination DTOs in `src/modules/program-batches/batches/dto/list-batches.dto.ts`
- [X] T046 [P] [US2] Implement paginated response metadata DTOs in `src/modules/program-batches/batches/dto/batch-response.dto.ts`
- [X] T047 [US2] Implement indexed, deterministic list and count queries scoped to `programId` in `src/modules/program-batches/batches/batch.repository.ts`
- [X] T048 [US2] Implement list orchestration and detail projection enrichment in `src/modules/program-batches/batches/batch.service.ts`
- [X] T049 [US2] Map list summaries, detail views, status, and version consistently in `src/modules/program-batches/mappers/program-batch.mapper.ts`
- [X] T050 [US2] Expose `GET /api/v1/programs/:programId/batches` with Swagger query documentation in `src/modules/program-batches/batches/batch.controller.ts`
- [X] T051 [US2] Add `batches.list` authorization and archived-record visibility policy in `src/modules/program-batches/batches/batch.controller.ts`

**Checkpoint**: Batch management screens can independently discover and inspect all authorized records.

---

## Phase 5: User Story 3 - Configure Schedule, Capacity, and Branches (Priority: P3)

**Goal**: Administrators can configure chronological dates, positive capacity, and eligible registration/study branches while capacity state is calculated from live enrollment counts.

**Independent Test**: Update schedule, maximum students, and both branch sets; verify chronology, branch eligibility, live counts, remaining seats, and all four fixed capacity states including a maximum below ten.

### Tests for User Story 3

- [X] T052 [P] [US3] Add date chronology, positive capacity, and branch-set validation tests in `test/unit/program-batches/batch-operational-policy.spec.ts`
- [X] T053 [P] [US3] Add exact integer capacity-state boundary tests in `test/unit/program-batches/batch-capacity.service.spec.ts`
- [X] T054 [P] [US3] Add enrollment dependency, branch replacement, and atomic update integration tests in `test/integration/program-batches/batch-operations.spec.ts`
- [X] T055 [P] [US3] Add schedule, capacity, branch, and derived-state API tests in `test/e2e/program-batches/batch-operations.e2e-spec.ts`

### Implementation for User Story 3

- [X] T056 [P] [US3] Add schedule, maximum-student, registration-branch, and study-branch fields to command DTOs in `src/modules/program-batches/batches/dto/upsert-batch.dto.ts`
- [X] T057 [US3] Implement chronological schedule and branch assignment policies in `src/modules/program-batches/batches/batch.policy.ts`
- [X] T058 [US3] Implement `AVAILABLE`, `NEARLY_FULL`, `FULL`, and `OVER_CAPACITY` derivation using integer arithmetic in `src/modules/program-batches/capacity/batch-capacity.service.ts`
- [X] T059 [US3] Implement live current-student lookup and safe available-seat projection in `src/modules/program-batches/capacity/batch-capacity.service.ts`
- [X] T060 [US3] Implement atomic branch-set replacement with duplicate and cross-organization validation in `src/modules/program-batches/batches/batch.repository.ts`
- [X] T061 [US3] Integrate operational policies and live capacity derivation into create, update, list, and details flows in `src/modules/program-batches/batches/batch.service.ts`
- [X] T062 [US3] Map schedule, branch assignments, maximum/current/available students, and capacity status in `src/modules/program-batches/mappers/program-batch.mapper.ts`
- [X] T063 [US3] Emit capacity and branch-change events after commit in `src/modules/program-batches/batches/batch.service.ts`

**Checkpoint**: Operational configuration is valid and capacity data is automatic rather than client-maintained.

---

## Phase 6: User Story 4 - Manage Batch Financial Defaults (Priority: P4)

**Goal**: Administrators can set batch-specific pricing, installment plans, discounts, and scholarships as immutable revisions without changing historical enrollment terms.

**Independent Test**: Create and revise financial defaults, confirm exact amounts and current revision selection, inspect revision history, and prove prior revisions and children cannot be mutated or deleted.

### Tests for User Story 4

- [X] T064 [P] [US4] Add exact-money, installment-total, offer-window, discount, and scholarship policy tests in `test/unit/program-batches/batch-financial.policy.spec.ts`
- [X] T065 [P] [US4] Add append-only financial revision and child persistence tests in `test/integration/program-batches/batch-financial-repository.spec.ts`
- [X] T066 [P] [US4] Add concurrent financial revision serialization and retry tests in `test/integration/program-batches/batch-financial-concurrency.spec.ts`
- [X] T067 [P] [US4] Add create/update/detail and financial-revision history contract tests in `test/e2e/program-batches/batch-financial.e2e-spec.ts`

### Implementation for User Story 4

- [X] T068 [P] [US4] Implement financial, installment-plan, installment, discount, and scholarship DTOs in `src/modules/program-batches/batches/dto/batch-financial.dto.ts`
- [X] T069 [P] [US4] Add financial revision and history response schemas in `src/modules/program-batches/batches/dto/batch-response.dto.ts`
- [X] T070 [US4] Implement exact-money conversion, non-negative validation, installment totals, and offer rules in `src/modules/program-batches/financial/batch-financial.policy.ts`
- [X] T071 [US4] Implement serializable append-only revision creation with revision-owned children in `src/modules/program-batches/batches/batch.repository.ts`
- [X] T072 [US4] Implement current and historical financial revision reads in `src/modules/program-batches/batches/batch.repository.ts`
- [X] T073 [US4] Integrate initial financial defaults and update-time revision appends in `src/modules/program-batches/batches/batch.service.ts`
- [X] T074 [US4] Implement financial history orchestration without exposing mutation operations in `src/modules/program-batches/batches/batch.service.ts`
- [X] T075 [US4] Expose `GET /api/v1/batches/:batchId/financial-revisions` in `src/modules/program-batches/batches/batch-consumer.controller.ts`
- [X] T076 [US4] Apply the required financial view and update permissions in `src/modules/program-batches/batches/batch.controller.ts` and `src/modules/program-batches/batches/batch-consumer.controller.ts`
- [X] T077 [US4] Emit financial-change events referencing the appended revision after commit in `src/modules/program-batches/batches/batch.service.ts`

**Checkpoint**: Batch financial defaults override catalog defaults while historical revisions remain immutable.

---

## Phase 7: User Story 5 - Control Registration and Academic Lifecycle (Priority: P5)

**Goal**: Authorized administrators move batches through valid lifecycle transitions, lock identity at first registration opening, archive instead of delete, and receive actionable readiness failures.

**Independent Test**: Exercise every allowed and forbidden transition, open registration only when ready, verify code/program identity locks permanently, archive historical records, and reject later mutation.

### Tests for User Story 5

- [X] T078 [P] [US5] Add lifecycle transition matrix, readiness, identity lock, and historical immutability tests in `test/unit/program-batches/batch-lifecycle-policy.spec.ts`
- [X] T079 [P] [US5] Add append-only lifecycle version and compare-and-swap transition tests in `test/integration/program-batches/batch-lifecycle-repository.spec.ts`
- [X] T080 [P] [US5] Add simultaneous transition concurrency tests in `test/integration/program-batches/batch-lifecycle-concurrency.spec.ts`
- [X] T081 [P] [US5] Add status, readiness, activate, archive, and forbidden-transition API tests in `test/e2e/program-batches/batch-lifecycle.e2e-spec.ts`

### Implementation for User Story 5

- [X] T082 [P] [US5] Implement status-change request and readiness response DTOs in `src/modules/program-batches/batches/dto/batch-lifecycle.dto.ts`
- [X] T083 [US5] Implement the explicit lifecycle transition matrix and terminal archived policy in `src/modules/program-batches/batches/batch.policy.ts`
- [X] T084 [US5] Implement registration-open readiness evaluation across schedule, capacity, finance, and branches in `src/modules/program-batches/batches/batch.service.ts`
- [X] T085 [US5] Implement serializable compare-and-swap status transitions with append-only lifecycle events in `src/modules/program-batches/batches/batch.repository.ts`
- [X] T086 [US5] Persist permanent code and owning-program identity locks on the first registration-open transition in `src/modules/program-batches/batches/batch.repository.ts`
- [X] T087 [US5] Implement transition, activate, archive, and readiness service operations in `src/modules/program-batches/batches/batch.service.ts`
- [X] T088 [US5] Expose `PATCH .../:batchId/status` and `GET .../:batchId/readiness` nested endpoints in `src/modules/program-batches/batches/batch.controller.ts`
- [X] T089 [US5] Apply status, archive, and readiness permissions and document conflict responses in `src/modules/program-batches/batches/batch.controller.ts`
- [X] T090 [US5] Emit lifecycle and archive events using the committed lifecycle version in `src/modules/program-batches/batches/batch.service.ts`

**Checkpoint**: Lifecycle state changes are explicit, race-safe, auditable, and respect historical immutability.

---

## Phase 8: User Story 6 - Supply Admissions Eligibility and Stable Selection Data (Priority: P6)

**Goal**: Admissions and other consumers can resolve stable batch references and determine whether a batch currently accepts admissions without duplicating lifecycle rules.

**Independent Test**: Query lookups, lifecycle history, public reference data, and eligibility for open, closed, full, over-capacity, archived, missing, and wrong-program batches.

### Tests for User Story 6

- [X] T091 [P] [US6] Add eligibility decision and reason-code unit tests in `test/unit/program-batches/batch-eligibility.spec.ts`
- [X] T092 [P] [US6] Add public-port stable-reference and bulk-resolution integration tests in `test/integration/program-batches/program-batches-public-port.spec.ts`
- [X] T093 [P] [US6] Add eligibility, lifecycle-history, and lookup endpoint contract tests in `test/e2e/program-batches/batch-consumer.e2e-spec.ts`
- [X] T094 [P] [US6] Add permission isolation and cross-program enumeration security tests in `test/e2e/program-batches/batch-security.e2e-spec.ts`

### Implementation for User Story 6

- [X] T095 [P] [US6] Implement eligibility, lifecycle-history, reference, and lookup response DTOs in `src/modules/program-batches/batches/dto/batch-consumer.dto.ts`
- [X] T096 [US6] Implement canonical intake, status, capacity-status, and branch lookup assembly in `src/modules/program-batches/lookups/batch-lookups.service.ts`
- [X] T097 [US6] Implement eligibility evaluation using lifecycle, dates, live capacity, archival, and branch rules in `src/modules/program-batches/batches/batch.service.ts`
- [X] T098 [US6] Implement ordered lifecycle-history reads and stable single/bulk reference projections in `src/modules/program-batches/batches/batch.repository.ts`
- [X] T099 [US6] Implement `PROGRAM_BATCHES_PUBLIC_PORT` over service operations in `src/modules/program-batches/types/program-batches-public.port.ts`
- [X] T100 [US6] Expose `GET /api/v1/batches/:batchId/eligibility` and `GET /api/v1/batches/:batchId/lifecycle` in `src/modules/program-batches/batches/batch-consumer.controller.ts`
- [X] T101 [US6] Expose `GET /api/v1/programs/:programId/batches/lookups` in `src/modules/program-batches/batches/batch.controller.ts`
- [X] T102 [US6] Apply consumer/view permissions and non-enumerating not-found behavior in `src/modules/program-batches/batches/batch-consumer.controller.ts`
- [X] T103 [US6] Export the public port and register consumer controller and lookup service in `src/modules/program-batches/program-batches.module.ts`

**Checkpoint**: Admissions can consume one authoritative eligibility decision and stable batch selection data.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Complete documentation, security, performance, regression, and release validation across all stories.

- [X] T104 [P] Complete Swagger success and error documentation for every Program Batch endpoint in `src/modules/program-batches/batches/batch.controller.ts` and `src/modules/program-batches/batches/batch-consumer.controller.ts`
- [X] T105 [P] Add all Program Batch permission definitions and default administrative role mappings in `prisma/seeds/program-batches.ts`
- [X] T106 Verify every implemented route, method, envelope, filter, and error against `specs/006-program-batches/contracts/openapi.yaml` and record corrections in `specs/006-program-batches/contracts/openapi.yaml`
- [X] T107 Verify public and dependency ports against `specs/006-program-batches/contracts/internal-ports.md` and update `src/modules/program-batches/types/program-batches-public.port.ts`
- [X] T108 [P] Add query-plan and bounded-query-count regression tests for list, details, and bulk references in `test/integration/program-batches/batch-query-performance.spec.ts`
- [X] T109 [P] Add authorization coverage asserting every route has authentication and the exact required permission in `test/e2e/program-batches/batch-authorization.e2e-spec.ts`
- [X] T110 Add seed idempotency and development-fixture verification tests in `test/integration/program-batches/program-batches-seed.spec.ts`
- [X] T111 Run formatter, lint, strict typecheck, unit, integration, end-to-end, Prisma validation, migration, seed, and production build commands and record results in `specs/006-program-batches/quickstart.md`
- [X] T112 Execute every acceptance scenario in `specs/006-program-batches/quickstart.md` and record the final evidence in `specs/006-program-batches/quickstart.md`
- [X] T113 Review controller-service-repository boundaries, transaction isolation, duplicate logic, and dead code; apply final refactoring under `src/modules/program-batches/`
- [X] T114 Review all create, update, branch, financial, lifecycle, and archive paths for after-commit domain-event coverage in `src/modules/program-batches/events/program-batch.events.ts`
- [X] T115 Re-run the complete existing backend regression suite and document any unrelated pre-existing failures in `specs/006-program-batches/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story.
- **US1 (Phase 3)**: Starts after Foundational and is the MVP.
- **US2–US6 (Phases 4–8)**: Start after Foundational; each is independently testable, but integration is safest in priority order because they enrich the same aggregate.
- **Polish (Phase 9)**: Depends on all selected user stories.

### User Story Dependency Graph

```text
Setup → Foundational → US1 (core commands)
                   ├→ US2 (queries)
                   ├→ US3 (operations/capacity)
                   ├→ US4 (financial revisions)
                   ├→ US5 (lifecycle/readiness; composes US3 + US4 rules)
                   └→ US6 (consumer eligibility; composes US2 + US3 + US5 views)

US1 + US2 + US3 + US4 + US5 + US6 → Polish
```

US5 may be developed independently with port/policy doubles, but its final registration-open readiness integration consumes the completed US3 and US4 policies. US6 may likewise use doubles, but its final eligibility projection composes US3 and US5 behavior.

### Within Each User Story

1. Write the listed tests and confirm failure.
2. Implement DTOs and policies.
3. Implement repository operations.
4. Implement services.
5. Implement controllers and authorization.
6. Run the story's independent test and all prior-story regressions.

### Parallel Opportunities

- Tasks marked `[P]` can run concurrently once their phase prerequisites are complete.
- Migration tests, port definitions, exceptions, events, and mapper primitives in Foundation touch separate files.
- Unit, integration, and end-to-end tests within a story can be authored concurrently.
- US2, US3, and US4 can be developed concurrently after Foundation when changes to shared repository/service files are coordinated.
- Documentation, performance tests, and authorization coverage in Polish can run concurrently.

## Parallel Example: User Story 3

```text
T052: Operational policy unit tests
T053: Capacity boundary unit tests
T054: Repository/dependency integration tests
T055: Operational API end-to-end tests
```

After those tests fail, T056 can proceed alongside preparation for T058; T057, T059, and T060 then feed T061 before mapping and event work.

## Implementation Strategy

### MVP First

1. Complete Setup.
2. Complete Foundational.
3. Complete US1.
4. Run US1's independent test suite and stop for validation.

### Incremental Delivery

1. **US1**: Core create/details/update workflow.
2. **US2**: Management discovery and review.
3. **US3**: Schedule, capacity, and branches.
4. **US4**: Immutable financial defaults.
5. **US5**: Lifecycle and registration readiness.
6. **US6**: Admissions-facing eligibility and stable references.
7. **Polish**: Full validation and production-readiness gate.

## Task Summary

- **Total tasks**: 115
- **Setup**: 6
- **Foundational**: 21
- **US1**: 14
- **US2**: 10
- **US3**: 12
- **US4**: 14
- **US5**: 13
- **US6**: 13
- **Polish**: 12
- **Suggested MVP**: Phases 1–3 through T041

