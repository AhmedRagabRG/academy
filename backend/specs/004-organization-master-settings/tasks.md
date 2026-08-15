---
description: "Dependency-ordered task list for Organization Master Settings"
---

# Tasks: Organization Master Settings

**Input**: Design documents from `/specs/004-organization-master-settings/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included because the specification defines measurable acceptance, concurrency, security,
contract, migration, and rollback outcomes. Write each named test first and verify it fails for the
intended missing behavior before implementing that behavior.

**Organization**: Tasks are grouped by the five prioritized user stories. The user's six work
packages map to Setup/Foundation, US1 structure, US2 calendar, US3 settings, US4 configurable
lookups, US5 downstream consumption, and final validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no unmet dependency
- **[Story]**: User story from [spec.md](spec.md)
- Every task includes an exact output or verification path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align the canonical contract and establish a verified starting point before persistence
or endpoint changes.

- [X] T001 Amend academic-term `order`, insertion/move semantics, year-version inputs, sort allow-list, and Arabic validation errors in `docs/api-data-requirements.html`
- [X] T002 Reconcile existing Organization implementation files with the feature 004 ownership tree in `src/modules/organization/` and document retained versus missing slices in `specs/004-organization-master-settings/quickstart.md`
- [X] T003 [P] Create missing unit, integration, and e2e test directories under `test/{unit,integration,e2e}/organization/`
- [X] T004 [P] Verify the Organization permission catalogue exactly covers profile, general settings, branches, departments, academic years, academic terms, and lookups in `prisma/seeds/permission-catalog.ts`
- [X] T005 [P] Update the Organization/Identity public-service boundary and immutable legal-identity rule in `src/modules/README.md`
- [X] T006 Record pre-feature build, lint, unit, e2e, migration, and repeated-seed results in `specs/004-organization-master-settings/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Complete persistence, shared types, constraints, transaction support, events, module
wiring, and common contract primitives required by all stories.

**⚠️ CRITICAL**: No user-story implementation begins until this phase passes.

- [X] T007 Add required Organization, settings, structure, calendar-order, and lookup fields/relations/index declarations in `prisma/schema.prisma`
- [X] T008 Create the reviewed upgrade migration with singleton, normalized uniqueness, one-active-year, inclusive term exclusion, `order > 0`, and deferrable `(academicYearId,order)` constraints in `prisma/migrations/*_organization_master_settings/migration.sql`
- [X] T009 Add fresh, prior-IAM upgrade, rollback reconstruction, and constraint-parity tests in `test/integration/organization/organization-migration.spec.ts`
- [X] T010 Update idempotent Organization structure, calendar-order, settings, and configurable lookup seed data in `prisma/seeds/organization-master-data.ts` and `prisma/seed.ts`
- [X] T011 [P] Complete path-free public record, list projection, asset descriptor, calendar order, lookup resolver, and settings read types in `src/modules/organization/types/organization.types.ts`
- [X] T012 [P] Complete Arabic search, code/email, date-only, URL, supported-standard, and safe descriptor normalization in `src/modules/organization/types/organization-normalization.ts`
- [X] T013 [P] Complete explicit allow-listed list/status/version/date-range and affected-year-version DTO primitives in `src/modules/organization/types/organization.dto.ts`
- [X] T014 [P] Complete database-to-contract mappings for every Organization entity, including derived labels, date-only values, term order, stable ordering, and record permissions in `src/modules/organization/mappers/organization.mapper.ts`
- [X] T015 Define typed audit-ready events for every create, update, status, activation, term move, lookup reorder, profile, settings, and consumer-resolution operation in `src/modules/organization/events/organization.events.ts`
- [X] T016 Extend the shared serializable transaction manager for bounded retry and ambient transaction clients in `src/database/transaction.manager.ts`
- [X] T017 Complete Identity-owned manager/dependency validation through `src/modules/identity/employees/organization-reference.service.ts` and its exported port in `src/modules/organization/types/organization-reference.port.ts`
- [X] T018 Complete Organization domain exceptions and Prisma/SQL constraint mappings for overlap, order, dependencies, duplicates, invalid state, and version conflicts in `src/core/exceptions/organization.exceptions.ts` and `src/database/prisma-error.mapper.ts`
- [X] T019 Wire `OrganizationModule` into `src/app.module.ts` with no circular dependency and export only public master-data/settings ports from `src/modules/organization/organization.module.ts`
- [X] T020 Verify Prisma generation, migration deployment, repeated seed, shared primitive tests, and unchanged Foundation/IAM regressions in `specs/004-organization-master-settings/quickstart.md`

