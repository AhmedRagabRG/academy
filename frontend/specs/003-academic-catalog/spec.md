# Feature Specification: Academic Catalog

**Feature Branch**: `[003-academic-catalog]`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Build the Academic Catalog as the configurable source of truth for educational products, their types, categories, academic and financial information, branch availability, sales content, marketing assets, and lifecycle."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintain the Product Catalog (Priority: P1)

An authorized administrator creates and maintains an educational product with its identity, type, category, department, academic details, catalog pricing, and lifecycle status so operational teams use one accurate source of truth.

**Why this priority**: Products are the central records consumed by every later admissions, enrollment, finance, marketing, and reporting workflow.

**Independent Test**: Create a draft product with a unique code and required relationships, edit it, activate it, and retrieve it from the catalog with all saved sections intact.

**Acceptance Scenarios**:

1. **Given** active product types, categories, and departments, **When** an authorized administrator submits valid required product data, **Then** the system creates a draft product and confirms success.
2. **Given** an existing product, **When** an administrator edits its allowed information, **Then** the updated product is visible consistently wherever catalog data is reviewed.
3. **Given** a duplicate product code or invalid academic or pricing values, **When** the administrator saves, **Then** the product is not saved and actionable field-level errors are presented.
4. **Given** a product with incomplete activation requirements, **When** activation is requested, **Then** activation is rejected and the missing requirements are identified.

---

### User Story 2 - Configure Catalog Taxonomy (Priority: P1)

A super administrator manages product types and categories so the catalog can represent current and future educational offerings without hardcoded choices.

**Why this priority**: A configurable taxonomy is required before products can be classified correctly and is mandated by the platform constitution.

**Independent Test**: Create, edit, deactivate, reactivate, and archive a type and category, then verify active values are available for new products while historical product relationships remain readable.

**Acceptance Scenarios**:

1. **Given** catalog configuration access, **When** an administrator creates a unique product type or category, **Then** it becomes available for product classification when active.
2. **Given** a type or category referenced by products, **When** it is archived, **Then** existing relationships remain visible but it cannot be selected for a new product.
3. **Given** an archived type or category, **When** it is reactivated, **Then** it becomes selectable again without losing its history.

---

### User Story 3 - Configure Academic Delivery and Availability (Priority: P2)

An administrator defines the academic structure applicable to a selected product type and assigns the branches where registration and study are permitted.

**Why this priority**: Admissions teams need accurate delivery details and branch eligibility before a product can accept future enrollments.

**Independent Test**: Select each configured product type, verify only its applicable academic fields appear, assign one or more eligible branches, save, and confirm the availability rules are retained.

**Acceptance Scenarios**:

1. **Given** a selected product type, **When** the academic section is opened, **Then** only fields configured as relevant to that type are requested.
2. **Given** active organization branches, **When** an administrator assigns registration and study branches, **Then** the product records the permitted branch sets distinctly.
3. **Given** an inactive or archived branch, **When** a new branch assignment is attempted, **Then** the assignment is rejected while existing historical associations remain visible.

---

### User Story 4 - Maintain Commercial and Support Content (Priority: P2)

Marketing, customer service, and admissions managers maintain approved media, sales scripts, frequently asked questions, admission requirements, and required documents for each product.

**Why this priority**: Consistent product messaging reduces operational errors and prepares the catalog for CRM and marketing reuse.

**Independent Test**: Add ordered FAQs, requirements, documents, sales content, images, video references, landing-page information, and a brochure to a product, then review the same content from the product detail view.

**Acceptance Scenarios**:

1. **Given** an editable product, **When** an authorized user adds valid sales and admissions content, **Then** the content is saved in a reusable, ordered form.
2. **Given** valid supported marketing assets, **When** they are added, removed, or reordered, **Then** the product gallery and asset list reflect the change with accessible previews and status feedback.
3. **Given** an unsupported, oversized, or unavailable asset, **When** it is submitted, **Then** it is rejected without losing other unsaved product changes.

---

