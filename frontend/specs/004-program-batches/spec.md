# Feature Specification: Program Batches

**Feature Branch**: `[004-program-batches]`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Manage independent intakes for Professional Programs, including schedules, capacity, pricing, installment plans, branch availability, lifecycle, and readiness for future enrollment."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create and Maintain a Batch (Priority: P1)

An authorized administrator creates a batch for an existing Professional Program and maintains its identity, academic context, schedule, capacity, and branch availability as one independent intake.

**Why this priority**: A batch is the future enrollment unit. Without it, a program cannot open a distinct intake or preserve intake-specific operating details.

**Independent Test**: Create a Draft batch with a unique code, edit it, and verify its program, schedule, capacity, and branches remain intact without changing its parent program.

**Acceptance Scenarios**:

1. **Given** an active Professional Program and active organizational configuration, **When** an authorized user submits valid batch information, **Then** a Draft batch is created under exactly that program and success is confirmed.
2. **Given** an existing editable batch, **When** an authorized user changes allowed information, **Then** the update is retained while the parent program and sibling batches remain unchanged.
3. **Given** a duplicate code, a non-Professional Program, an inactive dependency, or incomplete required data, **When** creation is attempted, **Then** no batch is created and actionable errors identify every blocker.

---

### User Story 2 - Govern the Batch Lifecycle (Priority: P1)

An authorized operational manager moves a batch through controlled lifecycle states so admissions teams can determine whether enrollment is allowed.

**Why this priority**: Enrollment eligibility depends on batch state. Invalid transitions could admit students into unavailable intakes.

**Independent Test**: Move an activation-ready batch through Registration Open, Registration Closed, Studying, Graduated, and Archived; reject invalid transitions; and verify only Registration Open can accept enrollment.

**Acceptance Scenarios**:

1. **Given** a complete Draft batch with available capacity, **When** registration is opened, **Then** the status becomes Registration Open and eligible registration branches may use it for future enrollment.
2. **Given** any status other than Registration Open, **When** enrollment eligibility is evaluated, **Then** the batch is ineligible and remains available for authorized historical review.
3. **Given** a transition not permitted from the current state, **When** it is requested, **Then** no change occurs and valid next actions are explained.
4. **Given** a restrictive or corrective transition, **When** it is requested, **Then** confirmation and a reason are required and retained.

---

### User Story 3 - Configure Capacity and Branch Access (Priority: P2)

An authorized manager defines how many students a batch accepts and which branches may register students or deliver study.

**Why this priority**: Admissions and branch teams need reliable seat availability and explicit routing boundaries.

**Independent Test**: Set a positive maximum, assign different registration and study branches, verify available seats, and evaluate eligibility as capacity and assignments change.

**Acceptance Scenarios**:

1. **Given** maximum and current student counts, **When** the batch is reviewed, **Then** available seats equal maximum minus current students and never display below zero.
2. **Given** active branches, **When** registration and study assignments are saved, **Then** both sets remain distinct and only registration branches can originate future enrollments.
3. **Given** current students equal maximum capacity, **When** eligibility is evaluated, **Then** the batch is full and cannot accept another enrollment.

---

### User Story 4 - Configure Independent Finances (Priority: P2)

An authorized financial or executive manager defines batch-specific price, fees, installment plans, discounts, and scholarships.

**Why this priority**: Intakes may have different terms, and later changes must not rewrite historical enrollment terms.

**Independent Test**: Configure two batches of the same program with different valid financial terms and verify each remains independent and historical enrollment pricing is preserved after revisions.

**Acceptance Scenarios**:

1. **Given** an editable batch, **When** valid financial settings are saved, **Then** they apply only to that batch.
2. **Given** installments are enabled, **When** a plan is saved, **Then** it has ordered installments, valid due rules, and a reconciled total.
3. **Given** a negative, incomplete, or inconsistent financial value, **When** saving is attempted, **Then** the change is rejected with field-level guidance.
4. **Given** historical enrollment pricing exists, **When** batch terms are revised, **Then** previously captured terms remain unchanged and the revision is retained for audit review.

---

### User Story 5 - Find and Monitor Batches (Priority: P2)

