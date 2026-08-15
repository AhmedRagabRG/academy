# Tasks: Program Batches

**Input**: Design documents from `/specs/004-program-batches/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Validation**: Tests are required by the feature design. Within each story, write the listed tests first and confirm they fail before implementing that story.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and demonstrated as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and does not depend on an unfinished task
- **[Story]**: Maps the task to one specification story (`US1`–`US5`)
- Every task contains an exact file path

## Phase 1: Setup (Feature Scaffolding)

**Purpose**: Establish the independent feature, test locations, and integration seams without implementing business behavior.

- [X] T001 Create the feature directory structure and public export boundary in `apps/web/src/features/program-batches/index.ts`
- [X] T002 [P] Create unit, integration, contract, and Playwright helper locations in `apps/web/tests/unit/program-batches/test-helpers.ts`, `apps/web/tests/integration/program-batches/test-helpers.tsx`, `apps/web/tests/contract/program-batches/test-helpers.ts`, and `apps/web/playwright/helpers/program-batches.ts`
- [X] T003 [P] Add Arabic batch copy, stable status keys, and non-business UI constants in `apps/web/src/features/program-batches/config/program-batch-copy.ts`
- [X] T004 [P] Add the 13 granular batch permission keys to the mock role in `apps/web/src/features/auth/data/auth-fixtures.ts`
- [X] T005 [P] Register Program Batches navigation and breadcrumb metadata through the Academic Catalog configuration in `apps/web/src/features/program-batches/config/navigation.ts` and `apps/web/src/shared/config/navigation.ts`
- [X] T006 Document the feature's mock-authorization limitation and backend adapter boundary in `README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement contracts and infrastructure required by every user story.

**⚠️ CRITICAL**: No user-story implementation begins until this phase is complete.

- [X] T007 Define branded IDs, localized values, date-only, money, audit, version, pagination, and lookup types in `apps/web/src/features/program-batches/types/common.ts`
- [X] T008 [P] Define batch aggregate, schedule, capacity, financial, branch, lifecycle, readiness, eligibility, summary, and detail models in `apps/web/src/features/program-batches/types/domain.ts`
- [X] T009 [P] Define normalized list queries and explicit create, update, transition, and history commands in `apps/web/src/features/program-batches/types/commands.ts`
- [X] T010 [P] Define discriminated batch error codes, kinds, field mappings, and safe message contract in `apps/web/src/features/program-batches/services/program-batch-error.ts`
- [X] T011 Define the transport-neutral `ProgramBatchService`, enrollment-count reader, lookup reader, and consumer contracts in `apps/web/src/features/program-batches/services/program-batch-service.ts`
- [X] T012 [P] Define canonical query-key factories for lookups, lists, details, readiness, eligibility, lifecycle, and revisions in `apps/web/src/features/program-batches/services/program-batch-query-keys.ts`
- [X] T013 [P] Implement code/search normalization, date-only comparison, decimal normalization, and immutable cloning utilities in `apps/web/src/features/program-batches/utils/normalization.ts`
- [X] T014 [P] Define deterministic mock latency, empty, forbidden, duplicate, conflict, dependency, validation, parent-mismatch, unavailable, and unexpected scenario controls in `apps/web/src/features/program-batches/services/mock-scenario-controller.ts`
- [X] T015 [P] Create configurable program, academic-year, intake, branch, currency, milestone, offer-status, and permission lookup fixtures in `apps/web/src/features/program-batches/data/program-batch-lookups.ts`
- [X] T016 Create seeded aggregate, history, financial revision, and deterministic occupancy fixtures without exporting them from the public boundary in `apps/web/src/features/program-batches/data/program-batch-fixtures.ts`
- [X] T017 Implement service-context permission and employee branch-scope intersection helpers in `apps/web/src/features/program-batches/utils/program-batch-scope.ts`
- [X] T018 Implement shared query and mutation hooks with cancellation, returned-detail cache updates, and targeted invalidation in `apps/web/src/features/program-batches/hooks/use-program-batches.ts`
- [X] T019 [P] Implement a permission boundary and forbidden explanation for batch routes, sections, and actions in `apps/web/src/features/program-batches/components/program-batch-permission-boundary.tsx`
- [X] T020 [P] Implement reusable loading, empty, retryable error, unavailable, stale-conflict, and forbidden query states in `apps/web/src/features/program-batches/components/program-batch-query-state.tsx`
- [X] T021 [P] Implement RTL-safe code, date, number, and currency presentation helpers in `apps/web/src/features/program-batches/components/program-batch-value.tsx`
- [X] T022 Export only route screens, navigation contribution, service contract, consumer DTOs, and test scenario controls from `apps/web/src/features/program-batches/index.ts`
- [X] T023 Add foundational contract tests that prevent route/fixture imports and verify consumer-safe exports in `apps/web/tests/contract/program-batches/foundation-contracts.test.ts`
- [X] T024 Run the foundational contract test and TypeScript gate and record results in `specs/004-program-batches/validation/foundation.md`

