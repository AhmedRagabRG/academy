# Data Model: Program Batches

## Ownership and Aggregate Boundary

`ProgramBatchesModule` owns the complete Program Batch aggregate and its persistence. Catalog owns `AcademicProduct`; Organization owns academic years, branches, intake lookups, and settings; Admissions owns enrollments and application snapshots. Batch rows persist foreign identifiers and reviewed restrictive foreign keys for integrity, but batch services resolve external state only through public ports and never query external repositories/tables.

The aggregate root is `ProgramBatch`. These children are written only through root operations:

- branch assignments;
- financial revisions and their plans/installments/offers;
- lifecycle events.

No batch entity supports physical deletion.

## Closed Enumerations

### BatchStatus

- `DRAFT`
- `REGISTRATION_OPEN`
- `REGISTRATION_CLOSED`
- `STUDYING`
- `GRADUATED`
- `ARCHIVED`

API mapping uses kebab case (`registration-open`, `registration-closed`).

### BatchBranchRole

- `REGISTRATION`
- `STUDY`

### InstallmentBasis

- `AMOUNT`
- `PERCENTAGE`

### CoveredCharge

- `PROGRAM_PRICE`
- `REGISTRATION_FEE`
- `COMBINED`

### BatchOfferKind

- `DISCOUNT`
- `SCHOLARSHIP`

### BatchValueType

- `AMOUNT`
- `PERCENTAGE`

### ConfigurationStatus

- `ACTIVE`
- `INACTIVE`

Capacity state (`AVAILABLE`, `NEARLY_FULL`, `FULL`, `OVER_CAPACITY`) is derived and is not persisted.

## ProgramBatch

The versioned root representing one intake of one Professional Program.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Primary identity |
| `organizationId` | UUID | Immutable organization scope |
| `programId` | UUID | Immutable Catalog product reference; must resolve as batchable Professional Program |
| `nameAr` | text | Required, trimmed, minimum 2 |
| `nameEn` | text nullable | Optional, trimmed |
| `normalizedNameAr` | text | Arabic-folded search value |
| `normalizedNameEn` | text nullable | Case-folded search value |
| `code` | text | Normalized uppercase code; unique with `programId` |
| `academicYearId` | UUID | Organization reference; required and active for new assignment |
| `intakeId` | UUID | `program-intakes` lookup reference; required and active for new assignment |
| `description` | text | Required property; may be empty |
| `registrationStartDate` | date nullable | Date-only |
| `registrationEndDate` | date nullable | Must be greater than registration start when both exist |
| `studyStartDate` | date nullable | Must be at least registration end when both exist |
| `studyEndDate` | date nullable | Must be greater than study start when both exist |
| `graduationDate` | date nullable | Must be at least study end when both exist |
| `maximumStudents` | positive integer | Only persisted capacity input |
| `status` | BatchStatus | Defaults to `DRAFT` |
| `codeLockedAt` | timestamp nullable | Set once on first `REGISTRATION_OPEN`; never cleared |
| `currentFinancialRevisionId` | UUID | Required after creation transaction; points to revision owned by this batch |
| `version` | positive integer | Starts at 1; increments exactly once per aggregate mutation |
| `archivedAt` | timestamp nullable | Set for terminal archive |
| `createdAt`, `updatedAt` | timestamp | UTC audit times |
| `createdBy`, `updatedBy` | UUID | IAM actor identifiers |

Relationships:

- exactly one Catalog Professional Program;
- exactly one Organization academic year;
- exactly one Organization intake lookup value;
- one current financial revision;
- many branch assignments, financial revisions, and lifecycle events.

Indexes and constraints:

- unique `(programId, code)`;
- indexes `(programId, status, updatedAt)`, `(academicYearId, status)`, `(intakeId, status)`, normalized Arabic/English names, and `updatedAt`;
- positive `maximumStudents` and positive `version` checks;
- date-order checks where both endpoints are non-null;
- restrictive external/current-revision foreign keys;
- a reviewed deferred consistency constraint or transaction validation ensures `currentFinancialRevisionId` belongs to the same batch.