Authorized users search, filter, sort, and page through batches to understand lifecycle, schedule, capacity, program, and branch availability.

**Why this priority**: Teams need a reliable operational view across many programs and intakes.

**Independent Test**: Populate batches across programs, years, intakes, branches, and statuses; combine filters and search; sort and paginate; and verify totals and capacity indicators.

**Acceptance Scenarios**:

1. **Given** a populated batch catalog, **When** search and program, academic year, intake, branch, and status filters are combined, **Then** only matching batches and an accurate total appear.
2. **Given** a branch-scoped manager, **When** the list opens, **Then** only batches associated with an authorized branch appear unless broader access is granted.
3. **Given** a batch near or at capacity, **When** list or detail information is reviewed, **Then** the capacity state is clear without relying on color alone.

### Edge Cases

- Concurrent users submit the same normalized code; only one succeeds and the other receives recoverable conflict feedback.
- The parent program changes after data entry; program-dependent information is not silently discarded and must be reviewed.
- A referenced program, year, intake, or branch becomes inactive; history remains readable, but the value cannot be newly assigned.
- Registration and study dates overlap, an interval has no duration, or graduation precedes study completion; saving is blocked with date-specific guidance.
- Graduation is unscheduled for an early-stage batch; it may remain unset until graduation readiness requires it.
- A proposed capacity falls below current enrollment; the reduction is rejected.
- A batch is full; it remains visible and retains status but becomes enrollment-ineligible.
- Installments are disabled while plans exist; removal requires deliberate confirmation.
- Installment totals have currency rounding differences; organization currency precision governs tolerance.
- Registration and study branches differ; enrollment eligibility uses registration branches only.
- A user tries to archive a Registration Open or Studying batch; archival is rejected until an allowed state is reached.
- Search is empty, data is unavailable, access is denied, or a conflict occurs; distinct empty, retryable error, forbidden, and conflict states appear.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Authorized users MUST be able to create, view, and edit batches that each belong to exactly one Professional Program.
- **FR-002**: Only active products classified as Professional Programs and eligible for batching MUST be selectable as parent programs.
- **FR-003**: A Professional Program MUST support unlimited batches without changing existing sibling batches.
- **FR-004**: Every batch MUST have a name, normalized organization-wide unique code including archived records, parent program, academic year, intake, and optional description.
- **FR-005**: A batch code MUST become immutable when registration first opens.
- **FR-006**: New batches MUST begin in Draft status.
- **FR-007**: Each batch MUST record registration start, registration end, study start, study end, and an optional graduation date.
- **FR-008**: A valid schedule MUST have registration start before registration end, registration end no later than study start, study start before study end, and graduation no earlier than study end.
- **FR-009**: Registration and study dates MUST be complete before registration opens; graduation date MUST exist before the batch becomes Graduated.
- **FR-010**: Every batch MUST define a positive maximum-student capacity.
- **FR-011**: Current students MUST be an enrollment-derived, read-only value within this module.
- **FR-012**: Available seats MUST equal the greater of zero and maximum students minus current students and MUST be recalculated when either source changes.
- **FR-013**: A maximum-capacity reduction below current students MUST be rejected.
- **FR-014**: Reaching capacity MUST NOT silently change lifecycle status; it makes the batch enrollment-ineligible.
- **FR-015**: Every batch MUST support independent non-negative program price and registration fee values in the configured organization currency.
- **FR-016**: Authorized users MUST be able to enable installments and maintain one or more named plans, or disable installments when no retained plan remains.
- **FR-017**: Each installment plan MUST contain ordered installments with positive amounts or percentages and due rules relative to defined batch milestones.
- **FR-018**: An active installment plan MUST reconcile to the amount or percentage it covers within configured currency precision.
- **FR-019**: Authorized users MUST be able to maintain batch discounts and scholarships with name, value, validity, status, and optional eligibility notes.
- **FR-020**: Financial settings for one batch MUST NOT alter its parent program or another batch.
- **FR-021**: Financial terms captured by future enrollments MUST remain immutable; later changes MUST retain attributable revision history without rewriting historical terms.
- **FR-022**: Each batch MUST support separate active registration-branch and study-branch sets.
- **FR-023**: At least one registration branch and one study branch MUST be assigned before registration opens.
- **FR-024**: Inactive or archived branches MUST remain visible historically but MUST NOT be newly assigned.
- **FR-025**: Lifecycle statuses MUST be Draft, Registration Open, Registration Closed, Studying, Graduated, and Archived.
- **FR-026**: Forward transitions MUST be Draft to Registration Open, Registration Open to Registration Closed, Registration Closed to Studying, Studying to Graduated, and Graduated to Archived.
- **FR-027**: Corrective transitions MAY allow Registration Open to Draft only with no students and Registration Closed to Registration Open only before study begins; both MUST require confirmation and a reason.
- **FR-028**: Archival MUST be allowed from Draft or Graduated, require confirmation and a reason, and preserve the complete record.
- **FR-029**: Only a Registration Open batch within its registration window, with seats, an active parent program, and the originating registration branch assigned MUST be eligible for new enrollment.
- **FR-030**: Draft, Registration Closed, Studying, Graduated, full, out-of-window, and Archived batches MUST be ineligible for enrollment while remaining historically available.
- **FR-031**: The system MUST NOT provide permanent batch deletion.
- **FR-032**: Lists MUST support combined search, sorting, pagination, and filters for program, academic year, intake, branch, and status.
- **FR-033**: Search MUST match normalized batch name, batch code, and parent program name.
- **FR-034**: List and detail views MUST show program, academic context, relevant dates, status, maximum students, current students, available seats, and capacity state.
- **FR-035**: Access MUST be permission-aware for view, create, update, open registration, close registration, start study, graduate, archive, manage capacity, manage pricing, manage branches, and export.
- **FR-036**: Branch managers MUST be limited to batches associated with authorized branches unless broader access is explicitly granted.
- **FR-037**: Listed roles MUST receive only explicitly assigned permissions; role names alone MUST NOT grant actions.
- **FR-038**: Every action MUST provide applicable pending, success, validation, conflict, dependency, permission-denied, and unexpected-failure feedback.
- **FR-039**: Every data surface MUST provide distinct loading, empty, error, retry, unavailable, and forbidden states.
- **FR-040**: Changes MUST retain creator, last updater, timestamps, lifecycle events and reasons, capacity changes, pricing revisions, and archive context for future audits.
- **FR-041**: Records MUST be organization-scoped and preserve future tenant isolation.
- **FR-042**: Stable batch identity, program, schedule, capacity, finances, branch eligibility, lifecycle, revision, and authorship context MUST be available to future Enrollment, Finance, Reporting, workflow, notification, and AI consumers.
- **FR-043**: This phase MUST operate without live Enrollment, Student, Payment, Attendance, Exam, Certificate, CRM, or AI integrations.
- **FR-044**: Primary workflows MUST be usable in Arabic RTL on desktop, laptop, and tablet without losing information or actions.
- **FR-045**: Primary workflows MUST support keyboard-only operation, logical focus, screen-reader names and announcements, semantic structure, and sufficient contrast.