**Checkpoint**: Schema and seeds are reproducible, database constraints close concurrent races, and
all stories can build on stable Organization public boundaries.

---

## Phase 3: User Story 1 — Maintain Organizational Structure (Priority: P1) 🎯 MVP

**Goal**: Authorized administrators manage scoped branches and organization-wide departments while
preserving historical references, validation, optimistic concurrency, and dependency safety.

**Independent Test**: Create a branch and department, find them with every supported query rule,
update them using current versions, exercise lifecycle states, and prove scope, uniqueness, dependency,
and archival behavior.

### Tests for User Story 1

- [X] T021 [P] [US1] Add branch endpoint, envelope, permission, record-permission, pagination, and Swagger contract tests in `test/e2e/organization/branches-contract.e2e-spec.ts`
- [X] T022 [P] [US1] Add department endpoint, envelope, permission, record-permission, pagination, and Swagger contract tests in `test/e2e/organization/departments-contract.e2e-spec.ts`
- [X] T023 [P] [US1] Add branch/department DTO tests for unknown fields, codes, contact fields, status, sort allow-lists, and versions in `test/unit/organization/structure-dtos.spec.ts`
- [X] T024 [P] [US1] Add Arabic-normalized search, scope, stable pagination, uniqueness, manager eligibility, dependencies, stale versions, transitions, rollback, and post-commit event tests in `test/integration/organization/structure-lifecycle.spec.ts`

### Implementation for User Story 1

- [X] T025 [P] [US1] Complete branch request/response DTOs with validation and Arabic Swagger examples in `src/modules/organization/branches/dto/branch.dto.ts`
- [X] T026 [P] [US1] Complete department request/response DTOs with validation and Arabic Swagger examples in `src/modules/organization/departments/dto/department.dto.ts`
- [X] T027 [P] [US1] Implement transaction-aware scoped branch queries, normalized uniqueness, versioned writes, and lifecycle primitives in `src/modules/organization/branches/branch.repository.ts`
- [X] T028 [P] [US1] Implement transaction-aware department queries, normalized uniqueness, versioned writes, and lifecycle primitives in `src/modules/organization/departments/department.repository.ts`
- [X] T029 [P] [US1] Implement branch scope, manager eligibility, assignment dependency, and transition rules in `src/modules/organization/branches/branch.policy.ts`
- [X] T030 [P] [US1] Implement department assignment dependency and transition rules in `src/modules/organization/departments/department.policy.ts`
- [X] T031 [US1] Implement branch list/detail/create/update and transactional status flows with post-commit events in `src/modules/organization/branches/branch.service.ts`
- [X] T032 [US1] Implement department list/detail/create/update and transactional status flows with post-commit events in `src/modules/organization/departments/department.service.ts`
- [X] T033 [P] [US1] Expose guarded branch endpoints matching the structure contract in `src/modules/organization/branches/branch.controller.ts`
- [X] T034 [P] [US1] Expose guarded department endpoints matching the structure contract in `src/modules/organization/departments/department.controller.ts`

**Checkpoint**: Organization structure is an independently deployable MVP.

---

## Phase 4: User Story 2 — Control the Academic Calendar (Priority: P2)

**Goal**: Administrators manage exclusive active years and retained, non-overlapping terms whose
explicit per-year order always forms a concurrency-safe `1..N` sequence.

**Independent Test**: Create and activate years, create/move/status-change terms, filter by year, and
prove date, overlap, order, version, rollback, and concurrent activation/move invariants.

