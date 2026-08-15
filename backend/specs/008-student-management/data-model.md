# Phase 1 Data Model: Student Management

Prisma models added to `prisma/schema.prisma`. All IDs are `String @db.Uuid`, all timestamps `DateTime @db.Timestamptz`, all calendar dates `@db.Date`. The migration is purely additive — no existing model is altered.

## Enums

```text
StudentStatus            ACTIVE | SUSPENDED | GRADUATED | WITHDRAWN | ARCHIVED
StudentEnrollmentStatus  ACTIVE | COMPLETED | SUSPENDED | WITHDRAWN
StudentOfferingKind      PROFESSIONAL_PROGRAM | PROFESSIONAL_DIPLOMA | TRAINING_COURSE
StudentDocumentState     MISSING | PRESENT | ARCHIVED
StudentTimelineCategory  ADMISSION_SUBMITTED | ADMISSION_APPROVED | STUDENT_CREATED |
                         ENROLLMENT_ADDED | DOCUMENT_UPLOADED | DOCUMENT_REPLACED |
                         DOCUMENT_ARCHIVED | PROFILE_UPDATED | STATUS_CHANGED |
                         FINANCIAL_EVENT | ACADEMIC_EVENT
```

`StudentDocumentState` deliberately differs from `AdmissionDocumentVersionStatus` — Students has no verification workflow and no `withdrawn` state (research R-009). There is **no** eligibility enum (research R-006).

---

## Student

The aggregate root. One row per enrolled student.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `organizationId` | uuid | scoping |
| `studentCode` | string | `2027-CAI-00001`; `@@unique([organizationId, studentCode])`; immutable |
| `status` | `StudentStatus` | default `ACTIVE` |
| **Identity** | | |
| `fullName` | string | trim, 3…120 |
| `searchName` | string | folded copy of `fullName`, indexed (research R-008) |
| `primaryPhone` | string | matches published `phonePattern` |
| `guardianName` | string? | trim 3…120 — **pending doc amendment** |
| `guardianPhone` | string? | required when derived age < `minorAgeThreshold` |
| `nationalId` | string? | `@@unique([organizationId, nationalId])` where not null |
| `alternativeIdentityReason` | string? | max 250; required when `nationalId` is null |
| `address` | string | trim, 3…250 |
| `dateOfBirth` | date | not future; derived age 0…120 |
| `qualificationId` / `qualificationLabel` | uuid / string | label re-resolved on write |
| `graduationYear` | int | ≤ current year, ≥ birthYear + `minimumGraduationAge` |
| `profileImageFileId` | string? | storage descriptor id, never a path |
| **Assignment** (labels denormalized for list speed, re-resolved on every write) | | |
| `registrationBranchId` / `registrationBranchLabel` | uuid / string | branch scoping key |
| `studyBranchId` / `studyBranchLabel` | uuid / string | |
| `departmentId` / `departmentLabel` | uuid / string | |
| `academicGradeId` / `academicGradeLabel` | uuid? / string? | optional |
| `customerServiceEmployeeId` / `customerServiceEmployeeName` | uuid / string | |
| **System — carried from admission, never editable** | | |
| `admissionId` | uuid | |
| `admissionReference` | string | |
| `approvalSnapshotId` | uuid | intake idempotency key |
| `admissionDate` | date | |
| `enrollmentDate` | date | |
| **Lifecycle & audit** | | |
| `archivedAt` / `archiveReason` | timestamptz? / string? | set by the archive transition |
| `timelineSequence` | int | monotonic counter for timeline cursors (research R-005) |
| `version` | int | optimistic concurrency, default 1 |
| `createdAt` / `createdById` / `createdByName` | | `ActorRef` is materialized as id + name + resolved active flag |
| `updatedAt` / `updatedById` / `updatedByName` | | |

