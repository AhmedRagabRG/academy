# Tasks: Organization & Settings

**Input**: Design documents from `/specs/002-organization-settings/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Validation**: Tests are included because the specification requires proof of business invariants,
RTL, responsive behavior, keyboard accessibility, and zero serious accessibility violations.

**Organization**: Tasks are grouped by user story so each increment can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it uses different files and has no incomplete dependency
- **[Story]**: Maps the task to a user story from `spec.md`
- Every task includes an exact target file path

---

## Phase 1: Setup (Feature Structure)

**Purpose**: Establish the isolated module and route adapters without adding business behavior.

- [X] T001 Create the feature directory structure and placeholder public boundary in `apps/web/src/features/organization-settings/index.ts`
- [X] T002 [P] Create route-level loading and error boundaries in `apps/web/src/app/(workspace)/settings/loading.tsx` and `apps/web/src/app/(workspace)/settings/error.tsx`
- [X] T003 [P] Register the ten settings route records and Lucide icon keys in `apps/web/src/features/organization-settings/config/navigation.ts`
- [X] T004 Add the Organization & Settings navigation contribution to `apps/web/src/shared/config/foundation-navigation.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared contracts and reusable infrastructure required by every story.

**⚠️ CRITICAL**: No user-story implementation begins until this phase is complete.

- [X] T005 [P] Define branded IDs, audit metadata, status definitions, file assets, contacts, list queries, and paginated results in `apps/web/src/features/organization-settings/types/common.ts`
- [X] T006 [P] Define organization, branch, department, academic calendar, user, role, permission, and settings domain types in `apps/web/src/features/organization-settings/types/domain.ts`
- [X] T007 Define typed commands, service facade operations, and lookup contracts in `apps/web/src/features/organization-settings/services/organization-settings-service.ts`
- [X] T008 [P] Define safe validation, duplicate, dependency, state, version-conflict, permission, and unexpected errors in `apps/web/src/features/organization-settings/services/organization-settings-error.ts`
- [X] T009 [P] Implement hierarchical TanStack Query key factories for every aggregate in `apps/web/src/features/organization-settings/services/organization-settings-query-keys.ts`
- [X] T010 [P] Create configurable statuses, countries, languages, time zones, currencies, date formats, number formats, weekdays, permission groups, and permission actions in `apps/web/src/features/organization-settings/data/organization-settings-fixtures.ts`
- [X] T011 Implement deterministic mock latency, empty, validation, conflict, dependency, permission, and unexpected-result controls in `apps/web/src/features/organization-settings/services/mock-scenario-controller.ts`
- [X] T012 Implement the in-memory transactional mock adapter shell and reset helpers in `apps/web/src/features/organization-settings/services/mock-organization-settings-service.ts`
- [X] T013 Extend controlled/manual search, sorting, filters, pagination, total counts, row IDs, retry, and selection reconciliation in `apps/web/src/shared/components/data-table/data-table.tsx`
- [X] T014 [P] Add generic multi-select, weekday selector, time-range, and image-upload form controls in `apps/web/src/shared/components/forms/multi-select-field.tsx`, `apps/web/src/shared/components/forms/weekday-field.tsx`, `apps/web/src/shared/components/forms/time-range-field.tsx`, and `apps/web/src/shared/components/forms/image-upload-field.tsx`
- [X] T015 Implement shared query/mutation error mapping and RHF field-error application in `apps/web/src/features/organization-settings/utils/service-error-mapping.ts`
- [X] T016 [P] Add contract tests for list queries, typed errors, query keys, controlled tables, and mock scenarios in `apps/web/tests/contract/organization-settings/foundation-contracts.test.tsx`

**Checkpoint**: The feature has one service boundary, deterministic mock infrastructure, reusable forms, and one controlled shared table.

---

## Phase 3: User Story 1 — Configure the Organization (Priority: P1) 🎯 MVP

**Goal**: Manage the organization profile, media, contacts, locale preferences, and general defaults through mock services.

**Independent Test**: Edit `/settings/organization` and `/settings/general`, validate malformed values and uploads, save, reload, and recover from a version conflict without losing input.

### Tests for User Story 1