### Tests for User Story 2

- [X] T035 [P] [US2] Add academic-year list/detail/create/update/status/activate contract and Swagger tests in `test/e2e/organization/academic-years-contract.e2e-spec.ts`
- [X] T036 [P] [US2] Add academic-term list/detail/create/update/status/order contract and Swagger tests in `test/e2e/organization/academic-terms-contract.e2e-spec.ts`
- [X] T037 [P] [US2] Add calendar DTO tests for date-only values, order/year-version inputs, moves, status, sort, versions, and rejected derived fields in `test/unit/organization/calendar-dtos.spec.ts`
- [X] T038 [P] [US2] Add serial/concurrent exclusive-year activation, default synchronization, stale version, and rollback tests in `test/integration/organization/academic-year-activation.spec.ts`
- [X] T039 [P] [US2] Add containment, inclusive overlap, boundary-touch, cross-year, archived-history, and concurrent exclusion tests in `test/integration/organization/academic-term-overlap.spec.ts`
- [X] T040 [P] [US2] Add create insertion, interval move, cross-year move, archive preservation, `1..N`, deferrable uniqueness, stale parent version, stable locks, and rollback tests in `test/integration/organization/academic-term-order.spec.ts`

### Implementation for User Story 2

- [X] T041 [P] [US2] Complete academic-year request/response DTOs and Swagger rules in `src/modules/organization/academic-calendar/dto/academic-year.dto.ts`
- [X] T042 [P] [US2] Add positive term order and affected-year-version request/response validation in `src/modules/organization/academic-calendar/dto/academic-term.dto.ts`
- [X] T043 [P] [US2] Implement transaction-aware year queries, active-year locking, versioned writes, activation, and default-setting primitives in `src/modules/organization/academic-calendar/academic-year.repository.ts`
- [X] T044 [P] [US2] Implement transaction-aware term queries, affected-year locks, interval shifts, cross-year compaction/insertion, and constraint mapping in `src/modules/organization/academic-calendar/academic-term.repository.ts`
- [X] T045 [US2] Implement year date, lifecycle, last-active, and activation rules plus term containment, inclusive non-overlap, and `1..N` rules in `src/modules/organization/academic-calendar/academic-calendar.policy.ts`
- [X] T046 [US2] Implement year list/detail/create/update/status and serializable activation/default synchronization with one post-commit event in `src/modules/organization/academic-calendar/academic-year.service.ts`
- [X] T047 [US2] Implement term list/detail/create insertion/update move/cross-year move/status flows with serializable ordering, overlap checks, and post-commit events in `src/modules/organization/academic-calendar/academic-term.service.ts`
- [X] T048 [P] [US2] Expose guarded academic-year endpoints matching the calendar contract in `src/modules/organization/academic-calendar/academic-year.controller.ts`
- [X] T049 [P] [US2] Expose guarded academic-term endpoints with order-aware Swagger envelopes in `src/modules/organization/academic-calendar/academic-term.controller.ts`
- [X] T050 [US2] Register calendar repositories, policy, services, and controllers in `src/modules/organization/organization.module.ts`
- [X] T051 [US2] Run quickstart academic calendar scenarios and record database/concurrency evidence in `specs/004-organization-master-settings/quickstart.md`

**Checkpoint**: The academic calendar is safe for all future academic and finance consumers.

---

## Phase 5: User Story 3 — Maintain Shared Organization Settings (Priority: P3)

**Goal**: Administrators read immutable legal identity and atomically update approved branding,
contacts, and valid operational defaults without unsafe descriptors or stale overwrites.

**Independent Test**: Read profile/settings, update every approved field with current versions,
reject name/code and invalid defaults/assets, and prove aggregate rollback and active-year consistency.

### Tests for User Story 3

