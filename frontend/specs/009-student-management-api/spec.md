# Feature Specification: Student Management

**Feature Branch**: `[009-student-management-api]`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "Build the Student Management module for the Education Operations Platform. This module manages enrolled students after successful admission approval, maintaining the student's academic profile, enrollment information, guardian information, uploaded documents, academic status, and overall lifecycle throughout the organization. Students become the primary entity used by Student Finance, Reporting, CRM, and future academic operations."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Convert an Approved Admission into a Student (Priority: P1)

An approved admission waits in a Ready for Enrollment queue until an authorized employee deliberately converts it. On conversion, the applicant's personal information, the agreed academic offering, the financial figures accepted at approval, and the uploaded documents all carry across into a new student record with a system-generated student code. No employee can type a student into existence, and the same admission can never produce a second student.

**Why this priority**: Every other capability in this module operates on a student record. Without a trustworthy, single-source conversion there is nothing to profile, search, document, or bill.

**Independent Test**: Approve an admission, confirm it appears in the Ready for Enrollment queue, convert it, and verify exactly one student exists carrying the applicant's identity, the enrollment details, the financial snapshot, copies of the admission documents, and a correctly formatted student code. Then verify the admission has left the queue, and attempt conversion again on that admission and on a non-approved admission — both refused with explicit reasons.

**Acceptance Scenarios**:

1. **Given** an admission that has just reached the Approved state, **When** the Ready for Enrollment queue is read, **Then** the admission appears in it and no student has been created.
2. **Given** an approved admission in the queue, **When** an authorized employee executes the conversion, **Then** exactly one student is created with a unique student code, a reference to the source admission, an enrollment date, and an Active status.
3. **Given** an approved admission, **When** it is converted, **Then** the applicant's full name, phone, parent phone, national identifier, date of birth, address, qualification, and graduation year are present on the student.
4. **Given** an approved admission, **When** it is converted, **Then** the academic product, the program batch where applicable, the registration branch, the study branch, and the academic year are recorded as the student's enrollment information.
5. **Given** an approved admission carrying financial figures accepted at approval, **When** it is converted, **Then** those figures are preserved on the student unchanged and remain readable by the finance layer.
6. **Given** an approved admission with uploaded documents, **When** it is converted, **Then** each document is copied to the student, retains its document type and upload metadata, and the admission's own copy is left untouched.
7. **Given** an admission enrolled for academic year 2027 at the Cairo branch, **When** it is converted, **Then** the generated student code follows the pattern `2027-CAI-00001`, composed of the academic year, the branch code, and a zero-padded sequence.
8. **Given** an admission that has been converted, **When** the Ready for Enrollment queue is read, **Then** the admission no longer appears in it.
9. **Given** an admission that has already produced a student, **When** conversion is attempted again, **Then** no second student is created and the existing student is identified in the refusal.
10. **Given** an admission that is not in the Approved state, **When** conversion is attempted, **Then** no student is created and the refusal names the unmet approval condition.
11. **Given** an approved admission, **When** approval alone occurs with no employee action, **Then** no student is created; approval makes an admission eligible for conversion but does not perform it.
12. **Given** any employee at any permission level, **When** the student collection is addressed, **Then** no manual student-creation path and no permanent-deletion path exist.

---

### User Story 2 - Read a Complete Student Profile (Priority: P1)

An authorized employee opens one student and sees the whole picture in one place: personal information, enrollment information, guardian information, current status, document completeness, documents, private notes, and timeline.

**Why this priority**: The consolidated student record is the business outcome of this module and the contract every downstream module reads against.

**Independent Test**: Open a student that has documents, notes, and timeline entries, and a student that has none, and verify each area of the record resolves independently with correct content or a correct empty result.

**Acceptance Scenarios**:

1. **Given** an existing student, **When** an authorized employee reads the record, **Then** student code, full name, phone number, parent phone number, national identifier, date of birth, address, qualification, and graduation year are returned.
2. **Given** an existing student, **When** the record is read, **Then** academic product, program batch where applicable, registration branch, study branch, and academic year are returned and marked as not directly editable.
3. **Given** an existing student, **When** the record is read, **Then** parent name, parent phone, and parent national identifier are returned.
4. **Given** an existing student, **When** the record is read, **Then** the current lifecycle status, the document completeness state, and the resulting academic eligibility are returned together.
5. **Given** an employee whose scope does not include the student, **When** the record is addressed directly by its identifier, **Then** access is refused and no student information is disclosed.
6. **Given** an identifier that matches no student, **When** the record is addressed, **Then** a not-found outcome is returned that does not reveal whether the identifier ever existed.

