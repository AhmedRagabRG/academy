# Feature Specification: Academic Catalog

**Feature Branch**: `[005-academic-catalog]`

**Created**: 2026-08-02

**Status**: Ready for planning

**Input**: User description: "Create a centralized catalog for professional programs, professional diplomas, and training courses with academic, financial, branch, sales, marketing, and lifecycle configuration."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintain Academic Products (Priority: P1)

An authorized catalog administrator creates, finds, views, and edits academic offerings through one
consistent product record so the organization has a reliable source of truth.

**Why this priority**: A usable product record is the minimum catalog capability required by every
future enrollment, finance, sales, and reporting workflow.

**Independent Test**: Create one draft product with a unique code, locate it using every supported
search/filter rule, update it with the current version, and verify the detail contains resolved
taxonomy and department labels without client-authored derived values.

**Acceptance Scenarios**:

1. **Given** active catalog taxonomy and valid Organization references, **When** an administrator
   creates a product with complete valid data, **Then** it is created as a draft with a unique code.
2. **Given** products across types, categories, departments, branches, study modes, and statuses,
   **When** an administrator searches, filters, sorts, or pages the list, **Then** stable matching
   summaries and accurate pagination are returned.
3. **Given** an existing product and its current version, **When** the administrator updates its
   editable information, **Then** all submitted sections change atomically and derived labels remain
   server-owned.
4. **Given** a duplicate code, stale version, inactive dependency, invalid branch assignment, or
   unknown field, **When** a create/update is submitted, **Then** no partial change is retained.

---

### User Story 2 - Configure Academic Product Taxonomy (Priority: P2)

An authorized administrator manages the academic product classifications and their schema-driving
academic fields so new offerings can be configured without hardcoded product records.

**Why this priority**: The product editor and category-specific validation depend on an authoritative
taxonomy, but the core catalog can be demonstrated first with seeded active classifications.

**Independent Test**: Create and update a Business Category, update a seeded Product Type's academic
field presentation, archive either when unused, and prove referenced archived taxonomy remains readable.

**Acceptance Scenarios**:

1. **Given** the three seeded Product Types, **When** an administrator updates their labels or ordered
   academic-field definitions, **Then** new products receive the correct fixed behavior and conditional requirements.
2. **Given** a valid unused Business Category, **When** it is created, **Then** products can select it
   independently of their Product Type.
3. **Given** a taxonomy record referenced by a non-archived product, **When** archival is attempted,
   **Then** archival is refused without changing either record.
4. **Given** the catalog taxonomy, **When** a product is created, **Then** it selects exactly one
   schema-driving Product Type (Professional Program, Professional Diploma, or Training Course) and
   exactly one separately configurable Business Category such as Engineering, Medical, IT, or Business.

---

### User Story 3 - Configure Academic and Commercial Profiles (Priority: P3)

An authorized administrator configures category-appropriate academic details, complete pricing,
branch availability, sales content, admission content, and marketing media for each product.

**Why this priority**: These sections make a draft complete enough for activation and future
admissions, enrollment, sales, and finance consumption.

**Independent Test**: Complete every section for one product, verify conditional academic rules and
money/asset/ordering validation, then retrieve the same aggregate with no loss or unsafe disclosure.

**Acceptance Scenarios**:

1. **Given** a selected product type, **When** academic data is submitted, **Then** only supported
   fields are accepted and every type-required field is present and positive where numeric.
2. **Given** complete financial information, **When** it is saved, **Then** every amount preserves
   currency and decimal precision and no negative value is accepted.
3. **Given** active branches, **When** registration/study/general availability is assigned, **Then**
   duplicate branch-role pairs are rejected and at least one registration branch can be identified.
4. **Given** ordered FAQs, documents, requirements, images, videos, and brochures, **When** content is
   updated, **Then** ordering and media policy are enforced and no local storage path is exposed.