- [X] T052 [P] [US3] Add profile GET/PATCH immutability, descriptors, permission, envelope, error, and Swagger tests in `test/e2e/organization/organization-profile-contract.e2e-spec.ts`
- [X] T053 [P] [US3] Add general-settings GET/PATCH permission, envelope, error, and Swagger tests in `test/e2e/organization/general-settings-contract.e2e-spec.ts`
- [X] T054 [P] [US3] Add profile/settings DTO tests for unknown identity fields, assets, contacts, URLs, working hours, standards, defaults, working days, and versions in `test/unit/organization/profile-settings-dtos.spec.ts`
- [X] T055 [P] [US3] Add child replacement, primary contacts, social uniqueness, safe descriptors, active defaults, year synchronization, stale version, rollback, and event tests in `test/integration/organization/profile-settings.spec.ts`

### Implementation for User Story 3

- [X] T056 [P] [US3] Complete immutable organization-profile update/child/asset and safe response DTOs in `src/modules/organization/profile/dto/organization-profile.dto.ts`
- [X] T057 [P] [US3] Complete general-settings update/response DTOs with supported standards and active default fields in `src/modules/organization/settings/dto/general-settings.dto.ts`
- [X] T058 [P] [US3] Implement singleton profile reads, versioned scalar writes, and atomic contact/social replacement primitives in `src/modules/organization/profile/organization-profile.repository.ts`
- [X] T059 [P] [US3] Implement singleton settings reads, versioned writes, and default-reference primitives in `src/modules/organization/settings/general-settings.repository.ts`
- [X] T060 [US3] Implement immutable profile projection and atomic approved-field update validation with post-commit events in `src/modules/organization/profile/organization-profile.service.ts`
- [X] T061 [US3] Implement settings read/update with supported standards, active branch/year validation, concurrency, and post-commit events in `src/modules/organization/settings/general-settings.service.ts`
- [X] T062 [P] [US3] Expose guarded `GET/PATCH /organization/profile` in `src/modules/organization/profile/organization-profile.controller.ts`
- [X] T063 [P] [US3] Expose guarded `GET/PATCH /settings/general` in `src/modules/organization/settings/general-settings.controller.ts`

**Checkpoint**: Legal identity remains immutable while shared branding and operational defaults are
safely configurable.

---

## Phase 6: User Story 4 — Configure Reusable Lookup Values (Priority: P4)

**Goal**: Administrators manage ordered hierarchical lookup groups/values while active choices and
historical resolution remain authoritative and dependency-safe.

**Independent Test**: Create groups/values, exercise uniqueness, hierarchy, ordering, lifecycle,
archival dependencies, and transactional reorder, then verify active and historical projections.

### Tests for User Story 4

- [X] T064 [P] [US4] Add lookup-group list/detail/create/update/status contract, permission, envelope, and Swagger tests in `test/e2e/organization/lookup-groups-contract.e2e-spec.ts`
- [X] T065 [P] [US4] Add lookup-value list/detail/create/update/status/reorder contract, permission, envelope, and Swagger tests in `test/e2e/organization/lookup-values-contract.e2e-spec.ts`
- [X] T066 [P] [US4] Add lookup DTO tests for codes, labels, sort order, hierarchy IDs, status, versions, and reorder membership in `test/unit/organization/lookup-dtos.spec.ts`
- [X] T067 [P] [US4] Add normalized uniqueness, hierarchy cycles, dependency archive, deterministic query, concurrent reorder, stale versions, rollback, and event tests in `test/integration/organization/lookup-lifecycle.spec.ts`

### Implementation for User Story 4

