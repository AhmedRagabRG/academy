# Tasks: Academic Catalog

**Input**: Design documents from `/specs/003-academic-catalog/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Validation**: Tests are included because the specification requires measurable business-rule,
RTL, responsive, accessibility, scale, and cross-browser proof. Write story tests first and verify
they fail for the intended missing behavior before implementation.

**Organization**: Tasks are grouped by user story so every story remains independently implementable,
testable, and demonstrable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: May run in parallel because it targets a different file and has no incomplete dependency
- **[Story]**: Maps work to a user story in [spec.md](./spec.md)
- Every task names its concrete output path

---

## Phase 1: Setup (Feature Scaffolding)

**Purpose**: Establish the feature and route ownership without implementing business workflows.

- [ ] T001 Create the feature directory structure and public export boundary in `apps/web/src/features/academic-catalog/index.ts`
- [ ] T002 [P] Create thin route adapters for overview, product types, categories, and products in `apps/web/src/app/(workspace)/academic-catalog/page.tsx`, `apps/web/src/app/(workspace)/academic-catalog/product-types/page.tsx`, `apps/web/src/app/(workspace)/academic-catalog/categories/page.tsx`, and `apps/web/src/app/(workspace)/academic-catalog/products/page.tsx`
- [ ] T003 [P] Create thin create, detail, and edit route adapters in `apps/web/src/app/(workspace)/academic-catalog/products/create/page.tsx`, `apps/web/src/app/(workspace)/academic-catalog/products/[productId]/page.tsx`, and `apps/web/src/app/(workspace)/academic-catalog/products/[productId]/edit/page.tsx`
- [ ] T004 [P] Define catalog route IDs, Arabic labels, Lucide icon keys, and permission metadata in `apps/web/src/features/academic-catalog/config/navigation.ts`
- [ ] T005 Register the Academic Catalog navigation group and required icon keys in `apps/web/src/shared/config/foundation-navigation.ts` and `apps/web/src/shared/config/icon-registry.ts`
- [ ] T006 [P] Add Academic Catalog permission fixtures for super-admin, executive, branch, marketing, and customer-service projections in `apps/web/src/features/auth/data/auth-fixtures.ts`
- [ ] T007 [P] Create unit, integration, contract, and Playwright test directories with feature test helpers in `apps/web/tests/unit/academic-catalog/test-helpers.ts`, `apps/web/tests/integration/academic-catalog/test-helpers.tsx`, `apps/web/tests/contract/academic-catalog/test-helpers.ts`, and `apps/web/playwright/helpers/academic-catalog.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the typed, service-backed, configurable infrastructure required by every story.

**⚠️ CRITICAL**: No user-story implementation begins until this phase is complete.

