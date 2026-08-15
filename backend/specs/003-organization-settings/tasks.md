---
description: "Dependency-ordered task list for Organization & Settings"
---

# Tasks: Organization & Settings

**Input**: Design documents from `/specs/003-organization-settings/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included because the specification and finalization brief require measurable contract,
authorization, validation, transaction, migration, concurrency, scope, and regression outcomes. Write
the named tests first and confirm they fail for the intended missing behavior before implementation.

**Organization**: Tasks are grouped by the four prioritized user stories. The user's six work
packages map to Setup/Foundation, US4 profile/settings, US1 structure, US2 calendar, US3 lookups, and
the final contract/validation phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: May run in parallel because it targets different files and has no unmet dependency
- **[Story]**: User story from [spec.md](spec.md)
- Every task names its exact output or verification path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Amend the canonical contract, establish feature boundaries, and verify the unchanged
Foundation/IAM baseline before persistence changes.

- [X] T001 Amend Organization & Settings routes, branch email, department/year codes, editable profile fields, configurable lookup contracts, permissions, and term-overlap errors in `docs/api-data-requirements.html`
- [X] T002 Create the capability skeleton under `src/modules/organization/{branches,departments,academic-calendar,lookups,profile,settings,events,mappers,types}/`
- [X] T003 [P] Create test skeletons with `.gitkeep` files under `test/unit/organization/`, `test/integration/organization/`, and `test/e2e/organization/`
- [X] T004 [P] Add every documented Organization permission key and Arabic metadata to `prisma/seeds/permission-catalog.ts`
- [X] T005 [P] Add Organization error subclasses/codes for overlap, dependency-in-use, invalid state, duplicate value, and unsafe profile fields in `src/core/exceptions/organization.exceptions.ts` and `src/core/exceptions/index.ts`
- [X] T006 [P] Add Organization response/error Swagger models and reusable decorators in `src/shared/swagger/organization-api.decorator.ts`
- [X] T007 Record the pre-change `npm run build`, `npm run lint`, `npm run test -- --runInBand`, and `npm run test:e2e -- --runInBand` results in `specs/003-organization-settings/quickstart.md`
- [X] T008 Update the module ownership and Identity/Organization public-service boundary documentation in `src/modules/README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add persistence, migration safeguards, transaction support, shared types, reference ports,
and module wiring required by every user story.

**⚠️ CRITICAL**: No user-story implementation begins until this phase is complete.

- [X] T009 Add Organization, OrganizationContact, OrganizationSocialLink, GeneralSettings, Branch, Department, AcademicYear, AcademicTerm, LookupGroup, and LookupValue models and relations in `prisma/schema.prisma`
- [X] T010 Create the reviewed Organization migration with `btree_gist`, singleton, normalized uniqueness, partial active-year, primary-contact, and inclusive term-exclusion constraints in `prisma/migrations/*_organization_settings/migration.sql`
- [X] T011 Add fresh/upgrade/rollback migration verification for every table, index, constraint, and prior IAM row in `test/integration/organization/organization-migration.spec.ts`
- [X] T012 Update the idempotent seed with singleton profile/settings, initial structure/calendar, static standards, and configurable lookup groups/values in `prisma/seed.ts` and `prisma/seeds/organization-master-data.ts`
- [X] T013 [P] Define secret/path-free public Organization records, list projections, file descriptors, and downstream master-data types in `src/modules/organization/types/organization.types.ts`
- [X] T014 [P] Define audit-ready event names and typed payloads for every create, update, status, activation, reorder, profile, and settings operation in `src/modules/organization/events/organization.events.ts`
- [X] T015 [P] Implement code, email, Arabic search, date-only, and safe file-descriptor normalization helpers in `src/modules/organization/types/organization-normalization.ts`
- [X] T016 Extend serializable transaction isolation, bounded retry, and ambient transaction-client support in `src/database/transaction.manager.ts`
- [X] T017 [P] Define the Organization dependency/reference port for manager and active-reference checks in `src/modules/organization/types/organization-reference.port.ts`
- [X] T018 Implement and export the Identity-owned Organization reference adapter without exposing repositories in `src/modules/identity/employees/organization-reference.service.ts` and `src/modules/identity/identity.module.ts`
- [X] T019 [P] Implement database-to-contract mappings, stable ordering, derived labels, record permissions, and safe descriptor projection in `src/modules/organization/mappers/organization.mapper.ts`
- [X] T020 [P] Add shared list/status/version/date-range DTO primitives with explicit allow-lists in `src/modules/organization/types/organization.dto.ts`
- [X] T021 Unit test normalization, date-only parsing, safe descriptors, pagination bounds, and immutable-field rejection in `test/unit/organization/organization-primitives.spec.ts`
- [X] T022 Integration test singleton, uniqueness, archival, partial active-year, primary-contact, and term-exclusion database constraints in `test/integration/organization/organization-constraints.spec.ts`
- [X] T023 Create `OrganizationModule` with public master-data ports and no circular dependency in `src/modules/organization/organization.module.ts`
- [X] T024 Import `OrganizationModule` and its Identity public reference dependency in `src/app.module.ts` and `src/core/core.module.ts`
- [X] T025 Verify generated Prisma types, migration deployment, repeated seed, and foundational regressions and record results in `specs/003-organization-settings/quickstart.md`

