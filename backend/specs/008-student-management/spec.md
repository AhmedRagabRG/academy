# Feature Specification: Student Management

**Feature Branch**: `[008-student-management]`

**Created**: 2026-08-04

**Status**: Ready for planning

**Input**: User description: "Manage enrolled students after admission approval: convert approved admissions into students, maintain the student profile, guardian information, enrollment information, documents, academic status and lifecycle, notes and timeline, so that Students becomes the primary entity for Student Finance and reporting."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Convert an Approved Admission into a Student (Priority: P1)

The Admissions module hands an approved, enrollment-ready admission to Student Management, which creates exactly one student with an allocated student code, a frozen enrollment record, carried-over admission information, and an initial lifecycle entry. Repeating the same handoff never produces a second student.

**Why this priority**: No other student capability exists until a student record exists, and a duplicated student would corrupt every downstream financial and reporting consumer.

**Independent Test**: Hand off approved admissions for each offering kind, retry the identical handoff, and verify one student per approval snapshot with a unique code, an active status, a frozen enrollment, protected admission information, copied student-owned documents, and the initial lifecycle entry.

**Acceptance Scenarios**:

1. **Given** an approved, enrollment-ready admission, **When** intake is performed, **Then** exactly one student is created with a unique organization-scoped student code, active status, version 1, a frozen enrollment, carried-over admission information, and one initial lifecycle entry whose previous status is empty.
2. **Given** an approved admission holding current documents, **When** intake is performed, **Then** those documents are retrieved through the Admissions public read-only interface and copied into student-owned documents carrying their file references and metadata, and no Admissions storage is read directly.
3. **Given** a completed conversion, **When** the admission's documents are later replaced, archived, or otherwise changed, **Then** the student's documents are unaffected, and the reverse is equally true.
4. **Given** an intake that already succeeded, **When** the identical handoff is retried, **Then** the same student is resolved and no second student, enrollment, lifecycle entry, or copied document is created.
5. **Given** an admission that is not approved, not enrollment-ready, or that changed after it was read, **When** intake is attempted, **Then** it is refused with the matching distinguishable reason and no partial student, enrollment, or document record remains.
6. **Given** a Professional Program without a batch, or a Professional Diploma or Training Course carrying a batch, **When** intake is attempted, **Then** it is refused for violating the batch rule.
7. **Given** a created student, **When** any request attempts to create a student directly or delete a student, **Then** no such capability exists.

---

### User Story 2 - Find, Open, and Export Student Records (Priority: P2)

Authorized employees search, filter, sort, and page through students inside their branch scope, open a complete student record with its enrollments, document completion, permitted actions and lifecycle history, and export the current result set without exposing sensitive personal data in list views.

**Why this priority**: Daily operations depend on locating the right student safely; the list is the entry point to every other student action.

**Independent Test**: Seed a large student population across branches, departments, offerings, batches, statuses, and assigned employees, exercise every documented query, inspect list redaction and detail completeness, verify out-of-scope refusal, and export an authorized result set.

**Acceptance Scenarios**:

1. **Given** students across branches, departments, offerings, batches, statuses, and assigned employees, **When** supported search, filters, sorting, and paging are applied, **Then** only matching in-scope students are returned in stable order with correct total, page, limit, and page-count information.
2. **Given** a list result, **When** it is displayed, **Then** every phone value is masked to its last four digits and national identity, address, documents, notes, timeline, and financial data are absent.
3. **Given** Arabic names written with different letter forms or Arabic-Indic digits, **When** a search term is supplied, **Then** matching applies the same normalization the client applies and returns the same records.
4. **Given** an in-scope student, **When** the detail record is requested, **Then** it returns the profile, assignment, protected admission information, enrollments, server-computed document completion, permitted status actions, a populated per-record permission set, and lifecycle history.
5. **Given** a student outside the caller's branch scope, **When** a detail or export request is made, **Then** it is refused with the distinct out-of-scope reason rather than a generic refusal, and the record is not disclosed.
6. **Given** a page number beyond the result set, **When** the list is requested, **Then** an empty result with correct paging information is returned rather than a failure.
7. **Given** an authorized export request, **When** it is executed, **Then** it applies the caller's current query, branch scope, permission, and the same sensitive-data rules as the list.

