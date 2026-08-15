# Data Model: Academic Catalog

## Conventions

- UUID identifiers; UTC timestamptz audit values; `version` on every mutable aggregate.
- Archival/status retains history; no public delete.
- Codes/search text are normalized before persistence and unique across every status.
- Money is stored in integer minor units and mapped to canonical decimal-string Money objects.
- External references are UUID values validated through owning-module public services, not cross-module FKs.

## ProductType

| Field | Type | Rules |
|---|---|---|
| id | UUID | Primary key |
| key | fixed enum | Program, Diploma, Course; unique and immutable |
| nameAr/nameEn | string | Trimmed, minimum 2 |
| description | string | Minimum 3 |
| status/archive/version/audit | standard | Three seeded rows only |

Relationships: many ProductTypeField and AcademicProduct. `supportsBatches` is derived from key and
not persisted/configurable. Create is prohibited; archive is dependency-checked.

## ProductTypeField

| Field | Type | Rules |
|---|---|---|
| productTypeId/key | composite identity | Key belongs to closed academic-field enum |
| label | string | Required Arabic presentation label |
| kind | number/option/boolean/reference | Must match field key |
| required | boolean | Configurable within allowed key set |
| position | positive integer | Unique and contiguous within type |

Allowed keys are constrained by type policy; Course includes `instructorId` reference.

## BusinessCategory

Organization-owned master data accessed through a public port and Catalog facade. Required projection:
UUID, code, Arabic/English names, description, status, version, audit fields. It is not duplicated in
Catalog; AcademicProduct stores only `categoryId`.

## AcademicProduct

| Field | Type | Rules |
|---|---|---|
| id/organizationId | UUID | Primary/owner |
| officialName/nameAr/nameEn | string | Required; normalized search fields |
| code | string | Global normalized unique; locked on first activation |
| codeLockedAt | timestamp nullable | Server-set only |
| productTypeId/categoryId | UUID | Exactly one of each; active for new/changed product |
| departmentId | UUID nullable | Organization reference |
| description | string | Minimum 10 |
| status | draft/active/hidden/closed/archived | Creation always draft |
| academic scalars | nullable typed fields | Type-policy controlled positive values/booleans |
| instructorId | UUID nullable | Required only for Course; Identity reference |
| version/archive/audit | standard | Optimistic concurrency/history |

Relationships: one ProductPricing; many BranchAssignment, ProductContentItem, ProductAsset,
ProductLifecycleEvent. Unique/indexes: normalized code; normalized search fields; type/status,
category/status, department/status, updatedAt.

## ProductPricing

One-to-one with product. Fields: `currency` ISO code, `precision`, bigint minor-unit amounts for
basePrice, registrationFees, certificateFees, trainingFees, cardFees, examFees, additionalFees,
discount, scholarship, plus `installmentAvailable`. All amounts non-negative; one currency/precision.

## ProductBranchAssignment

Composite identity `(productId,branchId,role)` where role is registration/study/general. Branch is an
Organization reference. Indexes support branch-scoped product lists and eligibility.

## ProductContentItem

| Field | Type | Rules |
|---|---|---|
| id/productId | UUID | Stable child/owner |
| kind | faq/admission-requirement/required-document | Closed union |
| title/description | string | Title required; description optional |
| required | boolean nullable | Requirements/documents only |
| position | positive integer | Unique contiguous per product/kind |

Product `salesScript` and optional landingPage remain product scalars.

## ProductAsset

Stable UUID, product owner, kind primary/gallery/brochure/video, safe file descriptor fields, label,
positive position. One primary; gallery maximum 8; MIME/size follows published policy; unique position
per product/kind. No filesystem path or secret is stored.

## ProductLifecycleEvent

Append-only UUID, productId, from/to statuses, optional reason, actorId, UTC time, resulting version.
Creation appends null→draft; each committed transition appends exactly one row.

## State Transitions

- Creation → draft.
- draft → active only when readiness passes; first activation locks code.
- active ↔ hidden; active/hidden → closed; eligible non-archived states → archived according to the
  canonical graph and dependency checks.
- Archived products remain readable and never return to selectable state unless the canonical graph
  is explicitly amended.

## Transaction Boundaries

1. Create/update: validate external references and type policy; write product, pricing, assignments,
   content, assets; increment once; commit; emit one aggregate event.
2. Status: version/readiness/dependency check, status/code lock, lifecycle append; commit; emit.
3. Product Type metadata update: version-check type, replace ordered fields, increment once.
4. Category mutations delegate atomically to Organization's public administration service.

## Migration and Seed Strategy

Create fixed enums/tables/indexes/checks; seed exactly three Product Types and allowed fields
idempotently; seed optional development categories/products only through production contracts. Verify
fresh and prior-Organization upgrades, repeated seeds, constraint parity, rollback reconstruction,
code uniqueness, child ordering, and retained existing Identity/Organization rows.