- [X] T017 [P] [US1] Add failing Zod tests for profile, contact, media, locale, and general-settings validation in `apps/web/tests/unit/organization-settings/organization-settings-schema.test.ts`
- [X] T018 [P] [US1] Add failing service tests for profile/settings persistence, active references, versions, and upload limits in `apps/web/tests/unit/organization-settings/organization-settings-service.test.ts`
- [X] T019 [P] [US1] Add failing component tests for error focus, pending state, file rejection, conflict recovery, and success feedback in `apps/web/tests/integration/organization-settings/organization-settings-forms.test.tsx`
- [X] T020 [P] [US1] Add the failing profile/defaults browser journey in `apps/web/playwright/journeys/organization-profile-settings.spec.ts`

### Implementation for User Story 1

- [X] T021 [P] [US1] Implement authoritative organization-profile and general-settings Zod schemas in `apps/web/src/features/organization-settings/schemas/organization-profile-schema.ts` and `apps/web/src/features/organization-settings/schemas/general-settings-schema.ts`
- [X] T022 [P] [US1] Seed the organization profile, contacts, media metadata, and general settings in `apps/web/src/features/organization-settings/data/organization-fixtures.ts`
- [X] T023 [US1] Implement profile, media, lookup, and general-settings mock service operations with version checks in `apps/web/src/features/organization-settings/services/mock-organization-settings-service.ts`
- [X] T024 [US1] Implement profile/settings queries and mutations with granular invalidation and Sonner feedback in `apps/web/src/features/organization-settings/hooks/use-organization-settings.ts`
- [X] T025 [P] [US1] Build the organization identity, contact, address, media, and language form sections in `apps/web/src/features/organization-settings/forms/organization-profile-form.tsx`
- [X] T026 [P] [US1] Build the language, time-zone, currency, formats, working-days, and default-record form in `apps/web/src/features/organization-settings/forms/general-settings-form.tsx`
- [X] T027 [US1] Compose loading, error, conflict, and success states in `apps/web/src/features/organization-settings/screens/organization-screen.tsx`
- [X] T028 [US1] Compose the default-settings experience and active-reference selectors in `apps/web/src/features/organization-settings/screens/general-settings-screen.tsx`
- [X] T029 [P] [US1] Add thin Server Component route adapters and metadata in `apps/web/src/app/(workspace)/settings/organization/page.tsx` and `apps/web/src/app/(workspace)/settings/general/page.tsx`
- [X] T030 [US1] Export organization and general-settings screens through `apps/web/src/features/organization-settings/index.ts`

**Checkpoint**: Organization profile and system defaults work as a standalone MVP through service abstractions.

---

## Phase 4: User Story 2 — Manage Organizational Structure (Priority: P1)

**Goal**: Create, edit, search, filter, paginate, archive, and activate branches and departments without destructive deletion.

**Independent Test**: Complete branch and department CRUD-like lifecycle workflows, reject duplicate codes/names, preserve existing references, and block invalid default-branch archival.

### Tests for User Story 2

- [X] T031 [P] [US2] Add failing branch schema and working-hours tests in `apps/web/tests/unit/organization-settings/branch-schema.test.ts`
- [X] T032 [P] [US2] Add failing department schema and normalized-name tests in `apps/web/tests/unit/organization-settings/department-schema.test.ts`
- [X] T033 [P] [US2] Add failing service tests for uniqueness, lifecycle, retained references, and default-branch dependencies in `apps/web/tests/unit/organization-settings/organizational-structure-service.test.ts`
- [X] T034 [P] [US2] Add failing branch and department management journeys in `apps/web/playwright/journeys/organizational-structure.spec.ts`

### Implementation for User Story 2