---

### User Story 3 - Maintain the Student Profile (Priority: P3)

Authorized employees correct a student's contact information, address, personal details, guardian contact, and assignment, while the system refuses any attempt to change service-owned or admission-carried information and protects concurrent editors from silently overwriting each other.

**Why this priority**: Student contact and assignment data drives communication, branch scoping, and every downstream operational report.

**Independent Test**: Update every editable field with valid and invalid values, submit stale expected versions, attempt each protected field, and attempt an update on an archived student.

**Acceptance Scenarios**:

1. **Given** valid identity and assignment values and the student's current version, **When** an authorized employee submits a profile update, **Then** the change is applied atomically, the version advances, and the timeline records the profile update.
2. **Given** identity values violating the published configurable identity rules, **When** an update is attempted, **Then** it is refused with field-level findings and no partial change is stored.
3. **Given** a student below the configured minor age threshold, **When** a guardian phone is absent, **Then** the update is refused; **Given** a blank national identity, **When** no alternative identity reason is supplied, **Then** the update is refused.
4. **Given** display labels submitted alongside identifiers, **When** the update is processed, **Then** labels are resolved from the identifiers and the submitted label values are ignored.
5. **Given** an attempt to change the student code, status, admission-carried information, lifecycle history, archival fields, or audit fields through the profile update, **When** it is submitted, **Then** those values remain unchanged.
6. **Given** a stale expected version, **When** an update is submitted, **Then** it is refused as a version conflict and the current version is returned as a first-class value.
7. **Given** an archived student, **When** a profile update is attempted, **Then** it is refused with the archived-read-only reason directing the caller to reactivate first.

---

### User Story 4 - Own and Maintain Student Documents (Priority: P4)

Students own their academic documents after enrollment. Authorized staff upload, replace, and archive files against the published document types, with append-only version history and server-computed completion, independently of the originating admission.

**Why this priority**: Document completeness gates academic operations and audit, and student-owned documents must survive any later change to the admission record.

**Independent Test**: Upload each published type, exercise every rejection path, replace and archive documents, repeat an upload with the same attempt identifier, and verify ordering, version history, completion counts, and independence from admission documents.

**Acceptance Scenarios**:

1. **Given** a published document type, **When** a file within its accepted types and size limit is uploaded, **Then** a new current version is stored with its file metadata, uploader, and time, and a timeline event is recorded.
2. **Given** an existing document, **When** it is replaced, **Then** a new version becomes current, every earlier version remains retrievable, and no version is removed.
3. **Given** an existing document, **When** it is archived with an optional reason, **Then** its state becomes archived, its versions remain retrievable, and further modification of it is refused.
4. **Given** the same upload attempt identifier, **When** the upload is retried, **Then** it resolves to the already-stored version rather than creating a duplicate version.
5. **Given** a zero-byte file, an unaccepted file type, or a file above the type's size limit, **When** upload is attempted, **Then** each is refused with its own distinguishable reason and no unusable current version remains.
6. **Given** a document list, **When** it is returned, **Then** required types appear first, then remaining types ordered by their Arabic label, and completion counts are server-computed.
7. **Given** a document type that permits multiple files, **When** several files are uploaded, **Then** all are retained; **Given** a single-file type, **When** a second file is uploaded, **Then** it becomes a new version rather than a second document.
8. **Given** a later change to the originating admission's documents, **When** the student's documents are read, **Then** they are unaffected.

---

### User Story 5 - Govern the Student Lifecycle (Priority: P5)

Authorized employees move students through the active, suspended, graduated, withdrawn, and archived lifecycle using only permitted transitions, supplying reasons where required, individually or in bulk, with every transition permanently recorded.

**Why this priority**: Lifecycle status determines which students may participate in future academic and financial operations, so uncontrolled transitions would corrupt downstream eligibility.

**Independent Test**: Attempt every permitted and forbidden status pair with and without reasons and permissions, exercise correction out of terminal statuses and reactivation from archived, and submit a bulk change mixing valid and invalid items.

