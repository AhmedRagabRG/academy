# Data Model: Admissions

## Modeling Conventions

- IDs are opaque branded strings. Display labels and localized names never drive rules.
- Mutable aggregates carry a positive integer `version`; every command supplies `expectedVersion`.
- Date-only values use canonical `YYYY-MM-DD`; audit moments use ISO 8601 instants.
- Money uses normalized decimal strings plus ISO currency and configured precision.
- Historical records resolve inactive dependency labels without making them selectable.
- Immutable records are append-only. Failed commands append no revisions, decisions, snapshots, or events.
- Organization, permission, and branch scope come from authenticated service context, never command input.

## Applicant

Stable person identity that remains separate from Student and may own several admissions over time.

| Field | Meaning and validation |
| --- | --- |
| `id` | `ApplicantId` |
| `organizationId` | Owning organization; never caller-editable |
| `fullName` | Required localized person name; normalized copy available for search |
| `primaryPhone` | Required normalized phone plus display value |
| `guardianPhone` | Required when configured age/guardian policy applies |
| `nationalIdentity` | Optional only when configured alternative evidence and reason exist; sensitive in projections |
| `address` | Structured or free-text address according to organization policy |
| `dateOfBirth` | Date-only, not future, plausible for qualification/graduation year |
| `qualificationId` / `qualificationLabel` | Configured qualification reference with historical label |
| `graduationYear` | Valid year, not future, consistent with birth date |
| `notes` | Permission-scoped operational notes; excluded from list/consumer projections |
| `profileImage` | Optional private media metadata reference |
| `status` | `active` or `archived`; no deleted state |
| `version` | Optimistic concurrency token |
| `createdAt/by`, `updatedAt/by` | Audit-ready context |

### Applicant Identity Evidence

`ApplicantIdentityEvidence` records the configured identity type, normalized value or private file reference, issuer/country where applicable, reason when national ID is unavailable, verification state, and audit context. Raw identity values are returned only to permitted detail/document projections.

## Duplicate Candidate and Resolution

`DuplicateCandidate` is an ephemeral projection containing candidate applicant ID, redacted identity/contact hints, match strength (`strong` or `possible`), and reason codes (`national-id`, `phone`, `name-and-birth-date`).

`DuplicateResolution` is immutable and records the candidate IDs, selected outcome (`use-existing`, `create-exception`, `cancel`), required reason for an exception, actor, and time. The service also prevents a concurrent second active admission for the same applicant and normalized academic target.

## Admission

Aggregate root for one operational application case.

| Field | Meaning and validation |
| --- | --- |
| `id` | `AdmissionId` |
| `reference` | Unique organization-scoped human reference; immutable after creation |
| `organizationId` | Authenticated organization scope |
| `applicantId` | Required stable applicant owner |
| `status` | `draft`, `submitted`, `under-review`, `approved`, `rejected`, `enrolled`, `archived` |
| `assignment` | Current `AdmissionAssignment` |
| `academicSelectionRevisionId` | Current selection revision |
| `financialRevisionId` | Current financial preparation revision |
| `documentRequirementSnapshotId` | Current applicable requirements |
| `approvalSnapshotId` | Present only after successful approval |
| `externalEnrollmentReference` | Present only after future confirmed enrollment |
| `notes` | Case-specific permission-scoped notes |
| `activeReviewerId` | Present during review; informational lock context, not authorization |
| `version` | Incremented once per successful mutation |
| `createdAt/by`, `updatedAt/by` | Audit-ready context |

### Aggregate Invariants

- Applicant remains separate and is never converted to Student.
- One academic offering is current; program selection requires one matching batch, diploma/course forbids batch.
- Submitted and Under Review records reject incompatible free edits; they must be returned to Draft.
- Approved facts are read from the immutable approval snapshot, not mutable current dependencies.
- Enrolled and Archived records are historical/read-only in this phase.
- No permanent-delete command exists.

## Admission Assignment

Current organization ownership and delivery context:

- `registrationBranchId` and resolved label
- `studyBranchId` and resolved label
- `admissionsEmployeeId`
- `customerServiceEmployeeId`
- `customerServiceManagerId`
- `departmentId`
- `leadSourceId`
- optional/configured `academicGradeId`

All references belong to the organization, satisfy configured role eligibility, are active when newly assigned, and intersect effective employee scope. Historical inactive references remain displayable. Changes before approval are captured through Admission history; approved values are copied into the approval snapshot.

## Academic Selection Revision

Append-only revision describing the selected academic target and its evaluation context.