**Checkpoint**: Fresh and upgraded databases migrate, seeds are idempotent, database constraints close
concurrency races, and the Organization module boundary is available to story implementations.

---

## Phase 3: User Story 1 — Maintain Branches and Departments (Priority: P1) 🎯 MVP

**Goal**: Authorized administrators can search, page, create, inspect, edit, activate, inactivate, and
archive branches/departments while preserving history, scope, concurrency, and dependencies.

**Independent Test**: Create one branch and department, locate them using every supported list rule,
update using versions, exercise statuses/archive, and prove archived history, branch scope, duplicate
prevention, and in-use refusal.

### Tests for User Story 1

- [X] T026 [P] [US1] Add branch endpoint, envelope, pagination, error, permission, and Swagger contract tests in `test/e2e/organization/branches-contract.e2e-spec.ts`
- [X] T027 [P] [US1] Add department endpoint, envelope, pagination, error, permission, and Swagger contract tests in `test/e2e/organization/departments-contract.e2e-spec.ts`
- [X] T028 [P] [US1] Add branch/department DTO tests for unknown fields, email/phone/code/name rules, status, sort allow-lists, and version in `test/unit/organization/structure-dtos.spec.ts`
- [X] T029 [P] [US1] Add Arabic-normalized search, filters, stable sorting, pagination clamp/over-range, and branch-scope integration tests in `test/integration/organization/structure-query.spec.ts`
- [X] T030 [P] [US1] Add uniqueness, stale-version, manager eligibility, dependency, transition, rollback, and out-of-scope tests in `test/integration/organization/structure-lifecycle.spec.ts`

### Implementation for User Story 1

