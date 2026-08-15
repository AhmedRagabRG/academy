# Feature Specification: Student Management

**Feature Branch**: `[006-student-management]`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Manage officially enrolled students after admission, providing a central student workspace covering profile information, academic enrollments, documents, internal notes, activity timeline, read-only financial summary, lifecycle status, and governed list search."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive Students from Successful Admissions (Priority: P1)

A student record appears in the platform only after an admission has been approved and its enrollment outcome is confirmed. No employee can create a student by hand, and no employee can delete one.

**Why this priority**: Every other student capability depends on a trustworthy record whose existence is guaranteed by a completed admission.

**Independent Test**: Confirm the enrollment outcome of an approved admission, verify exactly one student record with a unique student code appears, and verify that no manual creation or deletion path exists anywhere in the module.

**Acceptance Scenarios**:

1. **Given** an approved admission whose enrollment is confirmed, **When** the student record is produced, **Then** exactly one student exists with a unique student code, an admission reference, an admission date, an enrollment date, and an Active status.
2. **Given** an admission that is not approved or whose enrollment is not confirmed, **When** a student record is requested for it, **Then** no student is created and the refusal reason is explicit.
3. **Given** an existing student produced from an admission, **When** the same admission enrollment outcome is presented again, **Then** the existing student is reused and no duplicate record is created.
4. **Given** any employee and any permission level, **When** the student list or a student record is opened, **Then** no manual create action and no permanent delete action are available.
5. **Given** a newly produced student, **When** the record is opened, **Then** the personal, academic, and system information carried from the admission decision is present and attributable to its source.

---

### User Story 2 - Find Students Across the Organization (Priority: P1)

Authorized employees locate students using search, filters, sorting, and pagination, and see only the students permitted by their organization, branch, and role scope.

**Why this priority**: Student volume grows continuously and every downstream operation begins by finding the right student.

**Independent Test**: Search and combine every supported filter across a large student set, verify stable pagination and sorting, and compare results under organization-wide and branch-scoped employee contexts.

**Acceptance Scenarios**:

1. **Given** student records, **When** an employee searches by full name, student code, primary phone, parent phone, or national identifier, **Then** matching permitted students are returned.
2. **Given** branch, department, academic product, batch, status, and customer service employee filters, **When** filters are combined, **Then** results satisfy every selected condition simultaneously.
3. **Given** a branch-scoped employee, **When** list, detail, or export access is attempted, **Then** only students intersecting that employee's authorized branches are reachable, including by direct record address.
4. **Given** a changed filter, search term, or sort order, **When** the current page is no longer valid, **Then** pagination resets or clamps to a valid page without discarding the remaining filter state.
5. **Given** a filter selection that matches no student, **When** results are returned, **Then** an empty state explains the situation and offers a way to clear or adjust the filters.

---

### User Story 3 - Open the Student Workspace (Priority: P1)

An authorized employee opens a single student and reviews the complete picture: personal information, academic assignment, system information, current status, enrollments, documents, notes, timeline, and financial summary.

**Why this priority**: The consolidated workspace is the business outcome of this module and the surface every other module will later extend.

**Independent Test**: Open a student with populated and with empty related data, and verify that every workspace area renders its own loading, populated, empty, unavailable, and error state independently.

**Acceptance Scenarios**:

1. **Given** an existing student, **When** an authorized employee opens the record, **Then** full name, phone, parent phone, national identifier, address, date of birth, qualification, graduation year, and profile image are presented.
2. **Given** an existing student, **When** the record is opened, **Then** registration branch, study branch, department, academic grade, student code, admission date, enrollment date, and current status are presented.
3. **Given** a student with several enrollments, **When** the enrollments area is viewed, **Then** each enrollment shows its academic product, batch where applicable, enrollment date, and current status, and no create, edit, or delete enrollment action is offered.
4. **Given** a student with no documents, no notes, or no recorded enrollments, **When** those areas are viewed, **Then** each shows its own empty state without implying an error.
5. **Given** one workspace area that fails to load, **When** the record is displayed, **Then** the remaining areas stay usable and the failed area offers a retry.
6. **Given** an employee lacking permission for a workspace area, **When** the record is opened, **Then** that area is withheld with an explicit forbidden state rather than showing partial or empty data.

---

### User Story 4 - Maintain Student Information (Priority: P1)

An authorized employee corrects and updates the student's maintainable personal and operational information, while admission-derived and system-assigned facts stay protected.

