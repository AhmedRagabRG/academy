# Contracts: Academic Catalog

These are internal frontend, service, and UI contracts. No HTTP or OpenAPI surface is invented
because live backend integration is out of scope.

## Public Feature Boundary

`features/academic-catalog/index.ts` exports route-facing screens, navigation/permission contribution,
consumer-safe product summary/detail and eligibility types, and deterministic test-adapter controls.
Pages import only this boundary. Fixtures, mock implementation details, internal schemas, and
presentational components remain private.

## Route Contract

| Route | Purpose | View permission |
|---|---|---|
| `/academic-catalog` | Permission-aware catalog overview | `catalog.view` |
| `/academic-catalog/product-types` | Product-type configuration | `catalog.types.view` |
| `/academic-catalog/categories` | Category configuration | `catalog.categories.view` |
| `/academic-catalog/products` | Searchable product list | `catalog.products.view` |
| `/academic-catalog/products/create` | Create draft product | `catalog.products.create` |
| `/academic-catalog/products/[productId]` | Product detail and history | `catalog.products.view` |
| `/academic-catalog/products/[productId]/edit` | Sectioned product editor | `catalog.products.update` |

Routes own metadata, page title, breadcrumb, loading, not-found, and error context. Normal navigation
uses links; create success replaces the blank-create history entry with the canonical product route.

## Service Facade

Every operation returns a Promise with cloned typed data or a typed `AcademicCatalogError`.

### Taxonomy

- `listProductTypes(query)`, `getProductType(id)`, `createProductType(command)`,
  `updateProductType(command)`, `changeProductTypeStatus(command)`
- `listCategories(query)`, `getCategory(id)`, `createCategory(command)`, `updateCategory(command)`,
  `changeCategoryStatus(command)`

Status commands express activate, deactivate, archive, or reactivate behavior explicitly and carry
`expectedVersion`; no delete operation exists.

### Products

- `listProducts(query, signal?) -> PaginatedResult<ProductSummary>`
- `getProduct(id, signal?) -> ProductDetail`
- `createDraft(command) -> ProductDetail`
- `updateProduct(command) -> ProductDetail`
- `transitionProduct({ id, toStatus, reason?, expectedVersion }) -> ProductDetail`
- `getActivationReadiness(id) -> ActivationReadiness`
- `getEnrollmentEligibility(productId, branchId) -> EnrollmentEligibility`
- `getLifecycleHistory(productId) -> ProductLifecycleEvent[]`
- `getCatalogLookups() -> CatalogLookups`

Create/update commands contain normalized form values, never organization/actor scope. Update and
transition commands require `expectedVersion`. Business-specific commands are not a generic CRUD or
unconstrained `Partial<Product>` contract.

## Product DTO Contract

`ProductSummary` is list-optimized and does not embed complete content/media/history. `ProductDetail`
contains all editor sections, resolved historical references, current version, readiness, and
available actions. Consumers use DTOs rather than fixture shapes.

Required transport-neutral concepts:

- Opaque IDs, organization scope, versions, ISO times, localized labels
- Stable configured option/field keys without UI branching on display names
- Decimal money strings plus currency code, not binary floating-point results
- Ordered child records with stable IDs and positions
- File asset metadata and pending-file descriptors, never base64 fixture payloads
- Explicit lifecycle, readiness, and eligibility results with stable reason codes

## List and Facet Contract

Input contains trimmed search; arrays of type/category/department/branch/status IDs; allowlisted sort
field/direction; one-based page; bounded page size. The service owns Arabic/English/code normalization,
branch-scope intersection, filtering, deterministic sorting with ID tie-break, pagination, page
clamping, total, total pages, and optional facet counts. URL query serialization is canonical.
Superseded reads accept cancellation. Pages and tables never filter fixture arrays.

## Query Key and Invalidation Contract

Use a factory rooted at `['academic-catalog']`:

- `products.lists(normalizedQuery)`, `products.detail(id)`, `products.readiness(id)`,
  `products.eligibility(id, branchId)`, `products.lifecycle(id)`