- [X] T031 [P] [US1] Create branch list/create/update/status/detail response DTOs with Arabic Swagger examples in `src/modules/organization/branches/dto/branch.dto.ts`
- [X] T032 [P] [US1] Create department list/create/update/status/detail response DTOs with Arabic Swagger examples in `src/modules/organization/departments/dto/department.dto.ts`
- [X] T033 [P] [US1] Implement transaction-aware branch pagination, scoped detail, normalized uniqueness, versioned writes, and status primitives in `src/modules/organization/branches/branch.repository.ts`
- [X] T034 [P] [US1] Implement transaction-aware department pagination, normalized uniqueness, versioned writes, and status primitives in `src/modules/organization/departments/department.repository.ts`
- [X] T035 [P] [US1] Implement manager, assignment-dependency, branch-scope, and status-transition rules in `src/modules/organization/branches/branch.policy.ts`
- [X] T036 [P] [US1] Implement assignment-dependency and status-transition rules in `src/modules/organization/departments/department.policy.ts`
- [X] T037 [US1] Implement scoped branch list/detail and resolved manager/record-permission projections in `src/modules/organization/branches/branch.service.ts`
- [X] T038 [US1] Implement branch create/update with normalization, manager validation, optimistic concurrency, and post-commit events in `src/modules/organization/branches/branch.service.ts`
- [X] T039 [US1] Implement transactional branch activate/inactivate/archive with dependency checks and events in `src/modules/organization/branches/branch.service.ts`
- [X] T040 [US1] Implement department list/detail with normalized search, filtering, pagination, and record permissions in `src/modules/organization/departments/department.service.ts`
- [X] T041 [US1] Implement department create/update with normalized uniqueness, optimistic concurrency, and post-commit events in `src/modules/organization/departments/department.service.ts`
- [X] T042 [US1] Implement transactional department activate/inactivate/archive with dependency checks and events in `src/modules/organization/departments/department.service.ts`
- [X] T043 [P] [US1] Expose branch list/detail/create/update/status endpoints with `settings.branches.*` guards and Swagger envelopes in `src/modules/organization/branches/branch.controller.ts`
- [X] T044 [P] [US1] Expose department list/detail/create/update/status endpoints with `settings.departments.*` guards and Swagger envelopes in `src/modules/organization/departments/department.controller.ts`
- [X] T045 [US1] Register branch/department controllers, repositories, policies, and services in `src/modules/organization/organization.module.ts`
- [X] T046 [US1] Verify branch/department domain event payloads and strictly post-commit timing in `test/integration/organization/structure-events.spec.ts`
- [X] T047 [US1] Run quickstart checks 2–4 and the complete US1/Foundation regression slice and record results in `specs/003-organization-settings/quickstart.md`

**Checkpoint**: Organizational structure is an independently deployable master-data MVP.

---

## Phase 4: User Story 2 — Control the Academic Calendar (Priority: P2)

**Goal**: Administrators manage years and non-overlapping terms while exactly one eligible year and the
general-settings default remain active under concurrent requests.

**Independent Test**: Create two years and multiple contained terms, filter terms by year, activate
years sequentially/concurrently, and prove date, overlap, archival, version, and rollback invariants.

### Tests for User Story 2

- [X] T048 [P] [US2] Add academic-year list/detail/create/update/status/activate contract and Swagger tests in `test/e2e/organization/academic-years-contract.e2e-spec.ts`
- [X] T049 [P] [US2] Add academic-term list/detail/create/update/status/filter contract and Swagger tests in `test/e2e/organization/academic-terms-contract.e2e-spec.ts`
- [X] T050 [P] [US2] Add calendar DTO tests for date-only formats, containment fields, status, sort, version, and unknown/derived fields in `test/unit/organization/calendar-dtos.spec.ts`
- [X] T051 [P] [US2] Add serial/concurrent exclusive-year activation, default synchronization, stale version, and rollback tests in `test/integration/organization/academic-year-activation.spec.ts`
- [X] T052 [P] [US2] Add parent containment, inclusive sibling overlap, boundary-touch, cross-year, concurrent race, and archive-history tests in `test/integration/organization/academic-term-overlap.spec.ts`

### Implementation for User Story 2

