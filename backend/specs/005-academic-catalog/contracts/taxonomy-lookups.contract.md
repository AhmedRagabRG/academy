# Contract: Catalog Taxonomy and Lookups

## Product Types

- `GET /catalog/product-types`
- `GET /catalog/product-types/:id`
- `PATCH /catalog/product-types/:id`
- `PATCH /catalog/product-types/:id/status`

There is no Product Type POST. Exactly three seeded identities exist. List uses search/status/page/
pageSize. Response adds immutable `identity` and derived `batchable`; update permits localized names,
description, and ordered allowed fields plus expectedVersion. Identity/batchable/key/audit/status are
protected. Status uses the dedicated endpoint and dependency checks.

## Business Categories

- `GET /catalog/categories`
- `POST /catalog/categories`
- `GET /catalog/categories/:id`
- `PATCH /catalog/categories/:id`
- `PATCH /catalog/categories/:id/status`

These routes are a Catalog-authorized facade over Organization-owned category master data. Standard
taxonomy paging/search/status applies. Create/update localized names/description; status changes are
dependency-safe and archived labels remain readable. Catalog persists only category IDs on products.

## Instructor options

- `GET /catalog/instructors?search&page&pageSize`

Guard: `catalog.academic.manage`. Catalog delegates to Identity and returns minimal eligible active
options `{id,label,status}` within caller scope. It does not persist/cache employee data. IAM failure
is retryable SERVICE_UNAVAILABLE; unknown/ineligible assignment is non-disclosing DEPENDENCY_NOT_FOUND.

## Bounded editor lookups

- `GET /catalog/lookups`

Returns currencies, duration units, study modes, active branch/department options, statuses,
configStatuses, and mediaPolicy. Organization-owned business choices come from its public service.
Fixed statuses and media policy are bounded platform configuration. Product Types/Categories remain
paginated separately; instructors are never embedded as an unbounded array.

Permissions use the documented taxonomy keys except `catalog.types.create`, which is removed from the
canonical catalogue. Category create remains `catalog.categories.create`.
