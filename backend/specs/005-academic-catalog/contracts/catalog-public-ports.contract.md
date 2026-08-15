# Contract: Catalog Public Application Ports

These are internal typed read contracts exported by Catalog. Consumers import interfaces/services,
never Catalog repositories, and do not mutate Catalog state.

## Offering reader

`getById(id)` and `getHistoricalReference(id)` return stable identity, names, code, Product Type
identity/name, Business Category identity/name, status, version, and resolved historical labels.

## Selectable offerings

`listEligible({branchId,search,page,pageSize})` returns only active products with an active registration
assignment at the branch, using bounded stable pagination.

## Eligibility and readiness

`checkEligibility({productId,branchId})` returns `{eligible,reason,productVersion}` using the same
policy as HTTP eligibility. `getReadiness(productId)` returns the same versioned issues as HTTP.

## Batchability

`getBatchability(productId)` returns `{productId,productVersion,productTypeIdentity,batchable}`.
Program Batches uses this result and owns `PROGRAM_NOT_BATCHABLE`; no consumer reimplements type logic.

## Pricing/configuration snapshot

`getSnapshot(productId)` returns product identity/version, type/category, academic configuration,
branch assignments, and all canonical Money values. Admissions/enrollment/finance copy this output
into their own immutable business snapshot at their transaction boundary; Catalog does not own those
snapshots.

## Dependency port

Future Admissions/Students modules expose `hasActiveCatalogReferences(productId)` through public
dependency services. Catalog consults configured providers before archive. Failure is retryable and
cannot be treated as “no references.”