- [X] T035 [P] [US2] Implement branch and working-hours schemas in `apps/web/src/features/organization-settings/schemas/branch-schema.ts`
- [X] T036 [P] [US2] Implement department schemas in `apps/web/src/features/organization-settings/schemas/department-schema.ts`
- [X] T037 [P] [US2] Seed branches, departments, managers, contacts, working hours, and lifecycle statuses in `apps/web/src/features/organization-settings/data/structure-fixtures.ts`
- [X] T038 [US2] Implement paginated branch/department lists, uniqueness, create/update, archive/activate, and dependency rules in `apps/web/src/features/organization-settings/services/mock-organization-settings-service.ts`
- [X] T039 [US2] Implement branch and department query/mutation hooks in `apps/web/src/features/organization-settings/hooks/use-organizational-structure.ts`
- [X] T040 [P] [US2] Build reusable branch create/edit form sections in `apps/web/src/features/organization-settings/forms/branch-form.tsx`
- [X] T041 [P] [US2] Build the department create/edit form in `apps/web/src/features/organization-settings/forms/department-form.tsx`
- [X] T042 [US2] Build shared-table branch and department screens with status filters and accessible lifecycle confirmations in `apps/web/src/features/organization-settings/screens/branches-screen.tsx` and `apps/web/src/features/organization-settings/screens/departments-screen.tsx`
- [X] T043 [P] [US2] Add thin route adapters and metadata in `apps/web/src/app/(workspace)/settings/branches/page.tsx` and `apps/web/src/app/(workspace)/settings/departments/page.tsx`
- [X] T044 [US2] Export organizational-structure screens through `apps/web/src/features/organization-settings/index.ts`

**Checkpoint**: Branches and departments are independently configurable and retain historical relationships.

---

## Phase 5: User Story 3 — Configure the Academic Calendar (Priority: P1)

**Goal**: Manage academic years and standalone academic terms while guaranteeing valid ranges and zero-or-one active year.

**Independent Test**: Create non-overlapping years and contained terms, activate a different year atomically, and reject inverted, overlapping, orphaned, or out-of-range records.

### Tests for User Story 3

- [X] T045 [P] [US3] Add failing year/term schema tests for ISO date-only ranges and containment in `apps/web/tests/unit/organization-settings/academic-calendar-schema.test.ts`
- [X] T046 [P] [US3] Add failing service tests for overlap, immutable parent, and atomic active/default-year transitions in `apps/web/tests/unit/organization-settings/academic-calendar-service.test.ts`
- [X] T047 [P] [US3] Add failing academic-year and standalone-term browser journeys in `apps/web/playwright/journeys/academic-calendar.spec.ts`

### Implementation for User Story 3

- [X] T048 [P] [US3] Implement academic-year and academic-term Zod schemas in `apps/web/src/features/organization-settings/schemas/academic-calendar-schema.ts`
- [X] T049 [P] [US3] Seed academic years, terms, statuses, and parent-year projections in `apps/web/src/features/organization-settings/data/academic-calendar-fixtures.ts`
- [X] T050 [US3] Implement year/term list, create/update, overlap, containment, status, and atomic activation operations in `apps/web/src/features/organization-settings/services/mock-organization-settings-service.ts`
- [X] T051 [US3] Implement academic-year and academic-term query/mutation hooks in `apps/web/src/features/organization-settings/hooks/use-academic-calendar.ts`
- [X] T052 [P] [US3] Build academic-year create/edit and activation forms in `apps/web/src/features/organization-settings/forms/academic-year-form.tsx`
- [X] T053 [P] [US3] Build academic-term create/edit form with immutable parent context in `apps/web/src/features/organization-settings/forms/academic-term-form.tsx`
- [X] T054 [US3] Build the academic-year table, detail summary, and atomic activation confirmation in `apps/web/src/features/organization-settings/screens/academic-years-screen.tsx`
- [X] T055 [US3] Build the standalone academic-term table with year search/filter/sort/pagination context in `apps/web/src/features/organization-settings/screens/academic-terms-screen.tsx`
- [X] T056 [P] [US3] Add academic-year list and detail route adapters in `apps/web/src/app/(workspace)/settings/academic-years/page.tsx` and `apps/web/src/app/(workspace)/settings/academic-years/[yearId]/page.tsx`
- [X] T057 [P] [US3] Add the standalone term route adapter in `apps/web/src/app/(workspace)/settings/academic-terms/page.tsx`
- [X] T058 [US3] Export academic-calendar screens through `apps/web/src/features/organization-settings/index.ts`

**Checkpoint**: Years and terms are independently manageable while all calendar invariants remain service-owned.

---

## Phase 6: User Story 4 — Manage Administrative Access (Priority: P2)

**Goal**: Manage users, roles, role assignments, permission matrices, effective permissions, and safe lifecycle transitions.

**Independent Test**: Create/edit a user with branch, department, and multiple roles; configure a selected role’s permissions; verify effective access; and prevent final-administrator lockout.

