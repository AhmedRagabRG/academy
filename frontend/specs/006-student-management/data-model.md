# Data Model: Student Management

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) | **Date**: 2026-07-31

Types live under `apps/web/src/features/students/types/`. Shapes below are design contracts, not literal source. Every identifier is a branded opaque type so ids from different aggregates cannot be swapped.

---

## Identifiers and shared primitives

`types/common.ts`

```text
StudentId, StudentEnrollmentId, StudentDocumentId, StudentDocumentVersionId,
StudentNoteId, StudentTimelineEventId, StudentStatusChangeId, StudentIntakeId
  = Brand<string, ...>

Money            = { amount: string; currency: string; precision: number }   // decimal string, never float
ActorRef         = { id: string; name: string; active: boolean }
LookupOption     = { id: string; label: string; active: boolean }
AuditContext     = { createdAt; createdBy: ActorRef; updatedAt; updatedBy: ActorRef; version: number }
Paginated<T>     = { items: T[]; page: number; pageSize: number; total: number }
Cursor<T>        = { items: T[]; nextCursor?: string }

StudentStatus    = "active" | "suspended" | "graduated" | "withdrawn" | "archived"
OfferingKind     = "professional-program" | "professional-diploma" | "training-course"
DocumentState    = "missing" | "present" | "archived"
```

`AuditContext.version` is the optimistic-concurrency token for every command (FR-037).

---

## Entities

### Student

The aggregate root. Produced only by intake (FR-002), never deleted (FR-001).

```text
Student extends AuditContext {
  id: StudentId
  organizationId: string
  studentCode: string                 // unique, service-allocated, protected  (FR-006, FR-007, FR-008)
  status: StudentStatus               // (FR-028)
  identity: StudentIdentity
  assignment: StudentAssignment
  system: StudentSystemInfo
  statusHistory: StudentStatusChange[]   // immutable  (FR-029, FR-040)
  archivedAt?: string
  archiveReason?: string
}
```

**Rules**

- `studentCode` unique per `organizationId`; allocation and collision are service invariants (R11).
- Every field of `system` is read-only in this module (FR-008).
- When `status === "archived"`, all profile, document, and note commands are refused (FR-031).

### StudentIdentity

Maintainable personal facts (FR-004).

```text
StudentIdentity {
  fullName: string
  primaryPhone: string
  guardianPhone?: string
  nationalId?: string
  alternativeIdentityReason?: string   // required when nationalId is absent
  address: string
  dateOfBirth: string                  // ISO date
  qualificationId: string
  qualificationLabel: string
  graduationYear: number
  profileImageUrl?: string
}
```

**Validation** (authoritative Zod schema `schemas/student-profile-schema.ts`, FR-009)

| Field | Rule |
| --- | --- |
| `fullName` | required, trimmed, 3–120 chars |
| `primaryPhone` | required, matches configured phone pattern after normalization |
| `guardianPhone` | required when the student is a minor by configured age threshold; otherwise optional, same pattern |
| `nationalId` | matches the configured identifier pattern when present; when absent, `alternativeIdentityReason` is required |
| `address` | required, 3–250 chars |
| `dateOfBirth` | required, valid date, not in the future, yields a plausible age within the configured range |
| `qualificationId` | required, must be an active lookup option |
| `graduationYear` | required integer, not in the future, not earlier than birth year + configured minimum |
| `profileImageUrl` | optional; upload constrained by configured image formats and size |

### StudentAssignment

Operational and academic ownership (FR-005).

```text
StudentAssignment {
  registrationBranchId / registrationBranchLabel
  studyBranchId / studyBranchLabel
  departmentId / departmentLabel
  academicGradeId? / academicGradeLabel?
  customerServiceEmployeeId / customerServiceEmployeeName
}
```

**Rules**: options come from lookups and are restricted to active records within the acting employee's authorized scope (FR-010, FR-011).

### StudentSystemInfo

Protected facts carried from admission (FR-006, FR-008).

```text
StudentSystemInfo {
  admissionId: string                  // stable reference  (FR-002)
  admissionReference: string
  approvalSnapshotId: string           // intake idempotency key  (FR-003)
  admissionDate: string
  enrollmentDate: string
}
```

### StudentEnrollment

Read-only academic engagement (FR-012 – FR-015). Written only by intake.

```text
StudentEnrollment {
  id: StudentEnrollmentId
  studentId: StudentId
  offeringKind: OfferingKind
  offeringId: string
  offeringVersionAtEnrollment: number
  offeringLabel: string                // denormalized at intake  (FR-015)
  offeringCode: string
  batchId?: string                     // present iff professional-program  (FR-013)
  batchVersionAtEnrollment?: number
  batchLabel?: string
  batchCode?: string
  registrationBranchLabel: string
  studyBranchLabel: string
  enrollmentDate: string
  status: "active" | "completed" | "suspended" | "withdrawn"
  sourceAdmissionId: string
}
```