**Acceptance Scenarios**:

1. **Given** a permitted transition, the required permission, any required reason, and the current version, **When** it is requested, **Then** the status changes, the version advances, an immutable lifecycle entry recording previous status, new status, reason, actor, time, and source and result versions is appended, and the full updated record is returned.
2. **Given** a status pair outside the permitted transition table, **When** it is requested, **Then** it is refused with the invalid-transition reason together with the list of transitions currently allowed.
3. **Given** a transition requiring a reason, **When** no reason is supplied, **Then** it is refused with the reason-required finding; **Given** a reason longer than the permitted length, **When** it is supplied, **Then** it is refused.
4. **Given** a graduated or withdrawn student, **When** returning to active is requested, **Then** it succeeds only with the dedicated correction permission and a reason.
5. **Given** an archived student, **When** reactivation is requested, **Then** it succeeds only with the dedicated activation permission.
6. **Given** a caller lacking the permission for a specific transition, **When** it is requested, **Then** it is refused and no lifecycle entry is appended.
7. **Given** a bulk status request over several students, **When** some items succeed and others fail, **Then** every requested item reports its own outcome with its refusal reason where applicable, and successful items are not rolled back.
8. **Given** a student record, **When** it is read, **Then** the permitted status actions reflect both the current status and the caller's permissions.

---

### User Story 6 - Record Notes and Review Student History (Priority: P6)

Authorized employees record and maintain internal notes on a student and review the student's complete activity timeline, lifecycle history, financial position, and the compact context other modules consume.

**Why this priority**: Notes and history support day-to-day handovers and audit, and the context and financial reads are the contracts other modules depend on.

**Independent Test**: Create, edit, and archive notes including empty content, page the timeline across identical timestamps, filter by category, and read the financial summary in each of its available, unavailable, and forbidden states.

**Acceptance Scenarios**:

1. **Given** valid note content, **When** an authorized employee creates or edits a note, **Then** it is stored with its author, creation time, and where applicable its edit time and editor, without advancing the student's version.
2. **Given** empty or whitespace-only content, **When** a note is submitted, **Then** it is refused rather than silently stored.
3. **Given** a note whose author was later deactivated, **When** notes are read, **Then** the author's name is still returned together with an indication that the author is inactive.
4. **Given** an archived note, **When** notes are read, **Then** its history remains available and no note is permanently deleted.
5. **Given** a student with many timeline events, **When** the timeline is paged, **Then** events are returned newest-first, entries sharing an identical time are ordered deterministically, and continuing from the returned cursor yields no duplicated or skipped event.
6. **Given** a category filter, **When** the timeline is requested, **Then** only events of the requested categories are returned, each carrying its category, time, actor, originating module, and subject reference.
7. **Given** every material student action, **When** the timeline is read, **Then** a corresponding immutable event exists and no timeline event can be edited or removed.
8. **Given** the financial source is reachable, **When** the financial summary is requested, **Then** the available variant with exact monetary values is returned; **Given** the source fails, times out, or is absent, **Then** the unavailable variant with its reason is returned rather than zero values; **Given** the caller lacks financial permission, **Then** the forbidden variant is returned.
9. **Given** the compact context read, **When** it is requested by another module, **Then** it returns identity, status, assignment, enrollment targets, document completion, financial state reference, admission reference, and version, and carries no note content, document files, address, or national identity.

### Edge Cases

