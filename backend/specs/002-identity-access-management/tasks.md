---
description: "Dependency-ordered task list for Identity & Access Management"
---

# Tasks: Identity & Access Management

**Input**: Design documents from `/specs/002-identity-access-management/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included because the specification requires measurable authentication, replay,
authorization, transaction, concurrency, scope, disclosure, and contract outcomes. Within each story,
write the named tests first and confirm they fail for the intended reason before implementation.

**Organization**: Tasks are grouped by the five prioritized user stories. The user's six work
packages map to Setup/Foundation, US1 authentication, US3 employee administration, US4 role and
permission management, US2/US5 profile and sessions, and the final contract/validation phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: May run in parallel because it targets different files and has no unmet dependency
- **[Story]**: User story from [spec.md](spec.md)
- Every task names its exact output or verification path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the Identity module layout, configuration, and canonical contract before
schema or behavior changes.

- [X] T001 Amend authentication/session/profile and multi-role sections in `docs/api-data-requirements.html` to match the eight owner-approved additions in `specs/002-identity-access-management/spec.md`
- [X] T002 Create the capability directory skeleton and barrel-free module boundary under `src/modules/identity/{auth,sessions,employees,roles,profile,events,mappers,types}/`
- [X] T003 [P] Create test directory skeletons with `.gitkeep` files under `test/unit/identity/`, `test/integration/identity/`, and `test/e2e/identity/`
- [X] T004 [P] Add password-policy variables and safe defaults to `.env.example` and `.env.test.example`
- [X] T005 Add typed password-policy configuration to `src/config/config.types.ts`, `src/config/configuration.ts`, and `src/config/env.validation.ts`
- [X] T006 [P] Add Identity-specific documented error subclasses/codes for invalid credentials, inactive account, current-session revocation, and role-in-use to `src/core/exceptions/identity.exceptions.ts` and `src/core/exceptions/index.ts`
- [X] T007 [P] Create canonical permission seed manifest with exact documented keys and Arabic metadata in `prisma/seeds/permission-catalog.ts`
- [X] T008 Verify the unchanged Backend Foundation baseline with `npm run build`, `npm run lint`, `npm run test`, and `npm run test:e2e`, recording commands in `specs/002-identity-access-management/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migrate provisional foundation records into the shared Identity model and provide the
live caller/permission vocabulary every story needs.

**⚠️ CRITICAL**: No user-story implementation begins until the migration, repositories, caller
resolution, and module wiring below are complete.

- [X] T009 Extend `Account`, `Role`, and `RefreshToken` and add `Permission`, `AccountRole`, and `RolePermission` models, relationships, constraints, and indexes in `prisma/schema.prisma`
- [X] T010 Generate and review the additive/backfill/removal migration described in `specs/002-identity-access-management/data-model.md` under `prisma/migrations/*_identity_access_management/migration.sql`
- [X] T011 Add migration verification covering existing single-role data, permission-key parity, and rollback reconstruction in `test/integration/identity/identity-migration.spec.ts`
- [X] T012 Update the idempotent role/account seed and add canonical permission plus join-row upserts in `prisma/seed.ts`
- [X] T013 [P] Define public employee, role, permission, session, and context types without credential fields in `src/modules/identity/types/identity.types.ts`
- [X] T014 [P] Define Identity domain-event names and payload contracts for every operation in `src/modules/identity/events/identity.events.ts`
- [X] T015 [P] Implement the centralized configurable password policy in `src/modules/identity/auth/password-policy.service.ts`
- [X] T016 [P] Implement bounded user-agent/device/browser/IP derivation helpers in `src/modules/identity/sessions/session-metadata.ts`
- [X] T017 Create `EmployeeRepository` with active-context loading, scoped pagination, versioned writes, assignments, and transaction-client support in `src/modules/identity/employees/employee.repository.ts`
- [X] T018 Create `RoleRepository` with assignment counts, paginated search, versioned writes, status transitions, and transaction-client support in `src/modules/identity/roles/role.repository.ts`
- [X] T019 Create `PermissionRepository` with canonical catalogue reads, ID validation, and role replacement primitives in `src/modules/identity/roles/permission.repository.ts`
- [X] T020 Create `SessionRepository` with create, valid-hash compare-and-rotate, owned list, revoke-one, revoke-others, revoke-all, activity update, and prune operations in `src/modules/identity/sessions/session.repository.ts`
- [X] T021 [P] Create database-to-contract employee/role/context mappers with stable sorting and secret exclusion in `src/modules/identity/mappers/identity.mapper.ts`
- [X] T022 [P] Unit test password policy and request-metadata fallbacks/bounds in `test/unit/identity/password-policy.spec.ts` and `test/unit/identity/session-metadata.spec.ts`
- [X] T023 Integration test repository uniqueness, role/permission unions, branch scope, session validity, and optimistic concurrency in `test/integration/identity/identity-repositories.spec.ts`
- [X] T024 Update `CallerContext` for multi-role summaries, effective permission union, and current session ID in `src/shared/types/caller-context.ts`
- [X] T025 Replace provisional single-role account lookup with live active account/role/permission/session resolution in `src/core/auth/account.repository.ts` and `src/core/auth/auth.guard.ts`
- [X] T026 Update global permission enforcement to consume the live union while preserving AND semantics and protected-by-default behavior in `src/core/authorization/permissions.guard.ts`
- [X] T027 Create and export shared Identity providers/repositories through `src/modules/identity/identity.module.ts`
- [X] T028 Import `IdentityModule` without circular dependencies and retire provisional repository providers in `src/core/auth/auth.module.ts`, `src/core/core.module.ts`, and `src/app.module.ts`

