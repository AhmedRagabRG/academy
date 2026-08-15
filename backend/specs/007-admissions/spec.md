# Feature Specification: Admissions

**Feature Branch**: `[007-admissions]`

**Created**: 2026-08-02

**Status**: Ready for planning

**Input**: User description: "Manage the complete admission lifecycle from applicant registration through approval and enrollment preparation, including academic selection, financial snapshots, documents, assignments, notes, and timeline."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Complete Admission Draft (Priority: P1)

An authorized employee records an applicant, checks for possible duplicates, assigns the responsible staff and branches, selects an eligible academic offering, and creates a draft admission with pricing and document requirements fixed at that moment.

**Why this priority**: Every review, document, and enrollment-preparation flow depends on an accurate admission record.

**Independent Test**: Create admissions for each product type and verify identity rules, duplicate handling, assignments, selection eligibility, initial financial snapshot, document requirements, reference allocation, and initial timeline event.

**Acceptance Scenarios**:

1. **Given** valid applicant, assignment, and active offering details, **When** an authorized employee creates an admission, **Then** one draft admission is created with a unique reference, version 1, copied financial values, a document-requirement snapshot, and a creation timeline event.
2. **Given** a Professional Program, **When** no registration-open eligible batch is selected, **Then** creation is refused; **Given** a Diploma or Course, **When** a batch is supplied, **Then** creation is refused.
3. **Given** matching national identity or phone details, **When** duplicate checking identifies possible applicants, **Then** the employee must explicitly reuse a record or confirm creation before proceeding.
4. **Given** invalid applicant identity, branch, employee, product, batch, or qualification data, **When** creation is attempted, **Then** no admission or partial snapshot is created and field-specific findings are returned.

---

### User Story 2 - Find, Review, and Maintain Admissions (Priority: P2)

Authorized employees search, filter, sort, and page through admissions within their branch scope, open a complete record, and maintain editable draft information without exposing sensitive applicant data in list views.

**Why this priority**: Admissions teams need a safe operational work queue and accurate record details.

**Independent Test**: Seed admissions across statuses and scopes, exercise every documented query, inspect list redaction and full details, update a draft with current and stale versions, archive a permitted record, and export authorized results.

**Acceptance Scenarios**:

1. **Given** admissions across products, batches, branches, statuses, employees, academic years, and dates, **When** supported search or filters are applied, **Then** only matching in-scope records are returned in stable paginated order.
2. **Given** a list result, **When** it is displayed, **Then** phone numbers are masked and national identity, address, documents, and financial details are omitted.
3. **Given** a draft admission and its current version, **When** editable applicant or assignment data changes, **Then** the update is applied atomically and the timeline records the material change.
4. **Given** a submitted or later admission, **When** direct draft editing is attempted, **Then** it is refused and the appropriate controlled revision action is required.
5. **Given** a stale version or out-of-scope admission, **When** an update or detail request is made, **Then** the write is refused or the record is not disclosed.

---

### User Story 3 - Revise Selection and Financial Preparation (Priority: P3)

An authorized employee changes an admission's offering selection when permitted, confirms the consequences, and adjusts discounts while preserving every prior academic and financial revision.

**Why this priority**: Applicants need correct product, batch, branch, and tuition commitments without retroactive pricing changes.

**Independent Test**: Change selection across eligible offerings, verify recalculated snapshots and policies, update discounts, and prove all prior revisions remain immutable and ordered.

**Acceptance Scenarios**:

1. **Given** a permitted selection change, **When** the employee confirms its eligibility, document-policy, and financial consequences, **Then** new selection and financial revisions are appended and earlier revisions remain unchanged.
2. **Given** current product or batch pricing, **When** an admission is created or its selection changes, **Then** product price and registration fees are copied with source revision identifiers and later catalog changes do not alter them.
3. **Given** an authorized financial adjustment, **When** a valid discount is supplied, **Then** final tuition is recalculated exactly and a complete financial revision is appended.
4. **Given** a negative amount, discount above permitted bounds, stale version, or unauthorized employee, **When** a financial update is attempted, **Then** no revision is created.

---

### User Story 4 - Collect and Verify Required Documents (Priority: P4)

Authorized staff collect files against the admission's requirement snapshot, replace or withdraw files without destroying history, and verify or reject document versions.

**Why this priority**: Submission and approval readiness depend on complete, reviewable evidence.