**Indexes**: `[organizationId, status]`, `[organizationId, registrationBranchId]`, `[organizationId, studyBranchId]`, `[organizationId, departmentId]`, `[searchName]`, `[organizationId, updatedAt]`, `[organizationId, customerServiceEmployeeId]`.

**Relations**: `enrollments[]`, `documents[]`, `notes[]`, `statusHistory[]`, `timelineEvents[]`.

**Protected on update** (FR-017): `id`, `organizationId`, `studentCode`, `status`, all five system fields, `statusHistory`, `archivedAt`, `archiveReason`, `version`, audit fields.

---

## StudentEnrollment

Read-only projection created at intake. No student operation adds, changes or removes a row (FR-010).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `studentId` | uuid FK → Student | `onDelete: Restrict` |
| `offeringKind` | `StudentOfferingKind` | |
| `offeringId` | uuid | |
| `offeringVersionAtEnrollment` | int | pinned |
| `offeringLabel` / `offeringCode` | string | **frozen copies** — never re-resolved (research R-011) |
| `batchId` | uuid? | non-null iff `offeringKind = PROFESSIONAL_PROGRAM` |
| `batchVersionAtEnrollment` | int? | |
| `batchLabel` / `batchCode` | string? | frozen copies |
| `registrationBranchLabel` / `studyBranchLabel` | string | frozen copies |
| `academicYear` | int | resolved at intake; feeds the student code (research R-002) |
| `enrollmentDate` | date | |
| `status` | `StudentEnrollmentStatus` | default `ACTIVE` |
| `sourceAdmissionId` | uuid | |

**Batch rule (FR-006)** enforced in the service and backed by a DB check constraint: `PROFESSIONAL_PROGRAM` requires `batchId IS NOT NULL`; the other two kinds require `batchId IS NULL`. Violation → `enrollment-batch-rule-violated`.

**Index**: `[studentId]`, `[offeringId]`, `[batchId]`.

---

## StudentDocument

Student-owned from the moment of intake. One row per `(student, typeKey)` except `additional-attachment`, which permits several.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `studentId` | uuid FK → Student | |
| `typeKey` | string | one of the seven published keys (research R-009) |
| `state` | `StudentDocumentState` | `MISSING` rows are **not** persisted — absence is computed |
| `currentVersionId` | uuid? unique | FK → StudentDocumentVersion |
| `archivedAt` / `archiveReason` | timestamptz? / string? | reason max 250 |
| `version` | int | |
| `createdAt` / `createdById`, `updatedAt` / `updatedById` | | |

`@@unique([studentId, typeKey])` for single-instance types. `additional-attachment` rows are exempt, so uniqueness is enforced by a partial index rather than a plain composite unique.

**Ordering** (FR-035): required types first, then alphabetical by Arabic label — applied in the mapper, not the DB, since the label set is a module constant.

---

## StudentDocumentVersion

Append-only. Never deleted, never mutated.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `documentId` | uuid FK → StudentDocument | |
| `versionNumber` | int | `@@unique([documentId, versionNumber])` |
| `storageFileId` | string | shared with the admission copy at intake — no byte duplication (research R-001) |
| `fileDescriptor` | Json | read through a narrowing guard, never `any` |
| `fileName` / `mimeType` / `byteSize` | string / string / int | re-validated server-side (FR-034) |
| `previewLocator` | string? | |
| `uploadAttemptId` | string | `@@unique([documentId, uploadAttemptId])` — idempotency (FR-033) |
| `uploadedAt` / `uploadedById` / `uploadedByName` | | |
| `copiedFromAdmissionVersionId` | uuid? | provenance only; **not** a FK — no cross-module referential coupling |

`copiedFromAdmissionVersionId` is a plain uuid column, deliberately not a relation: a foreign key into `AdmissionDocumentVersion` would make the two modules' rows structurally dependent and break the independence FR-009 requires.

---

## StudentStatusChange