**Checkpoint**: Typed boundaries, configurable lookups, state ownership, permissions, mock scenarios, and query infrastructure are ready.

---

## Phase 3: User Story 1 — Create and Maintain a Batch (Priority: P1) 🎯 MVP

**Goal**: Create, view, and edit independent Draft batches under one eligible Professional Program.

**Independent Test**: Create two Draft batches under one Professional Program with different data, edit each independently, reload canonical routes, reject duplicates/ineligible parents, and hide a mismatched program/batch route.

### Tests for User Story 1

- [X] T025 [P] [US1] Add schema unit tests for normalized code, required identity, dependency IDs, and draft-safe partial schedule values in `apps/web/tests/unit/program-batches/batch-schema.test.ts`
- [X] T026 [P] [US1] Add service contract tests for create/get/update, uniqueness including archived records, expected versions, no delete command, and parent ownership in `apps/web/tests/contract/program-batches/batch-management-contract.test.ts`
- [X] T027 [P] [US1] Add integration tests for one sectioned form, error focus, dirty-value preservation, parent-change confirmation, and locked fields in `apps/web/tests/integration/program-batches/batch-editor.test.tsx`
- [X] T028 [P] [US1] Add Playwright coverage for create/detail/edit/deep-link/refresh and program-parent mismatch in `apps/web/playwright/journeys/program-batches-management.spec.ts`

### Implementation for User Story 1