- `types.lists(query)`, `types.detail(id)`
- `categories.lists(query)`, `categories.detail(id)`
- `lookups()` and overview/facet projections

Product writes set the returned detail, then invalidate affected product lists, readiness,
eligibility, lifecycle, and overview/facet keys. Taxonomy writes invalidate only their lists/details,
lookups, and affected product projections. Do not invalidate the full application cache or key by raw
object identity.

## Editor and Form Contract

- One RHF form and authoritative feature Zod schema own the complete create/edit submission.
- Section components consume FormProvider and do not own business validation or async data.
- Draft saves allow activation-only gaps; readiness is evaluated separately before activation.
- Type-driven academic applicability comes from lookup definitions, never type-name conditionals.
- Changing type with incompatible values requires explicit confirmation; values are not silently lost.
- Error summary links to sections/fields, and the first invalid field receives focus.
- Field errors map from typed service failures; dirty values survive conflict, dependency, media, and
  unexpected failures. Successful saves reset to the returned version before navigation.
- `beforeunload` applies only while dirty. Editor-owned exits use a reusable unsaved-change dialog;
  unsupported global App Router history interception is not monkey-patched.
- Codes, money, numbers, dates, and URLs use LTR input/bidi isolation within the RTL layout.

## Media Contract

The shared react-dropzone flow validates configured MIME, extension, size, count, and duplicate
identity before submission. Controlled asset descriptors support existing and pending items,
accessible labels/decorative state, preview, remove, and keyboard-operable reorder. Object URLs are
released when replaced/unmounted. Asset failures identify the item and preserve other form data.
The mock adapter owns mock persistence; a future upload adapter may replace it without editor changes.

## Controlled Table Contract

Product-type, category, and product lists reuse the shared TanStack Table controlled mode with stable
row IDs, URL-backed query state, service-driven search/filter/sort/page, total/facets, selection
reconciliation, column visibility, loading/error/empty/retry states, and permission-aware row/bulk
actions. Only lifecycle-safe operations are eligible for bulk execution. Horizontal scrolling is
confined to the table viewport; semantic headers/sort/selection labels remain intact.

## Permission and Scope Contract

Stable keys cover catalog overview/export and type/category/product view, create, update, activate,
archive, academic, availability, pricing, content, and media actions. Screens hide or disable
sections/actions based on effective keys and explain forbidden versus unavailable states. Branch
manager reads and commands intersect employee-context branch IDs; callers cannot broaden scope by
supplying organization or arbitrary branch scope. Mock checks are UX simulation only; future backend
authorization remains authoritative.

## Lifecycle and Eligibility Contract

The pure transition table is defined in [data-model.md](../data-model.md). Transition commands check
allowed source/destination, readiness for Active, confirmation/reason for restrictive transitions,
permissions, scope, and version atomically. Each success appends one immutable event. Archived is
terminal/read-only for products in this phase.

Eligibility is derived: Active product AND active branch AND active registration association. Hidden,
Draft, Closed, and Archived products are ineligible. Study/general associations never imply
registration eligibility.

## Error Contract

Failures include stable code, kind, safe Arabic message key, optional field-error map, retryable flag,
dependency/readiness context, and current version where safe. Catalog codes include validation,
duplicate code, stale version, inactive dependency, invalid transition, activation incomplete,
forbidden, not found, unavailable, asset type/size/reference, and unexpected.

Mock modes deterministically reproduce success, latency, empty, unavailable, retryable failure,
forbidden, duplicate, stale version, inactive dependency, invalid transition, activation gaps, and
asset rejection. Native alerts and raw internal error details are prohibited.

## Future Adapter and Consumer Contract

Replacing mock services with REST, GraphQL, or server functions must not change route screens or
presentational components. Downstream modules consume stable product IDs plus product/pricing version
or snapshot; they never treat mutable current reference pricing as historical transaction truth.
Catalog context remains suitable for future Admissions, Enrollment, Finance, CRM, Marketing,
Reporting, automation, audit, notification, and AI consumers without granting those consumers write
access to catalog internals.
