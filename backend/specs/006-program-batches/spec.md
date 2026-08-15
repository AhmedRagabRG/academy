# Feature Specification: Program Batches

**Feature Branch**: `[006-program-batches]`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Manage Professional Program batches with independent schedules, capacity, pricing, branches, lifecycle, and admissions readiness."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Maintain a Program Batch (Priority: P1)

An authorized administrator creates a batch beneath a Professional Program, records its localized name, code, academic year, intake, description, maximum capacity, schedule, financial defaults, and branch assignments, and later updates those details without losing historical identity.

**Why this priority**: A valid batch is the enrollment target required by Admissions. None of the later lifecycle or eligibility flows can operate until the batch exists.

**Independent Test**: Create a draft batch for an eligible Professional Program, retrieve it through the parent program, update it using the current version, and verify all entered and derived values.

**Acceptance Scenarios**:

1. **Given** an active Professional Program that supports batches, **When** an authorized administrator submits valid batch details, **Then** a draft batch is created with version 1, zero current students, full seat availability, an initial financial revision, and an initial lifecycle entry.
2. **Given** a Professional Diploma or Training Course, **When** an administrator attempts to create a batch, **Then** the request is refused because that product type never supports batches.
3. **Given** an existing batch and its current version, **When** an administrator changes editable details, **Then** all submitted changes are applied together and the version increases once.
4. **Given** a stale batch version, **When** an administrator submits an update, **Then** no changes are applied and the current version conflict is reported.
5. **Given** a batch whose registration has opened at least once, **When** an administrator attempts to change its code, **Then** the code change is refused while other valid edits remain possible through a corrected request.

---

### User Story 2 - Find and Review Program Batches (Priority: P2)

An authorized employee lists batches for a specific Professional Program, searches and filters the list, and opens a batch to review its resolved academic, capacity, financial, branch, lifecycle, and revision details.

**Why this priority**: Administrators and Admissions staff need a reliable view of available and historical batches before operating on them.

**Independent Test**: Seed multiple batches beneath one program and verify search, every supported filter, sorting, pagination, parent isolation, summaries, and full detail resolution.

**Acceptance Scenarios**:

1. **Given** batches across academic years, intakes, branches, and statuses, **When** a user searches or filters the program batch list, **Then** only matching batches beneath that program are returned in stable paginated order.
2. **Given** an archived batch, **When** a user explicitly includes archived records, **Then** the batch remains available for historical reporting.
3. **Given** a batch ID that belongs to a different program, **When** it is requested through the current program route, **Then** the record is not disclosed.
4. **Given** a batch detail request, **When** the batch is found, **Then** program, academic year, intake, branch labels, capacity state, lifecycle history, and financial revisions are resolved without exposing internal storage values.

---

### User Story 3 - Configure Schedule, Capacity, and Branches (Priority: P3)

An authorized administrator configures the registration and study calendar, maximum student capacity, and registration/study branch assignments used to determine whether the batch is operationally ready.

**Why this priority**: Admissions must not direct applicants to a batch with invalid dates, no registration branch, or exhausted capacity.

**Independent Test**: Configure valid and invalid schedules, capacity boundaries, and branch assignments, then verify derived seats, capacity state, readiness findings, and complete rollback on failure.

**Acceptance Scenarios**:

1. **Given** optional schedule dates, **When** dates are supplied, **Then** registration end follows registration start, study starts no earlier than registration end, study end follows study start, and graduation is no earlier than study end.
2. **Given** current enrollment counts, **When** maximum capacity is viewed, **Then** current students, available seats, and capacity state are derived from the authoritative enrollment count.
3. **Given** current students greater than a proposed maximum, **When** an administrator lowers capacity, **Then** the change is refused without altering the batch.
4. **Given** active Organization branches, **When** registration and study roles are assigned, **Then** duplicate branch-role pairs are refused and historical inactive assignments remain readable but cannot be newly assigned.
5. **Given** a batch without an active registration branch, **When** readiness is checked, **Then** a precise branch finding prevents registration from opening.