- [X] T029 [P] [US1] Implement authoritative basic and draft batch schemas with reusable date-only primitives in `apps/web/src/features/program-batches/schemas/program-batch-schema.ts`
- [X] T030 [P] [US1] Implement parent Professional Program eligibility and immutable code/parent lock rules in `apps/web/src/features/program-batches/utils/program-batch-policy.ts`
- [X] T031 [US1] Implement create/get/update and optimistic-version behavior in the mock adapter in `apps/web/src/features/program-batches/services/mock-program-batch-service.ts`
- [X] T032 [US1] Add create, detail, and update hooks with typed field-error mapping and Sonner feedback in `apps/web/src/features/program-batches/hooks/use-program-batch-mutations.ts`
- [X] T033 [P] [US1] Build the basic information section using shared inputs and branded Dropdown in `apps/web/src/features/program-batches/forms/batch-basic-section.tsx`
- [X] T034 [P] [US1] Build the academic context and schedule section with accessible grouped date controls in `apps/web/src/features/program-batches/forms/batch-schedule-section.tsx`
- [X] T035 [P] [US1] Build the initial maximum-capacity and read-only occupancy section in `apps/web/src/features/program-batches/forms/batch-capacity-section.tsx`
- [X] T036 [P] [US1] Build initial batch price, fee, and installment-enabled fields in `apps/web/src/features/program-batches/forms/batch-financial-section.tsx`
- [X] T037 [P] [US1] Build distinct registration and study branch assignment controls in `apps/web/src/features/program-batches/forms/batch-branches-section.tsx`
- [X] T038 [US1] Compose one RHF FormProvider editor with section navigation, error summary, first-error focus, and reset-to-returned-version behavior in `apps/web/src/features/program-batches/forms/program-batch-editor.tsx`
- [X] T039 [P] [US1] Implement editor-owned unsaved-change confirmation and `beforeunload` handling in `apps/web/src/features/program-batches/hooks/use-batch-unsaved-changes.ts`
- [X] T040 [P] [US1] Build a reusable batch detail summary with resolved dependency labels and audit metadata in `apps/web/src/features/program-batches/components/program-batch-details.tsx`
- [X] T041 [US1] Implement create, detail, and edit screens that consume only service hooks in `apps/web/src/features/program-batches/screens/create-program-batch-screen.tsx`, `apps/web/src/features/program-batches/screens/program-batch-detail-screen.tsx`, and `apps/web/src/features/program-batches/screens/edit-program-batch-screen.tsx`
- [X] T042 [US1] Add promise-param Server Component pages for create, detail, and edit in `apps/web/src/app/(workspace)/academic-catalog/programs/[programId]/batches/create/page.tsx`, `apps/web/src/app/(workspace)/academic-catalog/programs/[programId]/batches/[batchId]/page.tsx`, and `apps/web/src/app/(workspace)/academic-catalog/programs/[programId]/batches/[batchId]/edit/page.tsx`
- [X] T043 [P] [US1] Add segment loading and error boundaries for create/detail/edit in `apps/web/src/app/(workspace)/academic-catalog/programs/[programId]/batches/create/loading.tsx`, `apps/web/src/app/(workspace)/academic-catalog/programs/[programId]/batches/[batchId]/loading.tsx`, and `apps/web/src/app/(workspace)/academic-catalog/programs/[programId]/batches/[batchId]/error.tsx`
- [X] T044 [US1] Add the permission-aware Batches link and batch-count projection to eligible Professional Program details in `apps/web/src/features/academic-catalog/screens/product-detail-screen.tsx`
- [X] T045 [US1] Run US1 unit, contract, integration, and Playwright tests and record the independent MVP result in `specs/004-program-batches/validation/us1-batch-management.md`

**Checkpoint**: User Story 1 is independently usable as the MVP.

---

## Phase 4: User Story 2 — Govern the Batch Lifecycle (Priority: P1)

**Goal**: Move batches through explicit forward and corrective states while preserving readiness, reasons, versions, and immutable history.

**Independent Test**: Exercise every allowed and rejected transition, readiness blocker, correction restriction, stale version, and archive rule; verify one event per successful transition and enrollment eligibility only for Registration Open.

### Tests for User Story 2

- [X] T046 [P] [US2] Add transition-table and registration-readiness unit tests for every state, correction, date, occupancy, and dependency rule in `apps/web/tests/unit/program-batches/batch-lifecycle.test.ts`
- [X] T047 [P] [US2] Add lifecycle service contract tests for exact permissions, expected versions, confirmations/reasons, atomic events, and terminal archive behavior in `apps/web/tests/contract/program-batches/lifecycle-contract.test.ts`
- [X] T048 [P] [US2] Add integration tests for available actions, readiness findings, confirmation focus, reasons, pending states, and forbidden actions in `apps/web/tests/integration/program-batches/batch-lifecycle.test.tsx`
- [X] T049 [P] [US2] Add Playwright lifecycle and correction journey coverage in `apps/web/playwright/journeys/program-batches-lifecycle.spec.ts`

### Implementation for User Story 2

