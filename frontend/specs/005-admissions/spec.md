# Feature Specification: Admissions

**Feature Branch**: `[005-admissions]`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Manage applicants from registration through admission approval, including personal and academic information, product and batch selection, document verification, financial preparation, and enrollment readiness."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register and Maintain an Applicant (Priority: P1)

An authorized employee registers a person as an applicant, captures their personal and educational information, assigns the operational owners and branches, and saves the admission as a draft that can be resumed later.

**Why this priority**: Every later review, document, financial, and enrollment activity depends on an accurate applicant and admission record.

**Independent Test**: Register an applicant with valid required information, save the draft, reopen it, edit permitted fields, and verify that the applicant remains distinct from a student.

**Acceptance Scenarios**:

1. **Given** an authorized employee and valid required applicant information, **When** the employee registers the applicant, **Then** one applicant and one linked draft admission are created with a stable reference.
2. **Given** a saved draft, **When** an authorized employee updates personal, educational, assignment, or notes information, **Then** the latest valid values are retained and a success outcome is shown.
3. **Given** invalid phone, national identifier, birth date, or graduation-year information, **When** the employee attempts to save, **Then** the record is not changed and each invalid field receives specific guidance.
4. **Given** an applicant record, **When** an employee archives it with a reason, **Then** it remains available for historical lookup and cannot be permanently deleted.

---

### User Story 2 - Select an Eligible Academic Offering (Priority: P1)

An admissions employee selects the applicant's academic offering. A Professional Program requires an eligible batch, while a Professional Diploma or Training Course is selected without a batch.

**Why this priority**: The academic selection determines eligibility, delivery branches, document requirements, finances, and the future enrollment target.

**Independent Test**: Select each supported offering type and verify that batch requirements and eligibility are enforced correctly without completing documents or approval.

**Acceptance Scenarios**:

1. **Given** a Professional Program, **When** the employee selects it, **Then** an eligible active batch is required before the admission can be submitted.
2. **Given** a Professional Diploma or Training Course, **When** the employee selects it, **Then** no batch is requested or stored.
3. **Given** a batch that is closed, full, outside its registration window, inactive at the registration branch, or linked to another program, **When** selection is attempted, **Then** the selection is rejected with the applicable reason.
4. **Given** a changed academic offering, **When** the employee confirms the change, **Then** dependent branch, document, eligibility, and financial readiness are recalculated without silently preserving incompatible values.

---

### User Story 3 - Collect and Verify Required Documents (Priority: P1)

An admissions employee collects the configured documents for the selected offering, while an authorized reviewer records verification outcomes for each document.

**Why this priority**: Complete and verified evidence is a mandatory approval safeguard.

**Independent Test**: Upload valid and invalid files, replace a pending document, verify or reject documents, and confirm that approval remains blocked until every required document is accepted.

**Acceptance Scenarios**:

1. **Given** the selected offering's document requirements, **When** the employee opens the admission, **Then** required, optional, missing, uploaded, verified, and rejected documents are clearly distinguished.
2. **Given** an accepted PDF, JPG, JPEG, or PNG within the configured size limit, **When** it is uploaded, **Then** it is attached with its type, filename, upload time, and uploader.
3. **Given** an unsupported, oversized, empty, or unreadable file, **When** upload is attempted, **Then** it is rejected without replacing an existing valid document.
4. **Given** an uploaded document, **When** an authorized reviewer verifies or rejects it, **Then** the decision, reviewer, time, and rejection reason where applicable are retained.
5. **Given** one or more missing, pending, or rejected required documents, **When** approval is attempted, **Then** approval is blocked and the unresolved requirements are listed.

---

### User Story 4 - Prepare Financial Information (Priority: P2)

An authorized employee reviews the offering or batch price, records a permitted discount, and sees the registration fees and required amount that will be handed to Finance later.

**Why this priority**: Admissions must prepare consistent commercial terms without collecting money or replacing Finance responsibilities.

**Independent Test**: Load the authoritative offering terms, apply valid percentage and amount discounts, reject invalid values, and verify the derived required amount.

**Acceptance Scenarios**:

1. **Given** an eligible academic selection, **When** financial information is prepared, **Then** the authoritative product or batch price, registration fees, currency, discounts, and required amount are displayed.
2. **Given** a permitted discount percentage or amount, **When** it is applied, **Then** the required amount is recalculated consistently and never becomes negative.
3. **Given** conflicting discount percentage and amount values, **When** one is changed, **Then** the corresponding value is derived from the authoritative price rather than independently edited.
4. **Given** a price or fee change after an admission has been approved, **When** the record is viewed, **Then** its approved financial snapshot remains unchanged for historical and enrollment use.

---

### User Story 5 - Review, Decide, and Prepare Enrollment (Priority: P1)

Authorized staff submit complete drafts, review admissions, approve or reject them, and prepare approved records for a future enrollment process without directly creating students in this phase.

**Why this priority**: The controlled decision is the business outcome of Admissions and the boundary that protects Student Management.

**Independent Test**: Move complete and incomplete records through the allowed lifecycle, verify reasons and permissions, and confirm that only approved records expose an enrollment-ready snapshot.

**Acceptance Scenarios**:

1. **Given** a complete draft, **When** an authorized employee submits it, **Then** it becomes Submitted and is locked against incompatible changes until returned or reviewed.
2. **Given** a Submitted admission, **When** an authorized reviewer starts review, **Then** it becomes Under Review and records the reviewer and time.
3. **Given** an eligible offering, complete verified documents, valid assignments, and valid financial preparation, **When** an authorized reviewer approves, **Then** the admission becomes Approved and receives an immutable approval snapshot.
4. **Given** an admission under review, **When** an authorized reviewer rejects it with a reason, **Then** it becomes Rejected and the reason is visible to permitted employees.
5. **Given** an Approved admission, **When** a future enrollment process confirms enrollment, **Then** its status may become Enrolled while the original admission remains historically available.
6. **Given** any admission that is not Approved, **When** enrollment readiness is requested, **Then** it is denied with explicit reason codes and no student is created.

---

### User Story 6 - Find and Govern Admissions (Priority: P2)

Authorized employees locate admissions using search, filters, sorting, and pagination while seeing only records allowed by their organization, branch, and role scope.

**Why this priority**: Operational teams need reliable queues and workload ownership once admission volume grows.

**Independent Test**: Search and combine every supported filter across a large record set, verify stable pages, and compare results under organization-wide and branch-scoped employee contexts.

**Acceptance Scenarios**:

1. **Given** admission records, **When** the employee searches by applicant name, phone, national identifier, admission reference, product, or batch code, **Then** matching permitted records are returned.
2. **Given** branch, product, batch, status, assigned admissions employee, customer service employee, or customer service manager filters, **When** filters are combined, **Then** results satisfy every selected condition.
3. **Given** a branch-scoped employee, **When** list, detail, export, or update access is attempted, **Then** only records intersecting the employee's authorized branches are accessible.
4. **Given** a changed filter or search, **When** the current page is no longer valid, **Then** pagination resets or clamps to a valid page without losing the filter state.

### Edge Cases