---

### User Story 3 - Find Students Across the Organization (Priority: P1)

Authorized employees locate students by searching, filtering, sorting, and paging through the student population, seeing only students their role and branch scope permits.

**Why this priority**: Student volume grows continuously and every operational task begins by finding the right student.

**Independent Test**: Populate a large student set, combine every supported filter with search and sorting, page through the results, and compare what an organization-wide employee sees against what a branch-scoped employee sees.

**Acceptance Scenarios**:

1. **Given** student records, **When** an employee searches by full name, student code, phone number, parent phone number, or national identifier, **Then** matching permitted students are returned.
2. **Given** filters for academic product, program batch, branch, academic year, status, and document completeness, **When** several are combined, **Then** every returned student satisfies all selected conditions at once.
3. **Given** a sort selection on a supported field, **When** results are paged, **Then** ordering is stable and no student is duplicated or skipped across pages.
4. **Given** a branch-scoped employee, **When** the list is read, **Then** only students intersecting that employee's authorized branches appear.
5. **Given** a page number beyond the available results, **When** the list is read, **Then** a valid empty page is returned along with the true total, rather than an error.
6. **Given** a filter combination matching no student, **When** the list is read, **Then** an empty result with a zero total is returned and the applied filters are echoed back.

---

### User Story 4 - Maintain Contact, Address, and Guardian Information (Priority: P2)

An authorized employee corrects a student's phone number, address, or guardian details as they change over time, without ever being able to alter what the student is enrolled in or the code that identifies them.

**Why this priority**: Contact and guardian details drift constantly and stale details break collection, communication, and reporting. Enrollment and student-code immutability are what protect the record's integrity.

**Independent Test**: Update contact, address, and guardian fields on a student and verify the new values persist and appear in the timeline; then attempt to change the student code, academic product, batch, branch, or academic year through every available path and verify each attempt is refused.

**Acceptance Scenarios**:

1. **Given** an authorized employee, **When** phone number, parent phone number, or address is updated with valid values, **Then** the new values are stored and a success outcome is returned.
2. **Given** an authorized employee, **When** parent name, parent phone, or parent national identifier is updated with valid values, **Then** the new values are stored and a success outcome is returned.
3. **Given** any employee at any permission level, **When** a change to academic product, program batch, registration branch, study branch, or academic year is submitted, **Then** the change is refused, the stored enrollment information is unchanged, and the refusal states that enrollment information is immutable.
4. **Given** any employee at any permission level, **When** a change to the student code is submitted, **Then** the change is refused and the code is unchanged.
5. **Given** an update carrying an invalid phone number, national identifier, or graduation year, **When** it is submitted, **Then** nothing is stored and each invalid field receives specific guidance.
6. **Given** a national identifier already held by a different student, **When** it is submitted, **Then** the update is refused and the conflict is named without disclosing the other student's details.
7. **Given** a successful contact or guardian update, **When** the timeline is read, **Then** a corresponding event is present.

---

### User Story 5 - Govern the Student Lifecycle (Priority: P2)

An authorized employee moves a student through Active, Suspended, Graduated, Withdrawn, and Archived, so the organization always knows who may participate in academic operations. Students are archived, never deleted.

**Why this priority**: Status is one of the two gates every future academic and financial operation checks. Without enforced transitions, downstream modules cannot trust the record.

**Independent Test**: Walk a student through each permitted transition and attempt each forbidden one, verifying the stored status after every attempt and the presence of an immutable transition record for each accepted change.

**Acceptance Scenarios**:

1. **Given** an Active student, **When** an authorized employee suspends, graduates, withdraws, or archives the student with a reason, **Then** the new status is stored and the prior status, new status, actor, time, and reason are recorded immutably.
2. **Given** a Suspended student, **When** an authorized employee reinstates the student, **Then** the status becomes Active.
3. **Given** a Graduated or Withdrawn student, **When** a return to Active is attempted, **Then** the change is refused and the refusal names the terminal condition.
4. **Given** an Archived student, **When** any status change is attempted, **Then** the change is refused.
5. **Given** a status change submitted without the required reason, **When** it is processed, **Then** the change is refused and the status is unchanged.
6. **Given** a student already holding the requested status, **When** the change is submitted, **Then** it is refused as a no-op and no transition record is written.
7. **Given** any student in any status, **When** permanent deletion is attempted, **Then** no deletion path exists and the record remains readable.