- [X] T053 [P] [US2] Create academic-year list/create/update/status/activate/detail DTOs with date-only and Swagger rules in `src/modules/organization/academic-calendar/dto/academic-year.dto.ts`
- [X] T054 [P] [US2] Create academic-term list/create/update/status/detail DTOs with year filter and derived-label exclusion in `src/modules/organization/academic-calendar/dto/academic-term.dto.ts`
- [X] T055 [P] [US2] Implement transaction-aware year pagination, normalized uniqueness, versioned writes, active-year locking, and activation primitives in `src/modules/organization/academic-calendar/academic-year.repository.ts`
- [X] T056 [P] [US2] Implement transaction-aware term pagination, parent/sibling reads, versioned writes, and constraint-error mapping in `src/modules/organization/academic-calendar/academic-term.repository.ts`
- [X] T057 [US2] Implement year date/status/last-active/archive/activation business rules in `src/modules/organization/academic-calendar/academic-calendar.policy.ts`
- [X] T058 [US2] Implement term parent-boundary and inclusive sibling non-overlap rules in `src/modules/organization/academic-calendar/academic-calendar.policy.ts`
- [X] T059 [US2] Implement academic-year list/detail/create/update/status flows with concurrency and audit events in `src/modules/organization/academic-calendar/academic-year.service.ts`
- [X] T060 [US2] Implement serializable academic-year activation, prior-year inactivation, GeneralSettings synchronization, retry, and post-commit event in `src/modules/organization/academic-calendar/academic-year.service.ts`
- [X] T061 [US2] Implement academic-term list/detail/create/update/status flows with parent labels, exclusion mapping, concurrency, and events in `src/modules/organization/academic-calendar/academic-term.service.ts`
- [X] T062 [P] [US2] Expose academic-year list/detail/create/update/status/activate endpoints with `settings.academicYears.*` guards in `src/modules/organization/academic-calendar/academic-year.controller.ts`
- [X] T063 [P] [US2] Expose academic-term list/detail/create/update/status endpoints with `settings.academicTerms.*` guards in `src/modules/organization/academic-calendar/academic-term.controller.ts`
- [X] T064 [US2] Register academic-calendar controllers, repositories, policy, and services in `src/modules/organization/organization.module.ts`
- [X] T065 [US2] Verify year/term event payloads, one-event activation semantics, and post-commit timing in `test/integration/organization/academic-calendar-events.spec.ts`
- [X] T066 [US2] Run quickstart checks 5–6 and the complete US2/US1/Foundation regression slice and record results in `specs/003-organization-settings/quickstart.md`

**Checkpoint**: The academic calendar is safe for future Catalog, Admissions, Students, and Finance
consumers even under concurrent activation and term writes.

---

## Phase 5: User Story 3 — Configure Reusable Lookup Values (Priority: P3)

**Goal**: Administrators manage ordered hierarchical lookup groups/values while downstream modules
consume one authoritative active catalogue and historical labels remain resolvable.

**Independent Test**: Create parent/child groups and values, exercise normalized uniqueness, lists,
ordering, status/archive dependencies, and prove active consumer choices plus historical resolution.

### Tests for User Story 3

- [X] T067 [P] [US3] Add lookup-group list/detail/create/update/status contract, permission, envelope, and Swagger tests in `test/e2e/organization/lookup-groups-contract.e2e-spec.ts`
- [X] T068 [P] [US3] Add lookup-value list/detail/create/update/status/reorder contract, permission, envelope, and Swagger tests in `test/e2e/organization/lookup-values-contract.e2e-spec.ts`
- [X] T069 [P] [US3] Add lookup DTO tests for codes, labels, sort order, hierarchy IDs, versions, status, and reorder member validation in `test/unit/organization/lookup-dtos.spec.ts`
- [X] T070 [P] [US3] Add group/value normalized uniqueness, deterministic ordering, pagination, and historical-selectability integration tests in `test/integration/organization/lookup-query.spec.ts`
- [X] T071 [P] [US3] Add hierarchy cycles, wrong-parent group, archive dependencies, concurrent reorder, stale versions, and rollback tests in `test/integration/organization/lookup-lifecycle.spec.ts`

### Implementation for User Story 3