**Checkpoint**: Fresh and upgraded databases migrate; seeds are idempotent; the global guard resolves
multiple active roles and current session state; all foundation tests remain green.

---

## Phase 3: User Story 1 — Authenticate and Restore Work (Priority: P1) 🎯 MVP

**Goal**: An active employee can sign in, restore/refresh the session, reach protected APIs, and
logout without any credential appearing in response data or logs.

**Independent Test**: Execute login → restore → protected request → refresh → replay old refresh →
logout. Verify valid access succeeds, replay/logout access fails, unauthenticated restore returns null,
and secrets never appear.

### Tests for User Story 1

- [X] T029 [P] [US1] Add contract tests for login, session, refresh, logout, cookies, envelopes, status codes, and Swagger shapes in `test/e2e/identity/auth-contract.e2e-spec.ts`
- [X] T030 [P] [US1] Add integration tests for valid/wrong/unknown/inactive login and constant external failure behavior in `test/integration/identity/authentication.service.spec.ts`
- [X] T031 [P] [US1] Add concurrent refresh replay and hash compare-and-rotate tests against PostgreSQL in `test/integration/identity/refresh-rotation.spec.ts`
- [X] T032 [P] [US1] Add secret-disclosure and log-redaction assertions for passwords, cookies, hashes, and tokens in `test/e2e/identity/auth-redaction.e2e-spec.ts`

### Implementation for User Story 1

- [X] T033 [P] [US1] Create login and empty-body validation DTOs with Arabic Swagger field examples in `src/modules/identity/auth/dto/login.dto.ts` and `src/modules/identity/auth/dto/auth-response.dto.ts`
- [X] T034 [US1] Refactor access/refresh claims to carry stable session ID and implement same-session rotation primitives in `src/core/auth/token.service.ts`
- [X] T035 [US1] Align access/refresh cookie paths, expiry, clearing, and httpOnly/SameSite/Secure configuration in `src/core/auth/cookie.service.ts`
- [X] T036 [US1] Implement constant-behavior credential verification, session creation, context construction, and login/failed-login events in `src/modules/identity/auth/auth.service.ts`
- [X] T037 [US1] Implement unauthenticated-null restore and invalid-cookie clearing in `src/modules/identity/auth/auth.service.ts`
- [X] T038 [US1] Implement transactional refresh compare-and-rotate and old-token replay refusal in `src/modules/identity/auth/auth.service.ts`
- [X] T039 [US1] Implement idempotent current-session logout, cookie clearing, and logout event emission in `src/modules/identity/auth/auth.service.ts`
- [X] T040 [US1] Expose `POST login`, `GET session`, `POST refresh`, and `POST logout` with correct public/auth annotations and envelope Swagger decorators in `src/modules/identity/auth/auth.controller.ts`
- [X] T041 [US1] Register auth controller/service dependencies and route ownership in `src/modules/identity/identity.module.ts`
- [X] T042 [US1] Verify CSRF exemptions/protection and credentialed CORS behavior for all four auth routes in `test/e2e/identity/auth-csrf-cors.e2e-spec.ts`
- [X] T043 [US1] Run quickstart checks 1–2 and document any canonical contract corrections in `specs/002-identity-access-management/quickstart.md`
- [X] T044 [US1] Run the complete US1 test slice and foundation regression commands defined in `package.json`