**Why this priority**: Contact and personal information changes constantly, and correcting it is the most frequent day-to-day student operation.

**Independent Test**: Edit each maintainable field with valid and invalid values, confirm validation and persistence, and confirm that protected fields cannot be altered from this module.

**Acceptance Scenarios**:

1. **Given** an authorized employee, **When** maintainable personal or operational information is updated with valid values, **Then** the latest values are retained and a success outcome is shown.
2. **Given** invalid national identifier, phone, parent phone, date of birth, or graduation year values, **When** saving is attempted, **Then** the record is unchanged and each invalid field receives specific guidance.
3. **Given** protected information such as student code, admission reference, admission date, and enrollment date, **When** the edit form is opened, **Then** those values are visible but not editable.
4. **Given** a recoverable validation or service failure, **When** saving fails, **Then** the employee's unsaved input is preserved and a retry is offered.
5. **Given** two employees editing the same student, **When** the second save is attempted against a stale version, **Then** the save is refused with an explicit conflict outcome instead of silently overwriting the first employee's work.
6. **Given** an archived student, **When** editing is attempted, **Then** the record stays read-only until it is activated again.

---

### User Story 5 - Govern the Student Lifecycle (Priority: P1)

Authorized staff move a student through Active, Suspended, Graduated, Withdrawn, and Archived, each transition requiring the matching permission and a reason where applicable.

**Why this priority**: Lifecycle status drives reporting, access, and every future finance, academic, and communication decision.

**Independent Test**: Attempt every allowed and disallowed transition under permitted and unpermitted employee contexts, and confirm archived students remain fully readable.

**Acceptance Scenarios**:

1. **Given** an Active student, **When** an authorized employee suspends, graduates, withdraws, or archives the record with the required reason, **Then** the new status is applied and the actor, time, prior status, resulting status, and reason are retained.
2. **Given** an Archived student, **When** an authorized employee activates the record, **Then** the student returns to an active operational status and remains historically continuous.
3. **Given** a transition that the status policy does not allow, **When** it is attempted, **Then** it is refused with a specific explanation and the status is unchanged.
4. **Given** an employee without the specific action permission, **When** any status change is attempted, **Then** it is refused and no status change is recorded.
5. **Given** an Archived student, **When** the record is opened, viewed in historical lists, or referenced in reporting, **Then** it remains fully readable and is never permanently removed.
6. **Given** a status change that fails, **When** the outcome is reported, **Then** no lifecycle history entry is created.

---

### User Story 6 - Manage Student Documents (Priority: P2)

An authorized employee maintains the student's document set, uploading, replacing, previewing, downloading, and archiving evidence such as identity, qualification, and admission declaration files.

**Why this priority**: Document completeness is an ongoing compliance need, but the student record remains useful before it is achieved.

**Independent Test**: Upload valid and invalid files against each supported document type, replace and archive documents, and confirm archived documents remain retrievable.

**Acceptance Scenarios**:

1. **Given** the configured document types, **When** the documents area is opened, **Then** present, missing, and archived documents are clearly distinguished per type.
2. **Given** an accepted file format within the configured size limit, **When** it is uploaded, **Then** it is attached with its type, original filename, size, upload time, and uploader.
3. **Given** an unsupported, oversized, empty, or unreadable file, **When** upload is attempted, **Then** it is refused without replacing or damaging an existing document.
4. **Given** an existing document, **When** it is replaced, **Then** a new current version is recorded and the previous version remains retrievable rather than being erased.
5. **Given** an existing document, **When** an authorized employee previews or downloads it, **Then** the action succeeds for permitted employees and is refused for others.
6. **Given** a document that is no longer operationally relevant, **When** an authorized employee archives it, **Then** it leaves the active set, remains available for historical review, and cannot be permanently deleted.
7. **Given** an interrupted upload that is retried, **When** it completes, **Then** no duplicate attachment is created for the same attempt.

---

### User Story 7 - Record Internal Notes (Priority: P2)

Authorized staff attach internal notes to a student to record operational context that does not belong in formal fields, visible only to permitted employees.

**Why this priority**: Notes materially improve service continuity between employees but are not required to operate the record.

**Independent Test**: Add notes as different employees, verify authorship and ordering, and verify that employees without note permission cannot read them.

**Acceptance Scenarios**:

1. **Given** an authorized employee, **When** a note with content is added, **Then** it is stored with its author, creation time, and content, and appears in the student's notes.
2. **Given** an empty or whitespace-only note, **When** it is submitted, **Then** it is refused with specific guidance and nothing is stored.
3. **Given** several notes, **When** the notes area is viewed, **Then** they are ordered from most recent to oldest with each author and time clearly attributed.
4. **Given** an employee without note permission, **When** the student record is opened, **Then** notes are neither displayed nor retrievable.
5. **Given** a note whose author is no longer an active employee, **When** the note is viewed, **Then** the original authorship attribution is preserved.

---

### User Story 8 - Review the Student Activity Timeline (Priority: P2)

Authorized employees review a chronological history of what has happened to the student, from admission submission through creation, enrollments, document changes, updates, and future financial and academic events.

**Why this priority**: The timeline explains the current state and prepares the record for audit and AI use, but it reports rather than drives operations.

**Independent Test**: Perform a series of student operations and verify that each produces exactly one correctly ordered, attributable timeline event.

**Acceptance Scenarios**:

1. **Given** a student produced from an admission, **When** the timeline is viewed, **Then** admission submission, admission approval, and student creation appear in chronological order with their times.
2. **Given** an enrollment addition, document upload or replacement, profile update, or status change, **When** it succeeds, **Then** exactly one corresponding timeline event is recorded with actor and time.
3. **Given** an operation that fails, **When** the timeline is viewed, **Then** no event is recorded for it.
4. **Given** a student with a long history, **When** the timeline is viewed, **Then** events remain readable through ordered incremental loading without losing chronological order.
5. **Given** future financial and academic event categories, **When** they are absent, **Then** the timeline presents the events it has without implying data loss.

---

### User Story 9 - Review the Financial Summary (Priority: P3)

Authorized employees see a read-only financial overview of the student, covering total fees, paid amount, remaining balance, and active installments, without performing any financial operation here.

**Why this priority**: The summary provides valuable operational context, but every authoritative financial action belongs to the Student Finance module.

**Independent Test**: View the summary with available, empty, and unavailable financial context, and confirm no financial action can be taken from this module.

**Acceptance Scenarios**:

1. **Given** available financial context, **When** the summary is viewed, **Then** total fees, paid amount, remaining balance, active installments, and the currency are presented as read-only values.
2. **Given** the summary is displayed, **When** an employee looks for financial actions, **Then** no payment, refund, adjustment, installment, or schedule action is available in this module.
3. **Given** financial context that cannot be retrieved, **When** the summary is viewed, **Then** an explicit unavailable state with a retry is shown rather than zero values presented as facts.
4. **Given** an employee without financial-summary permission, **When** the record is opened, **Then** the summary is withheld with a forbidden state.

### Edge Cases