- [X] T072 [P] [US3] Create lookup-group list/create/update/status/detail DTOs with explicit sort/status allow-lists in `src/modules/organization/lookups/dto/lookup-group.dto.ts`
- [X] T073 [P] [US3] Create lookup-value list/create/update/status/reorder/detail DTOs with Arabic Swagger examples in `src/modules/organization/lookups/dto/lookup-value.dto.ts`
- [X] T074 [US3] Implement transaction-aware group/value pagination, hierarchy loading, normalized uniqueness, versioned writes, and atomic reorder primitives in `src/modules/organization/lookups/lookup.repository.ts`
- [X] T075 [US3] Implement group hierarchy cycle, parent-group/value, dependency, selectable-status, and transition rules in `src/modules/organization/lookups/lookup.policy.ts`
- [X] T076 [US3] Implement lookup-group list/detail/create/update/status/archive flows with dependency checks and events in `src/modules/organization/lookups/lookup.service.ts`
- [X] T077 [US3] Implement lookup-value list/detail/create/update/status/archive flows with historical resolution and events in `src/modules/organization/lookups/lookup.service.ts`
- [X] T078 [US3] Implement transactional multi-value reorder with exact membership/version validation, deterministic order, group version, and one event in `src/modules/organization/lookups/lookup.service.ts`
- [X] T079 [US3] Implement the bounded static settings feed and exported configurable master-data resolver/selectable-value service in `src/modules/organization/lookups/organization-lookups.service.ts`
- [X] T080 [US3] Expose lookup-group and group-code value administration plus static feed endpoints with `settings.lookups.*`/`settings.general.view` guards in `src/modules/organization/lookups/lookup.controller.ts`
- [X] T081 [US3] Register lookup controllers, repository, policy, administrative service, and exported resolver in `src/modules/organization/organization.module.ts`
- [X] T082 [US3] Verify group/value/reorder event payloads and strictly post-commit one-event timing in `test/integration/organization/lookup-events.spec.ts`
- [X] T083 [US3] Verify representative downstream lookup consumers use the exported resolver rather than hardcoded business choices in `test/integration/organization/lookup-consumer-contract.spec.ts`
- [X] T084 [US3] Run quickstart checks 7–10 and the complete US3/earlier-story regression slice and record results in `specs/003-organization-settings/quickstart.md`

**Checkpoint**: Configurable business classifications are authoritative, ordered, dependency-safe,
and ready for all downstream modules.

---

## Phase 6: User Story 4 — Maintain Operational Defaults (Priority: P4)

**Goal**: Administrators read immutable legal identity, atomically update approved branding/contact
fields, and maintain valid operational defaults without paths, partial writes, or stale overwrites.

**Independent Test**: Read profile/settings, update every permitted field with current versions, reject
name/code and unsafe/invalid fields, validate active defaults, and prove atomic rollback and consumers.

### Tests for User Story 4

- [X] T085 [P] [US4] Add profile GET/PATCH fields, immutability, permissions, descriptors, envelopes, errors, and Swagger tests in `test/e2e/organization/organization-profile-contract.e2e-spec.ts`
- [X] T086 [P] [US4] Add general-settings GET/PATCH fields, permissions, envelopes, errors, and Swagger tests in `test/e2e/organization/general-settings-contract.e2e-spec.ts`
- [X] T087 [P] [US4] Add profile/settings DTO tests for immutable/unknown fields, assets, contacts, URLs, working hours, standards, working days, and versions in `test/unit/organization/profile-settings-dtos.spec.ts`
- [X] T088 [P] [US4] Add profile child replacement, primary contacts, social uniqueness, stale version, active defaults, year synchronization, and rollback tests in `test/integration/organization/profile-settings.spec.ts`

### Implementation for User Story 4