- A retried intake whose stored student was archived after creation resolves to that same student rather than creating a new one, and does not copy the admission's documents a second time.
- Two concurrent intakes for the same approval snapshot produce at most one student.
- An approved admission carrying no documents still converts successfully, producing a student whose document completion reports every required type as missing.
- If the Admissions document interface is unreachable or a referenced file cannot be read during intake, the whole conversion fails and leaves no student, enrollment, or partially copied document behind.
- An admission document whose type is not among the published student document types is not copied, and its absence is reflected in document completion rather than silently creating an unpublished type.
- Concurrent mutating writes using the same expected version permit at most one success; the loser receives the current version.
- An offering or batch archived after enrollment must never blank the student's enrollment labels, codes, or pinned versions, because those are frozen copies rather than live lookups.
- A student aging past the minor age threshold does not retroactively invalidate a stored guardian phone, and a student aging into the threshold requires a guardian phone only on the next update.
- A graduation year at the current year boundary is accepted, while a future year or one below the minimum graduation age relative to the birth year is refused.
- Configurable identity rules changing after a student was stored do not rewrite the stored record; the new rules apply on the next update.
- A failed upload leaves no current usable version, and a retry can safely complete the same document.
- Uploading against an archived document, or an unpublished document type key, is refused.
- Archived students remain readable and exportable for authorized historical reporting but accept no further profile, document, or note mutation until reactivated.
- Archived students are excluded from default list results unless the archived status is explicitly requested.
- A timeline read for a student with no events returns an empty page with no continuation cursor rather than a failure.
- A student whose assigned customer-service employee, department, branch, grade, or qualification was later deactivated still resolves and displays those values, marked as no longer selectable.
- Lifecycle entries, document versions, notes history, and timeline events are append-only.

## Requirements *(mandatory)*

### Functional Requirements

#### Intake and enrollment

- **FR-001**: The system MUST create students only through the documented admission intake boundary and MUST NOT expose any direct student creation or student deletion capability.
- **FR-002**: Intake MUST be idempotent on the admission's approval snapshot identifier so that any retry resolves to the same student without creating a second student, enrollment, or lifecycle entry.
- **FR-003**: Intake MUST refuse, with individually distinguishable reasons, an admission that is not enrollment-ready, an admission whose version changed after it was read, a selection violating the batch rule, and a student code collision.
- **FR-004**: Intake MUST allocate a unique organization-scoped student code, set the initial status to active and the version to 1, and append one initial lifecycle entry with an empty previous status.
- **FR-005**: Intake MUST create the student's enrollment carrying the offering kind, offering and batch identifiers, the offering and batch versions pinned at enrollment, the offering and batch labels and codes frozen as stored copies, the registration and study branches, the enrollment date, the enrollment status, and the source admission identifier.
- **FR-006**: A Professional Program enrollment MUST reference exactly one batch; a Professional Diploma or Training Course enrollment MUST NOT reference a batch.
- **FR-007**: The admission-carried information — admission identifier, admission reference, approval snapshot identifier, admission date, and enrollment date — MUST be stored on the student and MUST NOT be editable through any student operation.
- **FR-008**: Intake MUST carry the admission's financial revision reference, currency, and required amount to the Student Finance boundary; Student Management MUST NOT own, recalculate, or expose student money values of its own.
- **FR-009**: Intake MUST obtain the admission's current documents solely through a public read-only interface published by Admissions, and MUST NOT read Admissions storage directly. For each retrieved document, intake MUST create a student-owned document by copying the file reference and its metadata, so that after conversion student documents are fully independent of the admission documents and no later change on either side affects the other.
- **FR-010**: Enrollment information MUST be read-only after creation; no student operation may add, change, or remove an enrollment.

#### Profile and guardian information

- **FR-011**: The student profile MUST hold full name, primary phone, guardian name, guardian phone, national identity or an alternative identity reason, address, date of birth, qualification, graduation year, and an optional profile image.
- **FR-012**: Identity validation MUST enforce exactly the configurable rules the system publishes to clients — national identity pattern, phone pattern, minor age threshold, and minimum graduation age — and MUST NOT hardcode different values.
- **FR-013**: A guardian phone MUST be required when the student's derived age is below the minor age threshold, and an alternative identity reason MUST be required whenever the national identity is absent.
- **FR-014**: The graduation year MUST be an integer no later than the current year and no earlier than the birth year plus the minimum graduation age.
- **FR-015**: Guardian information MUST consist of exactly a guardian name and a guardian phone stored on the student identity. The guardian phone MUST follow the existing conditional requirement in FR-013. The parent national identity MUST remain evidence-backed as the parent national identity document only, and MUST NOT be duplicated as a stored or searchable student field.
- **FR-016**: Profile updates MUST accept the assignment values — registration branch, study branch, department, optional academic grade, and customer-service employee — and MUST resolve all display labels from their identifiers, ignoring any submitted label values.
- **FR-017**: Profile updates MUST refuse any change to the student code, status, admission-carried information, lifecycle history, archival fields, version, organization, or audit fields.
- **FR-018**: A profile, document, or note mutation on an archived student MUST be refused with the archived-read-only reason.
- **FR-019**: A profile image MUST be supplied as a reference produced by the shared file upload capability and MUST respect the published image type and size policy.