- [ ] T008 Define branded IDs, audit/version metadata, lifecycle/status keys, money, assets, ordered content, list queries, pagination, readiness, and eligibility types in `apps/web/src/features/academic-catalog/types/common.ts`
- [ ] T009 Define ProductType, Category, AcademicProduct, ProductSummary, ProductDetail, academic/pricing/availability/content/media, and lifecycle domain contracts in `apps/web/src/features/academic-catalog/types/domain.ts`
- [ ] T010 [P] Define normalized create/update/transition/taxonomy command DTOs and permission-scope context in `apps/web/src/features/academic-catalog/types/commands.ts`
- [ ] T011 [P] Define service-driven academic field definitions, status definitions, fee definitions, duration units, study modes, media policies, and option catalogs in `apps/web/src/features/academic-catalog/types/configuration.ts`
- [ ] T012 Define the business-specific AcademicCatalogService interface and composed service export in `apps/web/src/features/academic-catalog/services/academic-catalog-service.ts`
- [ ] T013 [P] Define safe catalog error codes, field/dependency/readiness payloads, and UI mapping utilities in `apps/web/src/features/academic-catalog/services/academic-catalog-error.ts` and `apps/web/src/features/academic-catalog/utils/service-error-mapping.ts`
- [ ] T014 [P] Define hierarchical query keys and narrow invalidation helpers in `apps/web/src/features/academic-catalog/services/academic-catalog-query-keys.ts`
- [ ] T015 [P] Implement canonical URL query parsing, array filters, allowlisted sorting, page reset/clamping, and stable serialization in `apps/web/src/features/academic-catalog/utils/product-list-query.ts`
- [ ] T016 [P] Implement pure product-code normalization, academic applicability, activation-readiness, lifecycle-transition, enrollment-eligibility, and ordering rules in `apps/web/src/features/academic-catalog/utils/catalog-rules.ts`
- [ ] T017 [P] Create deterministic configurable lookup, taxonomy, product-summary, product-detail, historical-reference, and 10,000-record scale fixtures in `apps/web/src/features/academic-catalog/data/catalog-fixtures.ts`
- [ ] T018 Implement a deterministic mock scenario controller for latency, empty, unavailable, retryable, forbidden, duplicate, stale-version, inactive-dependency, invalid-transition, activation-gap, asset, and unexpected modes in `apps/web/src/features/academic-catalog/services/mock-scenario-controller.ts`
- [ ] T019 Implement the mock AcademicCatalogService adapter with cloned outputs, indexed IDs/codes, atomic version checks, normalized server-shaped list behavior, and organization/branch scope enforcement in `apps/web/src/features/academic-catalog/services/mock-academic-catalog-service.ts`
- [ ] T020 [P] Create reusable feature query/loading/error/empty/forbidden state composition in `apps/web/src/features/academic-catalog/components/catalog-query-state.tsx`
- [ ] T021 [P] Create permission-aware catalog actions and section access notices using stable permission keys in `apps/web/src/features/academic-catalog/components/catalog-permission-boundary.tsx`
- [ ] T022 [P] Create catalog page framing, section cards, activation-readiness summary, and mixed-direction value components in `apps/web/src/features/academic-catalog/components/catalog-page.tsx`, `apps/web/src/features/academic-catalog/components/product-section.tsx`, `apps/web/src/features/academic-catalog/components/activation-readiness-summary.tsx`, and `apps/web/src/features/academic-catalog/components/bidi-value.tsx`
- [ ] T023 Audit and extend shared controlled DataTable filter/facet, stable selection, column-priority, and lifecycle-safe bulk-action slots without creating a feature table in `apps/web/src/shared/components/data-table/data-table.tsx` and `apps/web/src/shared/components/data-table/filter-bar.tsx`
- [ ] T024 Audit and extend the shared Dropdown, form fields, Tiptap field, dropzone, and file-preview contracts for controlled error/disabled/ordered-asset behavior in `apps/web/src/shared/components/forms/dropdown.tsx`, `apps/web/src/shared/components/forms/rich-text-field.tsx`, `apps/web/src/shared/components/file-upload/file-dropzone.tsx`, and `apps/web/src/shared/components/file-upload/file-preview.tsx`
- [ ] T025 Wire the AcademicCatalogService and mock scenario controller through TanStack Query hooks without fixture imports in `apps/web/src/features/academic-catalog/hooks/use-academic-catalog.ts`

**Checkpoint**: Typed contracts, configurable data, mock services, query behavior, permissions, and shared UI foundations are ready.

---

## Phase 3: User Story 1 — Maintain the Product Catalog (Priority: P1) 🎯 MVP

**Goal**: Create, inspect, edit, validate, and activate one canonical educational product through a unified service-backed workflow.

**Independent Test**: Using seeded active configuration, create a Draft with a unique code, retain an incomplete Draft, complete required sections, activate it, edit it, reload detail/edit routes, and recover from duplicate and stale-version failures without losing values.

### Tests for User Story 1

- [ ] T026 [P] [US1] Add schema tests for Draft versus activation validation, normalized codes, academic values, money, URLs, and active references in `apps/web/tests/unit/academic-catalog/product-schema.test.ts`
- [ ] T027 [P] [US1] Add service contract tests for create, get, update, code uniqueness/locking, version conflicts, readiness, lifecycle history, and historical retention in `apps/web/tests/contract/academic-catalog/product-service-contract.test.ts`
- [ ] T028 [P] [US1] Add editor integration tests for section errors, first-invalid focus, dirty-value retention, pending/success states, and type-change confirmation in `apps/web/tests/integration/academic-catalog/product-editor.test.tsx`
- [ ] T029 [P] [US1] Add create-edit-activate and duplicate/conflict recovery browser journeys in `apps/web/playwright/journeys/academic-catalog-product-management.spec.ts`

### Implementation for User Story 1