- A possible duplicate is found by normalized national identifier, primary phone, or applicant identity during registration.
- An applicant lacks a national identifier; the reason and alternative configured identity evidence are required instead of inventing an identifier.
- The applicant is a minor and parent contact or guardian evidence is missing.
- Graduation year conflicts with date of birth or lies in the future.
- An assigned employee, branch, department, lead source, product, batch, or document requirement becomes inactive after the draft is saved.
- A batch becomes full, closes registration, or changes branch availability between selection, submission, review, and approval.
- Two employees update or decide the same admission concurrently.
- A document is replaced after verification, which invalidates the previous verification decision.
- A required document type changes after submission or approval.
- A zero-price offering, full discount, fractional currency, or discount greater than price is entered.
- An approved admission is archived before enrollment, or an enrolled admission is requested for archival.
- Search input contains Arabic variants, English text, punctuation, spaces, or mixed-direction identifiers.
- File upload is interrupted and later retried without creating duplicate attachments.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized employees to register, view, edit, and archive applicants; permanent deletion MUST NOT be available.
- **FR-002**: Registration MUST create an applicant identity and a separately identifiable admission record so an applicant is never treated as a student.
- **FR-003**: Each applicant MUST support full name, primary phone, parent or guardian phone when applicable, national identifier or configured alternative, address, birth date, qualification, graduation year, notes, and profile image.
- **FR-004**: Applicant validation MUST enforce configured national identifier and phone formats, plausible birth and graduation dates, and required guardian information based on applicant age or policy.
- **FR-005**: The system MUST warn authorized employees of potential duplicates using normalized identifiers and contact information before creating another applicant.
- **FR-006**: Each admission MUST retain registration branch, study branch, assigned admissions employee, customer service employee, customer service manager, lead source, department, and academic grade where required by configuration.
- **FR-007**: Branches, departments, lead sources, academic grades, employees, document types, statuses, and assignment options MUST come from configurable organizational data rather than fixed lists.
- **FR-008**: Assignment choices MUST be limited to active, eligible records within the current organization and the acting employee's authorized scope.
- **FR-009**: An admission MUST select exactly one supported academic offering: Professional Program, Professional Diploma, or Training Course.
- **FR-010**: A Professional Program selection MUST reference exactly one eligible batch belonging to that program; Diploma and Course selections MUST NOT reference a batch.
- **FR-011**: Batch eligibility MUST consider lifecycle status, registration dates, available seats, active parent offering, and authorized registration branch.
- **FR-012**: The system MUST revalidate academic eligibility at submission and approval, not only when the offering is initially selected.
- **FR-013**: Changing an academic offering or batch MUST identify and clear or recalculate incompatible branches, requirements, eligibility, and financial values only after employee confirmation.
- **FR-014**: Each admission MUST present document requirements applicable to its offering, applicant characteristics, and configured admission policy.
- **FR-015**: Authorized employees MUST be able to upload, preview, download, replace, and remove unfinalized documents in PDF, JPG, JPEG, or PNG format within configurable size limits.
- **FR-016**: Every document MUST retain its requirement type, original filename, media type, size, uploader, upload time, current verification state, and current version.
- **FR-017**: Authorized reviewers MUST be able to mark uploaded documents Verified or Rejected; rejection MUST require a reason.
- **FR-018**: Replacing a verified or rejected document MUST create a new version and reset its verification state without erasing the previous decision history.
- **FR-019**: Approval MUST be blocked while any required document is missing, pending verification, or rejected.
- **FR-020**: Financial preparation MUST retain authoritative product or batch price, registration fees, currency, discount percentage, discount amount, and derived required amount.
- **FR-021**: The system MUST derive discount amount from percentage, or percentage from amount, using one authoritative price and the configured currency precision.
- **FR-022**: Financial validation MUST reject negative values, discounts greater than the applicable price, incompatible currency, and inconsistent derived totals.
- **FR-023**: Approved admissions MUST retain an immutable snapshot of academic selection, branch assignments, verified requirements, and financial preparation for future enrollment and historical review.
- **FR-024**: The supported lifecycle MUST be Draft, Submitted, Under Review, Approved, Rejected, Enrolled, and Archived.
- **FR-025**: Lifecycle transitions MUST follow an explicit transition policy, require the exact action permission, and retain actor, time, prior status, resulting status, and reason where applicable.
- **FR-026**: Draft submission MUST require valid applicant information, operational assignments, academic selection, and financial preparation; document completeness MAY remain pending until approval unless configured policy requires it earlier.
- **FR-027**: Approval MUST require an admission under review, current academic eligibility, all required documents verified, valid assignments, and valid financial preparation.
- **FR-028**: Rejection MUST require a reason and MUST NOT delete the applicant, documents, decisions, or financial history.
- **FR-029**: Only Approved admissions MUST expose an enrollment-ready decision; this phase MUST NOT create students, enrollments, payments, or financial transactions.
- **FR-030**: Enrolled and Archived admissions MUST remain readable for permitted historical, audit, and future reporting use.
- **FR-031**: The system MUST support search across applicant identity, contact values, admission reference, product, and batch identifiers.
- **FR-032**: Admission lists MUST support combined branch, product, batch, status, assigned admissions employee, customer service employee, and customer service manager filters plus sorting and pagination.
- **FR-033**: Search, filtering, sorting, pagination, row selection, and applicable bulk actions MUST preserve organization, branch, and permission scope.
- **FR-034**: Bulk actions MUST evaluate every selected record independently, prevent unsafe lifecycle shortcuts, and report successful and unsuccessful outcomes without hiding partial failures.
- **FR-035**: Direct record access and every create, edit, document, finance, review, approval, rejection, archive, enrollment-readiness, and export action MUST be independently permission-aware.
- **FR-036**: Concurrent updates MUST detect stale records and require refresh or deliberate reconciliation rather than silently overwriting another employee's work.
- **FR-037**: Every user-triggered operation MUST expose progress, success, and actionable failure feedback; lists and records MUST define loading, empty, unavailable, forbidden, and retryable error states.
- **FR-038**: The system MUST preserve unsaved user input after recoverable validation or service failures.
- **FR-039**: Admissions MUST retain created and updated actor/time context and immutable lifecycle, document-verification, academic-selection, and approval decision history for future audit logging.
- **FR-040**: The module MUST expose a stable enrollment-readiness summary containing admission identity, approved snapshot identity, applicant identity, academic target, batch where applicable, branches, financial snapshot, and denial reasons without exposing unrestricted personal documents.