- [X] T050 [P] [US2] Implement the pure lifecycle transition table and exact action-permission mapping in `apps/web/src/features/program-batches/utils/batch-lifecycle.ts`
- [X] T051 [P] [US2] Implement ordered registration-readiness findings with stable section and field codes in `apps/web/src/features/program-batches/utils/batch-readiness.ts`
- [X] T052 [US2] Implement atomic transition, version, readiness, reason, event append, and archive behavior in `apps/web/src/features/program-batches/services/mock-program-batch-service.ts`
- [X] T053 [US2] Add readiness, available-action, lifecycle-history, and transition hooks with targeted invalidation in `apps/web/src/features/program-batches/hooks/use-batch-lifecycle.ts`
- [X] T054 [P] [US2] Build lifecycle and readiness badges that communicate without color alone in `apps/web/src/features/program-batches/components/batch-status-badge.tsx` and `apps/web/src/features/program-batches/components/batch-readiness-panel.tsx`
- [X] T055 [P] [US2] Build focus-managed confirmation/reason dialogs for open, close, correct, graduate, and archive operations in `apps/web/src/features/program-batches/components/batch-transition-dialog.tsx`
- [X] T056 [US2] Build permission-aware lifecycle actions from service-derived available actions in `apps/web/src/features/program-batches/components/batch-lifecycle-actions.tsx`
- [X] T057 [P] [US2] Build semantic pageable lifecycle history in `apps/web/src/features/program-batches/components/batch-lifecycle-history.tsx`
- [X] T058 [US2] Integrate readiness, lifecycle actions, lock state, and history into detail/edit screens in `apps/web/src/features/program-batches/screens/program-batch-detail-screen.tsx` and `apps/web/src/features/program-batches/screens/edit-program-batch-screen.tsx`
- [X] T059 [US2] Run US2 unit, contract, integration, and Playwright tests and record lifecycle results in `specs/004-program-batches/validation/us2-lifecycle.md`

**Checkpoint**: Lifecycle governance works independently on any seeded complete batch.

---

## Phase 5: User Story 3 — Configure Capacity and Branch Access (Priority: P2)

**Goal**: Derive reliable capacity and enforce distinct registration/study branch assignments and explainable enrollment eligibility.

**Independent Test**: Configure capacity and branches, verify all capacity states and assignment history, then evaluate eligibility across status, dates, seats, parent state, and assigned/unassigned branches.

### Tests for User Story 3

- [X] T060 [P] [US3] Add capacity derivation and enrollment-eligibility reason-code unit tests in `apps/web/tests/unit/program-batches/capacity-eligibility.test.ts`
- [X] T061 [P] [US3] Add service contract tests for read-only enrollment counts, capacity reductions, branch uniqueness/history, branch scope, and eligibility projections in `apps/web/tests/contract/program-batches/capacity-branches-contract.test.ts`
- [X] T062 [P] [US3] Add integration tests for read-only occupancy, capacity states, distinct branch roles, inactive labels, and exact section permissions in `apps/web/tests/integration/program-batches/capacity-branches.test.tsx`
- [X] T063 [P] [US3] Add Playwright capacity, branch, and eligibility coverage in `apps/web/playwright/journeys/program-batches-capacity-branches.spec.ts`

### Implementation for User Story 3

