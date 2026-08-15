# Contract: Academic Products

All paths are under `/api/v1`, use the global envelope, Arabic errors, UUID IDs, optimistic versions,
computed record permissions, and exact `catalog.*` guards.

## Product list and detail

- `GET /catalog/products`
- `GET /catalog/products/:id`

List query: `search`, array filters `typeIds`, `categoryIds`, `departmentIds`, `branchIds`, `statuses`,
`studyModeIds`, `sort=name|code|price|updatedAt`, `sortOrder`, `page`, `pageSize`. Defaults/max and
over-range behavior follow the shared pagination contract. Caller branch scope is applied to product
assignments; out-of-scope detail returns `403 out-of-scope`.

Summary includes identity/names/code, fixed `productTypeIdentity`, derived `batchable`, resolved
type/category/department labels, canonical basePrice Money, status, branchCount, version, updatedAt,
and permissions. Detail includes the full aggregate, resolved instructor name, and lifecycle.

## Create and full update

- `POST /catalog/products` — `catalog.products.create`, returns 201 draft/version 1
- `PATCH /catalog/products/:id` — section-specific update permissions plus products.update

Create/update body is the canonical full ProductInput: names/code/type/category/department/description,
academic, nine Money values plus installment flag, branches, and content. Update adds
`expectedVersion`. `academic.instructorEmployeeId` is required only for Training Course and forbidden
otherwise. Derived labels, type identity, batchable, status, lifecycle, codeLockedAt, audit fields,
and internal Money values are rejected.

Writes replace submitted owned children atomically. Product code is normalized globally unique and
cannot change after first activation. Money values use decimal strings, one supported currency and
precision, and non-negative amounts.

## Status, readiness, eligibility, lifecycle

- `PATCH /catalog/products/:id/status`
- `GET /catalog/products/:id/readiness`
- `GET /catalog/products/:id/eligibility?branchId=:uuid`
- `GET /catalog/products/:id/lifecycle`

Status body: `{toStatus,reason?,expectedVersion}`. Graph: draft→active/archived;
active→hidden/closed/archived; hidden→active/closed/archived; closed→active/archived; archived terminal.
Close/archive require a reason. Activation recomputes readiness; first activation locks code.

Readiness returns `{ready,version,issues:[{section,field,message}]}`. Eligibility returns
`{eligible,reason,productVersion}` where reason is eligible/product-not-active/branch-inactive/
registration-not-assigned. Lifecycle is ordered append-only entries.

## Content/media rules

Ordered FAQ/admission-requirement/required-document positions are unique contiguous per kind. One
primary image, up to eight gallery images, brochures under the PDF policy, and external HTTPS video
links are accepted. Uploaded assets use safe descriptors and never local paths.

## Errors

`VALIDATION_ERROR` 422; `DUPLICATE_CODE` 409; `VERSION_CONFLICT` 409 with currentVersion;
`DEPENDENCY_IN_USE` 409; `DEPENDENCY_NOT_FOUND` 422; `INVALID_TRANSITION` 409; `NOT_READY` 409 with
issues; `CODE_LOCKED` 409; `FORBIDDEN`/`out-of-scope` 403; `NOT_FOUND` 404; `ASSET_REJECTED` 422;
retryable `SERVICE_UNAVAILABLE` 503. Field details use exact editor paths.
