---
description: "Dependency-ordered task list for Academic Catalog"
---

# Tasks: Academic Catalog

**Input**: Design documents from `/specs/005-academic-catalog/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included because the specification and quickstart require measurable contract,
authorization, validation, migration, transaction, concurrency, scope, and regression evidence.
Write each named test first and confirm it fails for the intended missing behavior.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files with no unmet dependency
- **[Story]**: User story from [spec.md](spec.md); setup/foundation/polish have no story label
- Every task identifies an exact output or verification path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align the canonical contract and establish a verified starting point.

- [X] T001 Amend fixed Product Types/no-create route and permission, Organization-owned Business Categories, IAM instructor picker/reference, fixed batchability, study-mode filter, lifecycle graph, and video-link policy in `docs/api-data-requirements.html`
- [X] T002 Create the Catalog capability skeleton under `src/modules/catalog/{products,taxonomy,lookups,events,mappers,types}/`
- [X] T003 [P] Create Catalog test skeletons under `test/{unit,integration,e2e}/catalog/`
- [X] T004 [P] Amend the exact Catalog permission catalogue, removing unused `catalog.types.create`, in `prisma/seeds/permission-catalog.ts`
- [X] T005 [P] Document Catalog, Organization, Identity, Storage, and future-consumer ownership boundaries in `src/modules/README.md`
- [X] T006 Record pre-change build, lint, unit, e2e, migration, and repeated-seed results in `specs/005-academic-catalog/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish Catalog persistence, constraints, ports, mappings, errors, events, and wiring.

**⚠️ CRITICAL**: No user-story implementation begins until this phase passes.

- [X] T007 Add Catalog enums, ProductType/fields, AcademicProduct, pricing, branch, content, asset, and lifecycle models/indexes/check declarations in `prisma/schema.prisma`
- [X] T008 Create the reviewed Catalog migration with normalized code uniqueness, fixed type identities, child ordering, one-primary asset, Money non-negativity, and lifecycle append-integrity constraints in `prisma/migrations/*_academic_catalog/migration.sql`
- [X] T009 Add fresh/prior-Organization upgrade, rollback reconstruction, and constraint-parity tests in `test/integration/catalog/catalog-migration.spec.ts`
- [X] T010 Create idempotent fixed Product Type metadata and replaceable Catalog development seed in `prisma/seeds/academic-catalog.ts` and `prisma/seed.ts`
- [X] T011 [P] Define fixed type identities, academic fields, product statuses, projections, Money snapshots, eligibility/readiness, permissions, and public records in `src/modules/catalog/types/catalog.types.ts`
- [X] T012 [P] Define Identity instructor and Organization branch/department/category/lookup public reference ports in `src/modules/catalog/types/catalog-reference.port.ts`
- [X] T013 [P] Define downstream offering, selectable, readiness, eligibility, batchability, pricing, snapshot, and dependency ports in `src/modules/catalog/types/catalog-public.port.ts`
- [X] T014 [P] Implement code/name/Arabic search, Money, safe asset/video, URL, and ordered-collection normalization helpers in `src/modules/catalog/types/catalog-normalization.ts`
- [X] T015 [P] Implement database-to-summary/detail/taxonomy/readiness/eligibility/snapshot mappings without paths or internal minor units in `src/modules/catalog/mappers/catalog.mapper.ts`
- [X] T016 Define typed audit-ready events for create, aggregate update, pricing, branches, content/media, taxonomy, status, and code lock in `src/modules/catalog/events/catalog.events.ts`
- [X] T017 Add Catalog exceptions and stable mappings for duplicates, dependencies, readiness, transitions, code lock, assets, scope, and retryable failures in `src/core/exceptions/catalog.exceptions.ts` and `src/database/prisma-error.mapper.ts`
- [X] T018 Implement/export IAM instructor eligibility/options adapter without repository exposure in `src/modules/identity/employees/catalog-reference.service.ts` and `src/modules/identity/identity.module.ts`
- [X] T019 Implement/export Organization Catalog reference/category facade adapter without repository exposure in `src/modules/organization/types/catalog-organization.port.ts` and `src/modules/organization/organization.module.ts`
- [X] T020 Create and register `CatalogModule` with public ports and no circular dependency in `src/modules/catalog/catalog.module.ts` and `src/app.module.ts`
- [X] T021 Verify Prisma generation, migration, repeated seed, primitive tests, and unchanged Foundation/IAM/Organization regressions in `specs/005-academic-catalog/quickstart.md`

**Checkpoint**: Catalog persistence and module boundaries are reproducible and safe for stories.

---

