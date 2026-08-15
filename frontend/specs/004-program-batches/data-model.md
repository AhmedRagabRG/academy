# Data Model: Program Batches

## Shared Conventions

- IDs are opaque branded strings: `ProgramBatchId`, `ProgramId`, `AcademicYearId`, `IntakeId`, `BranchId`, `UserId`, `FinancialRevisionId`, and child-record IDs.
- Organization and future tenant scope are service context, never editable form fields.
- Mutable aggregate commands carry `expectedVersion`; stale writes return a typed conflict.
- Date-only values use canonical `YYYY-MM-DD`; audit instants use ISO 8601 UTC strings.
- Money uses normalized non-negative decimal strings plus currency code and configured precision.
- Records use configured keys for behavior and localized labels for display; business rules never branch on labels.
- Archival preserves relationships and history. No entity in this feature has a permanent-delete command.

## Program Batch

Aggregate root representing one intake of one Professional Program.

**Fields**:

- `id: ProgramBatchId`
- `organizationId: OrganizationId`
- `programId: ProgramId`
- `name: LocalizedText` with required Arabic and optional English value
- `code: string` normalized for uniqueness and bidi-isolated for display
- `academicYearId: AcademicYearId`
- `intakeId: IntakeId`
- `description?: RichTextOrPlainText`
- `schedule: BatchSchedule`
- `capacity: BatchCapacity`
- `financialProfile: BatchFinancialProfile`
- `branchAssignments: BatchBranchAssignment[]`
- `status: BatchStatus`
- `codeLocked: boolean`
- `createdBy`, `createdAt`, `updatedBy`, `updatedAt`
- `version: positive integer`

**Rules**:

- Belongs to exactly one active, batching-eligible Professional Program at creation.
- Code is required, normalized, unique across the organization including archived records, and locked after registration first opens.
- New batches start Draft with `currentStudents = 0` until the enrollment-count boundary supplies another value.
- Parent program cannot be changed after registration first opens. Before that point, changing it requires revalidation of all program-dependent information.
- Archived batches are read-only except for historical retrieval.

## Batch Schedule

Value object defining academic lifecycle dates.

**Fields**:

- `registrationStartDate?: DateOnly`
- `registrationEndDate?: DateOnly`
- `studyStartDate?: DateOnly`
- `studyEndDate?: DateOnly`
- `graduationDate?: DateOnly`

**Validation**:

- Draft save accepts incomplete dates but rejects malformed provided values.
- Registration readiness requires all registration and study dates.
- `registrationStart < registrationEnd <= studyStart < studyEnd`.
- If present, `graduationDate >= studyEnd`.
- Graduation transition requires `graduationDate` and cannot occur before that date unless a future permissioned override contract is explicitly introduced.

## Batch Capacity

Capacity projection with one configured and two enrollment-derived fields.

**Fields**:

- `maximumStudents: positive integer`
- `currentStudents: non-negative integer` read from enrollment-count boundary
- `availableSeats: non-negative integer` derived as `max(0, maximumStudents - currentStudents)`
- `state: available | nearly-full | full | over-capacity`
- `warningThresholdPercent: configured organization value`

**Rules**:

- Batch editors may change only `maximumStudents`.
- Maximum cannot be set below current students.
- `over-capacity` exposes legacy/concurrency inconsistency without displaying a negative seat count.
- Capacity state never changes lifecycle status automatically.
- Full and over-capacity batches are enrollment-ineligible.

## Batch Financial Profile

Current batch-specific commercial configuration.

**Fields**:

- `programPrice: Money`
- `registrationFee: Money`
- `currencyCode: CurrencyCode`
- `currencyPrecision: integer`
- `installmentsEnabled: boolean`
- `installmentPlans: InstallmentPlan[]`
- `offers: BatchOffer[]`
- `currentRevisionId: FinancialRevisionId`

**Rules**:

- Money values are non-negative and share the organization currency.
- If installments are enabled, at least one valid active plan is required for registration readiness.
- Disabling installments with retained plans requires explicit confirmation; accepted removal creates a financial revision.
- Financial updates affect only this batch and always produce an immutable revision.
- Taxes, collection, accounting, refunds, eligibility adjudication, and final enrollment pricing are outside the aggregate.

