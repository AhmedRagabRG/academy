# Contracts: Student Management

**Feature**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md) | **Data model**: [../data-model.md](../data-model.md)

These are internal frontend, route, service, dependency, and future-consumer contracts. No HTTP/OpenAPI surface is invented because a live backend, real file storage, and the Student Finance module are outside this phase.

---

## Public Feature Boundary

`features/students/index.ts` exports:

- route-facing screens (`StudentsScreen`, `StudentWorkspaceLayout`, `StudentOverviewScreen`, `EditStudentScreen`, `StudentDocumentsScreen`, `StudentNotesScreen`, `StudentTimelineScreen`)
- `studentsNavigation` and the permission-key constants
- consumer-safe types: `StudentSummary`, `StudentDetail`, `StudentContextSummary`, `StudentRef`, `StudentStatus`
- the service contract type `StudentsService` and the wired `studentsService` instance
- the inbound `studentIntakePort`
- `studentScenarios` for deterministic test control

Fixtures, the mock adapter internals, schemas, hooks, policies, and presentational components stay private.

Student Management consumes Admissions, Organization, Academic Catalog, and Program Batch facts through **Student-owned narrow reader ports** backed by those modules' public exports. It never imports their fixtures, internal schemas, screens, or mutable editor DTOs. No other module imports anything from `features/students` except the exports listed above.

---

## Route Contract

| Route | Purpose | Required permission |
| --- | --- | --- |
| `/students` | Scoped student list, search, filters, sorting, pagination, export | `students.view`; export additionally requires `students.export` |
| `/students/[studentId]` | Workspace overview: personal, academic, enrollments, financial summary | `students.view`; enrollments require `students.enrollments.view`; finance requires `students.finance.view` |
| `/students/[studentId]/edit` | Sectioned profile editor | `students.update` |
| `/students/[studentId]/documents` | Document management | `students.documents.view`; mutations require `students.documents.manage` |
| `/students/[studentId]/notes` | Internal notes | `students.notes.view`; authoring requires `students.notes.manage` |
| `/students/[studentId]/timeline` | Activity timeline | `students.timeline.view` |

There is **no** `/students/create` route and no create action anywhere in the module (FR-001).

Next.js 16 pages await promise-based `params`, validate the identifier, and pass strings to feature screens. Direct routes return **forbidden** for known but unauthorized records and **not found** for absent or cross-organization identifiers, without disclosing protected facts. Pages own metadata, breadcrumbs, and route-level loading/error context; they never access data or permission fixtures.

`[studentId]/layout.tsx` renders the workspace header, status badge, protected system information, and the tab navigation. Tab items are filtered by the acting employee's area permissions, so a forbidden area is not presented as an empty one. Each child segment owns its own `loading.tsx` and `error.tsx`, which is what makes one area's failure non-fatal to the rest (US3-5, US3-6).

Opening `/edit` for an archived student renders locked read-only guidance with the activate affordance instead of editable controls (FR-031).

---

## Service Context

The adapter receives authenticated context outside command payloads, sourced from `shared/store/employee-context-store.ts`:

- organization id and employee id
- effective permission keys
- authorized branch ids and an explicit organization-wide capability
- locale, time zone, currency, precision
- a stable scope fingerprint used in query keys

Commands never accept actor, organization, roles, permissions, or arbitrary scope. The current mock context is explicitly a UX and test simulation; a future backend is authoritative.

---

## Students Service Facade

All operations are asynchronous, accept cancellation on reads, return cloned typed projections, and throw only typed `StudentsError` values. **No create-by-hand operation and no delete operation exists at any level of this facade.**

### Reads

- `list(query: StudentListQuery, signal?) -> Paginated<StudentSummary>`
- `get(studentId, signal?) -> StudentDetail`
- `lookups(signal?) -> StudentLookups`
- `listEnrollments(studentId, signal?) -> StudentEnrollment[]`
- `listDocuments(studentId, signal?) -> StudentDocument[]`
- `documentHistory(studentId, documentId, signal?) -> StudentDocumentVersion[]`
- `listNotes(studentId, signal?) -> StudentNote[]`
- `listTimeline(studentId, query: StudentTimelineQuery, signal?) -> Cursor<StudentTimelineEvent>`
- `listStatusHistory(studentId, signal?) -> StudentStatusChange[]`
- `getFinancialSummary(studentId, signal?) -> StudentFinancialSummaryResult`
- `getContextSummary(studentId, signal?) -> StudentContextSummary`
- `exportList(query: StudentListQuery, signal?) -> string`