#### Listing, detail, and export

- **FR-020**: The student list MUST support search across full name, student code, primary phone, guardian phone, and national identity, applying the same Arabic letter folding, diacritic stripping, and Arabic-Indic digit folding the client applies.
- **FR-021**: The student list MUST support filtering by branches, departments, offerings, batches, statuses, and customer-service employees, and sorting by full name, student code, enrollment date, last update, and status.
- **FR-022**: Every list MUST be paginated with the shared page and page-size parameters, MUST enforce the maximum page size server-side, and MUST return an empty result with correct paging information for an out-of-range page rather than a failure.
- **FR-023**: List results MUST mask every phone value server-side to its last four digits and MUST omit national identity, address, documents, notes, timeline, and financial data.
- **FR-024**: List results MUST include server-computed enrollment counts and the frozen primary offering and batch labels.
- **FR-025**: Every list and detail read MUST be restricted to the caller's authorized branches unless the caller is organization-wide, and a request for a student outside that scope MUST be refused with the distinct out-of-scope reason rather than a generic refusal.
- **FR-026**: The student detail MUST return the profile, assignment, admission-carried information, enrollments, server-computed document completion, permitted status actions, lifecycle history, version, and audit references.
- **FR-027**: Every student detail MUST carry a fully populated per-record permission set covering overview, enrollments, documents, document management, notes, note management, timeline, financial, update, archive, activate, status management, status correction, and export.
- **FR-028**: Export MUST apply the caller's current query, branch scope, export permission, and the same sensitive-data rules as the list.
- **FR-029**: Archived students MUST remain queryable and exportable for authorized historical reporting and MUST be excluded from default list results unless the archived status is explicitly requested.

#### Documents

- **FR-030**: The system MUST publish the supported document types — personal photo, national identity, parent national identity, birth certificate, qualification certificate, admission declaration, and additional attachments — each with its required flag, multiplicity, accepted file types, and maximum size, and MUST enforce exactly the limits it publishes.
- **FR-031**: The system MUST support uploading, replacing, and archiving student documents, MUST keep every version append-only, and MUST expose the current version together with the full version history.
- **FR-032**: Document state MUST be one of missing, present, or archived, and archiving MUST NOT remove any version.
- **FR-033**: Document upload MUST be idempotent on the caller's upload attempt identifier so a retry resolves to the stored version rather than creating a duplicate.
- **FR-034**: Uploads MUST be re-validated server-side regardless of client checks, and a zero-byte file, an unaccepted file type, and an oversized file MUST each be refused with their own distinguishable reason.
- **FR-035**: Document listings MUST order required types first and then remaining types by their Arabic label.
- **FR-036**: Document completion counts — required types, present, missing, and archived — MUST be server-computed and MUST NOT be accepted from a client.
- **FR-037**: A modification targeting an archived document MUST be refused with the document-archived reason.

#### Lifecycle

- **FR-038**: The student lifecycle MUST consist of exactly active, suspended, graduated, withdrawn, and archived, and only transitions in the documented transition table MUST succeed.
- **FR-039**: Each transition MUST enforce its own documented permission, distinguishing routine status management, archival, reactivation from archived, and correction out of a terminal status.
- **FR-040**: A transition requiring a reason MUST refuse an absent reason, and any supplied reason MUST respect the documented maximum length.
- **FR-041**: A transition outside the table MUST be refused with the invalid-transition reason together with the transitions currently allowed.
- **FR-042**: Every successful transition MUST append an immutable lifecycle entry recording previous status, new status, reason, actor, time, source version, and result version, and MUST return the full updated student record.
- **FR-043**: The permitted status actions exposed on a student MUST reflect both the current status and the caller's permissions.
- **FR-044**: Bulk status changes MUST return an item-level outcome for every requested student, MUST expose each item's refusal reason, and MUST NOT roll back items that succeeded.
- **FR-045**: Students MUST be archived with a reason rather than permanently deleted, and archived students MUST retain their archival time and reason.