## Phase 3: User Story 1 — Maintain Academic Products (Priority: P1) 🎯 MVP

**Goal**: Administrators create, search, inspect, and atomically update scoped draft products.

**Independent Test**: Create a unique draft, find it through every supported list rule, update it with
the current version, and prove resolved labels, scope, duplicate, dependency, and rollback behavior.

### Tests for User Story 1

- [X] T022 [P] [US1] Add product list/detail/create/update envelope, permission, pagination, field, error, and Swagger contract tests in `test/e2e/catalog/products-contract.e2e-spec.ts`
- [X] T023 [P] [US1] Add product basic DTO tests for unknown/derived fields, localized names, normalized code, UUID references, arrays, sort/filter allow-lists, and versions in `test/unit/catalog/product-basic-dtos.spec.ts`
- [X] T024 [P] [US1] Add Arabic-normalized search, array filters, price/stable sorting, pagination clamp/over-range, and branch-scope integration tests in `test/integration/catalog/product-query.spec.ts`
- [X] T025 [P] [US1] Add normalized duplicate code, inactive dependency, stale version, aggregate rollback, event timing, and out-of-scope tests in `test/integration/catalog/product-lifecycle-basics.spec.ts`

### Implementation for User Story 1

- [X] T026 [P] [US1] Create product list/filter/sort/detail/basic create/update response DTOs with Arabic Swagger examples in `src/modules/catalog/products/dto/product.dto.ts`
- [X] T027 [P] [US1] Create nested product identity/taxonomy/department command DTOs and explicit protected-field rejection in `src/modules/catalog/products/dto/product-input.dto.ts`
- [X] T028 [US1] Implement transaction-aware product list/detail, scope, normalized code uniqueness, versioned root writes, and aggregate-loading primitives in `src/modules/catalog/products/product.repository.ts`
- [X] T029 [US1] Implement active type/category/department reference, code, branch scope, and aggregate-version rules in `src/modules/catalog/products/product.policy.ts`
- [X] T030 [US1] Implement scoped product list/detail and resolved label/record-permission projections in `src/modules/catalog/products/product.service.ts`
- [X] T031 [US1] Implement draft creation with normalized uniqueness, reference validation, creation lifecycle, transaction, and post-commit event in `src/modules/catalog/products/product.service.ts`
- [X] T032 [US1] Implement full versioned product update with atomic child replacement and one post-commit aggregate event in `src/modules/catalog/products/product.service.ts`
- [X] T033 [US1] Expose guarded list/detail/create/update endpoints matching the product contract in `src/modules/catalog/products/product.controller.ts`
- [X] T034 [US1] Register product controller, repository, policy, and service in `src/modules/catalog/catalog.module.ts`
- [X] T035 [US1] Run the Product MVP quickstart slices and record contract/query/rollback evidence in `specs/005-academic-catalog/quickstart.md`

**Checkpoint**: A draft product catalog is independently deployable as the MVP.

---

## Phase 4: User Story 2 — Configure Academic Product Taxonomy (Priority: P2)

**Goal**: Maintain the three fixed schema-driving Product Types and configurable Organization-owned
Business Categories without breaking active or historical products.

**Independent Test**: Update type metadata, create/update/category lifecycle, exercise dependencies,
and prove fixed identity/batchability, schema compatibility, versions, and historical labels.

### Tests for User Story 2

- [X] T036 [P] [US2] Add Product Type list/detail/update/status/no-create contract, permission, and Swagger tests in `test/e2e/catalog/product-types-contract.e2e-spec.ts`
- [X] T037 [P] [US2] Add Business Category list/detail/create/update/status facade contract, permission, and Swagger tests in `test/e2e/catalog/business-categories-contract.e2e-spec.ts`
- [X] T038 [P] [US2] Add taxonomy DTO tests for immutable identities/batchability, closed field keys/kinds, contiguous positions, unknown fields, status, and versions in `test/unit/catalog/taxonomy-dtos.spec.ts`
- [X] T039 [P] [US2] Add exactly-three seed, schema evolution, active-product compatibility, normalized category uniqueness, dependency archive, rollback, and event tests in `test/integration/catalog/taxonomy-lifecycle.spec.ts`

### Implementation for User Story 2