**Invariant** (`utils/enrollment-rules.ts`): `offeringKind === "professional-program"` ⇔ `batchId` is defined. Violation is a typed intake error, never a rendered state.

### StudentDocument

Type-grouped evidence with non-destructive versioning (FR-016 – FR-019).

```text
StudentDocument {
  id: StudentDocumentId
  studentId: StudentId
  type: StudentDocumentType            // configured, not hardcoded  (FR-010, FR-016)
  state: DocumentState
  currentVersionId?: StudentDocumentVersionId
  versions: StudentDocumentVersion[]   // append-only
  archivedAt?: string
  archivedBy?: ActorRef
}

StudentDocumentVersion {
  id, versionNumber, fileName, mimeType, size,
  previewUrl?, uploadedAt, uploadedBy: ActorRef,
  uploadAttemptId: string              // retry-safety key  (US6-7)
}

StudentDocumentType {
  key: "personal-photo" | "national-id" | "parent-national-id" | "birth-certificate"
     | "qualification-certificate" | "admission-declaration" | "additional-attachment"
  label, required: boolean, multiple: boolean,
  allowedMimeTypes: string[], maxBytes: number
}
```

**Rules**

- Replace appends a version and repoints `currentVersionId`; prior versions stay retrievable (FR-019).
- Archive sets `state = "archived"`; no delete operation exists (FR-019, FR-001).
- A repeated `uploadAttemptId` resolves to the existing version rather than a new one.
- `additional-attachment` is the only type with `multiple: true`.

### StudentNote

Permission-restricted internal remark (FR-020, FR-021).

```text
StudentNote {
  id: StudentNoteId
  studentId: StudentId
  content: string                      // trimmed, 1–2000 chars, non-empty
  author: ActorRef                     // preserved even when author.active === false
  createdAt: string
}
```

**Rules**: readable only with `students.notes.view`; never returned in list projections or the context summary.

### StudentTimelineEvent

Immutable chronological record (FR-022 – FR-024). Discriminated on `category`.

```text
StudentTimelineEvent {
  id: StudentTimelineEventId
  studentId: StudentId
  category: "admission-submitted" | "admission-approved" | "student-created"
          | "enrollment-added" | "document-uploaded" | "document-replaced"
          | "document-archived" | "profile-updated" | "status-changed"
          | "financial-event" | "academic-event"     // reserved for future modules
  occurredAt: string
  sequence: number                     // monotonic tiebreak for identical timestamps
  actor: ActorRef
  origin: "admissions" | "students" | "finance" | "academic"
  subjectRef?: string                  // affected document / enrollment / status-change id
  summary: string
}
```

**Rules**

- Appended inside the same service command that mutates state; a failed command appends nothing (FR-023).
- Ordering is `occurredAt` desc, then `sequence` desc; the cursor is the `(occurredAt, sequence)` pair (R7).
- `admission-submitted` and `admission-approved` are persisted at intake from the Admissions projection, not re-fetched per read.

### StudentStatusChange

Immutable lifecycle transition (FR-029, FR-040).

```text
StudentStatusChange {
  id: StudentStatusChangeId
  fromStatus: StudentStatus | null     // null only for the intake-created initial state
  toStatus: StudentStatus
  reason?: string                      // required where the policy demands it
  actor: ActorRef
  occurredAt: string
  sourceVersion: number
  resultVersion: number
}
```

### StudentFinancialSummary

Read-only projection owned by the future Student Finance module (FR-025 – FR-027).

```text
StudentFinancialSummaryResult =
  | { state: "available"; summary: StudentFinancialSummary }
  | { state: "unavailable"; reason: "finance-module-absent" | "source-error" | "timeout" }
  | { state: "forbidden" }

StudentFinancialSummary {
  totalFees: Money
  paidAmount: Money
  remainingBalance: Money
  activeInstallments: number
  asOf: string
  sourceRevisionId?: string
}
```

**Rule**: absence is never represented as zero. Only the `available` variant carries numbers.

---

## Projections

### StudentSummary — list row (R8)

```text
StudentSummary {
  id, studentCode, fullName, phoneHint,           // phoneHint redacted for scoped contexts
  registrationBranchLabel, studyBranchLabel, departmentLabel,
  primaryOfferingLabel, primaryBatchLabel?,
  customerServiceEmployeeName,
  status, enrollmentCount, updatedAt, version
}
```

Deliberately excludes national identifier, address, documents, notes, timeline, and finance.

### StudentDetail — workspace overview