5. **Given** a Training Course, **When** its instructor is assigned, **Then** the instructor references
   an eligible Identity employee rather than free text and remains suitable for future scheduling and reporting.

---

### User Story 4 - Control Product Lifecycle and Eligibility (Priority: P4)

An authorized administrator checks readiness and transitions products through draft, active, hidden,
closed, and archived states while consumers can determine whether a product is selectable at a branch.

**Why this priority**: Lifecycle gates prevent incomplete offerings from reaching Admissions or
future enrollment and preserve historical references after closure.

**Independent Test**: Attempt activation before and after completing readiness issues, exercise every
permitted transition, verify code locking and lifecycle history, and check branch eligibility.

**Acceptance Scenarios**:

1. **Given** an incomplete draft, **When** readiness or activation is requested, **Then** field-specific
   readiness issues are returned and activation is refused.
2. **Given** a ready draft, **When** it is activated, **Then** its code becomes immutable and exactly
   one versioned lifecycle event records the transition.
3. **Given** an active, hidden, or closed product, **When** a permitted transition occurs, **Then** the
   new status and lifecycle history commit atomically; illegal transitions are refused.
4. **Given** active downstream references, **When** archival is attempted, **Then** archival is refused;
   otherwise the archived product remains historically readable but not selectable.
5. **Given** a future module requests batch capability, **When** the product type is Professional
   Program, **Then** it is batchable; Professional Diploma and Training Course are never batchable,
   and administrators cannot configure or override this rule.

---

### User Story 5 - Consume Catalog Products (Priority: P5)

Admissions and future business modules retrieve authoritative product summaries, details, prices,
readiness, and branch eligibility without duplicating catalog data.

**Why this priority**: The catalog delivers platform value when downstream modules can safely consume
active offerings and resolve historical products through narrow public contracts.

**Independent Test**: Request active selectable offerings for a branch, verify an ineligible product
returns its documented reason, and resolve an archived product historically with the stored price and
version semantics intact.

**Acceptance Scenarios**:

1. **Given** active and non-active products across branches, **When** a consumer requests eligible
   offerings for a branch, **Then** only active products with registration availability are selectable.
2. **Given** an ineligible product/branch pair, **When** eligibility is checked, **Then** a stable reason
   distinguishes inactive product, inactive branch, and missing registration assignment.
3. **Given** a product later edited or archived, **When** a historical consumer resolves it, **Then**
   its identity remains available and future modules can snapshot the appropriate version and price.

### Edge Cases

- Two administrators create codes differing only by case or surrounding whitespace.
- A product dependency becomes inactive between validation and commit.
- A department or branch is archived while still assigned to a product.
- A type changes its required-field schema after products already reference it.
- A code edit races with the product's first activation.
- Different pricing fields use inconsistent currencies or precision.
- Gallery count, media size, MIME type, URL safety, or asset position is invalid.
- Ordered FAQs/documents contain duplicate IDs or positions.
- A dropped search connection is followed by a newer search request.
- A page is beyond the final page or a filter array is empty.
- A product has study availability but no registration availability.
- Archived taxonomy/product records are required to render historical data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized administrators to create, view, update, and archive
  academic products without permanent deletion.
- **FR-002**: Every product MUST have a globally unique normalized code, official name, Arabic name,
  English name, description, exactly one product type, exactly one category, optional department,
  lifecycle status, version, and audit attribution.
- **FR-003**: Every product MUST be created as `draft`; clients MUST NOT author status, lifecycle,
  derived labels, version, organization identity, or audit fields.
- **FR-004**: Product list reads MUST support Arabic-normalized search, array filters for type,
  category, department, branch, status, and study mode, allow-listed sorting, stable pagination, and
  caller branch scope.
- **FR-005**: Product detail MUST include the complete academic, pricing, availability, content,
  media, lifecycle, resolved-label, version, and per-record permission information.
- **FR-006**: Product updates MUST be all-or-nothing and protected by the submitted expected version.
- **FR-007**: A product code MUST become immutable on first activation and remain reserved through
  every later status.
