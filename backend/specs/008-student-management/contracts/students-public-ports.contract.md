# Public Ports Contract: Students Integrations

Ports expose stable domain facts, never Prisma models or repositories. Every cross-module read in this feature goes through one of these symbols (Principle II). Dependency failure stays distinguishable from an ineligible outcome.

## Ports Consumed by Students

### Admissions Enrollment Port — `ADMISSIONS_ENROLLMENT_PORT`

**Already exists** and is already exported by `AdmissionsModule` (`src/modules/admissions/types/admissions-enrollment.port.ts`). No change required.

- `getEnrollmentReadiness(admissionId)` → `{ready: true, handoff} | {ready: false, findings[]}`. The handoff carries admission identity and version, applicant, academic target with pinned versions, branches, department, customer-service employee, document policy snapshot id, verified document version ids, and the financial revision with currency, precision and required amount in minor units.
- `acknowledgeEnrollment({admissionId, approvalSnapshotId, externalStudentReference, expectedVersion})` → marks the admission enrolled. Called by Students **after** the student is committed, so a failure here never orphans a student.

### Admissions Document Read Port — `ADMISSIONS_DOCUMENT_READ_PORT`

**New — Admissions must publish this before intake can be built** (spec FR-009, research R-001).

- `listCurrentDocuments(admissionId)` → for each current admission document: `requirementKey`, `storageFileId`, `fileDescriptor`, `originalName`, `mimeType`, `byteSize`, `previewLocator?`, `uploadedAt`, `uploadedBy`, `sourceVersionId`.
- Read-only. It exposes no admission document repository, no policy snapshot internals, and no verification decisions.
- Students maps `requirementKey` → its own `typeKey` through an explicit constant map and skips any key with no student equivalent.
- Returning an empty list is a valid outcome (an approved admission may carry no documents); an unreachable port is a failure that aborts the whole intake transaction.

### Catalog and Program Batches Ports

Consumed **only at intake**, to resolve the offering and batch label, code and version that are then frozen onto the enrollment. Never re-consulted afterwards — archiving a catalog product must not blank a student's history (research R-011).

### Organization Master Data Port — `ORGANIZATION_MASTER_DATA_PORT`

- Resolve and list branches, departments, qualifications, academic grades, currency and precision, preserving inactive entries with a `disabledReason` so historical rows stay resolvable.
- Publish the configurable identity rules — `nationalIdPattern`, `phonePattern`, `minorAgeThreshold`, `minimumGraduationAge` — which Students both serves through `/students/lookups` and enforces. The API must enforce exactly the values it publishes.
- Resolve the organization's active academic year, used for the student code when there is no batch (research R-002).

### IAM Employee Reference Port — `IAM_EMPLOYEE_REFERENCE_PORT`

- Resolve bounded employee ids to name, active state, organization and assignment eligibility.
- Used to re-resolve assignment labels on write and to attach the `active` flag to every `ActorRef` at read time, so a note keeps its author's name after that employee is deactivated.
- Exposes no credentials, sessions or role internals.

### Storage Port — `STORAGE_SERVICE`

- `store(file, purpose, idempotencyKey)` → `FileDescriptor`, with purposes `student-document` and `student-photo` already declared.
- Business code receives and persists descriptors only; it never builds, joins or inspects a filesystem path.
- Intake reuses the admission's existing `storageFileId` rather than re-storing bytes.

### Student Finance Reader Port — `STUDENT_FINANCE_READER_PORT`

**Defined by Students, implemented by Student Finance (module 009).** Until 009 ships, Students provides a default adapter returning `{state: "unavailable", reason: "finance-module-absent"}` (research R-007).

- `getSummary(studentId)` → `{state:"available", summary} | {state:"unavailable", reason}`.
- The `forbidden` variant is produced by Students itself from the caller's permissions, before the port is consulted, so an unauthorized caller cannot infer whether Finance is running.
- Zeros are never substituted for a failed lookup.

---

## Port Published by Students

### Students Context Port — `STUDENTS_CONTEXT_PORT`

The stable read surface for Student Finance, reporting and future academic modules. This is the module's outward contract; consumers must not read student tables.

- `getContext(studentId)` → `studentId`, `studentCode`, `fullName`, `status`, `assignment` (registration branch, study branch, department, academic grade), `enrollmentTargets[]` (kind, offeringId, batchId, status), `documentCompletion`, `financialSummaryRef`, `admissionRef`, `updatedAt`, `version`.
- Carries **no** note content, document files, address or national identity — deliberately, so consumers need no additional redaction.
- `documentCompletion` combined with `status === "active"` is how consumers derive operational eligibility; Students stores no eligibility flag (research R-006).
- `resolveMany(studentIds[])` for batch consumers, bounded to a documented maximum so it cannot become an unbounded read.

### Domain events

Emitted through `DomainEventBus` **after** the transaction commits, carrying actor, target, operation and resulting state. Audit persistence is added later by subscribing — never by editing business logic (Principle X).

`student.created` · `student.admission-converted` · `student.profile-updated` · `student.guardian-updated` · `student.status-changed` · `student.archived` · `student.document-uploaded` · `student.document-replaced` · `student.document-archived` · `student.note-added` · `student.note-updated`.