- [X] T068 [P] [US4] Create lookup-group list/create/update/status/detail DTOs in `src/modules/organization/lookups/dto/lookup-group.dto.ts`
- [X] T069 [P] [US4] Create lookup-value list/create/update/status/reorder/detail DTOs in `src/modules/organization/lookups/dto/lookup-value.dto.ts`
- [X] T070 [US4] Implement transaction-aware group/value queries, hierarchy loading, normalized uniqueness, versioned writes, and atomic reorder primitives in `src/modules/organization/lookups/lookup.repository.ts`
- [X] T071 [US4] Implement group/value hierarchy cycle, parent compatibility, selectable status, dependency, and transition rules in `src/modules/organization/lookups/lookup.policy.ts`
- [X] T072 [US4] Implement lookup-group and lookup-value list/detail/create/update/status/archive flows with historical resolution and events in `src/modules/organization/lookups/lookup.service.ts`
- [X] T073 [US4] Implement exact-membership/version transactional lookup reorder with deterministic output and one post-commit event in `src/modules/organization/lookups/lookup.service.ts`
- [X] T074 [US4] Expose guarded lookup group/value administration endpoints matching the lookup contract in `src/modules/organization/lookups/lookup.controller.ts`
- [X] T075 [US4] Register lookup controller, repository, policy, and administrative service in `src/modules/organization/organization.module.ts`
- [X] T076 [US4] Seed representative configurable groups and values without hardcoded consumer branching in `prisma/seeds/organization-master-data.ts`
- [X] T077 [US4] Run quickstart lookup administration scenarios and record ordering/dependency evidence in `specs/004-organization-master-settings/quickstart.md`

**Checkpoint**: Configurable classifications are authoritative, ordered, and ready for consumers.

---

## Phase 7: User Story 5 — Consume Authoritative Master Data (Priority: P5)

**Goal**: Future modules receive bounded active master-data choices and can resolve historical labels
without copying Organization rows or importing Organization repositories.

**Independent Test**: Request each active choice family, confirm archived values are not selectable,
resolve archived historical IDs, and prove representative consumers use exported ports.

### Tests for User Story 5

- [X] T078 [P] [US5] Add bounded static standards and active master-data projection contract tests in `test/e2e/organization/organization-lookups-contract.e2e-spec.ts`
- [X] T079 [P] [US5] Add active/selectable filtering, deterministic ordering, historical resolution, missing IDs, and disclosure tests in `test/integration/organization/master-data-resolution.spec.ts`
- [X] T080 [P] [US5] Add representative downstream consumer boundary tests proving no hardcoded choices or repository imports in `test/integration/organization/master-data-consumer-contract.spec.ts`

### Implementation for User Story 5

- [X] T081 [US5] Implement bounded static standards plus active branch/department/year/term/lookup choice projections in `src/modules/organization/lookups/organization-lookups.service.ts`
- [X] T082 [US5] Implement historical label resolution and typed selectable-value/master-data ports in `src/modules/organization/types/organization-master-data.port.ts`
- [X] T083 [US5] Expose the bounded guarded settings/master-data feed through `src/modules/organization/lookups/lookup.controller.ts`
- [X] T084 [US5] Export safe lookup, master-data, and settings read services without repositories in `src/modules/organization/organization.module.ts`
- [X] T085 [US5] Document downstream service consumption and historical reference behavior in `src/modules/README.md` and `README.md`

**Checkpoint**: Organization master data is reusable by future modules without duplication or
cross-module persistence access.

---

## Phase 8: Polish & Cross-Cutting Validation

**Purpose**: Complete frontend contract integration and production-readiness across every story.