### Constitution Requirements *(mandatory for UI features)*

- **Business Workflow**: Registration, eligibility checks, document verification, financial preparation, submission, review, approval or rejection, and enrollment readiness remain distinct authorized steps. Applicants never become students inside Admissions, and permanent deletion is prohibited.
- **Module Boundary**: Admissions owns applicant/admission behavior and its route area. It consumes public Organization, Academic Catalog, and Program Batch concepts and exposes only enrollment-readiness and future Finance context through stable business contracts; it does not import other modules' internal behavior.
- **Dynamic Configuration**: Branches, departments, lead sources, grades, employees, academic offerings, batches, document requirements, size limits, statuses, and policy rules are configurable business data. Seeded examples do not become fixed application rules.
- **Arabic & RTL**: Arabic is the default interface language and all forms, document lists, tables, dialogs, histories, identifiers, dates, phone numbers, and monetary values must behave naturally in RTL with mixed-direction values isolated. Content remains ready for future languages.
- **Responsive & Accessibility**: Registration, editing, review, document, finance, lifecycle, and list workflows must remain complete on desktop, laptop, and tablet. All actions require keyboard access, visible focus, programmatic names, semantic grouping, announced errors and status changes, managed dialog focus, and sufficient contrast.
- **UI States**: Every data surface defines initial loading, empty, retryable error, unavailable, forbidden, and success states. Mutations preserve input on recoverable failure and never fail silently.
- **Reuse**: Admissions uses the platform's shared page, form, upload, dropdown, table, filter, badge, dialog, notification, loading, empty, and error patterns. New shared patterns are introduced only when an admission need recurs and contains no admission business logic.
- **Frontend Boundary**: Pages orchestrate screens, the Admissions feature owns policy and validation, and presentation components render state and interactions. All temporary data remains behind admission service boundaries so a future authoritative data source can replace it without changing page behavior.
- **AI & Future Context**: Read contexts may expose permission-scoped summaries, readiness findings, missing requirements, workload ownership, and decision history for future routing, summaries, recommendations, and automation. Future backend authorization, tenant isolation, audit storage, privacy controls, workflow execution, and human approval remain authoritative boundaries.

### Key Entities