- [ ] T030 [P] [US1] Create authoritative Zod schemas for basic information, Draft saving, full product values, and activation readiness in `apps/web/src/features/academic-catalog/schemas/product-schema.ts`
- [ ] T031 [P] [US1] Define product editor section metadata and type-driven field resolution without display-name conditionals in `apps/web/src/features/academic-catalog/config/product-editor-sections.ts`
- [ ] T032 [P] [US1] Implement the basic-information form section with shared Dropdown and bidi-safe code handling in `apps/web/src/features/academic-catalog/forms/product-basic-information-section.tsx`
- [ ] T033 [P] [US1] Implement academic and pricing form sections using configuration-driven applicability and shared controls in `apps/web/src/features/academic-catalog/forms/product-academic-section.tsx` and `apps/web/src/features/academic-catalog/forms/product-pricing-section.tsx`
- [ ] T034 [US1] Implement the single RHF FormProvider product editor, semantic section navigation, error summary, first-error focus, sticky actions, and save/reset behavior in `apps/web/src/features/academic-catalog/forms/product-editor-form.tsx`
- [ ] T035 [P] [US1] Implement dirty-form beforeunload and editor-owned exit confirmation without history monkey-patching in `apps/web/src/features/academic-catalog/hooks/use-unsaved-product-guard.ts` and `apps/web/src/features/academic-catalog/components/unsaved-product-dialog.tsx`
- [ ] T036 [US1] Implement product detail/readiness/history composition with permission-aware edit and transition actions in `apps/web/src/features/academic-catalog/screens/product-detail-screen.tsx`
- [ ] T037 [US1] Implement create and edit screen orchestration with service lookups, retained failures, narrow invalidation, and canonical post-create navigation in `apps/web/src/features/academic-catalog/screens/create-product-screen.tsx` and `apps/web/src/features/academic-catalog/screens/edit-product-screen.tsx`
- [ ] T038 [US1] Implement create/edit/detail route loading, not-found, and recoverable error boundaries in `apps/web/src/app/(workspace)/academic-catalog/products/create/loading.tsx`, `apps/web/src/app/(workspace)/academic-catalog/products/[productId]/loading.tsx`, and `apps/web/src/app/(workspace)/academic-catalog/products/[productId]/error.tsx`
- [ ] T039 [US1] Add explicit Draft-to-Active readiness command, confirmation, feedback, code-lock result, and lifecycle event rendering in `apps/web/src/features/academic-catalog/components/product-lifecycle-actions.tsx`
- [ ] T040 [US1] Validate the US1 workflow against Scenario 2 in `specs/003-academic-catalog/quickstart.md` and record any implementation evidence in `specs/003-academic-catalog/validation/us1-product-management.md`

**Checkpoint**: The MVP product record can be created, validated, activated, edited, and reviewed independently.

---

## Phase 4: User Story 2 — Configure Catalog Taxonomy (Priority: P1)

**Goal**: Manage configurable product types, type-driven academic fields, and categories while preserving historical references.

**Independent Test**: Create, edit, deactivate, archive, and reactivate a type and category; confirm active records are assignable, inactive records remain readable historically, and changed type requirements affect readiness without deleting values.

### Tests for User Story 2

- [ ] T041 [P] [US2] Add taxonomy schema tests for normalized names, academic-field definitions, ordering, and status commands in `apps/web/tests/unit/academic-catalog/taxonomy-schema.test.ts`
- [ ] T042 [P] [US2] Add mock service contract tests for taxonomy uniqueness, lifecycle, historical resolution, and inactive assignment rejection in `apps/web/tests/contract/academic-catalog/taxonomy-service-contract.test.ts`
- [ ] T043 [P] [US2] Add type/category table and form integration tests for search, filters, pagination, validation, actions, and query states in `apps/web/tests/integration/academic-catalog/taxonomy-management.test.tsx`
- [ ] T044 [P] [US2] Add taxonomy configuration and historical-reference browser journey in `apps/web/playwright/journeys/academic-catalog-taxonomy.spec.ts`

### Implementation for User Story 2