**Checkpoint**: User Story 1 is a deployable authentication MVP independent of administration UIs.

---

## Phase 4: User Story 2 — Control Active Sessions (Priority: P2)

**Goal**: Employees can inspect their own active devices, revoke one other session, or revoke all
others while preserving the current session and hiding foreign-session ownership.

**Independent Test**: Create three sessions, verify safe/current-first inventory, revoke one, revoke
all others, and compare foreign-ID and unknown-ID refusal bodies.

### Tests for User Story 2

- [X] T045 [P] [US2] Add contract tests for session descriptor fields, list ordering, revoke-one, revoke-all-others, and envelopes in `test/e2e/identity/sessions-contract.e2e-spec.ts`
- [X] T046 [P] [US2] Add ownership/non-disclosure and current-session refusal integration tests in `test/integration/identity/session-revocation.spec.ts`
- [X] T047 [P] [US2] Add multi-session lifecycle and post-revocation protected-request e2e coverage in `test/e2e/identity/session-lifecycle.e2e-spec.ts`

### Implementation for User Story 2

- [X] T048 [P] [US2] Create session ID parameter and response DTOs in `src/modules/identity/sessions/dto/session.dto.ts`
- [X] T049 [US2] Implement current-first bounded inventory and safe descriptor mapping in `src/modules/identity/sessions/session.service.ts`
- [X] T050 [US2] Implement owned non-current single-session revocation with non-disclosing lookup behavior in `src/modules/identity/sessions/session.service.ts`
- [X] T051 [US2] Implement transactional revoke-all-others with deterministic revoked count in `src/modules/identity/sessions/session.service.ts`
- [X] T052 [US2] Implement throttled session last-activity persistence from authenticated requests in `src/core/auth/auth.guard.ts` and `src/modules/identity/sessions/session.service.ts`
- [X] T053 [US2] Expose `GET /auth/sessions`, `DELETE /auth/sessions/:id`, and `DELETE /auth/sessions` with self-service authorization and Swagger envelopes in `src/modules/identity/sessions/sessions.controller.ts`
- [X] T054 [US2] Register session controller/service wiring in `src/modules/identity/identity.module.ts`
- [X] T055 [US2] Run quickstart check 3 and the complete US2/foundation regression suite from `specs/002-identity-access-management/quickstart.md`

**Checkpoint**: User Stories 1 and 2 provide a complete independently testable credential/session
lifecycle.

---

## Phase 5: User Story 3 — Manage Employee Accounts (Priority: P3)

**Goal**: Authorized administrators can list, inspect, create, update, transition, and reset employee
accounts with branch scope, multiple roles, concurrency, transactions, and archival history.

**Independent Test**: Create and find a multi-role employee, update it, exercise every filter/sort/
page rule, suspend/reactivate/archive it, reset its password, and verify stale/out-of-scope/partial-
failure behavior.

### Tests for User Story 3

- [X] T056 [P] [US3] Add employee list/detail/create/update/status/reset contract and Swagger tests in `test/e2e/identity/employees-contract.e2e-spec.ts`
- [X] T057 [P] [US3] Add DTO tests for names, normalized email, phone, assignments, unknown/server-owned fields, sort allow-list, and password confirmation in `test/unit/identity/employee-dtos.spec.ts`
- [X] T058 [P] [US3] Add Arabic-normalized search, filters, pagination clamp/over-range, and branch-scope integration tests in `test/integration/identity/employee-query.spec.ts`
- [X] T059 [P] [US3] Add transaction rollback tests for status-plus-session-revocation and reset-plus-revocation in `test/integration/identity/employee-transactions.spec.ts`
- [X] T060 [P] [US3] Add stale-version, duplicate-email, dependency, last-role, invalid-transition, and out-of-scope error tests in `test/e2e/identity/employee-errors.e2e-spec.ts`

### Implementation for User Story 3

