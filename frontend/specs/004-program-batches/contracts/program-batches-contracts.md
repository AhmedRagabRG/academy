# Contracts: Program Batches

These are internal frontend, service, route, and consumer contracts. No HTTP/OpenAPI surface is invented because live backend integration is outside this phase.

## Public Feature Boundary

`features/program-batches/index.ts` exports route-facing screens, navigation/permission contributions, consumer-safe batch summary/detail/readiness/eligibility types, the service contract, and deterministic test scenario controls. Route pages and future Enrollment import only this boundary. Fixtures, adapter internals, schemas, and presentational components remain private.

The feature consumes Professional Program and organization lookup contracts through their public boundaries. It never imports Academic Catalog or Organization & Settings fixtures, internal schemas, or screens.

## Route Contract

| Route                                                           | Purpose                              | Required permission                       |
| --------------------------------------------------------------- | ------------------------------------ | ----------------------------------------- |
| `/academic-catalog/programs/[programId]/batches`                | Program-context batch list           | `batches.view`                            |
| `/academic-catalog/programs/[programId]/batches/create`         | Create Draft batch                   | `batches.create`                          |
| `/academic-catalog/programs/[programId]/batches/[batchId]`      | Batch detail, readiness, and history | `batches.view`                            |
| `/academic-catalog/programs/[programId]/batches/[batchId]/edit` | Sectioned batch editor               | `batches.update` plus section permissions |

Next.js 16 pages await promise-based params, validate both identifiers, and pass them into feature screens. The service verifies that `batchId` belongs to `programId`; mismatch is a not-found result rather than a cross-program disclosure. Routes own metadata, breadcrumbs, loading, not-found, and error context. Normal transitions use links; successful creation replaces the blank create history entry with the canonical detail route.

Eligible Professional Program details expose a permission-aware “Batches” link through a public integration contribution rather than importing batch components.

## Service Facade

Every operation returns a Promise containing cloned typed data or a typed `ProgramBatchError`. No permanent-delete operation exists.

### Reads

- `listBatches(programId, query, signal?) -> PaginatedResult<BatchSummary>`
- `getBatch(programId, batchId, signal?) -> BatchDetail`
- `getBatchLookups(programId, signal?) -> BatchLookups`
- `getRegistrationReadiness(programId, batchId) -> RegistrationReadiness`
- `getEnrollmentEligibility(batchId, branchId, evaluatedOn?) -> EnrollmentEligibility`
- `listLifecycleHistory(batchId, historyQuery) -> PaginatedResult<BatchLifecycleEvent>`
- `listFinancialRevisions(batchId, historyQuery) -> PaginatedResult<BatchFinancialRevisionSummary>`

### Commands

- `createDraft({ programId, input }) -> BatchDetail`
- `updateBatch({ programId, batchId, input, expectedVersion }) -> BatchDetail`
- `transitionBatch({ programId, batchId, toStatus, reason?, expectedVersion }) -> BatchDetail`

Commands contain normalized form values and expected versions, never organization, actor, permission, or arbitrary branch scope. Business-specific commands replace generic CRUD and unconstrained partial updates.

## Cross-Feature Lookup Contract

`BatchLookups` contains:

- Resolved active parent Professional Program summary and batching eligibility/version
- Active academic years and configured intakes plus historical selected labels
- Active branches intersected with employee scope plus historical assigned labels
- Organization currency, precision, capacity warning threshold, offer statuses, and due milestones
- Effective permission keys and authorized branch IDs

Lookup records use stable IDs/keys and localized labels. The batch feature never determines program type from displayed text.

## DTO Contract

`BatchSummary` is list-optimized and excludes installment children and full histories. `BatchDetail` contains editor sections, current financial revision, resolved dependencies, readiness, available actions, and version. History uses pageable projections.

Transport-neutral concepts include:

- Opaque branded IDs, organization scope, versions, localized labels, date-only strings, and ISO audit instants
- Decimal money strings with currency code and precision
- Stable configured lookup keys rather than display-name conditionals
- Ordered child records with stable IDs and positions
- Explicit lifecycle/readiness/eligibility results with stable reason codes
- Resolved historical labels for inactive dependencies

## Editor and Validation Contract

- One RHF form with a composed feature Zod schema owns create/update submission.
- Sections consume FormProvider and render controls only; business rules remain in schemas/domain utilities.
- Draft saving allows readiness gaps but rejects malformed supplied values.
- Opening registration calls registration readiness separately.
- Parent program and code become read-only after registration first opens.
- Changing the parent before lock requires confirmation and revalidation; values are never silently discarded.
- Current students and available seats are read-only projections; only maximum capacity is editable.
- Installment and offer children have stable IDs and keyboard-operable add/remove/reorder controls.
- Disabling installments with retained plans requires confirmation.
- Error summary links to fields/sections and first invalid input receives focus.
- Typed service field errors map into the form. Dirty values survive validation, dependency, conflict, forbidden, unavailable, and unexpected failures.
- Successful save resets the form to returned data/version before canonical navigation.
- Unsaved-change handling uses `beforeunload` while dirty and a reusable dialog for editor-owned exits; no unsupported router interception.
- Codes, dates, money, and URLs use LTR direction/bidi isolation inside RTL layout.

## List and Table Contract