## BatchBranchAssignment

| Field | Type | Rules |
|-------|------|-------|
| `batchId` | UUID | Owning root |
| `branchId` | UUID | Organization branch reference |
| `role` | BatchBranchRole | Registration or study |
| `createdAt` | timestamp | Audit time |
| `createdBy` | UUID | Actor |

Primary key: `(batchId, branchId, role)`.

An active branch may hold both roles through two rows. New writes require the branch to be active and in caller scope. Historical rows are retained when a branch becomes inactive; response mapping derives assignment status from the live branch reference.

Indexes: `(branchId, role, batchId)` and `(batchId, role)`.

## BatchFinancialRevision

An immutable complete commercial configuration for one batch version.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Revision identity pinned by Admissions |
| `batchId` | UUID | Owning root |
| `revisionNumber` | positive integer | Sequential within batch |
| `programPriceMinor` | bigint | Non-negative scaled integer |
| `programPriceCurrency` | char(3) | Supported ISO currency |
| `programPricePrecision` | integer | 0–6 |
| `registrationFeeMinor` | bigint | Non-negative scaled integer |
| `registrationFeeCurrency` | char(3) | Must match supported configuration |
| `registrationFeePrecision` | integer | 0–6 |
| `installmentsEnabled` | boolean | Governs active-plan readiness |
| `sourceBatchVersion` | positive integer | Resulting root version that created the revision |
| `createdAt` | timestamp | Immutable creation time |
| `createdBy` | UUID | Actor |

Constraints:

- unique `(batchId, revisionNumber)`;
- unique `(batchId, sourceBatchVersion)` for financial-changing versions;
- all minor values non-negative; currency format and precision bounds;
- database trigger rejects update/delete;
- restrictive owner foreign key.

The API's complete revision snapshot is reconstructed from the revision and revision-owned children. It never follows mutable current rows.

## BatchInstallmentPlan

Revision-owned immutable plan.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Stable client/server identity |
| `financialRevisionId` | UUID | Immutable owner |
| `name` | text | Required |
| `basis` | InstallmentBasis | Amount or percentage |
| `coveredCharge` | CoveredCharge | Program price, registration fee, or combined |
| `status` | ConfigurationStatus | Active/inactive |
| `position` | non-negative integer | Unique and contiguous within revision |

Constraints: unique `(financialRevisionId, id)` and `(financialRevisionId, position)`; append-only trigger; restrictive revision foreign key.

When `installmentsEnabled` is true, at least one active valid plan is required. Each plan contains at least one installment.

## BatchInstallment

Revision/plan-owned immutable installment.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Stable identity |
| `planId` | UUID | Owning plan |
| `label` | text | Required |
| `valueMinor` | bigint | Positive scaled numeric value |
| `precision` | integer | 0–6 |
| `currency` | char(3) nullable | Required for amount basis, absent for percentage basis |
| `milestone` | text | Closed batch milestone (`registration-start`, `study-start`) available only when its schedule date exists |
| `position` | non-negative integer | Unique and contiguous within plan |

Constraints: unique `(planId, id)` and `(planId, position)`; positive value; append-only trigger; restrictive plan foreign key. Percentage-plan totals and amount-plan totals are validated against the selected covered charge by the financial policy.

## BatchOffer

Revision-owned immutable discount or scholarship.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Stable identity |
| `financialRevisionId` | UUID | Immutable owner |
| `kind` | BatchOfferKind | Discount or scholarship |
| `name` | text | Required |
| `valueType` | BatchValueType | Amount or percentage |
| `valueMinor` | bigint | Positive scaled value |
| `precision` | integer | 0–6 |
| `currency` | char(3) nullable | Required for amount, absent for percentage |
| `validFrom`, `validTo` | date nullable | End cannot precede start |
| `status` | ConfigurationStatus | Active/inactive |
| `position` | non-negative integer | Stable display ordering |

Percentage values must be at most 100 after scaling. Amount currencies must match the batch financial currency. Append-only triggers prevent update/delete.