```text
StudentDetail extends Student {
  enrollments: StudentEnrollment[]
  documentCompletion: { requiredTypes: number; present: number; missing: number; archived: number }
  availableStatusActions: StudentStatus[]        // from the transition policy, permission-filtered
  permissions: StudentAreaPermissions            // which areas this employee may open
}
```

### StudentContextSummary — consumer contract (FR-041)

```text
StudentContextSummary {
  studentId, studentCode, fullName, status,
  assignment: { registrationBranchId, studyBranchId, departmentId, academicGradeId? },
  enrollmentTargets: { kind: OfferingKind; offeringId: string; batchId?: string; status: string }[],
  documentCompletion: { requiredTypes: number; present: number; missing: number },
  financialSummaryRef?: { state: "available" | "unavailable" | "forbidden"; asOf?: string },
  admissionRef: { admissionId: string; approvalSnapshotId: string },
  updatedAt, version
}
```

Never carries note content, document files, addresses, or national identifiers.

### EnrollmentIntakeInput — inbound from Admissions (R1)

Mapped from the existing `EnrollmentReadinessSummary` exported by `features/admissions/index.ts`.

```text
EnrollmentIntakeInput {
  admissionId, admissionReference, admissionVersion,
  approvalSnapshotId,                                    // idempotency key
  applicant: { id, name, phone },
  academicTarget: { kind, offeringId, offeringVersion, batchId?, batchVersion? },
  branches: { registrationBranchId, studyBranchId },
  financial?: { revisionId, currency, requiredAmount }
}
```

---

## Relationships

```text
Admission (external, read-only)
    │ 1 approved + confirmed
    ▼ intake, idempotent on approvalSnapshotId
Student ──1:N──> StudentEnrollment        (written only by intake)
   │    ──1:N──> StudentDocument ──1:N──> StudentDocumentVersion
   │    ──1:N──> StudentNote
   │    ──1:N──> StudentTimelineEvent
   │    ──1:N──> StudentStatusChange
   └────1:0..1─> StudentFinancialSummary  (external projection, read-only)
```

A person returning through a new admission produces a **separate** Student linked to the new admission; merging is out of scope (spec Assumptions).

---

## State transitions

Authoritative table in `utils/student-lifecycle.ts`, consumed by the policy, the mock service, the available-actions projection, and bulk actions (R6).

```text
              suspended  graduated  withdrawn  archived  active
active            ✓          ✓          ✓         ✓        —
suspended         —          —          ✓         ✓        ✓
graduated         —          —          —         ✓        ✓ (correction)
withdrawn         —          —          —         ✓        ✓ (correction)
archived          —          —          —         —        ✓ (activate)
```

| Transition | Permission | Reason |
| --- | --- | --- |
| → `suspended` | `students.status.manage` | required |
| → `graduated` | `students.status.manage` | optional |
| → `withdrawn` | `students.status.manage` | required |
| → `archived` | `students.archive` | required from `active`/`suspended`, optional from `graduated`/`withdrawn` |
| `archived` → `active` | `students.activate` | optional |
| `graduated`/`withdrawn` → `active` | `students.status.correct` | required |
| `suspended` → `active` | `students.status.manage` | optional |

Every applied transition appends one `StudentStatusChange` and one `status-changed` timeline event. A refused or failed transition appends neither (SC-008, FR-023).

---

## Configurable lookups

Served by `StudentsService.lookups()`; nothing below is hardcoded (FR-010).

```text
StudentLookups {
  branches, departments, academicGrades, qualifications,
  customerServiceEmployees: LookupOption[]
  offerings, batches: LookupOption[]              // filter options only
  statuses: { value: StudentStatus; label: string }[]
  documentTypes: StudentDocumentType[]
  identityRules: { nationalIdPattern: string; phonePattern: string; minorAgeThreshold: number }
  imagePolicy: { allowedMimeTypes: string[]; maxBytes: number }
  currency: string
  precision: number
}
```

---

## Query model

```text
StudentListQuery {
  search?: string                                  // name, code, phone, guardian phone, national id  (FR-032)
  branchIds?: string[]
  departmentIds?: string[]
  offeringIds?: string[]
  batchIds?: string[]
  statuses?: StudentStatus[]
  customerServiceEmployeeIds?: string[]
  sort?: { field: "fullName" | "studentCode" | "enrollmentDate" | "updatedAt" | "status"; direction: "asc" | "desc" }
  page: number
  pageSize: number
}

StudentTimelineQuery { cursor?: string; limit: number; categories?: TimelineCategory[] }
```

Normalization (`utils/student-list-query.ts`): trim and collapse search whitespace, normalize Arabic variants and digits, sort and dedupe filter arrays, clamp `page`/`pageSize`, and produce a stable serialization for query keys. Every query is intersected with the acting employee's organization and authorized branches before results are produced (FR-034).