### Commands

- `updateProfile({ studentId, input, expectedVersion }) -> StudentDetail`
- `changeStatus({ studentId, toStatus, reason?, expectedVersion }) -> StudentDetail`
- `bulkChangeStatus({ studentIds, toStatus, reason?, expectedVersions }) -> BulkStatusOutcome[]`
- `uploadDocument({ studentId, typeKey, file, uploadAttemptId, expectedVersion }) -> StudentDocument`
- `replaceDocument({ studentId, documentId, file, uploadAttemptId, expectedVersion }) -> StudentDocument`
- `archiveDocument({ studentId, documentId, reason?, expectedVersion }) -> StudentDocument`
- `addNote({ studentId, content }) -> StudentNote`

Every command carries `expectedVersion` except `addNote`, which appends to an independent collection and cannot conflict.

### Command outcomes

```text
BulkStatusOutcome {
  studentId, studentCode
  outcome: "applied" | "refused"
  refusalCode?: StudentsErrorCode
  message?: string
}
```

Bulk operations evaluate each student independently and always report per-record results; partial failure is never collapsed into a single success or failure (FR-035).

---

## Inbound Intake Port

```text
studentIntakePort.enrollFromAdmission({
  admissionId: string
  expectedAdmissionVersion: number
}) -> StudentRef
```

Contract:

1. Requires the `students.intake` permission.
2. Reads `EnrollmentReadinessSummary` through `AdmissionEnrollmentReader`.
3. Refuses with `admission-not-ready` when `ready === false`, the status is not `Approved`, or `approvalSnapshotId` is absent — and creates nothing (FR-002, US1-2).
4. Refuses with `admission-version-stale` when `expectedAdmissionVersion` does not match.
5. Is **idempotent on `approvalSnapshotId`**: a repeated or concurrent call returns the existing `StudentRef` and creates no second student, no second enrollment, and no duplicate timeline events (FR-003, US1-3).
6. On first success, atomically: allocates a unique `studentCode`, creates the `Student` with `status = "active"`, creates one `StudentEnrollment` enforcing the program⇔batch invariant, seeds document records for configured required types in `missing` state, persists `admission-submitted` / `admission-approved` / `student-created` / `enrollment-added` timeline events, and appends the initial `StudentStatusChange` with `fromStatus = null`.
7. When the applicant already has a student and a **different** approved admission is presented, appends a new `StudentEnrollment` and an `enrollment-added` event to the existing student rather than creating a second student.
8. Returns `StudentRef { studentId, studentCode }` for the caller to record.

The port never mutates Admissions. Whether Admissions stores the returned reference in `externalEnrollmentReference` is that module's decision.

---

## Outbound Reader Ports

Owned by `features/students/services/students-dependency-readers.ts`. Each is a narrow interface with an adapter over the corresponding module's public export.

```text
AdmissionEnrollmentReader {
  getEnrollmentReadiness(admissionId, signal?) -> EnrollmentReadinessSummary
  getAdmissionTimelineFacts(admissionId, signal?) -> { submittedAt?, approvedAt?, actor? }
}

OrganizationDirectoryReader {
  getStudentLookups(signal?) -> {
    branches, departments, academicGrades, qualifications, customerServiceEmployees,
    identityRules, imagePolicy, documentTypes, currency, precision
  }
}

AcademicOfferingReader {
  getOfferingLabels(offeringIds, signal?) -> { id, kind, label, code }[]
  listFilterOfferings(signal?) -> LookupOption[]
}

BatchDirectoryReader {
  getBatchLabels(batchIds, signal?) -> { id, programId, label, code }[]
  listFilterBatches(programId?, signal?) -> LookupOption[]
}

StudentFinanceReader {
  getFinancialSummary(studentId, signal?) -> StudentFinancialSummaryResult
}
```