The batch list reuses shared controlled TanStack Table with stable row IDs, canonical query state, service-driven search/filter/sort/page, totals/facets, row selection, column visibility, loading/error/empty/retry states, and permission-aware row/bulk actions.

Input requires route `programId` and includes normalized search, academic-year/intake/branch/status arrays, allowlisted sort/direction, one-based page, and bounded page size. Service processing applies employee branch scope, stable ID tie-break sorting, pagination, totals, and page clamping. Changed criteria reset page and reconcile selection. No screen filters fixture arrays.

Only lifecycle-safe actions may be bulk operations; each selected record is revalidated by the service, and partial outcomes are reported per batch. Horizontal scrolling stays inside the table viewport and headers/sort/selection remain semantic.

## Query Key and Invalidation Contract

Use a factory rooted at `['program-batches']`:

- `lookups(programId)`
- `batches.lists(programId, normalizedQuery, effectiveScope)`
- `batches.detail(programId, batchId)`
- `batches.readiness(programId, batchId)`
- `batches.eligibility(batchId, branchId, evaluatedOn)`
- `batches.lifecycle(batchId, query)`
- `batches.financialRevisions(batchId, query)`

Writes set returned detail, then invalidate affected program lists, readiness, eligibility, lifecycle, financial revisions when applicable, and catalog program batch-count projections. They do not invalidate unrelated programs or the whole application. Superseded list/detail reads accept cancellation.

## Lifecycle Command Contract

The pure transition table in [data-model.md](../data-model.md) defines allowed transitions. A transition command atomically checks:

1. Batch belongs to route program and effective organization/branch scope.
2. Exact permission is present.
3. `expectedVersion` matches.
4. Source/destination transition is allowed.
5. Required confirmation context/reason exists.
6. Destination readiness and time conditions pass.
7. Successful mutation appends exactly one event and returns the new version.

UI renders service-derived available actions and readiness findings; it does not reconstruct transition rules. Automated future workflows must call the same command contract.

## Capacity and Enrollment Count Contract

The initial adapter supplies `currentStudents` through an `EnrollmentCountReader` returning zero or deterministic mock values. Batch forms cannot write it. The adapter derives available seats and capacity state on each read/write. Future Enrollment replaces the reader without changing batch screens or commands.

Enrollment eligibility returns batch/program/branch IDs, evaluated date, eligible boolean, ordered reason codes, available seats, batch version, and current financial revision ID. It is advisory in the frontend phase; future Enrollment/backend enforcement is authoritative and must perform an atomic seat/eligibility check.

## Financial Revision Contract

Money enters/leaves the boundary as normalized decimal strings. One installment plan uses one basis (`amount` or `percentage`) and reconciles using configured precision. Financial updates append an immutable revision containing the complete normalized profile, actor/time from context, reason when required, and source batch version.

Future Enrollment captures the returned financial revision ID and required snapshot. It never looks up mutable current batch pricing to reinterpret historical enrollment obligations.

## Permission and Scope Contract

Stable permission keys are:

- `batches.view`, `batches.create`, `batches.update`, `batches.export`
- `batches.capacity.manage`, `batches.pricing.manage`, `batches.branches.manage`
- `batches.registration.open`, `batches.registration.close`, `batches.registration.correct`
- `batches.study.start`, `batches.graduate`, `batches.archive`

Routes enforce view/action access and screens hide or explain forbidden actions. Section permissions disable or replace editor sections without exposing values the employee cannot view. Branch scope is derived only from employee context; query and command scopes are intersected in the service, and callers cannot supply broader organization/branch access. Mock enforcement is a UX/test simulation, not a production security boundary.

## Error Contract

`ProgramBatchError` includes stable `code`, `kind`, safe Arabic message key, optional field errors, retryable flag, optional readiness/dependency context, and current version where safe.

Codes include `validation`, `duplicate-code`, `stale-version`, `program-not-eligible`, `inactive-dependency`, `schedule-invalid`, `capacity-below-current`, `installment-unbalanced`, `invalid-transition`, `registration-incomplete`, `forbidden`, `scope-forbidden`, `route-parent-mismatch`, `not-found`, `unavailable`, and `unexpected`.

Deterministic mock modes cover success, latency, empty list, retryable/unavailable failures, forbidden, duplicate, stale version, invalid dependency, invalid schedule/capacity/finance, invalid transition, incomplete readiness, parent mismatch, and unexpected failure. Raw errors and native alerts are prohibited.

## Navigation, Feedback, and Accessibility Contract

- Navigation and program-detail integration are configuration/permission driven.
- Every read shows loading, empty, unavailable, forbidden, or retryable error states.
- Every command shows pending state and Sonner success/failure feedback without duplicate announcements.
- Confirmation dialogs trap focus, support Escape/cancel, return focus, and require reasons where specified.
- Capacity/status use text plus icon/shape, not color alone.
- Tables, fieldsets, headings, live regions, error links, and ordered editors retain semantic keyboard and screen-reader behavior.
- RTL is native at 1440, 1024, and 768 px; only table viewports scroll horizontally.

## Future Adapter and Consumer Contract

A REST, GraphQL, or server-function adapter may replace mocks without route/screen changes. Future Enrollment consumes stable batch ID/version, eligibility reason codes, available seats, registration-branch relationship, and financial revision/snapshot. Finance, Reporting, workflows, notifications, audit systems, and AI consumers receive typed read context but no implicit write permission.