---

### User Story 6 - Manage Student Documents and Reach Completeness (Priority: P2)

A student owns their academic documents. A student may be created with required documents still missing; employees then supply what is outstanding, and the student's completeness state updates as they do. Completeness — not the student's existence — is what gates academic participation.

**Why this priority**: Document completeness is an operational and compliance obligation that continues long after admission closes, and it is now one of the two conditions for academic eligibility.

**Independent Test**: Convert an admission missing a required document, verify the student is created and marked document-incomplete and academically ineligible, upload the outstanding document, and verify the student becomes complete and eligible. Then modify the originating admission's documents and verify the student's copies are unaffected.

**Acceptance Scenarios**:

1. **Given** an authorized employee, **When** a personal photo, national identifier, parent national identifier, birth certificate, qualification certificate, declaration, or additional attachment is uploaded, **Then** it is stored against the student with its type, file name, size, format, uploader, and upload time.
2. **Given** a file whose format or size falls outside the configured rules for its document type, **When** upload is attempted, **Then** the file is rejected and the applicable rule is stated.
3. **Given** a student with an existing document of a given type, **When** a replacement is uploaded, **Then** the newer file becomes current and the superseded file remains retrievable.
4. **Given** a student marked document-incomplete, **When** the last outstanding required document is uploaded and validated, **Then** the student becomes document-complete and academically eligible if the status also permits it.
5. **Given** a document-complete student, **When** a required document is superseded by a file that fails validation, **Then** the replacement is rejected and the student's completeness state is unchanged.
6. **Given** a converted student, **When** documents are changed on the originating admission, **Then** the student's documents and completeness state are unchanged.
7. **Given** a converted student, **When** the student's documents are changed, **Then** the originating admission's documents are unchanged.
8. **Given** a successful document upload, **When** the timeline is read, **Then** a corresponding event is present.
9. **Given** a student, **When** the document set is read, **Then** each supported document type reports whether it is present and, where configured as required, whether the requirement is satisfied.

---

### User Story 7 - Keep Private Notes on a Student (Priority: P3)

An authorized employee records internal context about a student in a single private notes field that is not visible to unauthorized roles.

**Why this priority**: Internal context is valuable but not required for the record to function, and it carries a confidentiality obligation that must be handled deliberately.

**Independent Test**: Write and rewrite the notes field as an authorized employee, read it back, verify a material change appears in the timeline, and verify an unauthorized employee can neither read nor write it.

**Acceptance Scenarios**:

1. **Given** an authorized employee, **When** the private notes field is written, **Then** the content is stored and returned on subsequent reads.
2. **Given** an employee not authorized for private notes, **When** the student is read, **Then** the notes field is absent from the response rather than returned empty.
3. **Given** an employee not authorized for private notes, **When** a write is attempted, **Then** it is refused and the stored content is unchanged.
4. **Given** a material change to the notes content, **When** the timeline is read, **Then** an event recording that the notes changed is present, without reproducing the note content in the timeline.

---

### User Story 8 - Review What Happened to a Student (Priority: P3)

Anyone authorized to see a student can read an immutable, chronological account of everything significant that has happened to that record.

**Why this priority**: The timeline is the module's accountability surface and the foundation of its audit readiness, but the record is operationally usable before it exists.

**Independent Test**: Perform a conversion, a contact update, a guardian update, a document upload, a status change, and an archive on one student, then read the timeline and verify one correctly ordered, attributable event per action and that no event can be altered or removed.

**Acceptance Scenarios**:

1. **Given** a student, **When** the timeline is read, **Then** events are returned in chronological order, each carrying its type, actor, time, and reference to the affected record.
2. **Given** the actions of creating a student, converting an admission, updating contact information, updating guardian information, uploading a document, changing status, and archiving, **When** each occurs, **Then** a matching event type is recorded.
3. **Given** an existing timeline event, **When** an edit or deletion is attempted, **Then** it is refused and the event is unchanged.
4. **Given** an operation that fails validation, **When** the timeline is read, **Then** no event was recorded for the failed attempt.

---

### User Story 9 - Hand a Financial Foundation to Student Finance (Priority: P3)

The financial figures agreed at admission stay attached to the student, unaltered, so the Student Finance module can raise invoices against a trustworthy basis.

**Why this priority**: This module does not perform financial operations, but it must not lose the figures that Student Finance depends on.