- [X] T061 [P] [US3] Create list/filter/sort/page DTOs and explicit sort/status enums in `src/modules/identity/employees/dto/list-employees.dto.ts`
- [X] T062 [P] [US3] Create employee create/update/status/reset DTOs with administrator field ownership and Swagger models in `src/modules/identity/employees/dto/employee-mutations.dto.ts`
- [X] T063 [P] [US3] Create employee detail/list/record-permission response DTOs in `src/modules/identity/employees/dto/employee-response.dto.ts`
- [X] T064 [US3] Implement employee assignment/status/dependency transition rules in `src/modules/identity/employees/employee.policy.ts`
- [X] T065 [US3] Implement scoped list/detail and effective permission projection in `src/modules/identity/employees/employee.service.ts`
- [X] T066 [US3] Implement transactional create with password hashing, active role validation, branch invariant, and creation event in `src/modules/identity/employees/employee.service.ts`
- [X] T067 [US3] Implement versioned administrator update with derived-label rejection, role replacement, and update event in `src/modules/identity/employees/employee.service.ts`
- [X] T068 [US3] Implement activate/inactivate/archive transitions with atomic all-session revocation and status event in `src/modules/identity/employees/employee.service.ts`
- [X] T069 [US3] Implement administrator password reset with policy, version increment, all-session revocation, and event in `src/modules/identity/employees/employee.service.ts`
- [X] T070 [US3] Expose seven employee administration operations with `settings.users.*` decorators and Swagger envelopes in `src/modules/identity/employees/employees.controller.ts`
- [X] T071 [US3] Register employee controller/service/policy wiring in `src/modules/identity/identity.module.ts`
- [X] T072 [US3] Verify employee create/update/status/reset domain event payloads and post-commit timing in `test/integration/identity/employee-events.spec.ts`
- [X] T073 [US3] Run quickstart checks 5–8 and the complete US3/foundation regression suite from `specs/002-identity-access-management/quickstart.md`

**Checkpoint**: Employee administration is complete and independently usable with pre-seeded roles,
even before role administration screens ship.

---

## Phase 6: User Story 4 — Manage Roles and Permissions (Priority: P4)

**Goal**: Administrators can manage roles, replace recognized permissions, view the full catalogue,
and rely on global guards to apply permission changes on the next request.

**Independent Test**: Create/edit a role, replace its permissions, assign it to an employee, prove
union/live guard behavior, reject unknown permissions, and enforce assigned-role archival refusal.

### Tests for User Story 4

- [X] T074 [P] [US4] Add role list/detail/create/update/status/permission-replace contract and Swagger tests in `test/e2e/identity/roles-contract.e2e-spec.ts`
- [X] T075 [P] [US4] Add exact permission-catalogue parity/group/order test against `prisma/seeds/permission-catalog.ts` in `test/integration/identity/permission-catalog.spec.ts`
- [X] T076 [P] [US4] Add role uniqueness, version, inactive-permission, in-use archive, and transaction rollback tests in `test/integration/identity/role-service.spec.ts`
- [X] T077 [P] [US4] Add live multi-role permission-union and global guard enforcement e2e tests in `test/e2e/identity/rbac-live-update.e2e-spec.ts`

### Implementation for User Story 4

- [X] T078 [P] [US4] Create role list/create/update/status/permission-replacement DTOs and allow-lists in `src/modules/identity/roles/dto/role.dto.ts`
- [X] T079 [P] [US4] Create role detail/list and grouped permission catalogue response DTOs in `src/modules/identity/roles/dto/role-response.dto.ts`
- [X] T080 [US4] Implement paginated role list/detail and normalized uniqueness rules in `src/modules/identity/roles/role.service.ts`
- [X] T081 [US4] Implement transactional role create/update with versioning and domain events in `src/modules/identity/roles/role.service.ts`
- [X] T082 [US4] Implement role status transitions and assigned-non-archived account protection in `src/modules/identity/roles/role.service.ts`
- [X] T083 [US4] Implement atomic full permission replacement with exact active catalogue validation and immediate authorization effect in `src/modules/identity/roles/role.service.ts`
- [X] T084 [US4] Implement grouped bounded canonical permission catalogue reads in `src/modules/identity/roles/permission.service.ts`
- [X] T085 [US4] Expose six role operations and the permission catalogue with `settings.roles.*`/`settings.permissions.*` authorization in `src/modules/identity/roles/roles.controller.ts` and `src/modules/identity/roles/permissions.controller.ts`
- [X] T086 [US4] Register role/permission services and controllers in `src/modules/identity/identity.module.ts`
- [X] T087 [US4] Verify role and permission domain event payloads and post-commit timing in `test/integration/identity/role-events.spec.ts`
- [X] T088 [US4] Run quickstart checks 4, 9–10 and the complete US4/foundation regression suite from `specs/002-identity-access-management/quickstart.md`