- [X] T040 [P] [US2] Create fixed Product Type list/detail/update/status DTOs and derived batchability responses in `src/modules/catalog/taxonomy/dto/product-type.dto.ts`
- [X] T041 [P] [US2] Create Business Category list/detail/create/update/status facade DTOs in `src/modules/catalog/taxonomy/dto/business-category.dto.ts`
- [X] T042 [US2] Implement Product Type queries, versioned metadata/field replacement, dependency reads, and status primitives in `src/modules/catalog/taxonomy/taxonomy.repository.ts`
- [X] T043 [US2] Implement fixed identity, allowed key/kind, contiguous fields, active-product compatibility, and dependency rules in `src/modules/catalog/taxonomy/taxonomy.policy.ts`
- [X] T044 [US2] Implement Product Type list/detail/update/status and Organization category facade flows with post-commit events in `src/modules/catalog/taxonomy/taxonomy.service.ts`
- [X] T045 [US2] Expose guarded Product Type and Business Category endpoints without a type-create route in `src/modules/catalog/taxonomy/taxonomy.controller.ts`
- [X] T046 [US2] Register taxonomy components in `src/modules/catalog/catalog.module.ts`
- [X] T047 [US2] Run taxonomy quickstart scenarios and record seed/dependency/schema evidence in `specs/005-academic-catalog/quickstart.md`

**Checkpoint**: Product behavior and business classification are authoritative and historical.

---

## Phase 5: User Story 3 — Configure Academic and Commercial Profiles (Priority: P3)

**Goal**: Configure type-specific academics, exact pricing, branch availability, ordered sales/
admission content, and safe marketing media as one atomic product aggregate.

**Independent Test**: Complete all sections for each type, round-trip exact Money, validate IAM/
Organization references and media/order policies, and prove all invalid writes roll back.

### Tests for User Story 3

- [X] T048 [P] [US3] Add academic/instructor/pricing/branch/content/media request and response contract tests in `test/e2e/catalog/product-profile-contract.e2e-spec.ts`
- [X] T049 [P] [US3] Add type-specific academic and instructor DTO/policy tests in `test/unit/catalog/product-academic.spec.ts`
- [X] T050 [P] [US3] Add all-nine Money decimal/currency/precision/minor-unit/price-sort tests in `test/unit/catalog/product-pricing.spec.ts`
- [X] T051 [P] [US3] Add branch role/scope/active-reference/duplicate/registration-readiness tests in `test/integration/catalog/product-branches.spec.ts`
- [X] T052 [P] [US3] Add ordered content stable-ID/position/kind/full-replacement/rollback tests in `test/integration/catalog/product-content.spec.ts`
- [X] T053 [P] [US3] Add primary/gallery/brochure/video descriptor/MIME/size/count/path/replacement/removal tests in `test/integration/catalog/product-assets.spec.ts`
- [X] T054 [P] [US3] Add aggregate multi-section transaction, stale version, one-version, event payload, and failure-silence tests in `test/integration/catalog/product-profile-transaction.spec.ts`

### Implementation for User Story 3

- [X] T055 [P] [US3] Create type-specific academic and IAM instructor DTOs in `src/modules/catalog/products/dto/product-academic.dto.ts`
- [X] T056 [P] [US3] Create canonical Money/pricing DTOs for every fee/default in `src/modules/catalog/products/dto/product-pricing.dto.ts`
- [X] T057 [P] [US3] Create branch assignment and ordered sales/admission content DTOs in `src/modules/catalog/products/dto/product-content.dto.ts`
- [X] T058 [P] [US3] Create safe uploaded asset and external HTTPS video DTO union in `src/modules/catalog/products/dto/product-asset.dto.ts`
- [X] T059 [US3] Implement pricing, branch, content, asset replacement and ordering primitives in `src/modules/catalog/products/product.repository.ts`
- [X] T060 [US3] Implement fixed-type academic/instructor and exact Money validation in `src/modules/catalog/products/product.policy.ts`
- [X] T061 [US3] Implement branch role/scope, ordered content, safe media, gallery, primary, brochure, and video policies in `src/modules/catalog/products/product.policy.ts`
- [X] T062 [US3] Integrate academic, pricing, branch, content, and media aggregate persistence into product create/update in `src/modules/catalog/products/product.service.ts`
- [X] T063 [US3] Implement paginated IAM instructor option lookup through the public port in `src/modules/catalog/lookups/catalog-lookups.service.ts`
- [X] T064 [US3] Expose guarded `GET /catalog/instructors` with minimal option responses in `src/modules/catalog/lookups/catalog-lookups.controller.ts`
- [X] T065 [US3] Add real section-specific permission enforcement and Swagger schemas to `src/modules/catalog/products/product.controller.ts`
- [X] T066 [US3] Run academic/commercial/media quickstart scenarios and record exact Money/rollback evidence in `specs/005-academic-catalog/quickstart.md`