---

### User Story 4 - Manage Batch Financial Defaults (Priority: P4)

An authorized administrator configures the program price, registration fee, installment plans, discounts, and scholarships for a batch independently from the parent product defaults.

**Why this priority**: Admissions and Finance need an exact, immutable commercial basis for every applicant selecting a batch.

**Independent Test**: Save a complete financial profile, revise it, and prove that each revision is exact, ordered, immutable, and independently selectable by future Admissions records.

**Acceptance Scenarios**:

1. **Given** product pricing defaults, **When** a new batch is prepared, **Then** the administrator can establish independent batch pricing without changing the parent product.
2. **Given** a valid financial profile, **When** any financial value, installment plan, discount, or scholarship changes, **Then** a new immutable financial revision is appended and becomes current.
3. **Given** a prior financial revision already referenced by an applicant or enrollment, **When** later batch pricing changes, **Then** the prior revision remains unchanged and resolvable.
4. **Given** installment plans, **When** they are saved, **Then** every plan contains at least one ordered positive installment tied to an available schedule milestone.
5. **Given** a percentage offer above 100 or an invalid offer date range, **When** it is submitted, **Then** the entire financial update is refused.

---

### User Story 5 - Control Registration and Academic Lifecycle (Priority: P5)

Authorized employees move a ready batch through registration, study, graduation, and archival states while preserving an append-only history and enforcing action-specific permissions.

**Why this priority**: The status determines whether Admissions may select the batch and whether academic operations may proceed.

**Independent Test**: Exercise every allowed and refused transition, including readiness-gated opening, controlled reopening, study start, graduation, and dependency-safe archival.

**Acceptance Scenarios**:

1. **Given** a complete draft batch, **When** an authorized employee opens registration, **Then** readiness is recomputed, the code becomes permanently locked, the status changes, the version increases, and a lifecycle entry is appended.
2. **Given** an incomplete draft, **When** registration opening is attempted, **Then** the transition is refused with all readiness findings and no state change.
3. **Given** registration is open, **When** an authorized employee closes it, **Then** new admissions stop and the transition is recorded.
4. **Given** registration was closed, **When** an employee with correction authority supplies a reason and reopens it, **Then** registration becomes open and the reason is preserved.
5. **Given** registration is closed, **When** study is started and later completed, **Then** the batch can progress to studying and then graduated but cannot follow an invalid transition.
6. **Given** active enrollment dependencies, **When** archival is attempted, **Then** archival is refused; otherwise archival is terminal and the batch remains historically readable.

---

### User Story 6 - Supply Admissions Eligibility and Stable Selection Data (Priority: P6)

Admissions checks whether a batch can accept an applicant through a chosen branch on a specified date and receives the exact batch version and current financial revision to pin to the application.

**Why this priority**: Eligibility and immutable selection data prevent invalid admissions and retroactive commercial changes.

**Independent Test**: Check eligible and ineligible batches across status, date, capacity, branch, and dependency conditions, then verify the returned batch version and financial revision remain stable selection references.

**Acceptance Scenarios**:

1. **Given** registration is open, the date is within the registration window, seats remain, and the branch is an active registration branch, **When** Admissions checks eligibility, **Then** the batch is eligible and returns its available seats, version, and current financial revision.
2. **Given** any failed condition, **When** eligibility is checked, **Then** the batch is ineligible with non-duplicated reasons identifying status, date, capacity, or branch failures.
3. **Given** a historical selection references a financial revision, **When** the batch is later edited, **Then** the referenced revision and selection snapshot remain unchanged.

### Edge Cases