- **FR-008**: The three seeded Product Types MUST be editable, versioned, archivable, searchable,
  paginated, and historically readable, but administrators MUST NOT create additional behavioral types.
- **FR-008A**: Business Categories MUST be dynamically creatable, editable, versioned, archivable,
  searchable, paginated, and historically readable.
- **FR-009**: A taxonomy record referenced by a non-archived product MUST NOT be archived.
- **FR-010**: Product Types MUST define an ordered set of supported academic fields, including field
  kind, label, requirement flag, and position; unsupported or missing required product data MUST fail.
- **FR-010A**: The system MUST provide exactly three behavioral Product Type identities—Professional
  Program, Professional Diploma, and Training Course—while allowing their academic field presentation
  metadata to be maintained without changing their fixed domain identity.
- **FR-011**: Academic numeric values MUST be positive, study mode/duration units MUST resolve from
  active Organization-owned configuration, and conditional requirements MUST follow the chosen type.
- **FR-011A**: Training Courses MUST reference one eligible Identity employee as Instructor; other
  product types MUST reject an instructor assignment, and no employee data may be copied into Catalog.
- **FR-012**: Product pricing MUST include base price, registration, certificate, training, card,
  exam, and additional fees, discount, scholarship, and installment availability.
- **FR-013**: Every monetary value MUST be a non-negative decimal amount with one supported currency
  and precision; bare floating-point values and inconsistent profile currency/precision MUST fail.
- **FR-014**: Branch availability MUST support registration, study, and general roles, reject duplicate
  branch-role pairs, validate active Organization branches, and respect caller branch scope.
- **FR-015**: Product content MUST support sales script, ordered FAQs, admission requirements,
  required documents, landing page, and ordered primary/gallery/brochure/video assets.
- **FR-016**: Assets MUST comply with the published media policy, use safe public descriptors, and
  never expose local paths or storage secrets.
- **FR-017**: The system MUST expose readiness issues before activation and MUST refuse activation
  while any required academic, pricing, branch, or content rule is incomplete.
- **FR-018**: Product transitions MUST follow the documented draft/active/hidden/closed/archived
  transition graph, require expected versions, and append one immutable lifecycle entry atomically.
- **FR-019**: The system MUST refuse archival while active Admissions, enrollment, or other blocking
  references exist and MUST retain archived products for historical resolution.
- **FR-020**: The system MUST expose stable product/branch eligibility results distinguishing eligible,
  product-not-active, branch-inactive, and registration-not-assigned outcomes.
- **FR-021**: Every protected endpoint MUST enforce its exact catalog permission, and detail responses
  MUST include computed record permissions.
- **FR-022**: Product create, update, status, pricing, content, asset, and branch operations MUST emit
  audit-ready actor, target, operation, time, and resulting-state information only after commit.
- **FR-023**: Downstream modules MUST consume catalog public read/readiness/eligibility services and
  MUST NOT copy products or import catalog persistence components.
- **FR-023A**: Batchability MUST be a fixed domain rule derived from Product Type: Professional
  Programs are batchable, while Professional Diplomas and Training Courses are not; no administrative
  setting may override it.
- **FR-024**: Catalog lookups MUST expose bounded supported currency, duration-unit, study-mode, status,
  Organization branch/department choices, active taxonomy, and media-policy data.
- **FR-025**: No academic product, category, type, pricing choice, or academic business choice MAY be
  hardcoded as a product record in business logic; development seed data remains replaceable.

### Key Entities

- **Academic Product**: The central educational offering aggregate containing identity, taxonomy,
  academic profile, pricing, branch assignments, content, media, lifecycle, and version information.
- **Product Type**: A configurable schema-driving academic classification with ordered supported
  field definitions and lifecycle status, with one of three fixed behavioral identities.