### Constitution Requirements _(mandatory for UI features)_

- **Business Workflow**: Authorized administrators create batches under Professional Programs and configure schedule, capacity, finances, and branches before registration opens. Lifecycle and capacity determine enrollment eligibility. Restrictive actions require confirmation and reasons; history is preserved; permission and branch scope govern every action.
- **Module Boundary**: Program Batches owns batch identity, parent-program relationship, schedule, capacity configuration, financial configuration, branch availability, and lifecycle. It consumes Academic Catalog and Organization & Settings concepts and exposes eligibility context without owning enrollment, payments, attendance, exams, certificates, CRM, or AI behavior.
- **Dynamic Configuration**: Programs, academic years, intakes, branches, currency, currency precision, offer statuses, due milestones, roles, and permissions come from administration. Lifecycle behavior is a governed domain rule rather than page-specific data.
- **Arabic & RTL**: Arabic and RTL are defaults. Mixed-direction codes, dates, currency, and program names retain correct reading order, and content remains separable for future localization.
- **Responsive & Accessibility**: List, detail, form, finance, capacity, branch, and lifecycle workflows function on desktop, laptop, and tablet with keyboard navigation, focus recovery, semantic controls, accessible names, announced feedback, and sufficient contrast.
- **UI States**: Every surface defines loading, empty, error, retry, success, validation, conflict, dependency, forbidden, unavailable, and stale-data states without silent failure.
- **Reuse**: The module uses shared page, section, card, form, dropdown, date, currency, dialog, badge, feedback, action-bar, and data-table patterns; repeated batch patterns become reusable feature components.
- **Frontend Boundary**: Pages orchestrate screens only. Schedule, capacity, finance, eligibility, and lifecycle rules belong to the feature domain, and all temporary or future data access passes through replaceable services.
- **AI & Future Context**: Context includes batch and program identity, academic context, milestones, capacity, financial revisions, branch roles, eligibility, lifecycle history, authorship, and timestamps. Future authorization, tenant isolation, audits, approvals, workflows, notifications, reporting, and AI actions remain explicit enforcement boundaries.