- [X] T086 [P] Verify every Organization controller documents real success envelopes, pagination metadata, Arabic examples, statuses, and closed error codes in `src/modules/organization/**/*.controller.ts`
- [X] T087 [P] Add protected-by-default, exact-permission, branch-scope, CSRF, and credentialed-CORS surface tests in `test/e2e/organization/security-surface.e2e-spec.ts`
- [X] T088 [P] Add log redaction and response disclosure tests for descriptors, paths, SQL, stack traces, derived labels, and foreign-scope data in `test/e2e/organization/organization-logging.e2e-spec.ts`
- [X] T089 Verify every implemented path, field, permission, status, error, and pagination name against `docs/api-data-requirements.html` and `specs/004-organization-master-settings/contracts/` in `specs/004-organization-master-settings/quickstart.md`
- [X] T090 Add exact Organization permission-catalog parity tests in `test/integration/organization/permission-catalog.spec.ts`
- [X] T091 Run fresh/prior-IAM migration, rollback reconstruction, and repeated-seed parity checks and record evidence in `specs/004-organization-master-settings/quickstart.md`
- [X] T092 Run Prisma layering, cross-module repository, strict-type, `any`, path, controller-logic, and transaction-boundary audits and record results in `specs/004-organization-master-settings/quickstart.md`
- [X] T093 Execute every quickstart acceptance scenario, including concurrent year activation, term overlap/order moves, lookup reorder, profile rollback, and consumer resolution in `specs/004-organization-master-settings/quickstart.md`
- [X] T094 Run `npm run build && npm run lint && npm run test -- --runInBand && npm run test:e2e -- --runInBand` and record complete Foundation/IAM/Organization results in `specs/004-organization-master-settings/quickstart.md`
- [X] T095 Perform final architecture, authorization, validation, Swagger, type-safety, duplication, dependency, and clean-code review and record sign-off in `specs/004-organization-master-settings/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately; T001 blocks endpoint/order implementation.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1–US4 (Phases 3–6)**: Can begin after Foundation; priority order is recommended, but each has
  an independent contract and test checkpoint.
- **US5 (Phase 7)**: Depends on the public records delivered by US1–US4.
- **Polish (Phase 8)**: Depends on every story selected for release.

### User Story Dependency Graph

```text
Setup → Foundation ─┬→ US1 Structure ─┐
                    ├→ US2 Calendar  ─┤
                    ├→ US3 Settings  ─┼→ US5 Consumption → Polish
                    └→ US4 Lookups   ─┘
```

### Within Each User Story

- Write the story's tests first and confirm the expected failures.
- Complete DTOs before repositories, repositories before policies/services, and services before
  controllers.
- Keep Prisma inside repositories and business conditions inside policies/services.
- Emit success events only after the owning transaction commits.
- Run the independent checkpoint before advancing to the next priority.

## Parallel Opportunities

- Setup T003–T005 can run concurrently after T001 is understood.
- Foundation type/normalization/DTO/mapper tasks T011–T014 can run concurrently.
- Once Foundation passes, US1–US4 can be developed in parallel in separate file families.
- Contract, DTO, integration, and concurrency test files marked `[P]` can be written concurrently.
- Within US1, branch and department DTO/repository/policy/controller work can proceed in parallel.
- Within US2, year and term DTO/repository/controller work can proceed in parallel before shared
  policy/service integration.
- Within US3, profile and general-settings file families can proceed in parallel.

## Parallel Execution Examples

### User Story 1

```text
T021 branches contract tests | T022 departments contract tests | T023 DTO tests | T024 lifecycle tests
T025 branch DTO/repository/policy | T026 department DTO/repository/policy
```

### User Story 2

```text
T035 year contracts | T036 term contracts | T037 DTOs | T038 activation | T039 overlap | T040 order
T041/T043 year files | T042/T044 term files
```

### User Story 3

```text
T052 profile contract | T053 settings contract | T054 DTOs | T055 aggregate integration
T056/T058 profile files | T057/T059 settings files
```

### User Story 4

```text
T064 group contract | T065 value contract | T066 DTOs | T067 lifecycle integration
T068 group DTO | T069 value DTO
```

### User Story 5

```text
T078 feed contract | T079 resolver integration | T080 consumer boundary
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Complete US1 structure management.
3. Run the US1 checkpoint and deploy/demo the independently useful master-data MVP.

### Incremental Delivery

1. Foundation → stable Organization persistence and boundaries.
2. US1 → operational structure.
3. US2 → safe ordered academic calendar.
4. US3 → immutable identity and shared operational settings.
5. US4 → configurable lookup administration.
6. US5 → downstream master-data consumption.
7. Polish → production readiness and full regression evidence.

## Notes

- `[P]` means different files and no unmet dependency, not permission to ignore transaction coupling.
- Story labels provide direct traceability to the feature specification.
- Existing feature 003 code is a starting implementation, not evidence that a feature 004 task is
  complete; mark tasks only after the exact feature 004 contract and tests pass.
- Do not introduce permanent deletes, cross-module repository imports, new permission keys, or
  undocumented endpoints.