- [ ] T045 [P] [US2] Create Zod schemas for product types, ordered academic-field configuration, categories, and lifecycle commands in `apps/web/src/features/academic-catalog/schemas/taxonomy-schema.ts`
- [ ] T046 [P] [US2] Implement the product-type form with accessible field-definition ordering and activation requirements in `apps/web/src/features/academic-catalog/forms/product-type-form.tsx`
- [ ] T047 [P] [US2] Implement the category form using shared controls and authoritative schema feedback in `apps/web/src/features/academic-catalog/forms/category-form.tsx`
- [ ] T048 [US2] Implement URL-backed controlled taxonomy management tables with reusable search/filter/page/action patterns in `apps/web/src/features/academic-catalog/components/taxonomy-manager.tsx`
- [ ] T049 [US2] Implement product-type screen orchestration and lifecycle confirmations in `apps/web/src/features/academic-catalog/screens/product-types-screen.tsx`
- [ ] T050 [US2] Implement category screen orchestration and lifecycle confirmations in `apps/web/src/features/academic-catalog/screens/categories-screen.tsx`
- [ ] T051 [US2] Recalculate product readiness and lookup availability after taxonomy mutations through narrow query invalidation in `apps/web/src/features/academic-catalog/hooks/use-catalog-taxonomy.ts`
- [ ] T052 [US2] Validate Scenario 1 independently and record evidence in `specs/003-academic-catalog/validation/us2-taxonomy.md`

**Checkpoint**: Taxonomy is dynamically configurable without hardcoded type behavior or broken history.

---

## Phase 5: User Story 3 — Configure Academic Delivery and Availability (Priority: P2)

**Goal**: Configure applicable delivery values and distinct registration, study, and general branch sets that determine enrollment eligibility.

**Independent Test**: Select each configured type, complete only applicable academic fields, assign branch roles, activate, and verify eligibility is true only for active assigned registration branches.

### Tests for User Story 3

- [ ] T053 [P] [US3] Add unit tests for academic applicability, positive/bounded values, branch-role uniqueness, readiness, and pure eligibility reason codes in `apps/web/tests/unit/academic-catalog/delivery-eligibility.test.ts`
- [ ] T054 [P] [US3] Add service contract tests for active-branch assignment, historical inactive links, branch scope, readiness, and eligibility across every product status in `apps/web/tests/contract/academic-catalog/availability-service-contract.test.ts`
- [ ] T055 [P] [US3] Add availability form integration tests for multi-branch role assignment, type changes, forbidden scope, and retained dependency failures in `apps/web/tests/integration/academic-catalog/product-availability.test.tsx`
- [ ] T056 [P] [US3] Add academic delivery, availability, and eligibility browser journey in `apps/web/playwright/journeys/academic-catalog-availability.spec.ts`

### Implementation for User Story 3

- [ ] T057 [P] [US3] Extend product validation with configured academic applicability, activation-only requirements, and distinct active branch-role constraints in `apps/web/src/features/academic-catalog/schemas/product-availability-schema.ts`
- [ ] T058 [P] [US3] Implement reusable branch-role selector with registration, study, and general fieldsets using shared multi-select/dropdown controls in `apps/web/src/features/academic-catalog/forms/product-availability-section.tsx`
- [ ] T059 [P] [US3] Implement academic-field renderer for configured number, option, and boolean definitions in `apps/web/src/features/academic-catalog/components/configured-academic-fields.tsx`
- [ ] T060 [US3] Integrate delivery and availability sections into the unified editor without introducing independent form state in `apps/web/src/features/academic-catalog/forms/product-editor-form.tsx`
- [ ] T061 [US3] Implement eligibility query hook and readable reason summary for detail/activation views in `apps/web/src/features/academic-catalog/hooks/use-product-eligibility.ts` and `apps/web/src/features/academic-catalog/components/product-eligibility-summary.tsx`
- [ ] T062 [US3] Enforce branch-manager scope and section/action permissions in availability query and mutation orchestration in `apps/web/src/features/academic-catalog/hooks/use-product-availability.ts`
- [ ] T063 [US3] Validate Scenario 3 independently and record state/eligibility evidence in `specs/003-academic-catalog/validation/us3-availability.md`

**Checkpoint**: Academic delivery and branch eligibility operate independently from future enrollment code.

---

## Phase 6: User Story 4 — Maintain Commercial and Support Content (Priority: P2)

**Goal**: Maintain structured sales/admissions content and ordered accessible marketing assets reusable by future teams and modules.