### User Story 5 - Discover and Govern Products (Priority: P2)

Authorized managers find products by search and operational filters, review status and availability, and move products through controlled lifecycle states.

**Why this priority**: A growing catalog is only useful when teams can quickly locate relevant offerings and trust their availability state.

**Independent Test**: Search and filter products by type, category, department, branch, and status; sort and paginate results; then perform each permitted lifecycle transition and verify its effect on new-enrollment eligibility.

**Acceptance Scenarios**:

1. **Given** a populated catalog, **When** a user combines search, filters, sorting, and pagination, **Then** the result set and total accurately reflect all applied criteria.
2. **Given** a draft, active, hidden, closed, or archived product, **When** an authorized transition is requested, **Then** only a valid transition is completed and feedback identifies the outcome.
3. **Given** an archived or closed product, **When** another module checks eligibility for new enrollment, **Then** the product is ineligible while its historical record remains available.

### Edge Cases

- A product type changes its applicable academic-field configuration after products already use it; existing values remain readable and administrators are prompted to resolve newly required data before activation.
- A category, department, branch, or product type becomes inactive while referenced; historical references remain intact, but inactive values cannot be newly assigned.
- Two administrators attempt to create or update the same product code concurrently; only one unique code is accepted and the other receives recoverable conflict feedback.
- A user changes product type after entering academic data; incompatible values are preserved until confirmation and are not silently discarded.
- A price or fee is zero, negative, unusually large, or uses a currency different from the organization default; only non-negative catalog values in the configured currency are accepted.
- Registration branches and study branches differ; the system preserves the distinction and evaluates registration eligibility from the registration set.
- A product has no gallery or optional commercial content; it remains saveable as a draft, while activation depends only on explicitly defined activation requirements.
- Search or filtering returns no products, a service is unavailable, or access is denied; the user sees a distinct empty, recoverable error, or forbidden state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized administrators to create, view, edit, activate, deactivate, and archive configurable product types.
- **FR-002**: Each product type MUST define a unique name, status, and the academic fields applicable to products of that type.
- **FR-003**: The system MUST seed initial product types for Professional Program, Professional Diploma, and Training Course while treating them as editable configuration rather than fixed application behavior.
- **FR-004**: The system MUST allow authorized administrators to create, view, edit, activate, deactivate, and archive categories with a name, description, and status.
- **FR-005**: Archived or inactive types and categories MUST remain visible on historical products but MUST NOT be assignable to new products.
- **FR-006**: The system MUST allow authorized users to create and edit products containing official, Arabic, and English names; a unique code; type; category; department; description; primary image; gallery; and brochure.
- **FR-007**: Every product MUST belong to exactly one active product type and one active category when created, and MAY belong to one active department.
- **FR-008**: Product codes MUST be required, normalized consistently, unique across the organization including archived records, and immutable after the product first becomes active.
- **FR-009**: The system MUST conditionally request duration, duration unit, term count, session count, hour count, study mode, training inclusion, internship inclusion, certificate inclusion, and final-project requirement according to the selected type configuration.
- **FR-010**: Duration, term, session, and hour values MUST be positive when applicable, and required academic values MUST be complete before activation.
- **FR-011**: The system MUST record non-negative catalog values for base price, registration, certificate, training, card, examination, additional fees, discounts, scholarships, and installment availability.
- **FR-012**: Catalog financial information MUST use the organization's configured currency and MUST be presented as reference pricing rather than a finalized enrollment charge.
- **FR-013**: The system MUST NOT calculate installment schedules, collect payments, or determine final transactional prices within this feature.
- **FR-014**: The system MUST allow each product to have distinct sets of active registration branches, study branches, and generally available branches.
- **FR-015**: A product MUST have at least one registration branch and one study branch before activation.
- **FR-016**: The catalog MUST expose whether a product is eligible for new enrollment at a given branch; only active products assigned to that registration branch are eligible.
- **FR-017**: The system MUST allow authorized users to maintain sales scripts, ordered FAQs, admission requirements, and required-document lists per product.
- **FR-018**: The system MUST allow authorized users to maintain landing-page references, images, video references, galleries, and brochures with accessible names and ordering.
- **FR-019**: Media validation MUST reject unsupported or oversized files with actionable feedback while preserving the rest of the product form.
- **FR-020**: Products MUST support Draft, Active, Hidden, Closed, and Archived lifecycle states.
- **FR-021**: The system MUST define and enforce valid lifecycle transitions, require confirmation for restrictive transitions, and prevent archived products from receiving new enrollments.
- **FR-022**: Hidden products MUST remain available to authorized internal users but be marked unavailable to public-facing consumers; closed products MUST remain discoverable internally but reject new enrollments.
- **FR-023**: Product and configuration records MUST remain available for historical references after archival; this feature MUST provide no permanent-delete workflow.
- **FR-024**: Product lists MUST support combined search, sorting, pagination, and filters for product type, category, department, branch, and status.
- **FR-025**: Product-type and category lists MUST support search, status filtering, sorting, pagination, selection, and lifecycle-appropriate bulk actions.
- **FR-026**: Every create, edit, media, and status action MUST provide pending, success, validation, conflict, dependency, permission-denied, and unexpected-failure feedback where applicable.
- **FR-027**: The system MUST expose loading, empty, unavailable, error, and retry states for every catalog data surface.
- **FR-028**: Access MUST be permission-aware by catalog area and action, including view, create, update, archive, activate, manage pricing, manage content, manage media, and export capabilities.
- **FR-029**: Branch managers MUST be limited to products and availability within their authorized branches unless a broader role grants access; other listed manager roles MUST see only actions granted to them.
- **FR-030**: Changes MUST retain who created and last updated each record, creation and update times, lifecycle history, price-change context, and archive context for future audit presentation.
- **FR-031**: Catalog data MUST be scoped to one organization and designed so future tenant boundaries cannot expose one organization's catalog to another.
- **FR-032**: The catalog MUST provide stable product identity, classification, academic, pricing-reference, branch-eligibility, lifecycle, sales, and marketing context for future Admissions, Enrollment, Students, Finance, CRM, Marketing, Reporting, and AI consumers.
- **FR-033**: The initial feature MUST use temporary catalog data through the platform's data boundary and MUST NOT require live enrollment, payment, CRM, or marketing integrations.
- **FR-034**: Primary workflows MUST be usable in Arabic RTL on desktop, laptop, and tablet without loss of information or action availability.
- **FR-035**: Primary workflows MUST support keyboard-only operation, logical focus, screen-reader names and status announcements, semantic structure, and sufficient contrast.