- [X] T089 [P] [US4] Create organization-profile update/contact/social/working-hours and safe response DTOs that reject name/code in `src/modules/organization/profile/dto/organization-profile.dto.ts`
- [X] T090 [P] [US4] Create complete general-settings update and response DTOs with supported-standard and working-day fields in `src/modules/organization/settings/dto/general-settings.dto.ts`
- [X] T091 [P] [US4] Implement singleton profile reads, versioned scalar updates, contact/social replacement, and safe descriptor primitives in `src/modules/organization/profile/organization-profile.repository.ts`
- [X] T092 [P] [US4] Implement singleton settings reads, versioned writes, and default-reference primitives in `src/modules/organization/settings/general-settings.repository.ts`
- [X] T093 [US4] Implement immutable legal identity projection and atomic profile update validation for descriptors, contacts, website, address, hours, social links, and events in `src/modules/organization/profile/organization-profile.service.ts`
- [X] T094 [US4] Implement settings read/update with supported standards, active branch/year validation, atomic concurrency, and events in `src/modules/organization/settings/general-settings.service.ts`
- [X] T095 [P] [US4] Expose `GET/PATCH /organization/profile` with `settings.organization.*` guards and Swagger envelopes in `src/modules/organization/profile/organization-profile.controller.ts`
- [X] T096 [P] [US4] Expose `GET/PATCH /settings/general` with `settings.general.*` guards and Swagger envelopes in `src/modules/organization/settings/general-settings.controller.ts`
- [X] T097 [US4] Register profile/settings controllers, repositories, and services and export safe settings reads in `src/modules/organization/organization.module.ts`
- [X] T098 [US4] Verify profile/settings event payloads, aggregate result state, failure silence, and post-commit timing in `test/integration/organization/profile-settings-events.spec.ts`
- [X] T099 [US4] Run quickstart checks 11–12 and the complete US4/earlier-story regression slice and record results in `specs/003-organization-settings/quickstart.md`

**Checkpoint**: All four user stories work independently and together; legal identity stays immutable
while public profile and operational defaults are safely configurable.

---

## Phase 7: Polish & Cross-Cutting Validation

**Purpose**: Complete frontend contract integration and production-readiness work across all stories.

- [X] T100 [P] Verify every Organization endpoint has accurate success-envelope, pagination-meta, Arabic example, status-code, and closed error-code Swagger documentation in `src/modules/organization/**/*.controller.ts`
- [X] T101 [P] Add protected-by-default, exact-permission, branch-scope, CSRF, and credentialed-CORS surface tests in `test/e2e/organization/security-surface.e2e-spec.ts`
- [X] T102 [P] Add log correlation/redaction and response disclosure tests for descriptors, paths, derived labels, SQL, and stack traces in `test/e2e/organization/organization-logging.e2e-spec.ts`
- [X] T103 Verify every implemented path, request/response field, permission, status, error, and pagination name against `docs/api-data-requirements.html` and `specs/003-organization-settings/contracts/` in `specs/003-organization-settings/quickstart.md`
- [X] T104 Verify the permission seed exactly matches the amended documented catalogue with no missing or invented Organization keys in `test/integration/organization/permission-catalog.spec.ts`
- [X] T105 Run migration and repeated-seed tests against fresh and copied-IAM databases and record constraint/index/row parity in `specs/003-organization-settings/quickstart.md`
- [X] T106 Run the Prisma layering and cross-module repository audit and remove every violation under `src/modules/organization/`
- [X] T107 Run strict-type, `any`, filesystem-path, secret-string, controller-business-logic, and transaction-boundary audits across `src/modules/organization/` and `test/{unit,integration,e2e}/organization/`
- [X] T108 [P] Update module architecture, configuration, migration, seed, public master-data services, and API usage documentation in `README.md` and `src/modules/README.md`
- [X] T109 Review dependency changes and `npm audit` findings without applying unreviewed breaking upgrades in `package.json` and `package-lock.json`
- [X] T110 Execute all 16 acceptance scenarios and document environment limitations and evidence in `specs/003-organization-settings/quickstart.md`
- [X] T111 Run `npm run build && npm run lint && npm run test -- --runInBand && npm run test:e2e -- --runInBand` and confirm all Organization, Identity, and Foundation suites pass in `specs/003-organization-settings/quickstart.md`
- [X] T112 Perform final architecture, authorization, validation, Swagger, type-safety, duplication, and clean-code review and record sign-off in `specs/003-organization-settings/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately; T001 contract amendment blocks endpoint implementation.
- **Foundational (Phase 2)**: depends on Setup and blocks every user story.
- **US1 Structure (Phase 3)**: depends on Foundational and delivers the master-data MVP.
- **US2 Calendar (Phase 4)**: depends on Foundational; activation also relies on the seeded singleton
  settings row but not the US4 HTTP surface.
- **US3 Lookups (Phase 5)**: depends on Foundational and can proceed independently of US1/US2.
- **US4 Profile/Settings (Phase 6)**: depends on Foundational; default validation consumes repository
  primitives established for US1/US2, so complete those stories first in a sequential implementation.
- **Polish (Phase 7)**: depends on all selected stories.

### User Story Dependency Graph

```text
Setup → Foundational → US1 (branches/departments MVP) ─┐
                   ├→ US2 (academic calendar) ─────────┼→ US4 (profile/settings)
                   └→ US3 (configurable lookups) ──────┘