**Independent Test**: Upload each supported format, reject invalid files, replace and withdraw versions, verify decisions, refresh policy after selection change, and confirm readiness reflects the current versions.

**Acceptance Scenarios**:

1. **Given** a required document slot, **When** a valid PDF, JPG, JPEG, or PNG within its size limit is uploaded, **Then** a new current version is stored with metadata and a timeline event.
2. **Given** an existing document, **When** it is replaced or withdrawn, **Then** history remains available and at most one version is current.
3. **Given** a document awaiting review, **When** an authorized verifier accepts or rejects it with any required reason, **Then** the immutable decision is recorded with actor and date.
4. **Given** a changed academic selection, **When** document policy is refreshed, **Then** still-satisfied requirements retain their versions and new or removed requirements are reconciled without deleting history.

---

### User Story 5 - Review and Decide an Admission (Priority: P5)

Authorized employees submit ready drafts, place submitted admissions under review, approve or reject them, return incomplete records for correction, and archive records according to the controlled lifecycle.

**Why this priority**: Controlled decisions protect enrollment quality and prevent unauthorized or incomplete approvals.

**Independent Test**: Exercise every allowed and forbidden transition, readiness condition, reviewer lock, permission, reason requirement, bulk partial result, and immutable lifecycle entry.

**Acceptance Scenarios**:

1. **Given** a draft with all submit findings resolved, **When** an authorized employee submits it, **Then** status changes to submitted and an immutable lifecycle event is appended.
2. **Given** a submitted admission, **When** an authorized reviewer starts review, **Then** it becomes under review and conflicting simultaneous review ownership is refused.
3. **Given** an eligible, complete admission under review, **When** an authorized reviewer approves it, **Then** an immutable approval snapshot is created; otherwise all blocking readiness findings are returned.
4. **Given** an admission under review, **When** it is rejected or returned, **Then** a reason is required and recorded.
5. **Given** multiple authorized records, **When** a bulk status action is requested, **Then** each item reports success or its own failure without rolling back successful independent items.
6. **Given** an admission that must be cancelled, **When** an authorized employee supplies an archive reason, **Then** the admission is archived, remains available for historical reporting and auditing, and no separate cancelled status is introduced.

---

### User Story 6 - Prepare an Approved Admission for Enrollment (Priority: P6)

An authorized employee checks an approved admission's enrollment readiness and provides a stable, idempotent handoff snapshot for the future Student Management intake process.

**Why this priority**: Only verified admissions should create students, and retries must never create duplicates.

**Independent Test**: Check readiness for incomplete, unapproved, and complete approved records, then retry the same handoff and verify one stable intake identity and no direct student creation inside Admissions.

**Acceptance Scenarios**:

1. **Given** an approved admission with complete identity, selection, financial, assignment, and document data, **When** enrollment readiness is checked, **Then** it is ready and exposes the immutable approval snapshot required by Student Management.
2. **Given** any outstanding finding or a non-approved status, **When** readiness is checked, **Then** enrollment is blocked with all actionable findings.
3. **Given** a successful future Student Management intake, **When** the admission is marked enrolled, **Then** the transition occurs once and repeated handoff attempts resolve the same outcome rather than creating another student.

### Edge Cases