- **Category**: A configurable business grouping used to organize and filter academic products.
- **Academic Profile**: Type-dependent duration, session/hour/term counts, study mode, and boolean
  academic characteristics, plus an IAM employee instructor reference for Training Courses only.
- **Pricing Profile**: The complete versioned set of product prices, fees, discounts, scholarships,
  and installment availability inherited by future consumers as an explicit snapshot.
- **Branch Assignment**: A relationship between a product and an Organization branch for registration,
  study, or general availability.
- **Product Content**: Sales and admission copy plus ordered FAQs, requirements, documents, landing
  page, and safe media descriptors.
- **Lifecycle Entry**: An immutable versioned record of creation or status transition with actor,
  reason, and time.

### API Contract Alignment *(mandatory when the feature exposes HTTP endpoints)*

- **Documented endpoints covered**: Product list/detail/create/update/status/readiness/eligibility/
  lifecycle under `/api/v1/catalog/products`; Product Type and Category list/create/update/status
  under `/api/v1/catalog/product-types` and `/api/v1/catalog/categories`; bounded
  `GET /api/v1/catalog/lookups`; shared file upload is consumed but not owned.
- **Requirements document sections**: §3 shared API conventions; §4.3 Academic Catalog; §5.3 frontend
  mapping; §7 file upload; §8 error catalogue; §9.2 money contract.
- **Contract gaps found**: The owner resolved all three gaps: Product Type and Business Category remain
  separate and mandatory; Training Course instructor references an eligible IAM employee; and
  batchability is fixed by Product Type. The canonical requirements document MUST be amended with the
  instructor field/reference rules, fixed batchability projection, and restriction of Product Type
  creation to the three platform identities before implementation. No new route is assumed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized administrator can create a valid draft product in under five minutes and
  find it on the first search attempt.
- **SC-002**: At least 95% of product searches and filter changes display the first result page within
  one second under expected academy load.
- **SC-003**: In 100% of duplicate-code, stale-version, invalid-dependency, invalid-money, media,
  readiness, and lifecycle trials, no partial product change is retained.
- **SC-004**: In 100% of first-activation trials, the product code is locked and exactly one lifecycle
  entry is added with the resulting version.
- **SC-005**: All three offering families can be represented with their required academic fields
  without hardcoded product records.
- **SC-006**: Every active product exposed to Admissions has at least one eligible registration branch,
  and every ineligible product/branch check returns one stable reason.
- **SC-007**: Archived products and taxonomy labels remain resolvable in 100% of historical-reference
  acceptance cases while remaining unavailable for new selection.
- **SC-008**: At least 90% of representative catalog administrators complete create, edit, readiness,
  and lifecycle tasks correctly on their first acceptance-test attempt.
- **SC-009**: No catalog response or log in the acceptance suite exposes local paths, storage secrets,
  internal query text, stack traces, or data outside caller scope.
- **SC-010**: In 100% of product-type capability checks, Professional Programs are batchable and
  Professional Diplomas and Training Courses are not, with no administrative override.
- **SC-011**: In 100% of Training Course instructor checks, the reference resolves to an eligible IAM
  employee or the mutation is rejected without copying employee data.

## Assumptions

- Identity supplies authentication, catalog permissions, actor identity, and authorized branch scope.
- Organization owns branches, departments, currencies, study modes, and other configurable lookup
  values consumed through public services rather than cross-module persistence access.
- Program Batch creation and management remain outside this feature; Academic Catalog only exposes
  the product metadata needed to determine whether a later batch request is allowed.
- Admissions, Students, Payments, Installments, CRM, and AI consume catalog data but do not mutate it.
- Generic file upload occurs before a catalog update; this module validates and stores only safe file
  descriptors and media ordering.
- Archived records remain retained indefinitely unless a later approved retention policy supersedes
  this assumption.
- The three Product Type behavioral identities are seeded platform domain identities; administrators
  may maintain their presentation and field definitions but cannot introduce a fourth behavioral type.
- Business Categories remain fully configurable and independent from the three Product Types.