**Checkpoint**: Products are complete for academic, finance, admissions, sales, and marketing use.

---

## Phase 6: User Story 4 — Control Product Lifecycle and Eligibility (Priority: P4)

**Goal**: Gate activation, lock codes, enforce the exact status graph/dependencies, and expose stable
readiness, branch eligibility, lifecycle history, and fixed batchability.

**Independent Test**: Fail/pass readiness, activate and race a code update, traverse every graph edge,
archive with/without dependencies, and verify eligibility/batchability/lifecycle/events.

### Tests for User Story 4

- [X] T067 [P] [US4] Add status/readiness/eligibility/lifecycle response, permission, error, and Swagger contract tests in `test/e2e/catalog/product-lifecycle-contract.e2e-spec.ts`
- [X] T068 [P] [US4] Add complete readiness issue and current-dependency validation tests in `test/unit/catalog/product-readiness.spec.ts`
- [X] T069 [P] [US4] Add every allowed/refused graph edge, reason, terminal archive, and reactivation test in `test/unit/catalog/product-transition.spec.ts`
- [X] T070 [P] [US4] Add activation/code-lock race, lifecycle append/version, archive dependency, rollback, retry, and event tests in `test/integration/catalog/product-lifecycle.spec.ts`
- [X] T071 [P] [US4] Add every eligibility reason, live branch status, scope, and fixed batchability test in `test/integration/catalog/product-eligibility.spec.ts`

### Implementation for User Story 4

- [X] T072 [P] [US4] Create status, readiness, eligibility, lifecycle, and batchability DTOs in `src/modules/catalog/products/dto/product-lifecycle.dto.ts`
- [X] T073 [US4] Implement pure shared readiness and exact transition graph policies in `src/modules/catalog/products/product.policy.ts`
- [X] T074 [US4] Implement versioned status/code-lock/lifecycle append and archive dependency primitives in `src/modules/catalog/products/product.repository.ts`
- [X] T075 [US4] Implement readiness read plus serializable transition/archive with one post-commit event in `src/modules/catalog/products/product.service.ts`
- [X] T076 [US4] Implement live branch eligibility and fixed Product Type batchability projections in `src/modules/catalog/products/product.service.ts`
- [X] T077 [US4] Expose guarded status/readiness/eligibility/lifecycle endpoints in `src/modules/catalog/products/product.controller.ts`
- [X] T078 [US4] Run lifecycle/eligibility quickstart scenarios and record concurrency/dependency evidence in `specs/005-academic-catalog/quickstart.md`

**Checkpoint**: Only ready, eligible products reach downstream operations; history remains intact.

---

## Phase 7: User Story 5 — Consume Catalog Products (Priority: P5)

**Goal**: Downstream modules consume authoritative selectable offerings, historical identities,
readiness, eligibility, batchability, pricing, and immutable configuration snapshots through ports.

**Independent Test**: Use only exported services to list eligible offerings, resolve archived products,
obtain all capability/snapshot data, and prove later edits do not mutate consumer-owned snapshots.

### Tests for User Story 5

- [X] T079 [P] [US5] Add public offering/selection/readiness/eligibility/batchability/pricing/snapshot contract tests in `test/integration/catalog/catalog-public-ports.spec.ts`
- [X] T080 [P] [US5] Add historical resolution, active selection, scope, pagination, and disclosure tests in `test/integration/catalog/catalog-consumer-resolution.spec.ts`
- [X] T081 [P] [US5] Add representative Program Batch/Admissions snapshot boundary tests proving no repository imports or duplicated batch rules in `test/integration/catalog/catalog-consumer-boundary.spec.ts`

### Implementation for User Story 5

- [X] T082 [US5] Implement offering, historical, and selectable product readers in `src/modules/catalog/products/catalog-offering.service.ts`
- [X] T083 [US5] Implement public readiness, eligibility, and batchability readers reusing product policies in `src/modules/catalog/products/catalog-capability.service.ts`
- [X] T084 [US5] Implement canonical pricing and complete configuration snapshot reader in `src/modules/catalog/products/catalog-snapshot.service.ts`
- [X] T085 [US5] Export only safe Catalog public services/ports from `src/modules/catalog/catalog.module.ts`
- [X] T086 [US5] Document Program Batches/Admissions/Students/Finance consumption and snapshot ownership in `src/modules/README.md` and `README.md`
- [X] T087 [US5] Run public-consumer quickstart scenarios and record snapshot/boundary evidence in `specs/005-academic-catalog/quickstart.md`

**Checkpoint**: Catalog is ready as the single product source for future modules.

---

## Phase 8: Polish & Cross-Cutting Validation