- Empty strings supplied for optional schedule dates are treated as absent rather than invalid dates.
- Registration end equal to registration start is invalid; study start equal to registration end is valid; graduation equal to study end is valid.
- Available seats may be negative only as a derived historical over-capacity state; an administrator cannot create negative capacity or lower maximum capacity below current enrollment.
- Codes that differ only by case or surrounding whitespace are treated as the same code within one program; the same normalized code may be used by a different program.
- Duplicate branch-role assignments, installment positions, identifiers, or revision numbers are refused.
- A branch that becomes inactive remains visible on historical assignments but is not eligible for new registration.
- A financial profile may disable installments and contain no active plans; when installments are enabled, at least one valid active plan is required.
- Percentage discounts and scholarships cannot exceed 100; monetary offers cannot be negative.
- Concurrent updates or transitions using the same version permit at most one successful change.
- A retryable dependency outage returns an unavailable outcome without partially changing the batch.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized users to create, view, list, update, transition, and archive Program Batches without permanent deletion.
- **FR-002**: Every batch MUST belong to exactly one product that is currently identified as a Professional Program with fixed batch capability.
- **FR-003**: The system MUST refuse batch creation for Professional Diplomas, Training Courses, unknown products, and products outside the caller's authorized scope.
- **FR-004**: A batch MUST contain a localized Arabic name, optional English name, normalized code, academic year, intake, description, maximum students, schedule, financial profile, and branch assignments.
- **FR-005**: Batch codes MUST be normalized and unique within the parent program.
- **FR-006**: The batch code MUST become immutable after registration first opens, including after later closure, graduation, or archival.
- **FR-007**: All updates and lifecycle transitions MUST require the caller's expected version and MUST refuse stale writes without partial changes.
- **FR-008**: Batch list results MUST be scoped to one parent program and support search by localized name or code; singular academic year, intake, branch, and status filters; stable sorting by updated time, name, code, or status; and pagination.
- **FR-009**: Archived batches MUST be excluded by default and available when explicitly requested for historical reporting.
- **FR-010**: A batch requested beneath the wrong parent program MUST not be disclosed.
- **FR-011**: The system MUST validate schedule ordering across registration start, registration end, study start, study end, and graduation dates whenever the relevant dates are supplied.
- **FR-012**: The system MUST treat an empty optional schedule date as absent.
- **FR-013**: Maximum students MUST be a positive whole number.
- **FR-014**: Current students MUST be read from the authoritative enrollment count and MUST never be accepted from an administrative batch request.
- **FR-015**: Available seats MUST equal maximum students minus current students. Capacity state MUST be derived in this precedence order: over capacity when current students exceed maximum students; full when available seats equal zero; nearly full when available seats are greater than zero and less than or equal to 10% of maximum students; otherwise available. The 10% threshold is fixed domain behavior and MUST NOT be configurable.
- **FR-016**: The system MUST refuse lowering maximum students below the authoritative current-student count.
- **FR-017**: Branch assignments MUST support registration and study roles, prevent duplicate branch-role pairs, accept only currently assignable branches, and preserve historical inactive assignments for display.
- **FR-018**: Students MUST be eligible to register only through an active branch assigned the registration role.
- **FR-019**: Batch pricing MUST be independent from the parent product after the batch is created.
- **FR-020**: Program price and registration fee MUST use exact non-negative monetary values with their currency and precision preserved.
- **FR-021**: A financial profile MUST support enabling installments, multiple named installment plans, amount or percentage bases, covered-charge selection, ordered installments, schedule milestones, and active/inactive status.
- **FR-022**: Every installment plan MUST contain at least one installment; installment values MUST be positive and positions MUST be unique and contiguous within the plan.
- **FR-023**: Discounts and scholarships MUST support amount or percentage values, optional validity dates, and active/inactive status; percentage values MUST not exceed 100 and validity end MUST not precede validity start.
- **FR-024**: Every financial change MUST append a complete immutable financial revision, assign it a sequential revision number, record its source batch version and actor, and identify it as the current revision.
- **FR-025**: Previously created financial revisions MUST remain unchanged and resolvable after later batch changes.
- **FR-026**: Batch creation MUST establish draft status, version 1, an initial lifecycle event, and financial revision 1 as one complete operation.
- **FR-027**: The lifecycle MUST support draft, registration open, registration closed, studying, graduated, and archived statuses.
- **FR-028**: The lifecycle MUST permit only these forward actions: draft to registration open or archived; registration open to registration closed or archived; registration closed to registration open by correction, studying, or archived; studying to graduated or archived; graduated to archived; archived to no other status.
- **FR-029**: Reopening registration after closure and archival MUST require a non-empty reason.
- **FR-030**: Opening registration MUST recompute readiness and refuse the transition when any finding remains.
- **FR-031**: Registration readiness MUST require an eligible active parent program, valid academic year and intake, complete ordered schedule, positive capacity, valid current financial revision, and at least one active registration branch.
- **FR-032**: Each successful status transition MUST append an immutable lifecycle entry containing prior status, new status, reason when applicable, actor, time, and resulting version.
- **FR-033**: Archival MUST be refused while active enrollment dependencies exist and MUST remain terminal once completed.
- **FR-034**: Only registration-open batches MUST accept new Admissions selections.
- **FR-035**: Admissions eligibility MUST evaluate the batch status, a supplied evaluation date, registration date window, live available seats, and active registration-branch assignment.
- **FR-036**: Eligibility results MUST include all refusal reasons without disclosing unrelated batch or enrollment data, plus available seats, batch version, and current financial revision identifier.
- **FR-037**: The system MUST expose ordered lifecycle history and financial revision history for authorized consumers.
- **FR-038**: The system MUST provide bounded program-scoped editor choices for the parent program, academic years, intakes, branches, schedule milestones, default currency, and precision, while retaining disabled historical branch labels.
- **FR-039**: Every protected operation MUST enforce its documented batch permission, including separate permissions for view, create, update, capacity, pricing, branches, registration open/close/correction, study start, graduation, and archive.
- **FR-040**: Create, update, financial revision, and lifecycle operations MUST be atomic; a failure MUST leave the complete prior batch state unchanged.
- **FR-041**: Successful creation, aggregate update, capacity change, financial change, and status change MUST produce an audit-ready event after the operation succeeds.
- **FR-042**: The system MUST return consistent success, pagination, validation, conflict, forbidden, not-found, and temporarily unavailable outcomes without exposing internal storage or dependency details.
- **FR-043**: No export operation is included until an export control is approved, despite the reserved export permission.
- **FR-044**: No batch file upload, student enrollment mutation, payment, attendance, exam, or certificate behavior is included in this feature.