#### Notes, timeline, and summaries

- **FR-046**: The system MUST support creating, editing, and archiving internal student notes, each retaining its author, creation time, and where applicable its edit time and editor.
- **FR-047**: Note content MUST be trimmed and bounded by the documented minimum and maximum length, and whitespace-only content MUST be refused rather than stored.
- **FR-048**: Note operations MUST NOT advance the student's version and MUST NOT require an expected version.
- **FR-049**: A note author or editor MUST remain resolvable after that employee is deactivated, and the response MUST indicate that the actor is inactive.
- **FR-050**: Every student MUST maintain an immutable, append-only timeline covering at minimum admission submission and approval, student creation, enrollment addition, document upload, replacement and archival, profile update, status change, financial events, and academic events, each recording its category, time, actor, originating module, subject reference, and summary.
- **FR-051**: The timeline MUST be cursor-paginated with a monotonic sequence value participating in the cursor so that events sharing an identical timestamp are ordered deterministically and paging neither duplicates nor skips events.
- **FR-052**: The timeline MUST support filtering by event category.
- **FR-053**: Lifecycle history MUST be readable independently of the student detail.
- **FR-054**: The financial summary MUST be returned as a three-state result — available with exact monetary values, unavailable with its reason, or forbidden — and MUST NOT substitute zero values for an unreachable or failed financial source.
- **FR-055**: The system MUST expose a compact context read for other modules carrying identity, status, assignment, enrollment targets, document completion, financial state reference, admission reference, update time, and version, and carrying no note content, document files, address, or national identity.

#### Cross-cutting

- **FR-056**: The system MUST expose bounded lookup choices for branches, departments, academic grades, qualifications, customer-service employees, offerings, batches, statuses, document types, identity rules, image policy, currency, and precision.
- **FR-057**: Inactive lookup choices MUST remain identifiable with an explanation of why they cannot be newly selected, so historical records stay resolvable.
- **FR-058**: Every mutating student operation except note commands MUST require an expected version, and a mismatch MUST be refused as a version conflict exposing the current version as a first-class value.
- **FR-059**: Every operation affecting more than one record MUST be atomic, leaving no partial write when any step fails.
- **FR-060**: Every protected operation MUST enforce its documented student permission key and the caller's branch scope, including separate access to enrollments, documents, document management, notes, note management, timeline, financial data, export, status management, correction, archival, and reactivation.
- **FR-061**: Failures MUST be reported using the module's closed set of documented reasons with their documented outcome categories, MUST carry supporting details such as current version, field findings, source and target status, allowed transitions, and reasons, and MUST NOT expose internal storage details.
- **FR-062**: Every successful creation, transition, profile change, document change, note change, and archival MUST produce audit-ready event data after persistence succeeds, without requiring later changes to business logic to persist it.
- **FR-063**: Student payments, attendance, exams, grades, certificates, CRM behavior, and AI behavior MUST remain outside this feature.

### Key Entities