- [X] T064 [P] [US3] Implement capacity derivation, thresholds, full/over-capacity states, and reduction validation in `apps/web/src/features/program-batches/utils/batch-capacity.ts`
- [X] T065 [P] [US3] Implement the deterministic enrollment-count reader and occupancy scenarios in `apps/web/src/features/program-batches/services/mock-enrollment-count-reader.ts`
- [X] T066 [P] [US3] Implement active/historical branch assignment normalization and uniqueness rules in `apps/web/src/features/program-batches/utils/batch-branches.ts`
- [X] T067 [P] [US3] Implement explainable enrollment eligibility with stable ordered reason codes in `apps/web/src/features/program-batches/utils/batch-eligibility.ts`
- [X] T068 [US3] Integrate enrollment counts, branch scope, capacity validation, and eligibility reads into `apps/web/src/features/program-batches/services/mock-program-batch-service.ts`
- [X] T069 [US3] Add capacity, branches, and eligibility query/mutation hooks in `apps/web/src/features/program-batches/hooks/use-batch-operations.ts`
- [X] T070 [P] [US3] Upgrade the capacity editor and non-color indicators for available, nearly full, full, and over-capacity states in `apps/web/src/features/program-batches/forms/batch-capacity-section.tsx` and `apps/web/src/features/program-batches/components/batch-capacity-indicator.tsx`
- [X] T071 [P] [US3] Upgrade branch controls for distinct roles, historical labels, scope restrictions, and validation feedback in `apps/web/src/features/program-batches/forms/batch-branches-section.tsx`
- [X] T072 [P] [US3] Build an enrollment-readiness/eligibility panel for future consumer verification in `apps/web/src/features/program-batches/components/batch-eligibility-panel.tsx`
- [X] T073 [US3] Integrate capacity, branch, and eligibility projections into batch detail and editor screens in `apps/web/src/features/program-batches/screens/program-batch-detail-screen.tsx` and `apps/web/src/features/program-batches/screens/edit-program-batch-screen.tsx`
- [X] T074 [US3] Run US3 unit, contract, integration, and Playwright tests and record results in `specs/004-program-batches/validation/us3-capacity-branches.md`

**Checkpoint**: Capacity and branch eligibility can be tested without financial editing or batch discovery.

---

## Phase 6: User Story 4 — Configure Independent Finances (Priority: P2)

**Goal**: Maintain batch-specific money, installment plans, discounts, scholarships, and immutable financial revisions.

**Independent Test**: Give sibling batches different financial profiles, reject invalid or unbalanced plans/offers, revise one profile, and verify older captured revision terms remain unchanged.

### Tests for User Story 4

- [X] T075 [P] [US4] Add money, plan reconciliation, due milestone, offer period, and currency-precision schema tests in `apps/web/tests/unit/program-batches/batch-financial-schema.test.ts`
- [X] T076 [P] [US4] Add service contract tests for batch isolation, immutable revision append, snapshot stability, permissions, and revision pagination in `apps/web/tests/contract/program-batches/financial-revision-contract.test.ts`
- [X] T077 [P] [US4] Add integration tests for installment/offer add-remove-reorder, disable confirmation, error focus, and dirty-value preservation in `apps/web/tests/integration/program-batches/batch-financial-editor.test.tsx`
- [X] T078 [P] [US4] Add Playwright financial configuration and history coverage in `apps/web/playwright/journeys/program-batches-financial.spec.ts`

### Implementation for User Story 4

- [X] T079 [P] [US4] Implement authoritative decimal-money, installment-plan, installment, discount, and scholarship schemas in `apps/web/src/features/program-batches/schemas/batch-financial-schema.ts`
- [X] T080 [P] [US4] Implement minor-unit money normalization and amount/percentage reconciliation in `apps/web/src/features/program-batches/utils/batch-money.ts`
- [X] T081 [P] [US4] Implement offer validation and validity-window warnings in `apps/web/src/features/program-batches/utils/batch-offers.ts`
- [X] T082 [US4] Implement immutable financial revision creation, pagination, and current-revision linkage in `apps/web/src/features/program-batches/services/mock-program-batch-service.ts`
- [X] T083 [US4] Add financial update and revision-history hooks with precise cache invalidation in `apps/web/src/features/program-batches/hooks/use-batch-financials.ts`
- [X] T084 [P] [US4] Build keyboard-operable installment plan and installment editors using shared controls in `apps/web/src/features/program-batches/forms/batch-installment-plans-section.tsx`
- [X] T085 [P] [US4] Build keyboard-operable discount and scholarship editors using configured statuses in `apps/web/src/features/program-batches/forms/batch-offers-section.tsx`
- [X] T086 [US4] Upgrade the financial section with currency isolation, precision-aware errors, plan-disable confirmation, and `batches.pricing.manage` enforcement in `apps/web/src/features/program-batches/forms/batch-financial-section.tsx`
- [X] T087 [P] [US4] Build semantic pageable financial revision history and snapshot summary in `apps/web/src/features/program-batches/components/batch-financial-history.tsx`
- [X] T088 [US4] Integrate complete finances and revision history into editor/detail screens in `apps/web/src/features/program-batches/screens/edit-program-batch-screen.tsx` and `apps/web/src/features/program-batches/screens/program-batch-detail-screen.tsx`
- [X] T089 [US4] Run US4 unit, contract, integration, and Playwright tests and record results in `specs/004-program-batches/validation/us4-financials.md`