| Field | Meaning |
| --- | --- |
| `id` | `AcademicSelectionRevisionId` |
| `admissionId`, `revisionNumber` | Parent and monotonic position |
| `offeringKind` | `professional-program`, `professional-diploma`, or `training-course` |
| `offeringId`, `offeringVersion` | Public Catalog identity/version |
| `offeringLabel` | Historical localized display label |
| `batchId`, `batchVersion` | Required only for Professional Program |
| `batchLabel`, `batchFinancialRevisionId` | Historical Program Batch references when applicable |
| `eligibilityAssessmentId` | Assessment made for this revision |
| `changeReason` | Required when replacing an existing selection |
| `createdAt/by` | Immutable audit context |

## Eligibility Assessment

Immutable/advisory result evaluated at `selection`, `submission`, or `approval`:

- target and branch IDs/versions
- `evaluatedAt` and date-only `evaluatedOn`
- `eligible` boolean
- ordered stable reason codes
- batch registration window and available seats when applicable
- offering/batch active and parent-match flags
- registration/study branch eligibility
- source pricing/document policy revision references

Professional Program approval requires current reasons to be empty and Batch registration to be open, in window, have seats, match the program, and allow both relevant branches. Diploma/Course assessment forbids a batch and checks active offering and branch availability. Frontend eligibility is advisory; a future backend performs authoritative atomic enrollment checks.

## Document Requirement Snapshot

Case-specific immutable set of the configured requirements applicable at evaluation time.

| Field | Meaning |
| --- | --- |
| `id` | `DocumentRequirementSnapshotId` |
| `admissionId` | Parent admission |
| `policyId`, `policyVersion` | Source admission policy |
| `selectionRevisionId` | Academic selection that produced applicability |
| `requirements` | Ordered `DocumentRequirementSnapshotItem[]` |
| `createdAt` | Evaluation instant |

Each item contains configured requirement ID/version, stable type key, localized label, required/optional flag, approval/submission impact, allowed MIME types/extensions, max bytes, multiplicity, and applicability reason. Before approval, changed policy creates a new snapshot and readiness shows new gaps; approval freezes the used snapshot.

## Admission Document and Document Version

`AdmissionDocument` is the logical slot for one requirement and contains current version ID and derived current state: `missing`, `uploading`, `pending`, `verified`, `rejected`, or `withdrawn`.

`DocumentVersion` is append-only:

- `id`, `admissionDocumentId`, monotonic `versionNumber`
- original filename, safe display filename, MIME type, extension, byte size
- private storage/preview reference abstraction and checksum placeholder
- upload status (`pending`, `available`, `failed`, `withdrawn`)
- uploader/time and optional superseded/withdrawn context

Accepted MIME types are PDF, JPEG, and PNG using configured MIME/extension pairs and size limits. An interrupted or invalid upload never supersedes the current available version. Removing an unfinalized file withdraws metadata; it does not erase history.

## Document Verification Decision

Immutable decision targeting exactly one `DocumentVersion`:

- `id`, `admissionId`, `admissionDocumentId`, `documentVersionId`
- `decision`: `verified` or `rejected`
- mandatory `reason` for rejection
- reviewer/time and admission expected/result version

Replacing a document produces a new version whose current state is Pending; earlier decisions remain historical and cannot authorize the replacement. Approval captures exact verified version IDs.

## Financial Preparation Revision

Append-only normalized commercial preparation:

| Field | Meaning and validation |
| --- | --- |
| `id`, `admissionId`, `revisionNumber` | Identity/order |
| `sourceKind` | `catalog-offering` or `program-batch` |
| `sourceId`, `sourceVersion`, `sourceFinancialRevisionId` | Authoritative pricing source |
| `currency`, `precision` | Organization/source configuration; must agree |
| `productPrice` | Non-negative normalized decimal |
| `registrationFees` | Non-negative normalized decimal |
| `discountMode` | `none`, `percentage`, or `amount` |
| `discountPercentage` | Derived or authoritative value from 0 through 100 |
| `discountAmount` | Derived or authoritative value from 0 through product price |
| `requiredAmount` | `productPrice - discountAmount + registrationFees`, never negative |
| `calculatedAt/by`, `reason` | Immutable context; reason required for revision after submission/return |

Calculations reconcile in integer minor units. This feature does not create installments, payments, receipts, or ledger entries.

## Admission Approval Snapshot

Created atomically with `under-review → approved` after all readiness gates pass:

- `id`, `admissionId`, `admissionVersion`, applicant ID and minimal approved identity facts
- assignment snapshot with stable IDs and historical labels
- academic selection revision and final eligibility assessment IDs
- document requirement snapshot plus exact verified document version IDs
- financial preparation revision plus complete normalized financial snapshot
- approver, approval time, and decision context

It is immutable and remains the only source for future enrollment/finance handoff. Raw document bytes, unrestricted notes, and unnecessary sensitive identity values are excluded from consumer projections.

## Admission Lifecycle Event

Immutable record of one successful transition:

- `id`, `admissionId`
- `fromStatus`, `toStatus`
- `reason` where required
- actor/time
- source and resulting admission versions
- optional reviewer, approval snapshot, or external enrollment reference

### Transition Table

| From | To | Permission | Preconditions |
| --- | --- | --- | --- |
| Draft | Submitted | `admissions.submit` | Applicant, assignments, academic eligibility, finances, and configured submission documents ready |
| Draft | Archived | `admissions.archive` | Confirmation and reason |
| Submitted | Under Review | `admissions.review` | Current scope, expected version; capture reviewer/time |
| Submitted | Draft | `admissions.return` | Confirmation and correction reason |
| Under Review | Draft | `admissions.return` | Confirmation and correction reason; clear active reviewer context |
| Under Review | Approved | `admissions.approve` | Current eligibility, valid assignments/finance, all required documents verified; create snapshot atomically |
| Under Review | Rejected | `admissions.reject` | Mandatory reason |
| Rejected | Draft | `admissions.return` | Reopen reason; normal resubmission required |
| Rejected | Archived | `admissions.archive` | Confirmation and reason |
| Approved | Enrolled | Future authoritative enrollment confirmation | Matching snapshot, idempotent external reference, backend eligibility/capacity recheck |
| Approved | Archived | `admissions.archive` | No enrollment link/in-progress claim; confirmation and reason |

Submitted/Under Review must return or receive a review decision before archival. Enrolled cannot be archived in this phase. Archived is terminal. Draft→Approved, Submitted→Approved, Rejected→Approved, and any non-Approved→Enrolled are prohibited.

## Admission Readiness

Derived result for a target action (`submit` or `approve`):

- `ready` boolean and evaluated admission version/time
- ordered findings with stable code, severity, section, field/document reference, and Arabic message key
- current academic eligibility assessment ID
- counts of required/missing/pending/rejected/verified documents
- finance and assignment readiness
- available lifecycle actions already filtered by state, permissions, and scope

The UI renders this projection and never rebuilds approval rules.

## Enrollment Readiness Summary

Consumer-safe result for future Enrollment:

- admission ID/reference/version/status
- approval snapshot ID and approval time
- applicant ID plus minimal permitted identity/contact summary
- offering kind/ID/version and optional batch ID/version
- registration/study branch IDs
- financial snapshot ID, currency, required amount, and source revision IDs
- current eligibility evaluation identity, eligible flag, and ordered denial codes
- `ready` is true only for Approved with a matching immutable snapshot

No raw documents, document download references, unrestricted notes, role lists, or mutable form values are exposed.

## List and Query Projections

`AdmissionSummary` contains only admission ID/reference, redacted applicant identity summary, academic target label/code, optional batch label/code, registration branch, assigned admissions employee, status, readiness counts, updated time, and version.

`AdmissionListQuery` contains normalized search, branch/product/batch/status/employee filter arrays, allowlisted sort/direction, one-based page, and bounded page size. The service adds authenticated scope, normalizes Arabic/English search, applies stable ID tie-break sorting, returns facets/totals, and clamps invalid pages. Documents, notes, histories, and full identity values are excluded.

## Service Context and Dependency References

Authenticated `AdmissionsServiceContext` contains employee ID, organization ID, effective permission keys, authorized branch IDs, organization-wide capability, locale, time zone, and a stable scope fingerprint. Commands cannot override it.

Admissions-owned dependency ports return narrow records:

- `OrganizationDirectoryReader`: branches, departments, eligible employees, sources, grades, identity/document policies, currency/precision, and historical labels.
- `AcademicOfferingReader`: stable offering kind, ID/version/status, localized label, branches, price/fees/currency, and policy references.
- `BatchAdmissionEligibilityReader`: parent match, lifecycle/window/seats, branch availability, batch version, financial revision/terms, evaluation identity, and stable reason codes.

The current frontend foundation must add these consumer-safe public projections where existing public boundaries are incomplete; Admissions never imports dependency fixtures or internals.