- An applicant younger than the configured minor threshold requires a guardian phone; the same applicant aging past the threshold does not rewrite historical snapshots.
- A national identity may be absent only when an accepted alternative identity reason is recorded; normalized Arabic and Western digits are compared consistently.
- Graduation year cannot be in the future or precede the configured minimum graduation age.
- An offering that becomes inactive, a batch that closes, loses seats, or leaves its registration window, or a branch that becomes ineligible must fail re-evaluation at submission and approval even if it was eligible at draft creation.
- Concurrent writes using the same expected version permit at most one success.
- Repeated create and upload requests with the same idempotency key do not create duplicate admissions or document versions.
- A failed upload leaves no current usable version; a retry can safely complete it.
- Archived applicants and admissions remain historically readable to authorized users but cannot enter new workflows.
- Money uses exact decimal values; percentage and amount discounts cannot produce negative final tuition.
- Timeline, selection revisions, financial revisions, document versions, and review decisions are append-only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized employees to create, view, list, update, export, transition, and archive admissions without permanent deletion.
- **FR-002**: Every admission MUST reference exactly one applicant and one academic product, have a unique organization-scoped reference, version, status, creator, creation date, and current immutable snapshots.
- **FR-003**: Applicant identity MUST support full name, primary and guardian phones, national identity or an alternative identity reason, date of birth, address, qualification, graduation year, optional profile image, and internal notes.
- **FR-004**: Identity validation MUST apply the same published configurable rules for phone format, national identity format, minor age, and minimum graduation age.
- **FR-005**: The system MUST check possible duplicates before creation using normalized national identity and phone data and require an explicit resolution.
- **FR-006**: Every draft admission MUST provide a registration branch, study branch, admissions employee, customer-service employee, customer-service manager, department, and lead source at creation; academic grade remains optional.
- **FR-007**: A Professional Program selection MUST include exactly one eligible registration-open batch; a Professional Diploma or Training Course selection MUST NOT include a batch.
- **FR-008**: Selection MUST accept only active offerings, eligible branches, and a batch with an open registration window, available capacity, and matching branch availability.
- **FR-009**: Admission creation and every selection change MUST copy the applicable product or batch pricing and source revision into a new immutable financial snapshot.
- **FR-010**: Financial preparation MUST preserve exact product price, registration fees, discount, required amount, currency, precision, source, actor, and time.
- **FR-011**: File-opening fees from the requested scope MUST be treated as part of registration fees unless the shared financial contract is amended to expose a separate charge.
- **FR-012**: Financial changes MUST never rewrite earlier revisions or consumer-owned enrollment pricing.
- **FR-013**: The system MUST snapshot required-document policy on creation and reconcile it explicitly after an academic selection change.
- **FR-014**: Documents MUST support PDF, JPG, JPEG, and PNG; per-requirement size/type validation; idempotent upload; replacement; withdrawal; version history; verification; rejection; and current-version selection.
- **FR-015**: Document versions and verification decisions MUST be immutable and retain file metadata, actor, date, and reason where required.
- **FR-016**: Submit and approve readiness MUST return all unresolved applicant, assignment, eligibility, financial, and document findings.
- **FR-017**: The lifecycle MUST support draft, submitted, under review, approved, rejected, enrolled, and archived. It MUST NOT introduce a separate cancelled status; cancelling an admission means archiving it with a required reason.
- **FR-018**: Only valid documented transitions MUST succeed; rejection, return for correction, and archive actions MUST capture required reasons.
- **FR-019**: Only approved, enrollment-ready admissions may become enrolled, and Admissions MUST NOT directly create or modify a Student record.
- **FR-020**: Approval MUST create an immutable snapshot suitable for an idempotent future Student Management handoff.
- **FR-021**: Each material creation, applicant change, selection change, assignment change, financial change, document action, decision, status change, and enrollment outcome MUST append a chronological immutable timeline event.
- **FR-022**: Admissions MUST maintain one private internal notes field. Material changes to that field MUST appear in the immutable timeline; a structured append-only notes collection and note-management operations are out of scope.
- **FR-023**: Lists MUST support documented search, filtering, sorting, and pagination while enforcing organization and branch scope.
- **FR-024**: List results MUST mask phone numbers and omit national identity, address, document, and financial details; full sensitive details require detail-level permission.
- **FR-025**: Search MUST cover applicant name, admission reference, offering code, and batch code with consistent Arabic text and digit normalization.
- **FR-026**: Filters MUST cover product, batch, branch, status, assigned employees and manager, academic year through selection, and registration/creation date where supported by the shared contract.
- **FR-027**: Export MUST apply the caller's current filters, scope, permission, and sensitive-data rules.
- **FR-028**: All updates, status actions, selection changes, financial changes, and document actions MUST require expected-version conflict protection and MUST be atomic per record.
- **FR-029**: Bulk status changes MUST return an item-level outcome for every requested admission and MUST not conceal partial success.
- **FR-030**: The system MUST expose bounded, status-aware lookup choices for branches, staff, managers, departments, lead sources, grades, qualifications, offerings, batches, currency, precision, and current document policy.
- **FR-031**: Disabled lookup choices MUST remain identifiable for historical display and MUST explain why they cannot be newly selected.
- **FR-032**: Every protected action MUST enforce the documented `admissions.*` permission and the caller's branch scope, including separate access to financials, documents, verification, assignments, decisions, and enrollment readiness.
- **FR-033**: Expected validation, conflict, permission, not-found, dependency, upload, and unavailable failures MUST be distinguishable without exposing internal storage details.
- **FR-034**: Successful operations MUST produce audit-ready event data after persistence succeeds.
- **FR-035**: Student profile management, student payments, accounting, CRM, and AI behavior MUST remain outside this feature.