**Checkpoint**: Financial configuration is independently usable and snapshot-safe.

---

## Phase 7: User Story 5 — Find and Monitor Batches (Priority: P2)

**Goal**: Search, filter, sort, paginate, monitor capacity/lifecycle, and perform permitted safe actions within program and branch scope.

**Independent Test**: Search and combine all filters in a deterministic 10,000-record scenario, verify canonical paging/totals/deep links, scope a branch manager, and complete permitted row/bulk actions.

### Tests for User Story 5

- [X] T090 [P] [US5] Add list-query normalization, canonical serialization, stable sorting, clamping, and 10,000-record unit tests in `apps/web/tests/unit/program-batches/batch-list-query.test.ts`
- [X] T091 [P] [US5] Add list service contract tests for program/branch scope, facets, pagination, cancellation, export permission, and deterministic failures in `apps/web/tests/contract/program-batches/batch-list-contract.test.ts`
- [X] T092 [P] [US5] Add integration tests for controlled table search, filters, sorting, selection reconciliation, bulk outcomes, and all query states in `apps/web/tests/integration/program-batches/batch-list.test.tsx`
- [X] T093 [P] [US5] Add Playwright search/filter/sort/page/deep-link/permission/scale coverage in `apps/web/playwright/journeys/program-batches-discovery.spec.ts`

### Implementation for User Story 5

- [X] T094 [P] [US5] Implement canonical list-query parsing and serialization for search, year, intake, branch, status, sort, and page in `apps/web/src/features/program-batches/utils/batch-list-query.ts`
- [X] T095 [P] [US5] Generate deterministic 10,000-record batch summaries and facet data in `apps/web/src/features/program-batches/data/program-batch-scale-fixtures.ts`
- [X] T096 [US5] Implement service-owned normalized search, branch/program scope, filtering, stable sorting, pagination, clamping, facets, cancellation, and export projection in `apps/web/src/features/program-batches/services/mock-program-batch-service.ts`
- [X] T097 [US5] Add controlled list/facet/export hooks with normalized query keys and stale-request cancellation in `apps/web/src/features/program-batches/hooks/use-program-batch-list.ts`
- [X] T098 [P] [US5] Define memoized summary columns, capacity/status cells, row selection, and permission-aware row actions in `apps/web/src/features/program-batches/components/program-batch-columns.tsx`
- [X] T099 [P] [US5] Build the shared-control filter and action toolbar using branded Dropdown, search, export, and bulk controls in `apps/web/src/features/program-batches/components/program-batch-toolbar.tsx`
- [X] T100 [US5] Build the program-context controlled DataTable screen with URL-compatible state and loading/empty/error/forbidden behavior in `apps/web/src/features/program-batches/screens/program-batches-screen.tsx`
- [X] T101 [US5] Add the list Server Component page plus segment loading/error boundaries in `apps/web/src/app/(workspace)/academic-catalog/programs/[programId]/batches/page.tsx`, `apps/web/src/app/(workspace)/academic-catalog/programs/[programId]/batches/loading.tsx`, and `apps/web/src/app/(workspace)/academic-catalog/programs/[programId]/batches/error.tsx`
- [X] T102 [US5] Run US5 unit, contract, integration, and Playwright tests and record scale/discovery results in `specs/004-program-batches/validation/us5-discovery.md`