## BatchLifecycleEvent

Immutable transition history.

| Field | Type | Rules |
|-------|------|-------|
| `id` | UUID | Event identity |
| `batchId` | UUID | Owning root |
| `fromStatus` | BatchStatus nullable | Null only for creation |
| `toStatus` | BatchStatus | Resulting state |
| `reason` | text nullable | Required for correction/reopen and archive |
| `actorId` | UUID | IAM actor |
| `occurredAt` | timestamp | UTC event time |
| `resultingVersion` | positive integer | Root version after transition |

Constraints: unique `(batchId, resultingVersion)`, index `(batchId, occurredAt, id)`, restrictive owner foreign key, and update/delete denial trigger.

## Derived Capacity Projection

Inputs:

- persisted `maximumStudents`;
- live `currentStudents` from `BATCH_ENROLLMENT_DEPENDENCY_PORT`.

Outputs:

- `availableSeats = maximumStudents - currentStudents`;
- `OVER_CAPACITY` when `currentStudents > maximumStudents`;
- `FULL` when `availableSeats = 0`;
- `NEARLY_FULL` when `availableSeats > 0` and `availableSeats * 10 <= maximumStudents`;
- `AVAILABLE` otherwise.

The multiplication rule avoids rounding ambiguity. Negative available seats are exposed only with `OVER_CAPACITY`; no request can write a derived field.

## State Transition Graph

```text
DRAFT ───────────────→ REGISTRATION_OPEN ─→ REGISTRATION_CLOSED ─→ STUDYING ─→ GRADUATED ─→ ARCHIVED
  └────────────────────────────────────────────────────────────────────────────────────────→ ARCHIVED
REGISTRATION_OPEN ─────────────────────────────────────────────────────────────────────────→ ARCHIVED
REGISTRATION_CLOSED ── correction + reason ─→ REGISTRATION_OPEN
REGISTRATION_CLOSED ───────────────────────────────────────────────────────────────────────→ ARCHIVED
STUDYING ──────────────────────────────────────────────────────────────────────────────────→ ARCHIVED
```

Rules:

- `ARCHIVED` is terminal.
- Registration opening from draft requires complete readiness and permanently locks code.
- Reopening after closure requires `batches.registration.correct` and a reason.
- Each action uses its exact permission.
- Archival requires a reason and no active Admissions dependency.
- A successful compare-and-swap root update and matching lifecycle insert occur in one serializable transaction.

## Aggregate Write Semantics

### Create

One serializable transaction:

1. re-resolve eligible program and active Organization references;
2. normalize/check program-scoped code;
3. create root at version 1/draft;
4. insert branch assignments;
5. insert financial revision 1 and all children with source version 1;
6. link current revision;
7. insert lifecycle null→draft/resulting version 1;
8. commit, then emit one creation event.

### Full Update

1. read aggregate and live count;
2. validate parent, schedule, capacity, references, financial data, code lock, and field-sensitive permissions;
3. compare-and-swap root by program/batch/version and increment once;
4. replace mutable branch assignments only when changed;
5. append a new complete financial revision only when financial configuration changed and link it as current;
6. commit, then emit one aggregate event describing changed sections.

Stable child IDs from commands are preserved where valid, but prior revision children remain immutable copies.

### Transition

Use serializable isolation, current-status/version compare-and-swap, live readiness/dependency recheck, permanent code lock, archive time update, and one lifecycle append. Emit after commit only.

## Public Projections

- **BatchSummary**: flattened localized name, code, resolved academic year/intake, key schedule dates, derived capacity, current program price Money, branch count, status, version, updated time, record permissions.
- **BatchDetail**: full current aggregate plus resolved external labels, derived capacity, lifecycle, financial revisions, and record permissions.
- **BatchReadiness**: ready flag, batch version, structured findings.
- **BatchEligibility**: eligible flag, deduplicated reasons, available seats, current financial revision ID, batch version.
- **BatchSelectionSnapshot**: immutable batch/program identity, schedule/capacity context, branch, batch version, and complete financial revision snapshot for Admissions ownership.