## Installment Plan

Named ordered structure for future payment scheduling.

**Fields**:

- `id: InstallmentPlanId`
- `name: LocalizedText`
- `basis: amount | percentage`
- `coveredCharge: program-price | registration-fee | combined`
- `status: active | inactive | archived` from configuration
- `installments: Installment[]`
- `position: non-negative integer`

**Rules**:

- Active plans require at least one installment.
- Positions are unique and contiguous after normalization.
- Amount-basis plans reconcile in minor units to the selected covered charge.
- Percentage-basis plans reconcile to 100% within configured percentage precision.
- Archived plans remain in financial history but are not available to future enrollment.

## Installment

One ordered component of an installment plan.

**Fields**:

- `id: InstallmentId`
- `label: LocalizedText`
- `value: positive decimal string`
- `dueMilestoneId: DueMilestoneId`
- `offsetDays: integer` (negative, zero, or positive as allowed by milestone configuration)
- `position: non-negative integer`

**Rules**:

- Value interpretation follows the parent plan basis; mixed bases are prohibited.
- Milestones are configured lookups such as registration date or study start, never display-label conditionals.
- A resulting due date outside policy returns a readiness finding rather than being silently adjusted.

## Batch Offer

Configurable discount or scholarship reference owned by one batch.

**Fields**:

- `id: BatchOfferId`
- `kind: discount | scholarship`
- `name: LocalizedText`
- `valueType: amount | percentage`
- `value: positive decimal string`
- `validFrom?: DateOnly`
- `validTo?: DateOnly`
- `statusId: OfferStatusId`
- `eligibilityNotes?: string`
- `position: non-negative integer`

**Rules**:

- Percentage cannot exceed 100; amount cannot exceed configured business-policy bounds.
- If both dates exist, `validFrom <= validTo`.
- Offer periods need not equal the registration period, but warnings identify periods that cannot affect any registration day.
- Application, approvals, stacking, allocation, and student eligibility remain future concerns.

## Batch Branch Assignment

Relationship between one batch and one organization branch.

**Fields**:

- `id: BatchBranchAssignmentId`
- `batchId: ProgramBatchId`
- `branchId: BranchId`
- `role: registration | study`
- `status: active | historical`
- creation metadata

**Rules**:

- `(batchId, branchId, role)` is unique.
- One branch may hold both roles through two explicit relationships.
- Only active branches may be newly assigned.
- Historical inactive branch labels remain resolved for detail/history.
- Registration readiness requires at least one active assignment of each role.

## Batch Financial Revision

Immutable snapshot produced by each accepted financial change.

**Fields**:

- `id: FinancialRevisionId`
- `batchId: ProgramBatchId`
- `revisionNumber: positive integer`
- complete normalized financial snapshot
- `changeReason?: string`
- `createdBy`, `createdAt`
- `sourceBatchVersion`

**Rules**:

- Revision numbers are monotonic per batch.
- Revisions cannot be updated or deleted.
- Future Enrollment captures revision identity plus required terms; later revisions do not mutate that snapshot.

## Batch Lifecycle Event

Immutable status-transition history.

**Fields**:

- `id: BatchLifecycleEventId`
- `batchId: ProgramBatchId`
- `fromStatus: BatchStatus`
- `toStatus: BatchStatus`
- `reason?: string`
- `actorId: UserId`
- `occurredAt: Instant`
- `sourceVersion`, `resultVersion`
- readiness/eligibility context safe for audit

**Rules**:

- Exactly one event is appended for each successful transition.
- Failed transitions append nothing.
- Restrictive, corrective, and archive transitions require a non-blank reason.

## Lifecycle State Machine