**Checkpoint**: RBAC administration and live enforcement are complete; every future protected module
can consume the same permission guard.

---

## Phase 7: User Story 5 — Maintain My Profile and Password (Priority: P5)

**Goal**: Authenticated employees can view/update narrowly owned profile fields and change their
password while preserving only the current session.

**Independent Test**: Read profile, update display name/phone/avatar, reject administrator-owned
fields, change password from one of two sessions, and verify only the current session survives.

### Tests for User Story 5

- [X] T089 [P] [US5] Add self-profile read/update and password-change contract/Swagger tests in `test/e2e/identity/profile-contract.e2e-spec.ts`
- [X] T090 [P] [US5] Add field-ownership, avatar-descriptor, phone/name, password-policy, and confirmation DTO tests in `test/unit/identity/profile-dtos.spec.ts`
- [X] T091 [P] [US5] Add profile concurrency and password-change rollback/current-session-preservation integration tests in `test/integration/identity/profile-service.spec.ts`

### Implementation for User Story 5

- [X] T092 [P] [US5] Create self-profile update and response DTOs that reject administrator-owned fields in `src/modules/identity/profile/dto/profile.dto.ts`
- [X] T093 [P] [US5] Create change-password DTO with current/new/confirmation/version validation in `src/modules/identity/profile/dto/change-password.dto.ts`
- [X] T094 [US5] Implement current profile projection and versioned displayName/phone/avatar update with event emission in `src/modules/identity/profile/profile.service.ts`
- [X] T095 [US5] Implement transactional current-password verification, hash/version update, other-session revocation, and event in `src/modules/identity/profile/profile.service.ts`
- [X] T096 [US5] Expose `GET/PATCH /auth/profile` and `POST /auth/change-password` with self-service authorization and Swagger envelopes in `src/modules/identity/profile/profile.controller.ts`
- [X] T097 [US5] Register profile controller/service wiring in `src/modules/identity/identity.module.ts`
- [X] T098 [US5] Run quickstart checks 11–12 and the complete US5/foundation regression suite from `specs/002-identity-access-management/quickstart.md`

**Checkpoint**: All five user stories work independently and together.

---

## Phase 8: Polish & Cross-Cutting Validation

**Purpose**: Complete the user's frontend-contract and production-readiness work packages across all
stories.

- [X] T099 [P] Verify every Identity endpoint carries an accurate success envelope and documented error-code Swagger decorator in `src/modules/identity/**/*.controller.ts`
- [X] T100 [P] Verify every state-changing Identity endpoint is CSRF-protected and every protected endpoint is fail-closed with the correct permission decorator in `test/e2e/identity/security-surface.e2e-spec.ts`
- [X] T101 [P] Add full security-log correlation/redaction coverage for all Identity operation families in `test/e2e/identity/identity-logging.e2e-spec.ts`
- [X] T102 Verify all 24 routes, request/response fields, pagination names, status codes, and errors against `docs/api-data-requirements.html` and `specs/002-identity-access-management/contracts/`
- [X] T103 Verify canonical permission keys exactly match the amended frontend contract and update `prisma/seeds/permission-catalog.ts` only if the source document changed
- [X] T104 Run migration and seed twice on both a fresh database and a copied foundation-schema database, recording parity results in `specs/002-identity-access-management/quickstart.md`
- [X] T105 Run the Prisma layering audit and remove every non-repository Identity query/import found under `src/modules/identity/`
- [X] T106 Run strict-type, filesystem-path, secret-string, and controller-business-logic audits across `src/modules/identity/`, `src/core/auth/`, `test/unit/identity/`, `test/integration/identity/`, and `test/e2e/identity/`
- [X] T107 [P] Update module architecture, configuration, migration, seed, and API usage documentation in `README.md` and `src/modules/README.md`
- [X] T108 Prune unused dependencies and review `npm audit` findings in `package.json` and `package-lock.json` without applying unreviewed breaking upgrades
- [X] T109 Execute all 16 scenarios in `specs/002-identity-access-management/quickstart.md` and record any environment-only limitations
- [X] T110 Final gate: run `npm run build && npm run lint && npm run test -- --runInBand && npm run test:e2e -- --runInBand` and confirm all Identity plus Backend Foundation suites pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately; T001 contract synchronization must finish before endpoint implementation.
- **Foundational (Phase 2)**: depends on Setup and blocks every story.
- **US1 (Phase 3)**: depends on Foundational; delivers the authentication MVP.
- **US2 (Phase 4)**: depends on Foundational and US1 session creation/current-session identity.
- **US3 (Phase 5)**: depends on Foundational. It can be developed alongside US1/US2, but its final status/password lifecycle tests require US1.
- **US4 (Phase 6)**: depends on Foundational. It may run alongside US1–US3; final live-guard tests require US1.
- **US5 (Phase 7)**: depends on US1 and US2 for current-session preservation/revocation behavior.
- **Polish (Phase 8)**: depends on every selected story.