**Checkpoint**: All five user stories work independently and together.

---

## Phase 8: Polish & Cross-Cutting Validation

**Purpose**: Prove constitutional compliance, integration stability, and backend/enrollment readiness across the complete module.

- [X] T103 [P] Add deterministic integration coverage for latency, empty, retryable, unavailable, forbidden, duplicate, stale, invalid dependency, parent mismatch, validation, and unexpected states in `apps/web/tests/integration/program-batches/program-batch-states.test.tsx`
- [X] T104 [P] Add direct-route and exact-action permission regression coverage for all 13 keys and branch scope in `apps/web/tests/integration/program-batches/program-batch-permissions.test.tsx`
- [X] T105 [P] Add consumer-contract tests proving Enrollment can consume eligibility and financial revision snapshots without internal imports in `apps/web/tests/contract/program-batches/enrollment-consumer-contract.test.ts`
- [X] T106 [P] Add automated axe coverage for list, create, detail, edit, dialogs, errors, and forbidden states in `apps/web/playwright/journeys/program-batches-accessibility.spec.ts`
- [X] T107 Verify Arabic RTL, Alexandria typography, bidi isolation, light/dark themes, and 200% zoom in `specs/004-program-batches/validation/rtl-accessibility.md`
- [X] T108 Verify desktop, laptop, and tablet layouts, table-contained overflow, sticky actions, and touch target behavior in `specs/004-program-batches/validation/responsive.md`
- [X] T109 Audit pages for Server Component defaults, promise-param handling, client-boundary size, memoized columns, stable keys, and cancellation in `specs/004-program-batches/validation/performance.md`
- [X] T110 Audit feature boundaries for fixture isolation, no direct page data access, no generic partial writes, no `any`, and no duplicated business validation in `specs/004-program-batches/validation/architecture.md`
- [X] T111 Audit dynamic configuration, lifecycle/permission key consistency, organization/tenant boundaries, audit context, workflow automation, and AI-ready read context in `specs/004-program-batches/validation/future-readiness.md`
- [X] T112 Reconcile Arabic copy, shared component usage, Sonner feedback, Lucide icons, status tones, spacing, and brand colors across `apps/web/src/features/program-batches/`
- [X] T113 Remove unused exports, duplicate helpers, raw selects, inline styles, native alerts, direct fixture imports, and dead mock scenarios across `apps/web/src/features/program-batches/` and `apps/web/src/app/(workspace)/academic-catalog/programs/[programId]/batches/`
- [X] T114 Update Program Batches module, mock credentials, permission limitations, and future adapter/enrollment guidance in `README.md`
- [X] T115 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` and record exact results in `specs/004-program-batches/quickstart.md`
- [X] T116 Run the full desktop/laptop/tablet Playwright matrix and record exact results in `specs/004-program-batches/quickstart.md`
- [X] T117 Execute all eight manual quickstart scenarios and record final acceptance evidence in `specs/004-program-batches/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: Starts immediately.
- **Phase 2 — Foundation**: Depends on Setup and blocks all story phases.
- **Phase 3 — US1**: Starts after Foundation and is the recommended MVP.
- **Phase 4 — US2**: Starts after Foundation; integrates most naturally after US1 because UI actions need a detail screen, but seeded batches make lifecycle independently testable.
- **Phase 5 — US3**: Starts after Foundation; capacity/branch domain and service work can proceed in parallel with US1/US2, then integrate with their screens.
- **Phase 6 — US4**: Starts after Foundation; finance domain/service/editor work can proceed independently against seeded batches.
- **Phase 7 — US5**: Starts after Foundation; list infrastructure can proceed independently, then consume summary projections from completed story services.
- **Phase 8 — Polish**: Depends on every story included in the release.