- An approved admission's enrollment outcome is presented twice, or two enrollment confirmations for the same applicant arrive concurrently.
- A student code collides with an existing code, or an admission arrives without a resolvable code.
- A student exists with no recorded enrollments yet, or with enrollments whose academic product or batch was later archived in the catalog.
- A batch referenced by an enrollment is cancelled, rescheduled, or moved to a different branch after the student was created.
- A branch, department, academic grade, or customer service employee assigned to the student is deactivated afterwards.
- The student is a minor and parent contact information is missing or becomes invalid.
- The student has no national identifier and was admitted using configured alternative identity evidence.
- Two employees update the same student, change its status, or replace the same document concurrently.
- A document is replaced or archived while another employee is previewing or downloading it.
- A student is graduated or withdrawn while enrollments remain active, or is archived with an outstanding financial balance.
- A withdrawn student later returns through a new admission, producing a second admission reference for the same person.
- An archived student is referenced by reporting, search, or a future module while archived.
- The financial summary source is unavailable, returns a different currency, or reports a negative remaining balance.
- Search input contains Arabic name variants, English text, punctuation, extra spaces, or mixed-direction identifiers.
- A branch-scoped employee's authorized branches change so that a previously visible student is no longer in scope.
- A profile image is missing, oversized, or fails to load.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized employees to view, edit, archive, and activate students; manual student creation and permanent deletion MUST NOT be available anywhere in the module.
- **FR-002**: Every student MUST originate from an approved admission whose enrollment outcome is confirmed, and MUST retain a stable reference to that admission.
- **FR-003**: Producing a student from the same admission enrollment outcome more than once MUST reuse the existing student rather than creating a duplicate.
- **FR-004**: Each student MUST retain full name, primary phone, parent or guardian phone where applicable, national identifier or configured alternative evidence reference, address, date of birth, qualification, graduation year, and profile image.
- **FR-005**: Each student MUST retain registration branch, study branch, department, and academic grade as academic assignment information.
- **FR-006**: Each student MUST retain student code, admission date, enrollment date, and current status as system information.
- **FR-007**: Student code MUST be unique across the organization, and any operation that would produce a duplicate code MUST be refused with a specific explanation.
- **FR-008**: Student code, admission reference, admission date, and enrollment date MUST be visible but not editable within this module.
- **FR-009**: Student validation MUST enforce required fields, the configured national identifier format, the configured phone number formats, plausible date of birth and graduation year values, and guardian information requirements based on the configured minor age threshold.
- **FR-010**: Branches, departments, academic grades, statuses, document types, employees, and assignment options MUST come from configurable organizational data rather than fixed lists.
- **FR-011**: Assignment choices MUST be limited to active records within the current organization and the acting employee's authorized scope.
- **FR-012**: Each student MUST support multiple enrollments, and each enrollment MUST present its academic product, batch where applicable, enrollment date, and current status.
- **FR-013**: An enrollment for a Professional Program MUST reference exactly one batch, while an enrollment for a Professional Diploma or a Training Course MUST NOT reference a batch.
- **FR-014**: The module MUST display enrollments only; creating, editing, or removing enrollments MUST NOT be available here.
- **FR-015**: An enrollment whose academic product or batch has since been archived or changed MUST remain displayable with its historically recorded values.
- **FR-016**: The module MUST present the configured student document types, including personal photo, national identifier, parent national identifier, birth certificate, qualification certificate, admission declaration, and additional attachments.
- **FR-017**: Authorized employees MUST be able to upload, replace, preview, download, and archive student documents within the configured accepted formats and size limits.
- **FR-018**: Every document MUST retain its type, original filename, media type, size, uploader, upload time, current version, and active or archived state.
- **FR-019**: Replacing a document MUST create a new current version while keeping previous versions retrievable; archiving a document MUST remove it from the active set without permanently deleting it.
- **FR-020**: Authorized employees MUST be able to add internal notes containing author, creation time, and content; empty content MUST be refused.
- **FR-021**: Notes MUST be readable only by employees holding note permission and MUST preserve original authorship even when the author is no longer active.
- **FR-022**: The system MUST maintain a chronological activity timeline covering admission submission, admission approval, student creation, enrollment additions, document uploads and replacements, profile updates, status changes, and future financial and academic event categories.
- **FR-023**: Every successful state-changing operation MUST produce exactly one attributable timeline event with actor and time; failed operations MUST produce none.
- **FR-024**: The timeline MUST present events in chronological order and MUST remain readable for long histories through ordered incremental loading.
- **FR-025**: The module MUST present a read-only financial summary containing total fees, paid amount, remaining balance, active installments, and currency, sourced from the authoritative financial context.
- **FR-026**: No payment, refund, adjustment, installment, invoicing, or schedule action MUST be available in this module.
- **FR-027**: When financial context is unavailable, the summary MUST present an explicit unavailable state with a retry rather than displaying zero or stale values as facts.
- **FR-028**: The supported student lifecycle MUST be Active, Suspended, Graduated, Withdrawn, and Archived.
- **FR-029**: Lifecycle transitions MUST follow an explicit transition policy, require the exact action permission, and retain actor, time, prior status, resulting status, and reason where applicable.
- **FR-030**: Archived students MUST remain fully readable for historical lookup and future reporting, and MUST be restorable to an active operational status by the activate action.
- **FR-031**: Archived students MUST be read-only for profile, document, note, and enrollment operations until they are activated again.
- **FR-032**: The system MUST support search across full name, student code, primary phone, parent phone, and national identifier.
- **FR-033**: Student lists MUST support combined branch, department, academic product, batch, status, and customer service employee filters plus sorting and pagination.
- **FR-034**: Search, filtering, sorting, pagination, row selection, and any applicable bulk actions MUST preserve organization, branch, and permission scope.
- **FR-035**: Bulk actions MUST evaluate every selected student independently, refuse transitions the status policy disallows, and report successful and unsuccessful outcomes without hiding partial failures.
- **FR-036**: Direct record access and every view, edit, document, note, timeline, financial-summary, status-change, archive, activate, and export action MUST be independently permission-aware.
- **FR-037**: Concurrent updates MUST detect stale records and require refresh or deliberate reconciliation rather than silently overwriting another employee's work.
- **FR-038**: Every user-triggered operation MUST expose progress, success, and actionable failure feedback; every data surface MUST define loading, empty, unavailable, forbidden, and retryable error states.
- **FR-039**: The system MUST preserve unsaved user input after recoverable validation or service failures.
- **FR-040**: Students MUST retain created and updated actor and time context and immutable status-change, profile-change, and document-change history for future audit logging.
- **FR-041**: The module MUST expose a stable, permission-scoped student context summary containing student identity, status, academic assignment, enrollment targets, document completeness, and financial summary identity for future Finance, CRM, AI, and Reporting use, without exposing unrestricted personal documents.