### Tests for User Story 4

- [X] T059 [P] [US4] Add failing user and assignment schema tests in `apps/web/tests/unit/organization-settings/user-schema.test.ts`
- [X] T060 [P] [US4] Add failing role and permission-assignment schema tests in `apps/web/tests/unit/organization-settings/role-permission-schema.test.ts`
- [X] T061 [P] [US4] Add failing service tests for unique email/role name, inactive references, permission union, and lockout protection in `apps/web/tests/unit/organization-settings/access-management-service.test.ts`
- [X] T062 [P] [US4] Add failing permission-matrix component tests for labels, indeterminate groups, keyboard flow, and save states in `apps/web/tests/integration/organization-settings/permission-matrix.test.tsx`
- [X] T063 [P] [US4] Add failing user, role, and permission browser journeys in `apps/web/playwright/journeys/access-management.spec.ts`

### Implementation for User Story 4

- [X] T064 [P] [US4] Implement internal-user and role-assignment schemas in `apps/web/src/features/organization-settings/schemas/user-schema.ts`
- [X] T065 [P] [US4] Implement role and permission-assignment schemas in `apps/web/src/features/organization-settings/schemas/role-permission-schema.ts`
- [X] T066 [P] [US4] Seed users, user-role joins, roles, role-permission joins, and permission catalog records in `apps/web/src/features/organization-settings/data/access-fixtures.ts`
- [X] T067 [US4] Implement paginated user operations, active reference validation, role replacement, and status transitions in `apps/web/src/features/organization-settings/services/mock-organization-settings-service.ts`
- [X] T068 [US4] Implement role operations, archive/activate lifecycle, atomic permission replacement, effective-permission union, and lockout protection in `apps/web/src/features/organization-settings/services/mock-organization-settings-service.ts`
- [X] T069 [US4] Implement user, role, permission catalog, selected-role matrix, and effective-permission hooks in `apps/web/src/features/organization-settings/hooks/use-access-management.ts`
- [X] T070 [P] [US4] Build the internal-user create/edit form with branch, department, role, image, and inherited-access summary in `apps/web/src/features/organization-settings/forms/user-form.tsx`
- [X] T071 [P] [US4] Build role create/edit form and assignment summary in `apps/web/src/features/organization-settings/forms/role-form.tsx`
- [X] T072 [P] [US4] Build the accessible module/action permission matrix with group selection in `apps/web/src/features/organization-settings/forms/permission-matrix-form.tsx`
- [X] T073 [US4] Build the user list with search, filters, pagination, activate/deactivate actions, and permission-aware controls in `apps/web/src/features/organization-settings/screens/users-screen.tsx`
- [X] T074 [US4] Build the user profile screen with assignments, effective permissions, audit metadata, and lifecycle actions in `apps/web/src/features/organization-settings/screens/user-profile-screen.tsx`
- [X] T075 [US4] Build the role list/detail screens with status, assignment count, summary, and archive/activate confirmations in `apps/web/src/features/organization-settings/screens/roles-screen.tsx` and `apps/web/src/features/organization-settings/screens/role-detail-screen.tsx`
- [X] T076 [US4] Build the standalone selected-role permission screen with URL-restorable context in `apps/web/src/features/organization-settings/screens/permissions-screen.tsx`
- [X] T077 [P] [US4] Add user list and profile route adapters in `apps/web/src/app/(workspace)/settings/users/page.tsx` and `apps/web/src/app/(workspace)/settings/users/[userId]/page.tsx`
- [X] T078 [P] [US4] Add role list/detail and permission route adapters in `apps/web/src/app/(workspace)/settings/roles/page.tsx`, `apps/web/src/app/(workspace)/settings/roles/[roleId]/page.tsx`, and `apps/web/src/app/(workspace)/settings/permissions/page.tsx`
- [X] T079 [US4] Export access-management screens and mock permission evaluator through `apps/web/src/features/organization-settings/index.ts`

**Checkpoint**: Users, roles, and permission assignments are fully configurable through mock service boundaries.

---

## Phase 7: User Story 5 — Find and Review Administrative Records (Priority: P2)

**Goal**: Prove consistent search, filters, sorting, pagination, selection, bulk actions, and query states across all administrative lists.