### User Story Dependency Graph

```text
Setup → Foundation ─┬→ US1 Create/Maintain ───────────┐
                    ├→ US2 Lifecycle ─────────────────┤
                    ├→ US3 Capacity/Branches ─────────┤→ Polish & Full Validation
                    ├→ US4 Finances ──────────────────┤
                    └→ US5 Discovery/Monitoring ──────┘
```

US2–US5 use seeded aggregates and public contracts so their domain/service tests remain independent. Final route integration follows US1 because it supplies the canonical detail/editor surfaces.

### Within Each User Story

1. Write the story's unit, contract, integration, and Playwright tests and confirm the relevant tests fail.
2. Implement pure types/schemas/domain rules before service behavior.
3. Implement service behavior and query hooks before screens.
4. Build reusable feature components before integrating route-facing screens.
5. Run only that story's test slice and record the checkpoint before starting the next sequential story.

## Parallel Opportunities

- T002–T005 can proceed in parallel after T001 establishes the public boundary.
- T008–T010 and T012–T015 can proceed in parallel after common conventions in T007.
- The four test tasks at the start of every story can run in parallel.
- Pure utilities, form sections, and presentational components marked `[P]` can run concurrently within their story.
- After Foundation, US2–US5 domain/service work can run in parallel using seeded aggregates, while US1 builds canonical routes.
- T103–T106 can run in parallel; T107–T111 can be reviewed in parallel after implementation stabilizes.

## Parallel Examples

### User Story 1

```text
T025 schema tests | T026 service contract | T027 editor integration | T028 route journey
T033 basic section | T034 schedule | T035 capacity | T036 finance | T037 branches | T040 details
```

### User Story 2

```text
T046 lifecycle unit | T047 service contract | T048 integration | T049 Playwright
T050 transition policy | T051 readiness | T054 badges/panel | T055 dialogs | T057 history
```

### User Story 3

```text
T060 eligibility unit | T061 service contract | T062 integration | T063 Playwright
T064 capacity | T065 count reader | T066 branch rules | T067 eligibility | T070 indicators | T071 branch UI | T072 eligibility panel
```

### User Story 4

```text
T075 schema unit | T076 revision contract | T077 editor integration | T078 Playwright
T079 schemas | T080 money | T081 offers | T084 installments | T085 offers UI | T087 history
```

### User Story 5

```text
T090 query unit | T091 list contract | T092 table integration | T093 Playwright
T094 query codec | T095 scale fixtures | T098 columns | T099 toolbar
```

## Implementation Strategy

### MVP First

1. Complete Setup (T001–T006).
2. Complete Foundation (T007–T024).
3. Complete US1 (T025–T045).
4. Stop and validate the US1 checkpoint: two independent Draft batches, canonical routes, duplicate/ineligible-parent rejection, and parent mismatch protection.
5. Demo the MVP before adding operational lifecycle and commercial depth.

### Incremental Delivery

1. **MVP**: US1 — create, view, and edit independent Draft batches.
2. **Operational control**: US2 — governed lifecycle and history.
3. **Enrollment readiness**: US3 — capacity, branches, and eligibility.
4. **Commercial terms**: US4 — installments, offers, and immutable revisions.
5. **Operational scale**: US5 — discovery, filters, pagination, export, and bulk monitoring.
6. **Release hardening**: Phase 8 — cross-story validation and documentation.

## Notes

- `[P]` means different files and no dependency on an unfinished task; it does not authorize overlapping edits.
- Story labels provide traceability to `spec.md` acceptance scenarios.
- No page or screen may import mock fixtures or reproduce service/domain rules.
- Tests precede implementation within each story and should demonstrate failure before the implementation tasks begin.
- Mock permission checks are UX and contract simulation; the future backend remains authoritative.
- Commit after each task or coherent task group and re-run the narrowest relevant gates at each checkpoint.