**Independent Test**: Add, remove, and keyboard-reorder scripts, FAQs, requirements, documents, images, video references, landing reference, and brochure; reject bad assets without losing other unsaved values.

### Tests for User Story 4

- [ ] T064 [P] [US4] Add content/media schema tests for stable IDs, ordering, URLs, labels, MIME, size, count, and duplicate identity in `apps/web/tests/unit/academic-catalog/content-media-schema.test.ts`
- [ ] T065 [P] [US4] Add service contract tests for structured content, ordered asset metadata, media failure isolation, and content/media permission boundaries in `apps/web/tests/contract/academic-catalog/content-media-service-contract.test.ts`
- [ ] T066 [P] [US4] Add editor integration tests for Tiptap, ordered repeaters, keyboard reorder, previews, object-URL cleanup, and retained media failures in `apps/web/tests/integration/academic-catalog/product-content-media.test.tsx`
- [ ] T067 [P] [US4] Add sales, marketing, and asset browser journey in `apps/web/playwright/journeys/academic-catalog-content-media.spec.ts`

### Implementation for User Story 4

- [ ] T068 [P] [US4] Create Zod schemas for sales script, ordered FAQs, requirements, documents, URLs, and transport-neutral assets in `apps/web/src/features/academic-catalog/schemas/product-content-schema.ts`
- [ ] T069 [P] [US4] Implement accessible ordered collection controls with add/remove/move buttons and stable child IDs in `apps/web/src/features/academic-catalog/components/ordered-content-list.tsx`
- [ ] T070 [P] [US4] Implement sales script, FAQ, admission requirement, and required-document form section using shared Tiptap and fields in `apps/web/src/features/academic-catalog/forms/product-sales-section.tsx`
- [ ] T071 [P] [US4] Implement primary image, gallery, brochure, video, and landing-reference form section using shared upload/preview controls in `apps/web/src/features/academic-catalog/forms/product-marketing-section.tsx`
- [ ] T072 [US4] Implement controlled existing/pending asset descriptors, duplicate validation, keyboard ordering, and object-URL cleanup in `apps/web/src/features/academic-catalog/hooks/use-product-assets.ts`
- [ ] T073 [US4] Integrate sales and marketing sections plus content/media permissions into the unified editor and detail view in `apps/web/src/features/academic-catalog/forms/product-editor-form.tsx` and `apps/web/src/features/academic-catalog/screens/product-detail-screen.tsx`
- [ ] T074 [US4] Validate Scenario 4 independently and record content/media evidence in `specs/003-academic-catalog/validation/us4-content-media.md`

**Checkpoint**: Commercial content is structured, accessible, ordered, and storage-adapter neutral.

---

## Phase 7: User Story 5 — Discover and Govern Products (Priority: P2)

**Goal**: Find products at scale and perform valid permission-aware lifecycle transitions without compromising historical or branch boundaries.

**Independent Test**: Against 10,000 summaries, combine search/filters/sort/page, deep-link and reload query state, execute valid transitions, reject invalid ones, and verify archived/closed/hidden eligibility and visibility outcomes.

### Tests for User Story 5

- [ ] T075 [P] [US5] Add normalized query, stable sort, facet, page-clamp, and 10,000-record performance tests in `apps/web/tests/unit/academic-catalog/product-list-query.test.ts`
- [ ] T076 [P] [US5] Add lifecycle transition-table, confirmation/reason, version, history, and terminal-archive service tests in `apps/web/tests/contract/academic-catalog/lifecycle-service-contract.test.ts`
- [ ] T077 [P] [US5] Add controlled table integration tests for combined queries, previous-data state, selection reconciliation, facets, and lifecycle-safe bulk actions in `apps/web/tests/integration/academic-catalog/product-list.test.tsx`
- [ ] T078 [P] [US5] Add discovery, query deep-link, lifecycle, branch-scope, and deterministic state browser journeys in `apps/web/playwright/journeys/academic-catalog-discovery-governance.spec.ts`

### Implementation for User Story 5