### Key Entities

- **Program Batch**: A versioned academic intake owned by one Professional Program. It carries identity, academic references, description, schedule, maximum capacity, status, code-lock state, and current financial revision.
- **Batch Schedule**: Optional registration, study, and graduation dates whose relative ordering determines operational readiness and eligibility.
- **Batch Capacity**: Maximum students plus derived current students, available seats, and capacity state. Enrollment operations own the current-student count.
- **Batch Branch Assignment**: A branch and its registration or study role, including whether the assignment remains active or is retained historically.
- **Financial Profile**: The batch's current program price, registration fee, installment configuration, plans, and offers.
- **Installment Plan**: A named active or inactive payment arrangement containing ordered installments tied to schedule milestones.
- **Batch Offer**: A discount or scholarship expressed as an amount or percentage with optional validity dates.
- **Financial Revision**: An immutable snapshot of a complete Financial Profile at a numbered point in the batch history; future Admissions records pin this identity.
- **Batch Lifecycle Event**: An immutable record of a status transition, actor, reason, time, and resulting batch version.
- **Admissions Eligibility Result**: A point-in-time decision containing eligibility reasons, live seats, batch version, and the financial revision offered to Admissions.

### API Contract Alignment *(mandatory when the feature exposes HTTP endpoints)*

- **Documented endpoints covered**:
  - `GET /api/v1/programs/:programId/batches`
  - `POST /api/v1/programs/:programId/batches`
  - `GET /api/v1/programs/:programId/batches/:batchId`
  - `PATCH /api/v1/programs/:programId/batches/:batchId`
  - `PATCH /api/v1/programs/:programId/batches/:batchId/status`
  - `GET /api/v1/programs/:programId/batches/:batchId/readiness`
  - `GET /api/v1/programs/:programId/batches/lookups`
  - `GET /api/v1/batches/:batchId/eligibility`
  - `GET /api/v1/batches/:batchId/lifecycle`
  - `GET /api/v1/batches/:batchId/financial-revisions`