### Key Entities

- **Program Batch**: One independent intake of one Professional Program with identity, academic context, schedule, capacity, branches, finances, and lifecycle.
- **Batch Schedule**: Registration, study, and graduation milestones governing readiness and eligibility windows.
- **Batch Capacity**: Maximum students, enrollment-derived current students, calculated available seats, and capacity state.
- **Batch Financial Profile**: Batch-specific program price, registration fee, currency, installment availability, and revision history.
- **Installment Plan**: A named, ordered payment structure with milestone-relative due rules.
- **Installment**: One amount or percentage and due rule within a plan.
- **Batch Offer**: A discount or scholarship with value, validity, status, and eligibility notes.
- **Batch Branch Assignment**: A branch relationship distinguished as registration authorization or study delivery.
- **Batch Lifecycle Event**: A transition with prior and resulting state, actor, time, reason, and eligibility context.
- **Batch Financial Revision**: An attributable terms snapshot that preserves previously captured enrollment pricing.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An authorized administrator can create a complete Draft batch within 8 minutes and open an activation-ready batch for registration within 2 additional minutes.
- **SC-002**: At least 95% of trained administrators complete creation, editing, and a valid lifecycle transition on their first attempt during acceptance testing.
- **SC-003**: Users can find a known batch within 30 seconds in a collection of at least 10,000 batches.
- **SC-004**: 100% of duplicate codes, non-Professional parent selections, invalid schedules, capacity reductions below occupancy, and invalid finances are prevented with actionable feedback.
- **SC-005**: 100% of eligibility evaluations approve only Registration Open batches within the registration window, with seats, an active parent, and an authorized registration branch.
- **SC-006**: Two batches of one program retain different schedules, capacities, prices, installment plans, offers, and branches without affecting each other.
- **SC-007**: 100% of historical financial terms associated with existing enrollment records remain unchanged after later revisions.
- **SC-008**: All primary workflows work by keyboard at desktop, laptop, and tablet sizes with no serious or critical accessibility violations.
- **SC-009**: At least 90% of administrators and admissions reviewers rate lifecycle, seat availability, and branch eligibility as clear in stakeholder acceptance review.
- **SC-010**: Every tested action visibly reports success or failure, and every data surface shows an appropriate loading, empty, error, unavailable, or forbidden state.

## Assumptions

- Academic Catalog supplies active products and identifies Professional Programs eligible for batches.
- Organization & Settings supplies academic years, configurable intakes, branches, currency, precision, users, roles, and permission context.
- Intake is administrator-configured rather than hardcoded.
- Current students is read-only and initially zero or supplied through a temporary enrollment boundary until Enrollment exists.
- Drafts may be incomplete; opening registration performs the complete readiness check.
- Registration end may equal study start, but registration and study intervals must each have positive duration.
- Graduation date is optional until graduation readiness.
- A full batch retains Registration Open status for reporting but cannot accept another enrollment.
- Taxes, collection, refunds, accounting, and final enrollment-charge calculation are out of scope.
- Installment due rules refer to configurable milestones; collection and payment execution remain out of scope.
- Discount and scholarship application, approval, stacking, allocation, and student eligibility belong to future Enrollment or Finance work.
- Future Enrollment captures the applicable financial snapshot; this module maintains revisions needed to protect it.
- Permanent deletion is unavailable, and this phase uses temporary data through the replaceable data boundary.