**Independent Test**: Exercise every list with matching, non-matching, loading, empty, error, retry, sorted, filtered, selected, and paginated results on desktop, laptop, and tablet.

### Tests for User Story 5

- [X] T080 [P] [US5] Add controlled-table integration tests for query callbacks, page clamping, selection reconciliation, and business-safe bulk actions in `apps/web/tests/integration/organization-settings/administrative-lists.test.tsx`
- [X] T081 [P] [US5] Add deterministic loading, empty, validation, conflict, dependency, error, and retry state tests in `apps/web/tests/integration/organization-settings/administrative-states.test.tsx`
- [X] T082 [P] [US5] Add desktop, laptop, and tablet list-state journeys in `apps/web/playwright/journeys/administrative-records.spec.ts`

### Implementation for User Story 5

- [X] T083 [US5] Standardize URL-backed list query parsing and serialization in `apps/web/src/features/organization-settings/utils/list-query-state.ts`
- [X] T084 [P] [US5] Define reusable feature table toolbar and business-safe bulk action contracts in `apps/web/src/features/organization-settings/components/administrative-table-toolbar.tsx`
- [X] T085 [US5] Integrate URL-backed search, filters, sorting, pagination, totals, and selection in `apps/web/src/features/organization-settings/screens/branches-screen.tsx`, `apps/web/src/features/organization-settings/screens/departments-screen.tsx`, `apps/web/src/features/organization-settings/screens/academic-years-screen.tsx`, `apps/web/src/features/organization-settings/screens/academic-terms-screen.tsx`, `apps/web/src/features/organization-settings/screens/users-screen.tsx`, and `apps/web/src/features/organization-settings/screens/roles-screen.tsx`
- [X] T086 [US5] Add consistent loading, empty, error, retry, permission-denied, and unavailable states across all feature screens in `apps/web/src/features/organization-settings/components/administrative-query-state.tsx`
- [X] T087 [US5] Create the permission-aware settings landing overview in `apps/web/src/features/organization-settings/screens/settings-overview-screen.tsx`
- [X] T088 [US5] Add the `/settings` route adapter and export the overview screen in `apps/web/src/app/(workspace)/settings/page.tsx` and `apps/web/src/features/organization-settings/index.ts`

**Checkpoint**: Every administrative list uses the same scalable interaction and query-state vocabulary.

---

## Phase 8: Polish & Cross-Cutting Validation

**Purpose**: Integrate navigation, permissions, accessibility, responsive behavior, and backend-ready boundaries across all stories.

- [X] T089 [P] Add serious/critical axe coverage for all ten required routes and both themes in `apps/web/playwright/accessibility/organization-settings-a11y.spec.ts`
- [X] T090 [P] Add route, navigation metadata, breadcrumb, active-item, and view-permission contract tests in `apps/web/tests/contract/organization-settings/navigation-contracts.test.ts`
- [X] T091 Add action-permission filtering, forbidden states, and the UX-only mock authorization notice through `apps/web/src/features/organization-settings/components/permission-aware-action.tsx`
- [X] T092 Verify logical RTL layout, mixed-direction values, Alexandria typography, and icon direction in `apps/web/playwright/journeys/organization-settings-rtl.spec.ts`
- [X] T093 Verify desktop, laptop, tablet, 200-percent zoom, and table-only horizontal scrolling in `apps/web/playwright/journeys/organization-settings-responsive.spec.ts`
- [X] T094 Verify keyboard flow, error focus, dialog focus trap/return, semantic headings/tables/fieldsets, live feedback, and contrast in `apps/web/playwright/accessibility/organization-settings-keyboard.spec.ts`
- [X] T095 Audit Client Component boundaries, query invalidation, rerenders, and large-list behavior and record fixes/evidence in `specs/002-organization-settings/validation/performance.md`
- [X] T096 Audit strict typing, fixture isolation, dynamic configuration, and public feature imports and record fixes/evidence in `specs/002-organization-settings/validation/architecture.md`
- [X] T097 [P] Document mock scenarios, permission limitations, extension points, and validation evidence in `specs/002-organization-settings/quickstart.md`
- [X] T098 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` from `package.json` and resolve every failure
- [X] T099 Run `npm run test:e2e -w web` from `apps/web/package.json`, complete the manual screen-reader review, and record final evidence in `specs/002-organization-settings/quickstart.md`
- [X] T100 Build the shared branded dropdown and migrate Organization & Settings selectors in `apps/web/src/shared/components/forms/dropdown.tsx` and `apps/web/src/shared/components/forms/select-field.tsx`
- [X] T101 Add the settings sidebar group and branded 404 recovery experience in `apps/web/src/shared/components/layout/sidebar-navigation.tsx` and `apps/web/src/app/not-found.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: Starts immediately.
- **Phase 2 — Foundational**: Depends on Phase 1 and blocks all user stories.
- **US1, US2, US3, US4**: Depend on Phase 2 and may proceed in parallel after it.
- **US5**: Depends on the list screens delivered by US2, US3, and US4; its generic tests and utilities may begin after Phase 2.
- **Phase 8 — Polish**: Depends on all selected stories being complete.