- **Requirements document sections**: `docs/api-data-requirements.html` §3.1 shared responses/pagination, §3.3 permissions, §4.4 Program Batches, §9.2 monetary precision, and §9.3 localized naming/code-lock differences.
- **Contract gaps found**: None. This specification adopts the existing contract's nested program routes, singular list filters, immutable financial revisions, authoritative enrollment count, deterministic eligibility date, lifecycle actions, and reserved-but-unimplemented export permission.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized administrator can create a valid draft batch, including schedule, pricing, capacity, and branch configuration, in under five minutes without manual data correction.
- **SC-002**: 100% of attempts to create batches beneath Diplomas or Training Courses are refused before a batch becomes available to Admissions.
- **SC-003**: 100% of list searches and supported filters return only batches belonging to the requested parent program and the caller's allowed scope.
- **SC-004**: Capacity displays always reconcile exactly: available seats equal maximum students minus the authoritative current-student count for every batch.
- **SC-005**: 100% of invalid schedule sequences, negative or excessive financial values, duplicate branch roles, and capacity reductions below enrollment are refused without partial changes.
- **SC-006**: Every financial edit creates exactly one new immutable revision, and historical Admissions selections continue to resolve their original revision after later edits.
- **SC-007**: Every successful lifecycle action creates exactly one ordered history entry and increments the batch version exactly once; concurrent conflicting actions yield at most one success.
- **SC-008**: No batch opens registration while any readiness finding remains, and a complete batch can be opened in one action by an authorized employee.
- **SC-009**: Admissions eligibility decisions consistently identify every failing status, date, capacity, or branch condition and return the current selection references when eligible.
- **SC-010**: Archived batches remain retrievable for authorized historical reporting while accepting zero new Admissions selections.
- **SC-011**: At least 95% of authorized users can complete the primary create, find, update, and lifecycle tasks on their first attempt using the documented validation feedback.
- **SC-012**: Lists containing at least 10,000 batches remain usable, with 95% of searches, filters, and page changes visibly completing within two seconds under normal operating conditions.

## Assumptions

- Identity and Access Management supplies authenticated callers, branch scope, and the existing `batches.*` permission catalogue.
- Academic Catalog is the authority for product identity, active state, fixed batchability, product labels, and product pricing defaults; this feature does not duplicate those rules.
- Organization & Settings is the authority for academic years, configurable intake values, branches, default currency, and precision.
- Admissions will own enrollment/application records and expose an authoritative current-student count and active-dependency check through an approved public boundary; until Admissions exists, development substitutes must preserve the same contract and cannot become business truth.
- Batch financial defaults may initially be copied from the product to help the administrator, but the saved batch profile and all later revisions are independent.
- Schedule dates are interpreted as organization-local calendar dates rather than instants.
- Intake is an Organization-owned configurable lookup rather than a hardcoded seasonal enumeration.
- Historical records retain resolved identifiers and labels needed for reporting even when referenced master data later becomes inactive.
- Existing enrollments and applications own their financial snapshots; later batch changes never rewrite those consumer-owned records.
- The nearly-full threshold is a fixed percentage-based domain rule: a positive remaining-seat count at or below 10% of maximum capacity. Full and over-capacity states take precedence.