### User Story Dependency Graph

```text
Setup → Foundational → US1 (authentication MVP) → US2 (session control) → US5 (self-service)
                   ├────────────────────────────→ US3 (employee administration)
                   └────────────────────────────→ US4 (roles and permissions)

US1 + US2 + US3 + US4 + US5 → Polish
```

### Within Each User Story

1. Write contract/unit/integration tests and verify they fail for the intended missing behavior.
2. DTOs/types precede repositories/services that consume them.
3. Repositories precede services; services precede controllers.
4. Multi-record behavior is implemented and tested through the transaction manager.
5. Complete the story checkpoint and regression suite before declaring the story done.

## Parallel Opportunities

- Phase 1: T003, T004, T006, and T007 affect separate files.
- Phase 2: T013–T016 and T021–T022 are independent after the schema shape is known; repository tasks T017–T020 target different files but migration T010 must land first.
- US1: T029–T032 tests can be authored together; T033 can proceed while token/cookie primitives are reviewed.
- US2: T045–T047 and the response DTO T048 are parallel.
- US3: T056–T060 tests and T061–T063 DTO groups are parallel.
- US4: T074–T077 tests and T078–T079 DTO groups are parallel.
- US5: T089–T091 tests and T092–T093 DTOs are parallel.
- After Foundational, US3 and US4 can proceed independently while US1/US2 are built, subject to their noted final integration tests.

## Parallel Execution Examples

### User Story 1

```text
T029 auth contract tests | T030 login integration | T031 refresh replay | T032 redaction
```

### User Story 3

```text
T056 employee contracts | T057 DTO rules | T058 list/scope | T059 transactions | T060 errors
T061 list DTOs | T062 mutation DTOs | T063 response DTOs
```

### User Story 4

```text
T074 role contracts | T075 catalogue parity | T076 role service | T077 live RBAC
T078 mutation DTOs | T079 response DTOs
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 through T044.
3. Stop and validate login, restore, refresh replay defense, protected access, logout, cookies, CSRF,
   envelopes, logging redaction, and foundation regressions.
4. This is the minimum deployable increment; it replaces mock authentication without requiring the
   administration screens.

### Incremental Delivery

1. **MVP** — US1 authenticates employees securely.
2. **Session security** — US2 gives employees device/session control.
3. **Administration** — US3 enables employee onboarding and lifecycle management.
4. **RBAC control plane** — US4 enables role/catalogue management with live enforcement.
5. **Self-service** — US5 enables profile and password ownership.
6. **Production gate** — Phase 8 proves the complete contract and security surface.

## Notes

- `[P]` means the task changes different files and does not depend on unfinished work.
- Story labels provide direct traceability to the five acceptance journeys.
- The route examples in the user's task brief are normalized to the finalized contract: `/auth/*`
  self-service and `/settings/*` administration under the global `/api/v1` prefix.
- Session and permission catalogue arrays are intentionally bounded exceptions to general list
  pagination; employee and role lists always paginate.
- No task introduces Organization tables or queries; branch and department IDs remain external
  references until that module exists.