| From                | Allowed destination | Permission                     | Preconditions and effects                                                            |
| ------------------- | ------------------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| Draft               | Registration Open   | `batches.registration.open`    | Full readiness, current registration window not ended; locks code and parent program |
| Draft               | Archived            | `batches.archive`              | Confirmation and reason; becomes historical/read-only                                |
| Registration Open   | Registration Closed | `batches.registration.close`   | Confirmation and reason; immediately stops new enrollment                            |
| Registration Open   | Draft               | `batches.registration.correct` | Correction only; zero current students; confirmation and reason                      |
| Registration Closed | Registration Open   | `batches.registration.correct` | Before study start; full readiness; confirmation and reason                          |
| Registration Closed | Studying            | `batches.study.start`          | Study start reached and dependency checks pass                                       |
| Studying            | Graduated           | `batches.graduate`             | Study ended; graduation date exists/reached; confirmation                            |
| Graduated           | Archived            | `batches.archive`              | Confirmation and reason; historical/read-only                                        |
| Archived            | None                | —                              | Terminal in this phase                                                               |

Unlisted transitions are invalid. Lifecycle does not advance automatically; future workflow automation may request the same guarded commands.

## Registration Readiness Projection

**Fields**:

- `batchId`, `batchVersion`
- `ready: boolean`
- ordered `findings[]`: stable code, section, field key, severity, safe message key
- `evaluatedAt`

**Checks**:

- Active batching-eligible parent Professional Program
- Active academic year and intake permitted by organization rules
- Valid complete registration/study schedule
- Positive maximum capacity not below occupancy
- Valid current financial profile and enabled-plan reconciliation
- At least one active registration branch and one active study branch
- No unresolved dependency or version conflict

## Enrollment Eligibility Projection

**Fields**:

- `batchId`, `batchVersion`, `programId`, `branchId`
- `eligible: boolean`
- ordered stable reason codes
- `availableSeats`, `financialRevisionId`
- `evaluatedOn: DateOnly`

**Decision**: Eligible only when status is Registration Open, evaluated date is within the inclusive registration window, available seats are positive, parent program is active and batching-eligible, and an active registration assignment exists for the active originating branch.

**Reason codes** include `status-not-open`, `registration-not-started`, `registration-ended`, `batch-full`, `program-inactive`, `program-not-eligible`, `branch-inactive`, `registration-branch-not-assigned`, and `dependency-unavailable`.

## Read Projections

### Batch Summary

List-optimized: ID/version, localized name, isolated code, program summary, year/intake labels, key schedule dates, status, capacity counts/state, registration/study branch summaries, current price/currency, updated time, and effective available actions.

### Batch Detail

Full aggregate plus resolved current/historical labels, readiness, eligibility context, current financial revision, available lifecycle actions, and permission metadata. Full lifecycle and revision histories are independently pageable projections.

## List Query Model

- Required `programId` from route context; service verifies Professional Program and scope.
- Trimmed normalized search over batch name, code, and resolved parent program name.
- Multi-value filters: academic year, intake, registration/study branch, and status.
- Allowlisted sort with immutable ID secondary ordering.
- One-based page and bounded page size.
- Result: items, total, page, page size, total pages, and optional service-derived facet counts.
- Query criteria are canonical and serializable; changing criteria resets page and results clamp invalid pages.

## Permission Keys

- `batches.view`, `batches.create`, `batches.update`, `batches.export`
- `batches.capacity.manage`, `batches.pricing.manage`, `batches.branches.manage`
- `batches.registration.open`, `batches.registration.close`, `batches.registration.correct`
- `batches.study.start`, `batches.graduate`, `batches.archive`

View permission plus program/branch scope controls direct routes and reads. Each command requires its exact action permission; role names do not imply keys.

## Relationship Summary

- Professional Program 1 → many Program Batches (external Academic Catalog reference)
- Academic Year 1 → many Program Batches (external Organization & Settings reference)
- Intake 1 → many Program Batches (external configurable reference)
- Program Batch 1 → 1 Batch Schedule, Capacity, and current Financial Profile
- Program Batch 1 → many Installment Plans, Offers, Branch Assignments, Financial Revisions, and Lifecycle Events
- Installment Plan 1 → many Installments
- Branch 1 → many Batch Branch Assignments (external Organization & Settings reference)
- Future Enrollment many → 1 Program Batch and 1 captured Financial Revision