### Constitution Requirements *(mandatory for UI features)*

- **Business Workflow**: Students exist only as the result of a successful admission. Viewing, editing, document handling, note taking, and each lifecycle transition are separately authorized operations. Enrollment creation belongs to Admissions, financial operations belong to Student Finance, and permanent deletion is prohibited everywhere.
- **Module Boundary**: Student Management owns student records, documents, notes, timeline, and lifecycle behavior within its own route area. It consumes public Organization, Academic Catalog, Program Batch, and Admissions enrollment-outcome concepts and exposes a stable student context contract to future Finance, CRM, AI, and Reporting modules without importing their internals.
- **Dynamic Configuration**: Branches, departments, academic grades, statuses, document types, accepted formats and size limits, employees, minor age threshold, identifier and phone formats, and transition policy are configurable business data. Seeded examples do not become fixed application rules.
- **Arabic & RTL**: Arabic is the default interface language, and the workspace, forms, tables, filters, dialogs, timeline, notes, documents, identifiers, dates, phone numbers, and monetary values must behave naturally in RTL with mixed-direction values isolated. Content remains ready for future languages.
- **Responsive & Accessibility**: List, workspace, editing, document, note, timeline, financial-summary, and lifecycle workflows must remain complete on desktop, laptop, and tablet. Every action requires keyboard access, visible focus, programmatic names, semantic grouping, announced errors and status changes, managed dialog focus, and sufficient contrast.
- **UI States**: Every data surface and every workspace area independently defines loading, empty, retryable error, unavailable, forbidden, and success states. Mutations preserve input on recoverable failure and never fail silently.
- **Reuse**: The module uses the platform's shared page, form, upload, dropdown, table, filter, badge, tab, dialog, notification, loading, empty, and error patterns. New shared patterns are introduced only when a student need recurs and must contain no student business logic.
- **Frontend Boundary**: Pages orchestrate screens, the Student Management feature owns policy and validation, and presentation components render state and interactions. All temporary data stays behind student service boundaries so a future authoritative data source can replace it without changing page behavior.
- **AI & Future Context**: Read contexts may expose permission-scoped student summaries, enrollment targets, document completeness, timeline history, and financial summary identity for future routing, summaries, recommendations, and automation. Future backend authorization, tenant isolation, audit storage, privacy controls, workflow execution, and human oversight remain authoritative boundaries.

### Key Entities