**Purpose**: Complete backend integration and production-readiness across all stories.

- [X] T088 [P] Implement bounded Organization-backed currencies/duration units/study modes/branches/departments/status/media feed in `src/modules/catalog/lookups/catalog-lookups.service.ts` and `src/modules/catalog/lookups/catalog-lookups.controller.ts`
- [X] T089 [P] Verify every Catalog controller documents real envelopes, pagination, Arabic examples, statuses, permissions, and closed error shapes in `src/modules/catalog/**/*.controller.ts`
- [X] T090 [P] Add protected-by-default, exact-permission, branch-scope, CSRF, and credentialed-CORS surface tests in `test/e2e/catalog/security-surface.e2e-spec.ts`
- [X] T091 [P] Add log redaction and disclosure tests for paths, secrets, SQL, stacks, minor units, employee data, derived labels, and foreign-scope products in `test/e2e/catalog/catalog-logging.e2e-spec.ts`
- [X] T092 Verify every implemented path/field/permission/status/error/pagination name against `docs/api-data-requirements.html` and `specs/005-academic-catalog/contracts/` in `specs/005-academic-catalog/quickstart.md`
- [X] T093 Run fresh/prior-Organization migration, rollback reconstruction, constraint/index parity, and repeated-seed tests and record evidence in `specs/005-academic-catalog/quickstart.md`
- [X] T094 Run Prisma layering, cross-module repository, strict-type, `any`, filesystem-path, controller-logic, transaction, and event-timing audits in `specs/005-academic-catalog/quickstart.md`
- [X] T095 Execute all 15 quickstart scenario groups and document results/environment limitations in `specs/005-academic-catalog/quickstart.md`
- [X] T096 Run `npm run build && npm run lint && npm run test -- --runInBand && npm run test:e2e -- --runInBand` and record complete Foundation/IAM/Organization/Catalog results in `specs/005-academic-catalog/quickstart.md`
- [X] T097 Perform final architecture, authorization, validation, Swagger, type-safety, dependency, duplication, and clean-code review and record sign-off in `specs/005-academic-catalog/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup starts immediately; T001 blocks Catalog endpoint implementation.
- Foundation depends on Setup and blocks all user stories.
- US1–US4 can start after Foundation, but priority order reduces integration risk.
- US5 depends on product/taxonomy/profile/lifecycle records from US1–US4.
- Polish depends on all stories selected for release.

### User Story Dependency Graph

```text
Setup → Foundation ─┬→ US1 Product MVP ───────┐
                    ├→ US2 Taxonomy ──────────┤
                    ├→ US3 Profiles/Media ────┼→ US5 Consumers → Polish
                    └→ US4 Lifecycle ─────────┘
```

### Within Each Story

- Write and fail tests first; DTOs before repositories; repositories before policies/services;
  services before controllers.
- External data is accessed only through public ports; Prisma stays in Catalog repositories.
- Multi-row writes commit atomically and emit success events only after commit.
- Run the independent checkpoint before advancing.

## Parallel Opportunities

- Setup T003–T005 and Foundation type/port/normalization/mapper tasks T011–T015 can run in parallel.
- After Foundation, US1–US4 test suites and distinct file families can be developed concurrently.
- In US3, academic, Money, content, media, and branch DTO/tests are independent before integration.
- US5 contract tests can run in parallel before its three reader services.

## Parallel Execution Examples

```text
US1: T022 contracts | T023 DTOs | T024 queries | T025 lifecycle basics
US2: T036 types | T037 categories | T038 DTOs | T039 integration
US3: T048 contract | T049 academic | T050 Money | T051 branches | T052 content | T053 assets | T054 transaction
US4: T067 contract | T068 readiness | T069 transitions | T070 lifecycle | T071 eligibility
US5: T079 public ports | T080 resolution | T081 consumer boundary
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundation.
2. Complete US1 product management.
3. Validate and deploy/demo the draft product catalog MVP.

### Incremental Delivery

1. Foundation → persistence and public boundaries.
2. US1 → product MVP.
3. US2 → fixed types and categories.
4. US3 → academic, financial, branch, sales, marketing, media.
5. US4 → readiness/lifecycle/eligibility.
6. US5 → downstream readers/snapshots.
7. Polish → production readiness.

## Notes

- Existing Organization implementation is a dependency, not Catalog-owned code.
- Do not add Product Type creation, editable batchability, permanent deletes, cross-module repository
  imports, hardcoded business choices, or undocumented endpoints.
- `[P]` indicates file independence, not permission to bypass transaction or test dependencies.