### User Story Dependencies

```text
Setup -> Foundation -> US1 (MVP)
                    -> US2 ----\
                    -> US3 -----+-> US5 -> Polish
                    -> US4 ----/
```

- **US1 (P1)** has no story dependency and proves profile/default service replacement.
- **US2 (P1)** has no story dependency after Foundation; it consumes active-default contracts from Foundation.
- **US3 (P1)** has no story dependency after Foundation; it owns the academic year/term invariant.
- **US4 (P2)** has no story dependency after Foundation; fixture references may use seeded branch/department IDs.
- **US5 (P2)** integrates the independently completed list screens from US2–US4.

### Within Each User Story

1. Write the listed tests and confirm they fail for the intended behavior.
2. Implement authoritative schemas and story fixtures.
3. Implement service invariants and TanStack Query hooks.
4. Build RHF forms and shared-table screens.
5. Add thin routes and public exports.
6. Run the story-specific test set before its checkpoint.

### Parallel Opportunities

- T002 and T003 can run in parallel after T001.
- T005, T006, T008, T009, and T010 use separate foundational files.
- Test files marked `[P]` within each story can be authored concurrently.
- Schema, fixture, and form tasks marked `[P]` within a story use separate files.
- US1, US2, US3, and US4 may run concurrently once Phase 2 passes.
- Accessibility, navigation-contract, documentation, and responsive-test work marked `[P]` can run concurrently in Phase 8.

---

## Parallel Execution Examples

### User Story 1

```text
T017 Organization/settings schema tests
T018 Organization/settings service tests
T019 Organization/settings form integration tests
T020 Organization/settings browser journey
```

### User Story 2

```text
T031 Branch schema tests
T032 Department schema tests
T033 Structure service tests
T034 Structure browser journey
```

### User Story 3

```text
T045 Academic calendar schema tests
T046 Calendar invariant service tests
T047 Academic calendar browser journey
```

### User Story 4

```text
T059 User schema tests
T060 Role/permission schema tests
T061 Access service tests
T062 Permission matrix tests
T063 Access browser journey
```

### User Story 5

```text
T080 Controlled list integration tests
T081 Administrative state tests
T082 Responsive list journeys
```

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Complete US1 organization profile and general settings.
3. Run T017–T030 and the applicable static gates.
4. Stop and validate `/settings/organization` and `/settings/general` independently.

### Incremental Delivery

1. Foundation → reusable service, query, form, table, and mock boundaries.
2. US1 → organization identity and defaults MVP.
3. US2 → branches and departments.
4. US3 → academic years and terms.
5. US4 → users, roles, and permissions.
6. US5 → consistent large-list behavior across the module.
7. Polish → full navigation, accessibility, RTL, responsive, and quality evidence.

### Parallel Team Strategy

After Phase 2, separate implementers can own US1, US2, US3, and US4 because each uses distinct
schemas, fixtures, hooks, forms, screens, routes, and tests. Coordinate only on the composed mock
adapter and public `index.ts`; integrate those sequentially to avoid file conflicts.

---

## Notes

- `[P]` means the task can execute concurrently with adjacent independent-file tasks.
- User-story labels provide requirement traceability.
- Pages import feature screens; only mock adapters import fixtures.
- Business statuses, options, and permission groups remain configurable service data.
- Branch deletion is prohibited; archive/deactivate actions retain relationships.
- Mock permission checks control affordances only and are not a security boundary.
- Commit after each task or coherent group and validate at every checkpoint.