- [ ] T079 [P] [US5] Define product list columns, bidi identity cells, responsive priorities, filters, facets, row actions, and safe bulk command metadata in `apps/web/src/features/academic-catalog/config/product-table.tsx`
- [ ] T080 [P] [US5] Implement the catalog overview with permission-aware totals, lifecycle summaries, and navigation cards in `apps/web/src/features/academic-catalog/screens/academic-catalog-overview-screen.tsx`
- [ ] T081 [US5] Implement URL-backed product-list query orchestration with debounced/cancellable search, previous results, totals, facets, and page clamping in `apps/web/src/features/academic-catalog/hooks/use-product-list.ts`
- [ ] T082 [US5] Implement the shared-table product listing with query toolbar, status/branch filters, selection, loading/empty/error/retry, and permission-aware actions in `apps/web/src/features/academic-catalog/screens/products-screen.tsx`
- [ ] T083 [US5] Implement lifecycle transition dialog consequences, required reasons, pending feedback, invalid-transition recovery, and focus return in `apps/web/src/features/academic-catalog/components/product-transition-dialog.tsx`
- [ ] T084 [US5] Integrate transition commands, lifecycle-safe bulk actions, narrow invalidation, and eligibility refresh in `apps/web/src/features/academic-catalog/hooks/use-product-lifecycle.ts`
- [ ] T085 [US5] Validate Scenario 5 independently and record scale, query, lifecycle, permission, and state evidence in `specs/003-academic-catalog/validation/us5-discovery-governance.md`

**Checkpoint**: Authorized users can discover and govern a large catalog through one consistent table vocabulary.

---

## Phase 8: Polish & Cross-Cutting Validation

**Purpose**: Validate the composed module and preserve platform-wide quality and future compatibility.

- [ ] T086 [P] Add navigation, route, public-export, permission-key, configuration-driven option, and no-page-fixture-import contract tests in `apps/web/tests/contract/academic-catalog/foundation-contracts.test.ts`
- [ ] T087 [P] Add serious/critical axe coverage for every Academic Catalog route, representative states, and light/dark themes in `apps/web/playwright/accessibility/academic-catalog-a11y.spec.ts`
- [ ] T088 [P] Add keyboard, first-error focus, section navigation, dialog trap/return, upload, reorder, semantic form/table, and live-feedback coverage in `apps/web/playwright/accessibility/academic-catalog-keyboard.spec.ts`
- [ ] T089 [P] Add Arabic RTL, Alexandria, mixed-direction, desktop/laptop/tablet, table-only overflow, sticky-action, and 200% zoom coverage in `apps/web/playwright/journeys/academic-catalog-rtl-responsive.spec.ts`
- [ ] T090 Verify every page imports only the Academic Catalog public feature boundary and every screen accesses data only through service/query hooks in `apps/web/src/app/(workspace)/academic-catalog/` and `apps/web/src/features/academic-catalog/index.ts`
- [ ] T091 Audit strict types, branded IDs, absence of `any`, authoritative schema ownership, immutable outputs, and fixture isolation and record evidence in `specs/003-academic-catalog/validation/architecture.md`
- [ ] T092 Audit Server Component route defaults, Client Component boundaries, query invalidation, editor rerenders, object-URL cleanup, and 10,000-record list behavior and record evidence in `specs/003-academic-catalog/validation/performance.md`
- [ ] T093 Verify no catalog option or behavior branches on product-type/category/status display names and record dynamic-configuration evidence in `specs/003-academic-catalog/validation/dynamic-configuration.md`
- [ ] T094 Verify all mutations and data surfaces cover pending, success, validation, duplicate, conflict, dependency, forbidden, unavailable, empty, retry, and unexpected states in `apps/web/tests/integration/academic-catalog/catalog-states.test.tsx`
- [ ] T095 Verify organization/branch scope cannot be supplied or broadened by form commands and safe errors expose no internal detail in `apps/web/tests/contract/academic-catalog/security-boundaries.test.ts`
- [ ] T096 Update the feature validation outcomes, mock limitations, backend adapter boundary, and future Program Batches extension notes in `specs/003-academic-catalog/quickstart.md` and `README.md`
- [ ] T097 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` from `package.json` and resolve every failure
- [ ] T098 Run `npm run test:e2e -w web`, complete manual screen-reader and responsive review, and record final browser evidence in `specs/003-academic-catalog/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependency; starts immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks every story.
- **US1 and US2 (P1)**: Begin after Foundational and may proceed in parallel because seeded taxonomy
  supports the independent US1 product workflow.