**Independent Test**: Convert an admission carrying financial figures, read the student's financial snapshot, verify it matches the admission exactly, and verify no path in this module can change it.

**Acceptance Scenarios**:

1. **Given** a converted student, **When** the financial snapshot is read, **Then** the academic price, applicable reductions, resulting required amount, and currency accepted at approval are returned.
2. **Given** any employee at any permission level, **When** a change to the financial snapshot is attempted through this module, **Then** it is refused and the snapshot is unchanged.
3. **Given** a converted student, **When** the finance layer requests the student's enrollment and financial basis, **Then** the student identity, enrollment information, and financial snapshot are supplied together as one consistent set.
4. **Given** a student who is document-incomplete and therefore academically ineligible, **When** the finance layer reads the student, **Then** the financial snapshot is still available; document completeness gates academic participation, not financial obligation.

---

### Edge Cases

- Two employees convert the same queued admission at the same moment: exactly one student is created, the second attempt is refused, and no duplicate student code is issued.
- Two conversions for the same academic year and branch run concurrently: each receives a distinct sequence number and neither reuses nor skips a value in a way that breaks uniqueness.
- Two admissions carry the same national identifier: the second conversion is refused with an explicit uniqueness conflict, and the first student is unaffected.
- An admission's registration branch and study branch differ: the student code is generated from the defined branch source consistently, and both branches are preserved separately on the record.
- A branch has no configured branch code: conversion is refused before anything is written, rather than generating a malformed student code.
- An admission for a Professional Program carries no program batch: conversion is refused before anything is written.
- An admission for a Professional Diploma or Training Course carries a program batch: the batch is not copied and the inconsistency is refused or discarded according to the enrollment-consistency rule.
- The document copy step fails partway through conversion: no partial student is left behind, no sequence number is consumed in a way that leaves a permanent gap in the audit story, and the admission remains in the queue.
- An admission is converted with every required document missing: the student is created, marked document-incomplete, and reported academically ineligible with the missing document types named.
- A required document type is added to configuration after students already exist: previously complete students are re-evaluated and those now missing it become document-incomplete.
- A student is document-complete but Suspended: the student is academically ineligible, and the reported blocking condition is the status alone.
- A student is Active but document-incomplete: the student is academically ineligible, and the reported blocking condition is the outstanding documents alone.
- A student's national identifier is corrected to a value another student already holds: the update is refused and neither record changes.
- A student has no national identifier on record because none was captured at admission: uniqueness is enforced only over the values that exist, and the absence does not block conversion.
- A file upload exceeds the configured size or arrives in an unsupported format: it is rejected before any part of it is retained and completeness is not recalculated.
- A branch-scoped employee addresses a permitted student's document or timeline directly by identifier: scope is enforced on the nested resource, not only on the parent record.
- A filter references an academic product, batch, branch, or academic year that no longer exists: an empty result is returned rather than an error.

## Requirements *(mandatory)*

### Functional Requirements

#### Student Creation

- **FR-001**: System MUST create students only from admissions in the Approved state; no other origin is permitted.
- **FR-002**: System MUST NOT expose any path for manually creating a student.
- **FR-003**: System MUST present approved, not-yet-converted admissions in a Ready for Enrollment queue, scoped to the reading employee's authorization.
- **FR-004**: System MUST require an explicit conversion action by an authorized employee; reaching the Approved state MUST make an admission eligible for conversion but MUST NOT itself create a student.
- **FR-005**: System MUST remove an admission from the Ready for Enrollment queue once it has been converted.
- **FR-006**: System MUST permit at most one student per admission and MUST refuse any subsequent conversion attempt for the same admission, naming the existing student.
- **FR-007**: System MUST copy the applicant's personal information onto the student during conversion.
- **FR-008**: System MUST preserve the financial figures accepted at admission approval on the student, unaltered.
- **FR-009**: System MUST copy the admission's documents to the student during conversion, retaining document type and upload metadata.
- **FR-010**: System MUST create the student's enrollment information from the admission's academic selection during conversion.
- **FR-011**: System MUST complete conversion as a single all-or-nothing operation; a failure at any step MUST leave no student, no copied documents, and no timeline events behind, and MUST leave the admission in the queue.
- **FR-012**: System MUST leave the source admission's own documents and records unchanged by the conversion.

#### Student Code

