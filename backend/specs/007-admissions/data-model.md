# Data Model: Admissions

All identifiers are UUIDs, timestamps are UTC, calendar dates are date-only, and persisted business roots carry positive integer versions. External module identifiers are validated through public ports; Admissions does not query foreign repositories.

## Enums

- `AdmissionStatus`: `draft`, `submitted`, `under-review`, `approved`, `rejected`, `enrolled`, `archived`; no `cancelled`.
- `ApplicantStatus`: `active`, `archived`.
- `OfferingKind`: `professional-program`, `professional-diploma`, `training-course`.
- `EligibilityContext`: `selection`, `submission`, `approval`.
- `FinancialSourceKind`: `catalog-offering`, `program-batch`.
- `DiscountMode`: `none`, `percentage`, `amount`.
- `AdmissionDocumentState`: `missing`, `uploading`, `pending`, `verified`, `rejected`, `withdrawn`.
- `DocumentVersionStatus`: `available`, `failed`, `withdrawn`.
- `DocumentDecision`: `verified`, `rejected`.
- `TimelineEventKind`: created, applicant-updated, notes-updated, assignment-changed, selection-changed, financial-updated, document-uploaded/replaced/withdrawn/verified/rejected/policy-refreshed, status-changed, approved, rejected, archived, enrolled.

## Applicant

Fields: organization ID; full name and normalized name; primary/guardian phones and normalized forms; optional national ID and normalized form; alternative identity reason; address; date of birth; qualification ID and resolved label; graduation year; private applicant notes; optional profile-file descriptor; status/version; archive reason/time; created/updated actor and time.

Rules:

- Name is trimmed and 3–120 characters. Phone/national-ID/age rules use the same values published by Organization lookups.
- Guardian phone is required when age is below the configured threshold.
- National ID is required unless an alternative identity reason is present.
- Graduation year is not future and is at least birth year plus configured minimum graduation age.
- Normalized national ID and phones are indexed for duplicate matching but are not globally unique; explicit duplicate exceptions remain possible.
- Archive requires expectedVersion and reason. Records are never deleted.

Indexes: `(organizationId, normalizedNationalId)`, `(organizationId, normalizedPrimaryPhone)`, `(organizationId, normalizedFullName)`, status.

## Admission

Fields: organization-scoped unique reference; applicant ID; status/version; all required assignment IDs and snapshotted labels; optional academic grade; current selection/financial/document-policy snapshot IDs; optional approval snapshot ID; private admission notes; active reviewer ID/name/time; external enrollment reference; archive reason/time; created/updated actor and time.

Rules:

- Reference is allocated from an organization-scoped counter.
- Assignment fields are required at draft creation.
- Current pointers must reference children owned by the same admission; migration SQL enforces ownership where Prisma cannot.
- Archived status requires archive reason/time. Enrolled is terminal.
- One approval snapshot may be attached in this release.

Indexes: unique `(organizationId, reference)`; operational `(organizationId,status,updatedAt,id)`; applicant, both branches, three assignees, offering/batch projection keys, and created time.

## Admission Selection Revision

Fields: admission ID; positive contiguous revision number; source/result admission version; offering kind/ID/version/label/code; optional batch ID/version/label/code/financial-revision ID; registration/study branch snapshot; change reason; actor/time; one owned Eligibility Assessment.

Rules:

- Unique `(admissionId, revisionNumber)` and `(admissionId, resultAdmissionVersion)`.
- Program requires batch; Diploma/Course forbid batch.
- Rows are append-only. Selection change requires confirmed `financial-recalculated` and/or `documents-repolicied` consequences actually produced.

## Eligibility Assessment

Fields: selection revision ID; context; eligible flag; evaluated timestamp/date; offering/batch versions; available seats; ordered reason codes.

Rules: Recomputed at selection, submission, and approval. It reports all non-duplicate reasons. Submission/approval assessments may be stored as readiness/timeline evidence without mutating the original selection assessment.

## Admission Financial Revision

Fields: admission ID; revision number; source kind/ID/version/financial-revision ID; product-price minor units; registration-fees minor units; currency/precision; discount mode; scaled discount percentage; discount amount minor units; required amount minor units; reason; result admission version; actor/time.

Rules:

- All amount fields are non-negative and share currency/precision. Precision is bounded by shared Money rules.
- `requiredAmount = max(0, productPrice + registrationFees - discountAmount)` using integer arithmetic.
- Percentage discount is 0–100 and derives discount amount; amount discount cannot exceed pre-discount total.
- File-opening fees, if business input uses that phrase, are included in registration fees.
- Unique `(admissionId, revisionNumber)` and `(admissionId, resultAdmissionVersion)`; append-only trigger blocks update/delete.

## Document Policy Snapshot and Requirement

Snapshot fields: admission ID; source policy ID/version; snapshot version/time/actor. Requirement fields: snapshot ID; stable key; label; required flag; required-at stage; allowed MIME types; maximum bytes; source requirement ID.

Rules: Snapshot and requirement rows are immutable. Refresh creates a new snapshot, matches requirements by stable key, retains satisfying documents, and materializes missing document rows for new requirements.

## Admission Document

Fields: admission ID; requirement key/current requirement ID; derived state; optional current version ID; version; created/updated metadata.

Rules: Unique active requirement key per admission. State is derived from requirement/current version/latest decision; it is never trusted from clients. At most one current version pointer exists.

## Admission Document Version

Fields: document ID; positive version number; stable storage file ID/descriptor; original name; MIME; byte size; optional preview locator; status; durable idempotency key; uploaded actor/time; withdrawn actor/time/reason.

Rules:

- Unique `(documentId, versionNumber)` and organization/admission-scoped idempotency key.
- Only PDF, JPEG, and PNG signatures/MIME are supported; maximum is 5,000,000 bytes unless the snapshot requirement is stricter.
- Rows are append-only except the controlled status transition to withdrawn/failed; descriptive file metadata never changes.

## Admission Document Decision

Fields: document version ID; decision; reason; reviewer ID/name; decided time; source admission version.

Rules: Rejection requires a reason. Decisions are append-only. The latest applicable decision determines verified/rejected state without altering earlier decisions.

## Admission Approval Snapshot

Fields: admission ID unique; source admission/selection/financial/policy versions; assignment snapshot; applicant enrollment identity snapshot; verified document-version IDs; stable academic target; exact required amount/currency; actor/time; idempotency identity.

Rules: Created exactly once atomically with approval, immutable, and used as the Student intake idempotency key.

## Admission Lifecycle Event

Fields: admission ID; from/to status; reason; actor; occurred time; source/result version.

Rules: Unique `(admissionId, resultVersion)`; append-only. Archive, reject, and return require reasons under the approved rules.

### Transition Matrix

| From | Allowed destination/action | Conditions |
|------|----------------------------|------------|
| draft | submitted | Submit readiness passes |
| draft | archived | Required archive reason |
| submitted | under-review | Reviewer ownership acquired |
| submitted | archived | Required archive reason |
| under-review | approved | Approval readiness and eligibility pass; approval snapshot created |
| under-review | rejected | Required rejection reason |
| under-review | draft | Required return reason; reviewer cleared |
| under-review | archived | Required archive reason |
| approved | enrolled | Future Students intake succeeds idempotently |
| approved | archived | Required archive reason and no completed enrollment |
| rejected | archived | Required archive reason |
| enrolled | — | Terminal inside Admissions |
| archived | — | Terminal |

## Admission Timeline Event

Fields: admission ID; kind; source/result admission version; actor/time; safe structured metadata.

Rules: Append-only and ordered by occurred time then ID. Metadata contains identifiers and safe change descriptors only—never national ID, phone, address, notes text, document bytes, or detailed financial values. Every status event also creates one lifecycle row in the same transaction.

## Admission Request Key / Reference Counter

- Request key fields: organization, operation scope, idempotency key, request fingerprint, target/result ID, status, timestamps; unique by organization/scope/key. Reusing a key with a different fingerprint is a conflict.
- Reference counter fields: organization/year prefix and next value; locked/incremented in the creation transaction to allocate `ADM-YYYY-NNNNN` without races.

## Transaction Boundaries

- **Create**: duplicate resolution, create/reuse applicant, reference allocation, admission/assignment, selection/eligibility, financial revision, policy/requirements/documents, lifecycle/timeline, idempotency result.
- **Aggregate update**: applicant/assignment/private notes plus relevant revisions and one version/timeline change.
- **Selection/financial/status/policy refresh**: compare-and-swap root, append all derived children, switch pointers, append timeline/lifecycle, emit after commit.
- **Document write**: storage first; serializable metadata/version/root/timeline transaction; storage compensation on failure.
- **Bulk status**: one independent transaction per item to preserve partial success.