- **Student**: An officially enrolled person produced from an approved admission, holding personal, academic assignment, system, status, and audit-ready information. It is never created manually and never permanently deleted.
- **Student Identity**: The personal and contact facts of the student, including name, phones, national identifier or configured alternative evidence reference, address, date of birth, qualification, graduation year, and profile image.
- **Student Assignment**: The registration branch, study branch, department, academic grade, and customer service ownership associated with the student.
- **Student Enrollment**: A read-only academic engagement linking the student to one Professional Program with its batch, one Professional Diploma, or one Training Course, with its enrollment date and current status.
- **Student Document**: A versioned student file linked to a configured document type, with upload metadata, current version, and active or archived state.
- **Student Note**: An internal, permission-restricted remark carrying its author, creation time, and content.
- **Student Timeline Event**: An immutable, chronologically ordered record of something that happened to the student, carrying its category, actor, time, and reference to the affected record.
- **Student Status Change**: An immutable lifecycle transition record containing prior status, resulting status, actor, time, reason where applicable, and record version.
- **Student Financial Summary**: A read-only projection of total fees, paid amount, remaining balance, active installments, and currency, owned by the future Student Finance module.
- **Student Admission Link**: The stable reference connecting a student to the approved admission and enrollment outcome that produced it.
- **Student Context Summary**: A permission-scoped read projection of student identity, status, assignment, enrollment targets, document completeness, and financial summary identity supplied to future modules.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of student records in the system trace to an approved admission with a confirmed enrollment outcome, and no student can be created manually or permanently deleted.
- **SC-002**: Student codes are unique across 100% of tested records, including concurrent and repeated enrollment-outcome submissions for the same admission.
- **SC-003**: An employee can locate a known student using search and combined filters in under 30 seconds in at least 95% of observed attempts.
- **SC-004**: Users receive searched or filtered student results within 2 seconds for at least 95% of interactions across a working set of 20,000 students.
- **SC-005**: A trained employee can open a student and locate profile, enrollment, document, note, timeline, and financial information without assistance in at least 95% of first attempts.
- **SC-006**: 100% of Professional Program enrollments display a batch, and 100% of Professional Diploma and Training Course enrollments display no batch.
- **SC-007**: 100% of invalid national identifier, phone, date of birth, graduation year, and required-field entries are refused before saving, with field-specific guidance and no data change.
- **SC-008**: 100% of disallowed status transitions and unpermitted lifecycle actions are refused with a specific explanation and produce no status change and no history entry.
- **SC-009**: Every successful profile update, document change, note addition, and status change produces exactly one attributable timeline event, and every failed operation produces none.
- **SC-010**: No tested unauthorized direct route, branch-scope request, document action, note access, financial-summary access, lifecycle action, or export reveals or changes an out-of-scope student.
- **SC-011**: 100% of archived students remain retrievable and readable for historical review, and 100% of archived students can be returned to an active operational status by a permitted employee.
- **SC-012**: Every workspace area presents a correct loading, empty, unavailable, forbidden, or error state in 100% of tested conditions, including when one area fails while others succeed.
- **SC-013**: List, workspace, editing, document, note, timeline, and lifecycle workflows complete without loss of functionality at desktop, laptop, and tablet widths and at 200% zoom.
- **SC-014**: Primary workflows have no serious or critical accessibility violations and can be completed using only a keyboard.
- **SC-015**: Every student exposes exactly one stable permission-scoped context summary consumable by future Finance, CRM, AI, and Reporting modules.

## Assumptions

- Existing authentication supplies the current employee, organization, role permissions, and authorized branch scope; mock contexts are non-authoritative during frontend development.
- Organization & Settings supplies configurable branches, departments, employees, roles, permissions, academic grades, locale, time zone, currency, identifier and phone formats, minor age threshold, and document policy settings.
- Academic Catalog supplies Professional Programs, Professional Diplomas, and Training Courses, and Program Batches supplies batch identity and lifecycle; this module displays their recorded values and does not govern them.
- Admissions supplies the approved admission and its confirmed enrollment outcome. This module accepts that outcome through a stable contract and does not perform admission review, approval, or enrollment creation itself.
- Maintainable information covers personal and contact details, address, qualification, graduation year, profile image, and operational ownership. Student code, admission reference, admission date, enrollment date, and enrollment records are protected from editing in this module; changes to academic assignment require the corresponding permission and remain subject to the transition and audit rules.
- The assumed status transition policy is: Active may become Suspended, Graduated, Withdrawn, or Archived; Suspended may become Active, Withdrawn, or Archived; Graduated and Withdrawn may become Archived, and may return to Active only through a separately permitted correction action; Archived may become Active through the activate action. The definitive transition table will be finalized during planning without weakening permission or history requirements.
- Student code generation rules, accepted document formats, file size limits, and required document types are organization-configurable; reasonable seeded examples are used during frontend development.
- Financial summary values are owned by the future Student Finance module. Until it exists, the summary is served through a stable read contract behind the student service boundary and must degrade to an explicit unavailable state.
- Timeline events originating before student creation, such as admission submission and approval, are carried from the admission record rather than regenerated here.
- A person who returns through a new admission produces a separate student record linked to the new admission; deliberate merging of duplicate people is outside this feature phase.
- Archived students and archived documents remain available according to the organization's future retention and privacy policies.
- Audit logging is prepared for but not implemented in this phase; the module retains the actor, time, and change context that future audit storage will consume.
- Mobile optimization, real file storage, malware scanning, Admissions, Student Finance, Attendance, Scheduling, Exams, Certificates, CRM, AI automation, Ticket Management, and Reporting execution are outside this feature phase.