- **FR-013**: System MUST generate every student code itself at conversion; a student code MUST NOT be supplied by the converting employee or carried from the admission.
- **FR-014**: System MUST compose the student code as `{AcademicYear}-{BranchCode}-{Sequence}`, for example `2027-CAI-00001`, where the academic year and branch code come from the student's enrollment information and the sequence is a zero-padded incrementing number.
- **FR-015**: System MUST guarantee student codes are globally unique across all students, including archived ones, and MUST NOT issue a duplicate under concurrent conversion requests.
- **FR-016**: System MUST treat the student code as immutable after creation and MUST refuse every attempt to change it.
- **FR-017**: System MUST refuse conversion when the academic year or the branch code needed to compose the student code is unavailable, before writing anything.

#### Student Profile

- **FR-018**: System MUST store for each student: student code, full name, phone number, parent phone number, national identifier, date of birth, address, qualification, and graduation year.
- **FR-019**: System MUST enforce uniqueness of national identifier across all students where a national identifier is present.
- **FR-020**: System MUST validate phone numbers, national identifiers, dates of birth, and graduation years against configured format and range rules before storing them.

#### Enrollment Information

- **FR-021**: System MUST store for each student: academic product, program batch where the product is a Professional Program, registration branch, study branch, and academic year.
- **FR-022**: System MUST require a program batch when the academic product is a Professional Program.
- **FR-023**: System MUST NOT associate a program batch with a Professional Diploma or a Training Course.
- **FR-024**: System MUST treat enrollment information as immutable after creation and MUST refuse every direct modification attempt with an explicit reason.
- **FR-025**: System MUST expose enrollment information as read-only so that a future academic workflow can be introduced as the only path that changes it.

#### Guardian Information

- **FR-026**: System MUST store for each student: parent name, parent phone, and parent national identifier.
- **FR-027**: System MUST allow authorized employees to update guardian information and MUST validate it under the same rules as the corresponding student fields.

#### Student Documents

- **FR-028**: System MUST support the document types Personal Photo, National ID, Parent National ID, Birth Certificate, Qualification Certificate, Declaration, and Additional Attachments.
- **FR-029**: System MUST allow authorized employees to upload documents to a student after enrollment.
- **FR-030**: System MUST validate each uploaded file against the configured format and size rules for its document type before retaining any part of it.
- **FR-031**: System MUST treat a student's documents as owned by the student, so that changes to the originating admission's documents do not affect them and changes to the student's documents do not affect the admission's.
- **FR-032**: System MUST retain a superseded document when a document of the same type is replaced, and MUST identify which file is current.
- **FR-033**: System MUST report, for each student, which document types are present and which configured requirements are unsatisfied.
- **FR-034**: System MUST maintain a document-completeness state for every student, derived from the configured required document types, and MUST recompute it whenever the student's documents or the required-document configuration change.

#### Student Status and Eligibility

- **FR-035**: System MUST support the statuses Active, Suspended, Graduated, Withdrawn, and Archived, and MUST set a newly converted student to Active regardless of document completeness.
- **FR-036**: System MUST permit only these transitions: Active to Suspended, Graduated, Withdrawn, or Archived; Suspended to Active, Graduated, Withdrawn, or Archived; Graduated to Archived; Withdrawn to Archived. Every other transition MUST be refused.
- **FR-037**: System MUST require a reason for every status change and MUST refuse the change when it is absent.
- **FR-038**: System MUST refuse a status change that would set a student to the status the student already holds.
- **FR-039**: System MUST report a student as eligible for academic operations only when the status is Active **and** the document-completeness state is satisfied.
- **FR-040**: System MUST report, for every ineligible student, which conditions are blocking — the status, the outstanding required documents, or both — naming the missing document types where documents are the cause.
- **FR-041**: System MUST NOT expose any path for permanently deleting a student; archiving is the only removal mechanism, and archived students MUST remain readable.

#### Profile Updates

- **FR-042**: System MUST allow authorized employees to update contact information, address, guardian information, and private notes.
- **FR-043**: System MUST refuse updates to any field outside that permitted set, including enrollment information, the student code, and the financial snapshot.
- **FR-044**: System MUST validate every update in full and MUST persist nothing when any part of it is invalid.

#### Private Notes

- **FR-045**: System MUST store exactly one private notes field per student.
- **FR-046**: System MUST restrict reading and writing private notes to roles authorized for them, and MUST omit the field entirely from responses for unauthorized roles.
- **FR-047**: System MUST record a timeline event when the private notes content materially changes, without reproducing the note content in that event.

#### Timeline