### Constitution Requirements *(mandatory for UI features)*

- **Business Workflow**: Super administrators govern types, categories, products, lifecycle, and permissions. Executive managers review the full catalog. Branch, marketing, and customer-service managers act only within granted scopes. Historical records are preserved, inactive dependencies cannot be newly assigned, and product eligibility is determined by lifecycle plus registration-branch assignment.
- **Module Boundary**: The Academic Catalog owns its configuration, products, academic attributes, pricing references, availability, commercial content, and lifecycle. It exposes stable catalog and eligibility concepts to future modules without owning enrollment, billing, scheduling, attendance, assessment, certificates, CRM, or automation behavior.
- **Dynamic Configuration**: Product types, their applicable fields, categories, departments, branches, study modes, duration units, statuses, fee classifications, and permission choices are sourced from administrative configuration. Initial values are seeds, not hardcoded behavior.
- **Arabic & RTL**: Arabic is the default content and layout direction. Names support Arabic and English variants, mixed-direction codes and links retain correct reading order, and content remains separable for future localization.
- **Responsive & Accessibility**: All list, detail, form, media, and lifecycle workflows work on desktop, laptop, and tablet; support keyboard navigation, deliberate focus and recovery, semantic fields and tables, announcements, and accessible contrast.
- **UI States**: Every catalog surface defines loading, empty, error, retry, success, validation, conflict, dependency, forbidden, and unavailable states without silent failure.
- **Reuse**: The module uses the platform's shared page, card, form, dropdown, upload, dialog, badge, feedback, and data-table interaction patterns; recurring catalog patterns become shared feature components rather than page-specific variants.
- **Frontend Boundary**: Pages coordinate feature screens only. Catalog business rules belong to the feature domain and all temporary or future data access passes through replaceable service functions.
- **AI & Future Context**: Stable typed context includes product identity, multilingual names, taxonomy, academic delivery, pricing references, branch eligibility, lifecycle, FAQs, requirements, documents, media metadata, authorship, and timestamps. Future authentication, authorization, tenant isolation, audit logs, workflows, and AI actions remain enforcement boundaries rather than assumptions.