Immutable lifecycle entry, append-only.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `studentId` | uuid FK → Student | |
| `fromStatus` | `StudentStatus?` | null **only** for the intake-created initial row |
| `toStatus` | `StudentStatus` | |
| `reason` | string? | max 500; required per the transition table (research R-004) |
| `actorId` / `actorName` | | the intake row uses the system actor |
| `occurredAt` | timestamptz | |
| `sourceVersion` / `resultVersion` | int | |

**Index**: `[studentId, occurredAt]`.

---

## StudentNote

Author-attributed collection. Note commands never advance `Student.version` (FR-048).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `studentId` | uuid FK → Student | |
| `content` | string | trimmed, 1…2000; whitespace-only refused → `note-content-empty` |
| `authorId` / `authorName` | | preserved after the employee is deactivated (FR-049) |
| `createdAt` | timestamptz | |
| `editedAt` / `editedById` / `editedByName` | | null until first edit |
| `archivedAt` | timestamptz? | archived notes are retained, never deleted |

Actor `active` flags are resolved at read time through `IAM_EMPLOYEE_REFERENCE_PORT`; only id and name are stored, so a rename does not rewrite history.

**Index**: `[studentId, createdAt]`.

---

## StudentTimelineEvent

Immutable, append-only, cursor-paginated.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `studentId` | uuid FK → Student | |
| `category` | `StudentTimelineCategory` | |
| `occurredAt` | timestamptz | |
| `sequence` | int | from `Student.timelineSequence`; `@@unique([studentId, sequence])` |
| `actorId` / `actorName` | | |
| `origin` | string | `admissions \| students \| finance \| academic` |
| `subjectRef` | string? | id of the status change, document, note… |
| `summary` | string | Arabic |

**Index**: `[studentId, sequence DESC]` — the cursor page predicate (research R-005).

---

## StudentIntakeKey

Idempotency ledger (research R-010).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `organizationId` | uuid | |
| `approvalSnapshotId` | uuid | `@@unique([organizationId, approvalSnapshotId])` |
| `studentId` | uuid | the resolved result |
| `createdAt` | timestamptz | |

---

## StudentCodeCounter

Collision-safe sequence allocation (research R-002).

| Field | Type | Notes |
|---|---|---|
| `organizationId` | uuid | composite PK part |
| `academicYear` | int | composite PK part |
| `branchId` | uuid | composite PK part |
| `nextValue` | int | default 1, incremented atomically in the intake transaction |
| `updatedAt` | timestamptz | |

`@@id([organizationId, academicYear, branchId])` — same shape as the proven `AdmissionReferenceCounter`.

---

## Derived, never stored

| Value | Computation | Exposed on |
|---|---|---|
| `documentCompletion` | count of published required types vs. present / missing / archived documents | detail, `context-summary` |
| `enrollmentCount` | `COUNT(StudentEnrollment WHERE studentId)` | list row |
| `availableStatusActions` | transition table filtered by current status ∩ caller permissions | detail |
| `permissions` | `RecordPermissionsHelper.compute` over the 15 `students.*` keys | detail |
| `phoneHint` | `••••••` + last 4 digits, produced in the mapper | list row only |
| `primaryOfferingLabel` / `primaryBatchLabel` | first active enrollment's frozen labels | list row |
| **operational eligibility** | `status = ACTIVE` **and** `documentCompletion.missing = 0` | consumers compute it; see research R-006 |

## Entity relationship summary

```text
Student 1─┬─* StudentEnrollment
          ├─* StudentDocument 1─* StudentDocumentVersion
          ├─* StudentNote
          ├─* StudentStatusChange
          └─* StudentTimelineEvent

Student 1─1 StudentIntakeKey        (by approvalSnapshotId)
StudentCodeCounter                  (standalone, per org+year+branch)
```

Cross-module references (`admissionId`, `offeringId`, `batchId`, branch and employee ids) are stored as plain uuid columns with **no** Prisma relation, preserving module independence per Principle II.