US1 + US2 + US3 + US4 → Polish
```

### Within Each User Story

1. Write the named tests and confirm failure for the intended missing behavior.
2. DTOs precede repositories/policies that consume their vocabulary.
3. Repositories precede services; services precede controllers.
4. Multi-record behavior is composed by services through the shared transaction manager.
5. Domain events emit only after commit.
6. Complete the story checkpoint and regressions before declaring the story done.

## Parallel Opportunities

- Setup T003–T006 affect independent files after T001's contract decisions are fixed.
- Foundational types/events/normalizers/reference port/mapper/DTO work (T013–T015, T017, T019–T020)
  can run in parallel after the schema shape is agreed.
- After Foundational, US1, US2, and US3 can be staffed in parallel; US4's profile work can proceed
  while its default-reference integration waits for US1/US2.
- Contract, DTO, query, concurrency, and lifecycle tests within each story target separate files.
- Paired branch/department, year/term, and profile/settings controllers and repositories are parallel.

## Parallel Execution Examples

### User Story 1

```text
T026 branch contracts | T027 department contracts | T028 DTOs | T029 queries | T030 lifecycle
T031 branch DTOs/repository/policy | T032 department DTOs/repository/policy
```

### User Story 2

```text
T048 year contracts | T049 term contracts | T050 DTOs | T051 activation | T052 overlap
T053/T055 year DTO+repository | T054/T056 term DTO+repository
```

### User Story 3

```text
T067 group contracts | T068 value contracts | T069 DTOs | T070 queries | T071 lifecycle
T072 group DTOs | T073 value DTOs
```

### User Story 4

```text
T085 profile contracts | T086 settings contracts | T087 DTOs | T088 integration
T089/T091 profile DTO+repository | T090/T092 settings DTO+repository
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T047.
3. Stop and validate branch/department contract, scope, lifecycle, dependencies, concurrency,
   authorization, Swagger, and regressions.
4. Deploy/demo the organizational-structure master-data MVP if desired.

### Incremental Delivery

1. **MVP** — US1 supplies branches and departments.
2. **Calendar** — US2 supplies exclusive years and non-overlapping terms.
3. **Configurable classifications** — US3 eliminates hardcoded business choices.
4. **Branding/defaults** — US4 supplies safe public profile and operational settings management.
5. **Production gate** — Phase 7 proves the complete contract and security surface.

## Notes

- `[P]` means different files with no unmet dependency; it does not waive phase gates.
- Story labels trace tasks directly to the four acceptance journeys in `spec.md`.
- Identity retains employee, role, permission, and authentication ownership despite shared `/settings`
  routes; Organization consumes only its exported reference service.
- Static standards remain a bounded feed; configurable business lookups paginate and never hardcode
  consuming-module dropdown values.
- No task adds permanent-delete endpoints or direct filesystem access.