- **Student**: The versioned aggregate produced by admission intake, holding the student code, status, identity, assignment, admission-carried information, lifecycle history, archival data, version, and audit references.
- **Student Identity**: Personal and qualification details — name, primary phone, guardian name and guardian phone, national identity or alternative identity reason, address, birth date, qualification, graduation year, and optional profile image.
- **Student Assignment**: Registration and study branches, department, optional academic grade, and the responsible customer-service employee, each stored as an identifier with a resolvable label.
- **Admission-Carried Information**: The admission identifier, reference, approval snapshot identifier, admission date, and enrollment date, protected from any student-side change.
- **Enrollment**: The read-only projection linking a student to one offering and optional batch, with pinned source versions, frozen labels and codes, branches, enrollment date, status, and source admission.
- **Student Document**: A typed, student-owned document with a state, a current version, and an append-only version history carrying file metadata, uploader, time, and upload attempt identifier.
- **Document Type Policy**: The published set of supported document types with required flag, multiplicity, accepted file types, and size limit.
- **Status Change**: An immutable lifecycle entry recording previous status, new status, reason, actor, time, and source and result versions.
- **Student Note**: Internal commentary with author, content, creation time, and optional edit time, editor, and archival.
- **Timeline Event**: A chronological, immutable record of material student activity, carrying category, time, sequence, actor, originating module, subject reference, and summary.
- **Financial Summary Projection**: A read-only three-state view of the student's financial position owned by Student Finance.
- **Student Context Summary**: The compact, sensitive-data-free read surface other modules consume.

### API Contract Alignment *(mandatory when the feature exposes HTTP endpoints)*

- **Documented endpoints covered**: `GET /api/v1/students` · `GET /api/v1/students/export` · `GET /api/v1/students/:studentId` · `GET /api/v1/students/:studentId/enrollments` · `GET /api/v1/students/:studentId/documents` · `GET /api/v1/students/:studentId/documents/:documentId/versions` · `GET /api/v1/students/:studentId/notes` · `GET /api/v1/students/:studentId/timeline` · `GET /api/v1/students/:studentId/status-history` · `GET /api/v1/students/:studentId/financial-summary` · `GET /api/v1/students/:studentId/context-summary` · `POST /api/v1/students/intake` · `PATCH /api/v1/students/:studentId` · `PATCH /api/v1/students/:studentId/status` · `POST /api/v1/students/bulk-status` · `POST /api/v1/students/:studentId/documents` · `POST /api/v1/students/:studentId/documents/:documentId/replace` · `PATCH /api/v1/students/:studentId/documents/:documentId/archive` · `POST /api/v1/students/:studentId/notes` · `PATCH /api/v1/students/:studentId/notes/:noteId` · `PATCH /api/v1/students/:studentId/notes/:noteId/archive` · `GET /api/v1/students/lookups`. The shared `POST /api/v1/files/upload` is reused for the profile image.
- **Explicitly forbidden endpoints**: `POST /api/v1/students` and `DELETE /api/v1/students/:studentId` MUST NOT exist; the contract asserts this surface.
- **Requirements document sections**: `docs/api-data-requirements.html` §3 shared contracts (envelope, pagination, money, identifiers, concurrency, idempotency, permissions, branch scoping, errors, uploads) and §4.6 Students.
- **Required Admissions port**: intake depends on a public read-only Admissions interface returning an approved admission's current documents with their file references and metadata (FR-009). This is a module-to-module port rather than an HTTP endpoint, so it adds no route to the documented surface, but Admissions must publish it before this feature can be built.
- **Required contract amendment**: `StudentIdentity` gains a guardian name field alongside the existing guardian phone (FR-015). Per Constitution Principle III this deviation is authorized by the project owner and MUST be written into `docs/api-data-requirements.html` §4.6 — the profile field-rules table, the detail example, and the profile update payload — before implementation begins. Parent national identity is deliberately not added as a field; it remains the `parent-national-id` document.
- **Contract gaps resolved**: The feature description asks for a single private notes field, while the contract defines a structured, author-attributed notes collection with create, edit, and archive commands; per Constitution Principle III the contract wins and this specification adopts the notes collection. The feature description also lists academic year as enrollment information and as a common filter, but the documented student enrollment projection and list filter set carry no academic year; academic year therefore remains reachable only through the enrolled batch, and no undocumented field or filter is introduced.
- **Contract gaps outstanding**: none.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of approved, enrollment-ready admissions convert into exactly one student, and 100% of repeated handoffs for the same approval snapshot resolve to that same student with no duplicate student, enrollment, or lifecycle entry.
- **SC-002**: 100% of intake attempts for a non-ready, stale, or batch-rule-violating admission are refused with a distinguishable reason and leave no partial student, enrollment, or document record.
- **SC-003**: 100% of an approved admission's documents whose type is published for students are present as student-owned documents immediately after conversion, and 100% of subsequent changes on either the admission or the student leave the other side unchanged.
- **SC-004**: 100% of student records retain their original enrollment labels, codes, and pinned source versions after the referenced offering or batch is later changed or archived.
- **SC-005**: 100% of attempts to change the student code, status, admission-carried information, lifecycle history, or audit fields through a profile update leave those values unchanged.
- **SC-006**: 100% of list and export results disclose no student outside the caller's branch scope, and 100% of list rows expose a masked phone with no national identity, address, document, note, timeline, or financial data.
- **SC-007**: 100% of status changes outside the documented transition table are refused together with the currently allowed transitions, and 100% of reason-required transitions without a reason are refused.
- **SC-008**: Every successful profile, document, note, status, and archival operation produces exactly one corresponding immutable timeline or lifecycle entry.
- **SC-009**: Repeated document uploads carrying the same upload attempt identifier create no duplicate document version, and no failed upload leaves a usable current version.
- **SC-010**: 100% of financial summary reads against an unreachable, failing, or timed-out financial source return the unavailable result with its reason and never zero monetary values.
- **SC-011**: 100% of concurrent mutating writes submitting the same expected version result in at most one success, with the loser receiving the current version.
- **SC-012**: With a population of at least 20,000 students, 95% of searches, filters, sorts, and page changes visibly complete within two seconds under normal operating conditions.
- **SC-013**: An authorized employee can locate a student and complete a profile correction, a document upload, or a status change in under three minutes.
- **SC-014**: At least 95% of authorized users complete the primary find, update, document, and status tasks on their first attempt using the returned guidance.
- **SC-015**: Archived students remain retrievable for authorized historical reporting in 100% of cases while accepting no further profile, document, or note mutation.
- **SC-016**: The compact context read returns in 100% of cases without any note content, document file, address, or national identity, so downstream modules can consume it without additional redaction.

