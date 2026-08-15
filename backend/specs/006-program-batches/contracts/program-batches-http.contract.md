# HTTP Contract: Program Batches

All paths are beneath `/api/v1`. Success uses the global `{success:true,data,meta?}` envelope; errors use the canonical Arabic error envelope. IDs are UUIDs, timestamps are UTC ISO strings, schedules are `YYYY-MM-DD`, Money uses decimal strings, and every update/transition carries `expectedVersion`.

## Shared Rules

- List requests use `page` and `pageSize` (defaults 1/20, maximum 100); responses use `meta.{total,page,limit,totalPages}`. Over-range pages return empty 200.
- Detail responses include computed `permissions`.
- Stale writes return `409 VERSION_CONFLICT` with first-class `currentVersion`.
- Wrong-parent batch detail is non-disclosing `404 NOT_FOUND`; a correctly parented foreign-scope record returns `403 out-of-scope`.
- Arabic search applies the platform folding rules.

## Administration Endpoints

### List

`GET /api/v1/programs/:programId/batches` — `batches.view`

Query: `search`, singular `academicYearId`, `intakeId`, `branchId`, `status` (including `all`), `sortBy` (`updatedAt|name|code|status`), `sortOrder`, `page`, `pageSize`.

Summary: identity, flattened name, code, resolved academic year/intake, registration end, study start, status, derived capacity, current program price Money, branch count, updated time, version, permissions. Archived records are excluded by default. Results are parent- and branch-scoped and use `id` as stable sort tie-breaker.

### Create

`POST /api/v1/programs/:programId/batches` — `batches.create`

`BatchInput` contains:

- `name {ar,en?}`, `code`, `academicYearId`, `intakeId`, `description`;
- hoisted positive `maximumStudents`;
- `schedule {registrationStartDate?,registrationEndDate?,studyStartDate?,studyEndDate?,graduationDate?}` where empty optional dates mean absent;
- `financialProfile {programPrice,registrationFee,installmentsEnabled,installmentPlans,offers}`;
- `branchAssignments [{branchId,role:registration|study}]`.

The server rejects status, capacity derivatives, lifecycle, revisions, audit fields, and other server-owned fields. A documented client `currentRevisionId` placeholder is ignored on create and never trusted. Response is 201 full detail at draft/version 1 with revision 1 and initial lifecycle entry.

### Detail

`GET /api/v1/programs/:programId/batches/:batchId` — `batches.view`

Returns the full current aggregate, resolved program/academic-year/intake/branch labels, derived live capacity, current FinancialProfile, ordered lifecycle and revisions, audit data, version, and record permissions. Internal scaled values and enrollment details are never exposed.

### Full Update

`PATCH /api/v1/programs/:programId/batches/:batchId` — base `batches.update`

Request is complete `BatchInput` plus `expectedVersion`. Changed capacity, financial, and branch sections additionally require `batches.capacity.manage`, `batches.pricing.manage`, and `batches.branches.manage` respectively. Code changes after first registration opening return `CODE_LOCKED`; maximum below live current students returns `CAPACITY_EXCEEDED`.

All changes commit atomically and increment the root once. A changed financial profile appends exactly one immutable complete revision whose source version equals the resulting batch version. An unchanged financial profile creates no revision.

### Status Transition

`PATCH /api/v1/programs/:programId/batches/:batchId/status`

Body: `{toStatus,reason?,expectedVersion}`.

| From | To | Permission | Rule |
|------|----|------------|------|
| draft | registration-open | `batches.registration.open` | readiness; permanent code lock |
| draft | archived | `batches.archive` | reason; no active dependency |
| registration-open | registration-closed | `batches.registration.close` | — |
| registration-open | archived | `batches.archive` | reason; no active dependency |
| registration-closed | registration-open | `batches.registration.correct` | reason; readiness |
| registration-closed | studying | `batches.study.start` | valid schedule |
| registration-closed | archived | `batches.archive` | reason; no active dependency |
| studying | graduated | `batches.graduate` | valid lifecycle |
| studying | archived | `batches.archive` | reason; no active dependency |
| graduated | archived | `batches.archive` | reason; no active dependency |

All other edges return `INVALID_TRANSITION`; archived is terminal. One transition increments once and appends one lifecycle event atomically.

### Readiness

`GET /api/v1/programs/:programId/batches/:batchId/readiness` — `batches.view`

Returns `{ready,batchVersion,findings:[{code,section,field,message}]}`. Findings cover parent eligibility, active academic year/intake, complete ordered schedule, positive/live capacity, valid current revision, and an active registration branch. Registration opening uses this exact evaluator.

### Lookups

`GET /api/v1/programs/:programId/batches/lookups` — `batches.view`

Bounded response: program identity/active/batchingEligible, academic years, `program-intakes`, branches including disabled historical values, available schedule milestones, Organization currency/precision, and optional Catalog pricing defaults for form seeding.

## Consumer and History Endpoints

### Admissions Eligibility

`GET /api/v1/batches/:batchId/eligibility?branchId=:uuid&today=:YYYY-MM-DD` — HTTP `batches.view`; in-process Admissions uses the public port.

Returns `{eligible,reasons,availableSeats,financialRevisionId,batchVersion}`. Reasons are deduplicated across parent/batch state, registration dates, live capacity, and active registration branch. `today` is required for deterministic evaluation. Dependency failure returns `SERVICE_UNAVAILABLE`, never zero.

### Lifecycle

`GET /api/v1/batches/:batchId/lifecycle` — `batches.view`

Returns append-only entries ordered by `occurredAt,id`: `id`, `fromStatus`, `toStatus`, `reason?`, `actorId`, `occurredAt`, `resultVersion`.

### Financial Revisions

`GET /api/v1/batches/:batchId/financial-revisions` — `batches.view`

Returns immutable revisions ordered by number. Each contains identity, revision number, complete canonical FinancialProfile, actor/time, and source batch version.

## Financial Child Contracts

- Money is `{amount:string,currency:string,precision:number}` and non-negative.
- Installment plan: stable UUID, name, `basis:amount|percentage`, `coveredCharge:program-price|registration-fee|combined`, status, ordered non-empty installments.
- Installment: stable UUID, label, positive decimal string value, available milestone, unique contiguous position.
- Offer: stable UUID, `kind:discount|scholarship`, name, `valueType:amount|percentage`, positive value, optional valid dates, status. Percentages do not exceed 100; end does not precede start.

## Closed Errors

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 422 | Request, schedule, Money, plan, offer, or branch validation |
| `DUPLICATE_CODE` | 409 | Normalized code reused within program |
| `VERSION_CONFLICT` | 409 | Stale expected version |
| `CODE_LOCKED` | 409 | Code changed after first opening |
| `INVALID_TRANSITION` | 409 | Illegal status edge |
| `NOT_READY` | 409 | Registration readiness failed |
| `CAPACITY_EXCEEDED` | 409 | Maximum below current students |
| `PROGRAM_NOT_BATCHABLE` | 422 | Parent cannot own batches |
| `DEPENDENCY_IN_USE` | 409 | Archive blocked by Admissions |
| `DEPENDENCY_NOT_FOUND` | 422 | Unknown/ineligible reference |
| `FORBIDDEN` / `out-of-scope` | 403 | Permission or scope refusal |
| `NOT_FOUND` | 404 | Unknown program/batch or wrong parent |
| `SERVICE_UNAVAILABLE` | 503 | Retryable dependency failure |

There is no delete, export, or file-upload endpoint in this feature.