- **FR-048**: System MUST maintain, for every student, an append-only timeline whose events cannot be edited or removed.
- **FR-049**: System MUST record timeline events for: student created, admission converted, contact updated, guardian updated, document uploaded, status changed, and archived.
- **FR-050**: System MUST record on each timeline event its type, the acting employee, the time it occurred, and a reference to the affected record.
- **FR-051**: System MUST return timeline events in chronological order and MUST NOT record events for operations that failed validation.

#### Search and Listing

- **FR-052**: System MUST support searching students by full name, student code, phone number, parent phone number, and national identifier.
- **FR-053**: System MUST support filtering students by academic product, program batch, branch, academic year, status, and document completeness, with multiple filters applying together.
- **FR-054**: System MUST support sorting on the supported list fields and MUST return a stable order so that paging neither duplicates nor omits records.
- **FR-055**: System MUST paginate list results and MUST return the total count alongside each page.
- **FR-056**: System MUST return an empty page with the true total, rather than an error, when a requested page falls beyond the available results.

#### Validation and Authorization

- **FR-057**: System MUST complete all validation before any data is persisted, so that a rejected request changes nothing.
- **FR-058**: System MUST validate, before conversion: that the admission is Approved, that the admission has not already been converted, that the generated student code is unique, that the national identifier is unique where present, that enrollment information is internally consistent, and that the student code's composing values are available.
- **FR-059**: System MUST evaluate required-document completeness during conversion and record the resulting state, but MUST NOT block conversion on unsatisfied required documents.
- **FR-060**: System MUST return validation failures in a consistent, field-attributable form that identifies each offending field and the rule it broke.
- **FR-061**: System MUST enforce role-based authorization on every operation, and MUST enforce the acting employee's branch scope on students, documents, notes, timeline, and the Ready for Enrollment queue alike, including when a nested record is addressed directly by identifier.
- **FR-062**: System MUST NOT disclose the existence or content of a student that the acting employee is not permitted to see.

#### Audit Readiness

- **FR-063**: System MUST emit an audit event for student creation, admission conversion, contact updates, guardian updates, status changes, document changes, completeness-state changes, and archive actions.
- **FR-064**: System MUST record on each audit event the acting employee, the time, the affected record, and what changed, in a form that a future audit-log consumer can read without this module's cooperation.

### Constitution Requirements *(mandatory for UI features)*

- **Business Workflow**: An approved admission enters a Ready for Enrollment queue and is converted into exactly one student by a deliberate act of an authorized employee. The resulting student is maintained through profile, guardian, document, note, and status operations, and finally archived rather than deleted. A student may exist while document-incomplete; completeness and Active status together determine academic eligibility. Conversion, status change, document upload, and note access are each permission-gated. Enrollment information, the student code, and the financial snapshot are outcomes of the system and the admission decision, not of employee input.
- **Module Boundary**: Student Management owns the student record, its student code, its guardian information, its documents, its completeness state, its notes, and its timeline. It consumes an approved admission and its decision snapshot from Admissions through an explicit contract and MUST NOT reach into Admissions' internals. It publishes a read-only student context — identity, enrollment, status, completeness, eligibility, financial snapshot — that Student Finance, Reporting, and future academic modules consume. It performs no financial operation itself.
- **Dynamic Configuration**: Academic products, program batches, branches and their branch codes, academic years, roles, document types with their format and size rules, and which document types are required MUST be treated as configurable data, not hardcoded values. Student statuses are a fixed domain lifecycle; the transitions between them and the eligibility rule are business rules, not configuration. The student code format is a business rule; its inputs are configuration.
- **Arabic & RTL**: All employee-facing copy MUST be authored in Arabic with RTL as the native direction. Validation messages, status labels, completeness and eligibility explanations, timeline event descriptions, and refusal reasons MUST be produced as localization-ready keys with structured parameters rather than assembled sentences. Student codes contain Latin characters and digits and MUST render left-to-right within RTL layouts without breaking surrounding text. Stored student names and addresses MUST preserve Arabic characters exactly through search, sort, and export.
- **Responsive & Accessibility**: The Ready for Enrollment queue, student list, student workspace, document area, and status dialogs MUST function on desktop, laptop, and tablet. Every operation MUST be reachable by keyboard, focus MUST move deliberately into and out of dialogs and back to the triggering control, validation errors MUST be programmatically associated with their fields and announced, and status, completeness, and eligibility indicators MUST NOT rely on color alone.
- **UI States**: Every surface MUST define loading, populated, empty, error, and forbidden states independently — the queue, the student list, the profile, guardian information, documents, notes, timeline, and financial summary each resolve on their own so one slow or forbidden area does not blank the workspace. A document-incomplete student MUST be a first-class presented state, not an error. Every action MUST expose loading, success, and failure feedback. Silent failures are prohibited.
- **Reuse**: The queue and student list MUST both use the shared table implementation with its search, filter, sort, pagination, loading, and empty behaviors. Forms MUST use the shared form field, validation, and dialog components; documents MUST use the shared upload and file-list components; status, completeness, and eligibility MUST use the shared badge; timeline MUST use a shared activity-list pattern, established here if it does not yet exist. No student-specific variant of an existing shared pattern may be introduced.
- **Frontend Boundary**: Pages orchestrate only. Conversion, code generation, validation, completeness derivation, eligibility, status-transition, document-ownership, and permission rules live in the feature layer behind typed service functions. Pages and presentational components MUST NOT access data directly, and MUST NOT recompute eligibility or completeness locally. The current data source MUST sit entirely behind those service functions so a real service can replace it without changing any page or component.
- **AI & Future Context**: The module MUST expose a typed, permission-scoped student context — identity, enrollment, status, completeness, eligibility with blocking reasons, and financial snapshot identity — sufficient for future automation, reporting, and AI agents to reason about a student without reading internal records. Authorization, validation, immutability, and audit obligations apply identically to automated callers; no automated path may bypass a rule a human path enforces, including the requirement that conversion be a deliberate authorized act. Tenant and branch scope MUST be carried on every read and write even where multi-tenancy is deferred.