## Assumptions

- Identity & Access Management supplies authenticated actors, employee identities and their active state, permission keys, organization membership, and authorized branch scope.
- Admissions owns the approval decision and exposes an enrollment-ready approval snapshot; Student Management only consumes that handoff and never reads or writes Admissions data directly.
- Admissions will publish a read-only document interface returning an approved admission's current documents with their file references and metadata. This port is a prerequisite for intake and is owned by Admissions, not by this feature.
- A document copied at intake is a new student-owned record referencing the same stored file; neither side's later document activity affects the other, and no shared mutable document state remains after conversion.
- Guardian name is being added to the student identity by an approved contract amendment; until `docs/api-data-requirements.html` §4.6 carries it, the field is specified here but not yet contract-backed.
- Organization & Settings supplies branches, departments, academic grades, qualifications, currency, precision, and the configurable identity rules the module publishes and enforces.
- Academic Catalog and Program Batches supply the offering and batch identity, code, label, and version that intake freezes onto the enrollment; the module never re-resolves them from a live lookup afterwards.
- Student Finance owns all student money; Student Management stores no balances and renders the financial position solely as a read-only three-state projection.
- Student codes are allocated by the service, unique within the organization, and immutable once assigned.
- Academic year is a property of the enrolled batch rather than of the student, and is therefore neither stored on the student nor offered as a documented student list filter.
- Notes follow the contract's structured collection rather than the single free-text field named in the feature description, and are protected by the dedicated note view and management permissions.
- Local file storage backs both student documents and profile images, while the business contract depends on stable file metadata rather than storage paths, so the store can later be replaced without touching business logic.
- The profile image is uploaded through the shared file upload capability and attached to the student as a reference on a subsequent profile update.
- Dates are evaluated using the organization's configured time zone and calendar date rules, and derived age is computed against the current date at validation time.
- Audit persistence is not built here; the module emits audit-ready events that a future audit subscriber can consume without changing business logic.
- Attendance, exams, grades, certificates, CRM, and AI behavior are deferred to future modules and place no requirement on this feature beyond the stable context read.