### Key Entities

- **Product Type**: A configurable classification of offering that defines its name, status, and applicable academic information; referenced by many products.
- **Category**: A configurable catalog grouping with name, description, and status; referenced by many products.
- **Academic Product**: The source-of-truth educational offering with multilingual identity, unique code, classification, department, content, academic details, catalog pricing, availability, media, and lifecycle.
- **Academic Profile**: Product-specific duration, workload, delivery mode, terms, sessions, included experiences, certification, and final-project requirements governed by product type.
- **Pricing Profile**: Non-transactional base price, fees, discounts, scholarships, installment indicator, and currency reference for a product.
- **Product Branch Availability**: The relationship between a product and a branch, distinguishing registration, study, and general availability.
- **Sales Content**: Ordered scripts, FAQs, admission requirements, and required documents used by admissions and customer-service teams.
- **Marketing Asset**: Images, videos, brochures, gallery items, and landing-page references associated with a product, including accessible labels and order.
- **Product Lifecycle Event**: A status change with actor, time, prior state, resulting state, and reason/context retained for future audit use.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized administrator can create a complete draft product in no more than 10 minutes and activate an activation-ready product in no more than 2 additional minutes.
- **SC-002**: At least 95% of trained administrators complete product creation, editing, and lifecycle changes successfully on their first attempt during acceptance testing.
- **SC-003**: Users can locate a known product using search and filters in under 30 seconds within a catalog of at least 10,000 products.
- **SC-004**: 100% of attempts to reuse a product code, assign an inactive dependency, enter invalid academic ranges, or activate an incomplete product are prevented with actionable feedback.
- **SC-005**: 100% of archived and closed products are rejected as candidates for new enrollment while remaining accessible to authorized users for historical review.
- **SC-006**: Adding a new product type and configuring its applicable academic fields requires no redesign of existing product records or user workflows.
- **SC-007**: All primary catalog workflows can be completed using only a keyboard at desktop, laptop, and tablet viewport sizes, with no serious or critical accessibility violations.
- **SC-008**: At least 90% of admissions, customer-service, and marketing reviewers rate product information as complete and easy to find during stakeholder acceptance review.
- **SC-009**: Across acceptance scenarios, every catalog action visibly reports success or failure and every data surface displays an appropriate loading, empty, error, or unavailable state.

## Assumptions

- The existing Organization & Settings module supplies active departments, branches, currencies, users, roles, and permission context.
- Initial product types are seeded but remain administrator-managed configuration.
- Products begin in Draft status; activation requires valid classification, academic information, pricing reference, and registration/study branch availability.
- One organization-level currency applies to catalog pricing in this phase; multi-currency transactional pricing belongs to future finance work.
- Product codes remain globally unique within an organization, including archived products, to protect historical references.
- Department assignment is optional because not every organization structures catalog ownership identically; if assigned, the department must be active.
- Discounts and scholarships are catalog reference values only; eligibility, stacking, approval, expiration, and final-price computation are out of scope.
- File and media limits use organization-configurable policies; unsupported formats and unavailable remote references are rejected.
- Live public landing-page publishing, student enrollment, payment schedules, and downstream synchronization are out of scope; this feature only prepares authoritative catalog data for them.
