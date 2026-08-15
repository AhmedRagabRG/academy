# Research: Academic Catalog

All technical unknowns were resolved during Phase 0.

## Feature and Route Boundary

**Decision**: Use one `academic-catalog` feature with overview, product-type, category, product-list,
create, detail, and edit routes. The detail route is read-oriented; create/edit share one sectioned
editor composition.

**Rationale**: These records share activation and reference-integrity rules but require distinct
deep links, permissions, metadata, and loading boundaries. **Alternatives considered**: Separate
taxonomy and product features create internal coupling; one tab-only page weakens deep linking and
permission context; inline row editing cannot safely represent the full product aggregate.

## Configurable Product Types and Field Applicability

**Decision**: Product types are service records with stable IDs, configurable labels/status/order,
and academic field-definition records describing visibility, requirement, and ordering. Seed the
three requested defaults but never branch UI behavior on their names.

**Rationale**: A new type becomes usable through configuration without structural changes.
**Alternatives considered**: Type-name conditionals violate dynamic configuration; free-form JSON
without typed field definitions weakens validation and accessibility.

## Product Aggregate and Editor

**Decision**: Treat product identity, academic profile, pricing profile, availability, sales content,
marketing assets, and lifecycle as one versioned aggregate. Present sections through an always
visible logical section navigator on wide screens and a compact accessible selector on tablet,
with one RHF form and one final save command.

**Rationale**: A single form preserves cross-section validation and dirty state while progressive
section disclosure reduces cognitive load. Invalid-section summaries link and focus the first
invalid control. **Alternatives considered**: Independent section saves allow partial incompatible
states; a client-only wizard obstructs review and deep recovery; multiple unrelated pages fragment
activation readiness.

## Product Code, References, and Concurrency

**Decision**: Normalize codes case-insensitively, require organization-wide uniqueness including
archived products, and make the code immutable after first activation. Relationships use opaque IDs.
Inactive dependencies remain readable historically but cannot be newly assigned. Writes carry an
`expectedVersion` token and conflict responses preserve unsaved values.

**Rationale**: Stable codes and IDs protect downstream references and future imports. Version checks
prevent silent overwrite. **Alternatives considered**: Reusing archived codes creates ambiguity;
cascading removal damages history; last-write-wins loses administrator work.

## Lifecycle and Activation Readiness

**Decision**: Enforce explicit transitions: Draft → Active; Active ↔ Hidden; Active/Hidden → Closed;
Closed → Active only after readiness revalidation; non-archived → Archived with confirmation;
Archived is terminal and read-only for products in this phase. Activation requires
complete classification, applicable academic fields, valid pricing reference, and at least one
active registration and study branch.

**Rationale**: Stable behavior keys support operational rules while configurable records supply
labels and presentation. **Alternatives considered**: Arbitrary status assignment bypasses rules;
permanent deletion violates history; archived restoration weakens the explicit historical boundary
and is not required for products in this phase.

## Reference Pricing and Enrollment Eligibility

**Decision**: Store non-negative catalog price components in organization currency and expose a
reference subtotal plus discount/scholarship metadata without calculating the final enrollment
charge or installment schedule. New-enrollment eligibility is derived from Active status and
membership in the active registration-branch set; study and general availability remain distinct.

**Rationale**: The catalog supplies authoritative inputs without taking ownership from Finance or
Enrollment. **Alternatives considered**: A final-price engine expands scope and duplicates future
finance rules; merging branch sets makes eligibility ambiguous.

## Sales Content and Marketing Assets

**Decision**: Model FAQs, requirements, documents, and gallery assets as ordered child records with
stable IDs. Use Tiptap for rich sales content and react-dropzone for local asset selection. The mock
adapter returns metadata/preview references and validates service-configured MIME/size limits; remote
video and landing references use validated URLs.

**Rationale**: Structured ordered records are reusable by admissions, CRM, marketing, reporting,
and future AI while remaining accessible to edit. **Alternatives considered**: One opaque rich-text
blob prevents structured reuse; inline base64 fixture data is heavy; a feature-specific uploader
duplicates shared behavior.

## Service, Query, and Table Strategy

**Decision**: Define a typed catalog facade with business-specific commands and hierarchical query
keys. Lists accept serializable query objects and return server-shaped pagination. Reuse the shared
controlled TanStack Table with stable row IDs, manual search/filter/sort/page callbacks, selection
reconciliation, totals, and lifecycle-safe bulk commands.

**Rationale**: Only the mock adapter imports fixtures, and an API adapter can replace it without UI
changes. **Alternatives considered**: Direct fixture access violates separation; Zustand duplicates
server cache; generic CRUD erases activation/archive semantics; client-only filtering fails at scale.

## Validation and Error Strategy

**Decision**: Feature Zod schemas normalize field values and validate section/cross-field rules;
services enforce uniqueness, active dependencies, lifecycle, version, and derived eligibility.
Typed errors distinguish field validation, duplicate, state, dependency, conflict, permission,
not-found, media, and unexpected retryable failures. Mutations are pessimistic and use Sonner plus
inline retained errors.

**Rationale**: Each rule has one authoritative boundary and failures remain actionable.
**Alternatives considered**: Component validation drifts; optimistic lifecycle changes display
impossible states; generic errors create silent operational failures.

## Permissions and Tenant Boundary

**Decision**: Use stable action keys for catalog/type/category view, create, update, activate,
archive, pricing, content, media, and export. Branch managers receive an authorized-branch scope in
addition to keys. Every record and command includes organization scope; frontend checks remain UX
only until backend authorization exists.

**Rationale**: Action plus resource scope prepares least-privilege enforcement without misleading
users about mock security. **Alternatives considered**: Role-name branching is brittle; navigation-
only filtering exposes forbidden actions; omitting tenant context blocks safe backend integration.

## Accessibility, RTL, and Responsive Behavior

**Decision**: Use logical layout properties, Alexandria typography, bidi isolation for codes/money/
URLs, semantic fieldsets and headings, accessible section navigation, first-error focus, focus-return
dialogs, live mutation/upload status, keyboard reorder alternatives, 200% zoom support, and horizontal
scrolling limited to table viewports. Critical actions remain visible on tablet.

**Rationale**: These are functional requirements and match established foundation patterns.
**Alternatives considered**: icon-only section tabs, drag-only ordering, hidden tablet actions, and
page-level horizontal scrolling fail accessibility or responsive workflows.

## Testing Strategy

**Decision**: Combine schema/service invariant tests, query and contract tests, editor/component
integration tests, Playwright journeys, axe scans, and manual screen-reader/zoom review. The mock
adapter exposes deterministic latency, empty, validation, duplicate, conflict, dependency,
permission, media, and unexpected failure scenarios plus large-list fixtures.

**Rationale**: Domain rules need fast isolated proof while browser tests verify integrated focus,
RTL, responsive, media, and navigation behavior. **Alternatives considered**: E2E alone obscures
business failures; unit-only validation cannot prove user journeys or accessibility.