### Key Entities

- **Student**: An officially enrolled person produced from an approved admission. Holds identity, enrollment, guardian, status, completeness, notes, and audit-ready information. Never created manually, never permanently deleted.
- **Student Identity**: The personal facts of the student — full name, phone number, parent phone number, national identifier, date of birth, address, qualification, and graduation year.
- **Student Code**: The system-generated, immutable, globally unique identifier composed of academic year, branch code, and sequence.
- **Enrollment Queue Entry**: An approved, not-yet-converted admission awaiting a deliberate conversion action, visible within the reading employee's authorization scope.
- **Student Enrollment**: The immutable academic placement — academic product, program batch where the product is a Professional Program, registration branch, study branch, and academic year.
- **Guardian**: The parent or guardian information carried with the student — parent name, parent phone, and parent national identifier.
- **Student Document**: A student-owned file of a configured document type, with its file metadata, uploader, upload time, current-or-superseded state, and independence from the admission copy it originated from.
- **Document Type**: A configurable evidence category with its applicability, required-or-optional status, and permitted formats and sizes.
- **Document Completeness**: The derived state indicating whether every configured required document type is satisfied for a student, together with the list of outstanding types.
- **Student Status**: The lifecycle state of the student — Active, Suspended, Graduated, Withdrawn, or Archived.
- **Academic Eligibility**: The derived determination of whether a student may participate in academic operations, satisfied only when the status is Active and document completeness is satisfied, carrying the blocking conditions when it is not.
- **Status Change**: An immutable transition record carrying prior status, resulting status, acting employee, time, and reason.
- **Private Notes**: A single internal remark field per student, readable and writable only by authorized roles.
- **Timeline Event**: An immutable, chronologically ordered record of a significant occurrence, carrying its type, acting employee, time, and reference to the affected record.
- **Financial Snapshot**: The read-only academic price, reductions, required amount, and currency accepted at admission approval, preserved for the finance layer and unchangeable within this module.
- **Admission Link**: The stable reference connecting a student to the single approved admission that produced them, enforcing the one-admission-one-student rule.
- **Student Context**: A permission-scoped read projection of identity, enrollment, status, completeness, eligibility, and financial snapshot identity, published for consumption by other modules.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of students in the system trace to exactly one approved admission, and no admission is linked to more than one student.
- **SC-002**: 100% of students carry a system-generated student code matching the defined format, and 0% were supplied by an employee.
- **SC-003**: Under at least 1,000 concurrent conversions within the same academic year and branch, zero duplicate student codes are issued and zero conversions fail for reasons other than a stated business rule.
- **SC-004**: An employee converting a queued admission sees the resulting student record in under 10 seconds, including the transfer of its documents.
- **SC-005**: An employee finds a specific student from the full student population in under 30 seconds using search or filters, on the first attempt, in at least 95% of attempts.
- **SC-006**: Student search and filtered list results return in under 2 seconds for a population of at least 50,000 students.
- **SC-007**: 100% of attempts to modify enrollment information, the student code, the financial snapshot, or a recorded timeline event are refused, and none leaves the stored data altered.
- **SC-008**: 100% of attempted status changes outside the permitted transitions are refused, with the reason stated.
- **SC-009**: 100% of students who are not both Active and document-complete are reported ineligible for academic operations, each with its blocking conditions named.
- **SC-010**: 100% of students created with missing required documents exist as readable, operable records, confirming that completeness gates eligibility and never existence.
- **SC-011**: Every one of the seven timeline event types is produced by its corresponding action, and no timeline event is produced by an action that failed validation.
- **SC-012**: 100% of rejected requests leave the stored data byte-for-byte unchanged, with no partially applied update and no orphaned document.
- **SC-013**: 0% of students, documents, notes, timeline entries, or queue entries are reachable by an employee outside the authorized branch or role scope, including by direct identifier.
- **SC-014**: Every duplicate national identifier is rejected before persistence, with a zero rate of duplicates reaching storage under concurrent submission.
- **SC-015**: The published student context supplies everything Student Finance needs to raise an invoice against an enrollment, verified by a consuming integration test with no additional read into this module's internals.
- **SC-016**: Every operation in the module is reachable and completable by keyboard alone, and every validation error is announced to assistive technology.