- **US3 (P2)**: Begins after Foundational and integrates most efficiently after the US1 editor shell;
  its domain/service and tests may run in parallel with US1.
- **US4 (P2)**: Begins after Foundational and integrates most efficiently after the US1 editor shell;
  its schema/content/asset work may run in parallel.
- **US5 (P2)**: Begins after Foundational; product listing uses seeded summaries independently, while
  final lifecycle integration follows US1 commands.
- **Polish (Phase 8)**: Begins after all desired story phases are integrated.

### User Story Dependency Graph

```text
Setup → Foundation ─┬→ US1 Maintain Product (MVP) ─┬→ US3 Delivery & Availability ─┐
                    ├→ US2 Configure Taxonomy      ├→ US4 Content & Media ─────────┤
                    └→ US5 Discovery foundation ───┴→ US5 Lifecycle integration ──┴→ Polish
```

### Within Each User Story

1. Write and run story tests first; confirm failures represent missing behavior.
2. Complete schemas/configuration and pure domain rules before service/UI consumers.
3. Complete service/query behavior before screen orchestration.
4. Compose shared controls rather than creating feature-local dropdown/table/upload substitutes.
5. Stop at the checkpoint and execute the independent scenario before cross-story integration.

### Parallel Opportunities

- T002–T004, T006–T007 run in parallel after T001.
- T010–T011 and T013–T017 run in parallel after T008–T009; T020–T022 may run alongside adapter work.
- Each story's four test files run in parallel before implementation.
- US1 section components T032–T033 and guard T035 run in parallel before editor composition.
- US2 forms T046–T047 run in parallel before manager screens.
- US3 schema, branch selector, and field renderer T057–T059 run in parallel.
- US4 schema, ordered-list, sales, and marketing work T068–T071 run in parallel.
- US5 table configuration and overview T079–T080 run in parallel before list orchestration.
- Cross-cutting Playwright suites T087–T089 and audits T091–T093 run in parallel after integration.

---

## Parallel Examples

### User Story 1

```text
Task T026: Product schema tests
Task T027: Product service contract tests
Task T028: Product editor integration tests
Task T029: Product management browser journey

Then in parallel:
Task T032: Basic-information section
Task T033: Academic and pricing sections
Task T035: Unsaved-change guard
```

### User Story 2

```text
Task T041: Taxonomy schema tests
Task T042: Taxonomy service contract tests
Task T043: Taxonomy UI integration tests
Task T044: Taxonomy browser journey

Then in parallel:
Task T046: Product-type form
Task T047: Category form
```

### User Stories 3–5

```text
US3 parallel core: T057, T058, T059
US4 parallel core: T068, T069, T070, T071
US5 parallel core: T079, T080
```

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 using seeded active taxonomy/lookups.
3. Stop and run Scenario 2 plus T026–T040 validation.
4. Demonstrate create Draft → complete → activate → edit → detail and conflict recovery.

### Incremental Delivery

1. Foundation → typed configurable service/query/UI boundary.
2. US1 → independently usable Academic Product MVP.
3. US2 → administrator-managed types and categories.
4. US3 → type-driven delivery and enrollment eligibility.
5. US4 → reusable sales content and marketing assets.
6. US5 → 10,000-record discovery and governed lifecycle.
7. Polish → full RTL, responsive, accessibility, type, performance, and browser evidence.

### Parallel Team Strategy

After Foundation, independent implementers may own US1–US5 because story-specific tests, schemas,
components, hooks, and screens use distinct files. Coordinate sequentially on the mock adapter,
`product-editor-form.tsx`, `product-detail-screen.tsx`, public `index.ts`, navigation registration,
and shared component extensions to avoid overlapping edits.

---

## Notes

- `[P]` means the task targets independent files and has no incomplete prerequisite.
- Story labels provide direct traceability to the specification.
- Pages import feature screens; only the mock adapter imports fixtures.
- Product types, field applicability, categories, statuses, options, branches, departments, and
  permissions remain service-driven data.
- Product archival is terminal/read-only in this phase; taxonomy reactivation is explicit.
- Catalog prices are references only; transactions must snapshot accepted values and versions later.
- Mock permission checks are UX simulation, never the future security boundary.
- Commit after each task or coherent group and validate at every story checkpoint.