### Key Entities

- **Applicant**: Reusable, versioned personal identity and qualification record that may be active or archived.
- **Admission**: The versioned aggregate connecting an applicant to one academic selection, assignments, current snapshots, lifecycle, and audit metadata.
- **Admission Assignment**: Registration/study branches and responsible employees, manager, department, lead source, and optional academic grade.
- **Academic Selection Revision**: Immutable product, optional batch, branches, eligibility outcome, actor, time, and source versions.
- **Financial Preparation Revision**: Immutable exact-money snapshot derived from a product or batch and adjusted by an authorized discount.
- **Document Requirement Snapshot**: The policy and requirement versions applicable to an admission at a point in its lifecycle.
- **Admission Document / Version**: A requirement-bound document with append-only file versions, current state, metadata, and verification decisions.
- **Approval Snapshot**: Immutable enrollment handoff data created when an admission is approved.
- **Lifecycle Event**: Append-only status transition with actor, reason, time, and source/result versions.
- **Timeline Event**: Chronological, immutable record of material admission activity.
- **Internal Note**: Private admission commentary whose final representation depends on clarification FR-022.

### API Contract Alignment *(mandatory when the feature exposes HTTP endpoints)*

- **Documented endpoint groups covered**: admission list/detail/create/update/export/duplicates; status and bulk status; selection and financial revisions; applicant archival; submit/approve readiness, lifecycle, financial history, and enrollment readiness; document list/upload/replace/withdraw/verify/version history/policy refresh; consolidated admissions lookups.
- **Requirements document sections**: `docs/api-data-requirements.html` §3 shared contracts and §4.5 Admissions.
- **Contract gaps resolved**: Cancellation maps to reason-required archival with no cancelled status; all seven documented assignment fields are mandatory at draft creation; and Admissions uses the canonical single private notes field with material changes recorded in the timeline. File-opening fees are folded into registration fees because no separate canonical field exists.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized employee can create a valid draft admission, including applicant, assignment, selection, pricing, and document requirements, in under seven minutes.
- **SC-002**: 100% of Professional Program admissions without an eligible batch and 100% of Diploma/Course admissions containing a batch are refused without partial records.
- **SC-003**: 100% of saved admissions retain their original selection and financial revisions after later catalog or batch pricing changes.
- **SC-004**: 100% of submit and approve attempts with unresolved readiness findings are blocked and return all actionable findings in one response.
- **SC-005**: Every successful status, financial, selection, assignment, and document operation creates exactly one corresponding immutable history or timeline entry.
- **SC-006**: Repeated idempotent admission and document requests create no duplicate aggregate or file version.
- **SC-007**: List and export results disclose no data outside the caller's branch scope, and list views expose no full phone, national identity, address, document, or financial data.
- **SC-008**: 100% of approved enrollment handoffs contain a stable approval snapshot and repeated handoff attempts produce at most one Student intake outcome.
- **SC-009**: At least 95% of authorized users can complete the primary create, find, document, review, and approval tasks on their first attempt using the returned guidance.
- **SC-010**: With at least 10,000 admissions, 95% of searches, filters, and page changes visibly complete within two seconds under normal operating conditions.
- **SC-011**: Archived admissions remain retrievable for authorized historical reporting while accepting no further workflow mutations.

## Assumptions

- Identity & Access Management supplies authenticated actors, employee and manager identities, permissions, organization membership, and branch scope.
- Academic Catalog supplies product identity, product type, active status, pricing revision, and document-policy reference.
- Program Batches supplies eligibility, available seats, registration/study branches, academic year, registration window, and financial revision.
- Organization & Settings supplies branches, departments, qualifications, grades, lead sources, currency, precision, and configurable identity rules.
- Student Management will consume the immutable approval snapshot through an idempotent intake boundary; Admissions only reports readiness and records the outcome.
- Student Finance and payments are not created here; Admissions only prepares and pins tuition values.
- Local file storage is the initial document store, while the business contract depends on stable file metadata rather than storage paths.
- Admission references are allocated by the service and are unique within the organization.
- Dates are evaluated using the organization's configured time zone and calendar date rules.
- Archived applicant records may be reused only through an explicit authorized restoration or duplicate-resolution workflow.
- Cancelling an admission is a user-facing archival action, requires an archive reason, and never permanently deletes the record.
- A structured append-only notes collection is deferred; the single private notes field is protected by admission detail/update permissions and timeline recording.