## Assumptions

- **Repository scope**: This repository is the platform frontend, and its constitution governs frontend architecture. The stated technical constraints — Prisma ORM, Swagger documentation, standard API responses, global validation, role-based authorization, and local file storage — describe the service that backs this module, not this repository's code. They are recorded here as constraints for `/speckit-plan` to allocate, and are deliberately kept out of the requirements above, which stay technology-agnostic. If this spec is intended for a separate backend repository, it should be moved there before planning.
- **Relationship to `specs/006-student-management`**: An earlier specification of this module already exists, written from the frontend workspace perspective. This specification is written from the module-capability perspective described in the new input. The two overlap substantially and should be reconciled — either by superseding 006 or by scoping this one explicitly to the service layer — before either proceeds to planning.
- **Admissions contract**: Admissions is the upstream module and already produces an approved admission carrying an immutable decision snapshot with the academic selection, assignments, and financial figures. This module reads that snapshot and does not re-derive it. The Ready for Enrollment queue is a read over approved, unconverted admissions; whether it is materialized here or projected from Admissions is a planning decision.
- **Student code sequence scope**: The sequence resets per academic year and branch, since the academic year and branch code already qualify the code. The example `2027-CAI-00001` implies a five-digit zero-padded sequence; behavior beyond 99,999 students in one year and branch is treated as out of range and should be confirmed if that volume is plausible.
- **Branch code source**: The branch code embedded in the student code is drawn from the study branch, as that is where the student actually attends. If registration branch is the intended source, this must be corrected before planning, as the code is immutable once issued.
- **Academic year**: The academic year is a configured organizational value carried from the admission, not calculated from the enrollment date.
- **Financial snapshot content**: The financial figures preserved at conversion are those the Admissions module recorded as accepted at approval — academic price, reductions, resulting required amount, and currency. This module stores and republishes them without interpretation.
- **National identifier optionality**: Some applicants may reach approval without a national identifier. Uniqueness is enforced only over values that are present; an absent identifier does not block conversion.
- **Required-document configuration changes**: Adding or removing a required document type re-evaluates existing students' completeness. Students are not grandfathered, since completeness expresses a current compliance position rather than a historical one.
- **Document retention**: Superseded documents are retained rather than overwritten, following standard practice for records with a compliance dimension. No retention period is specified; documents persist for the life of the archived student record.
- **Concurrency**: Conversion, student-code issuance, status change, and uniqueness enforcement are assumed to run under a guarantee that two simultaneous requests cannot both succeed. The enforcement mechanism is a planning decision.
- **Actors**: All actors are internal employees. Students and guardians have no access to this module. Employee identity, roles, and branch scope come from the existing platform authorization context.
- **Timeline versus audit**: The timeline is the operational, employee-facing account of what happened to a student. Audit events are the separate, system-facing record for a future audit-log consumer. Both are produced by the same actions; neither replaces the other.
- **Deferred by scope**: Payments, attendance, exams, grades, certificates, CRM, and AI features are out of scope. Multiple guardians per student, guardian records as independent entities, and student-initiated changes to enrollment are also out of scope; the enrollment immutability rule leaves the extension point open for a future academic workflow.