- **Applicant**: A person seeking admission, containing personal, contact, identity, educational, notes, profile image, archival, and audit-ready information. It is explicitly not a Student.
- **Admission**: The operational case linking one applicant to one academic selection, organizational assignments, documents, financial preparation, lifecycle, readiness, and decision history.
- **Academic Selection**: The chosen Professional Program and Batch, Professional Diploma, or Training Course, including the eligibility outcome and relevant branch context.
- **Admission Assignment**: The registration and study branches plus admissions, customer service, management, department, source, and academic-grade ownership associated with a case.
- **Document Requirement**: A configurable evidence requirement with applicability, required/optional status, allowed formats, size rules, and approval impact.
- **Admission Document**: A versioned applicant file linked to a requirement, with upload metadata and a current verification decision.
- **Document Verification**: An immutable reviewer decision that verifies or rejects a specific document version with actor, time, and reason.
- **Financial Preparation**: The authoritative academic price and fees, discount inputs, derived required amount, currency, and version used before approval.
- **Admission Decision Snapshot**: The immutable academic, assignment, requirement, and financial facts accepted at approval and supplied to future enrollment.
- **Admission Lifecycle Event**: An immutable transition record containing prior status, resulting status, actor, time, reason, and record version.
- **Enrollment Readiness**: A permission-scoped decision stating whether an Approved admission may proceed, together with stable reason codes and the approved snapshot identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A trained employee can register and save a valid draft applicant in under 5 minutes in at least 90% of observed attempts.
- **SC-002**: At least 95% of trained employees can complete the primary registration, academic selection, document review, and decision workflows on their first attempt without assistance.
- **SC-003**: Users receive search or filtered admission results within 2 seconds for at least 95% of interactions across a working set of 10,000 admissions.
- **SC-004**: 100% of approval attempts with missing or unverified required documents, ineligible academic selections, or invalid financial preparation are blocked with a specific explanation.
- **SC-005**: 100% of Professional Program submissions require one eligible matching batch, while 100% of Diploma and Course submissions proceed without a batch requirement.
- **SC-006**: Required amounts are correct to the configured currency precision in 100% of tested price, fee, percentage-discount, and amount-discount combinations.
- **SC-007**: No tested unauthorized direct route, branch-scope request, document action, financial action, lifecycle decision, archive, or export reveals or changes an out-of-scope admission.
- **SC-008**: Every successful status or document-verification decision produces exactly one attributable historical event, and failed decisions produce none.
- **SC-009**: List, detail, registration, editing, review, document, finance, and decision workflows complete without loss of functionality at desktop, laptop, and tablet widths and at 200% zoom.
- **SC-010**: Primary workflows have no serious or critical accessibility violations and can be completed using only a keyboard.
- **SC-011**: An admissions employee can locate a known record using search and combined filters in under 30 seconds in at least 95% of observed attempts.
- **SC-012**: Every Approved admission exposes one stable enrollment-ready snapshot, and no non-Approved admission can be accepted for enrollment.

## Assumptions

- Existing authentication supplies the current employee, organization, role permissions, and authorized branch scope; mock contexts are non-authoritative during frontend development.
- Organization & Settings supplies configurable branches, departments, employees, roles, permissions, lead sources, grades, locale, time zone, currency, and policy settings.
- Academic Catalog supplies active Professional Programs, Professional Diplomas, Training Courses, prices, registration fees, eligibility characteristics, and applicable document requirements.
- Program Batches supplies authoritative batch lifecycle, registration dates, seats, branches, independent financial terms, eligibility reason codes, and stable financial revision identity.
- An applicant normally has one active admission per academic selection; potential duplicates are warned and deliberate exceptions require appropriate permission and reason.
- National identifier rules, minor age threshold, guardian requirements, file-size limits, and document requirements are organization-configurable; reasonable seeded examples are used during frontend development.
- Submitted records may be returned to Draft by a separately permitted correction action before approval; the detailed transition table will be finalized during planning without weakening approval gates.
- Required documents must be verified before approval, but configuration may require selected documents earlier at submission.
- Financial preparation calculates admission terms only. Payment schedules, collection, receipts, refunds, and ledger posting remain Finance responsibilities.
- Enrollment confirmation and Student creation belong to future modules. Admissions exposes readiness and accepts a future confirmed enrollment reference without creating it itself.
- Archived records remain available according to the organization's future retention and privacy policies.
- Mobile optimization, real file storage, malware scanning, external identity verification, messaging, CRM leads, Student Management, Payments, Attendance, Scheduling, AI execution, and Ticketing are outside this feature phase.