`StudentFinanceReader`'s wired default returns `{ state: "unavailable", reason: "finance-module-absent" }`. The offering and batch readers supply **filter options and label refresh only**; enrollment rows always render their intake-time denormalized values, so a reader failure degrades filter dropdowns without blanking student history (FR-015).

---

## Error Contract

```text
StudentsError { code: StudentsErrorCode; message: string; details?: Record<string, unknown> }

StudentsErrorCode =
  | "not-found" | "forbidden" | "out-of-scope"
  | "version-conflict"                 // details: { currentVersion }
  | "validation-failed"                // details: { fieldErrors }
  | "invalid-status-transition"        // details: { fromStatus, toStatus, allowed }
  | "reason-required"
  | "archived-read-only"
  | "duplicate-student-code"
  | "admission-not-ready"              // details: { reasons }
  | "admission-version-stale"
  | "enrollment-batch-rule-violated"
  | "unsupported-file-type" | "file-too-large" | "file-unreadable"
  | "document-archived"
  | "note-content-empty"
  | "finance-unavailable"
  | "service-unavailable"
```

Errors never carry national identifiers, addresses, note content, or file bytes. Every code maps to specific Arabic guidance in `config/students-copy.ts`; no code falls back to a generic message.

---

## Query Key Contract

`services/students-query-keys.ts` produces normalized, scope-fingerprinted keys so areas invalidate independently and one employee's scoped cache is never served to another context.

```text
["students", fingerprint, "list", serializedQuery]
["students", fingerprint, "detail", studentId]
["students", fingerprint, "enrollments", studentId]
["students", fingerprint, "documents", studentId]
["students", fingerprint, "document-history", studentId, documentId]
["students", fingerprint, "notes", studentId]
["students", fingerprint, "timeline", studentId, serializedTimelineQuery]
["students", fingerprint, "status-history", studentId]
["students", fingerprint, "finance", studentId]
["students", fingerprint, "lookups"]
```

Invalidation rules: `updateProfile` invalidates detail, list, and timeline. `changeStatus` invalidates detail, list, status-history, and timeline. Document commands invalidate documents, document-history, detail (completion counts), and timeline. `addNote` invalidates notes only. Nothing invalidates `finance` or `lookups` from within this module.

---

## Future Consumer Contract

`getContextSummary(studentId)` is the stable read surface for future Finance, CRM, AI, and Reporting consumers (FR-041).

Guarantees:

- Permission-scoped: returns `forbidden` for out-of-scope students, exactly as interactive reads do.
- Read-only: no consumer can mutate a student through this contract.
- Minimal: no note content, no document files or download URLs, no address, no national identifier.
- Additive evolution only: fields may be added; existing field meanings do not change without a contract revision.

Future backend authorization, tenant isolation, audit persistence, privacy controls, workflow execution, and human oversight remain the authoritative boundaries regardless of what this contract exposes.

---

## Shared Component Contracts

Two components are added to the shared layer as the canonical implementations.

```text
TabNavigation({ items: { href, label, exact? }[], ariaLabel })
```

Renders a landmark `nav` of links, derives the active item from `usePathname`, and marks it with `aria-current="page"`. All items stay in the tab order. It performs no permission checks itself — callers pass already-filtered items.

> **Revised during implementation.** This originally specified an ARIA `tablist` with roving tabindex. Each tab is a real URL that navigates and code-splits, so `role="tab"` would strip the link affordance assistive technology should announce and imply an `aria-controls` relationship to a `tabpanel` that does not survive a route change; roving tabindex would also make only one tab reachable by <kbd>Tab</kbd>. The link-based landmark is the more accessible choice and matches every other navigation in the app. See [validation/architecture.md](../validation/architecture.md#deviation-recorded).

```text
Timeline({ items: TimelineItem[], onLoadMore?, hasMore?, loading? })
TimelineItem { id, occurredAt, title, description?, actor?, iconKey?, tone? }
```

Presentational only: renders an ordered list with non-color status encoding and logical properties for RTL mirroring. It holds no business logic, performs no fetching, and knows nothing about students.

Migrating `features/admissions/components/admission-lifecycle-timeline.tsx` onto the shared `Timeline` is a tracked follow-up outside this feature's scope.
