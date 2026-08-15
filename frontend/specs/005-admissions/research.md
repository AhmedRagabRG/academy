# Research: Admissions

All technical-context questions are resolved. No `NEEDS CLARIFICATION` remains.

## Feature Ownership and Cross-Module Integration

**Decision**: Implement `admissions` as an independent top-level feature. Consume organization assignments/configuration, catalog offering summaries, and batch eligibility through public read contracts; expose narrow approval/enrollment-readiness and finance snapshot contracts.

**Rationale**: Admissions owns a long-lived operational case used by several teams but must not own products, batches, students, payments, or organizational records. Public projections prevent internal fixtures and schemas from becoming cross-feature dependencies.

**Alternatives considered**:

- Place Admissions inside CRM: rejected because lead management is out of scope and an applicant can exist without a CRM lead.
- Place Admissions inside Student Management: rejected because applicants are explicitly not students.
- Import feature fixtures directly: rejected because it creates competing sources of truth and blocks future adapters.

## Applicant Identity and Admission Cases

**Decision**: Model `Applicant` as the stable person identity and `Admission` as a separately versioned case for one attempted academic selection. One applicant may have multiple admissions over time, while a service policy normally permits only one active case for the same academic target.

**Rationale**: Reapplications and different offerings must preserve identity and history without prematurely creating or mutating a Student.

**Alternatives considered**:

- One combined applicant/admission record: rejected because person facts and case decisions have different lifecycles.
- Limit an applicant to one lifetime admission: rejected because it blocks legitimate reapplication and different offerings.

## Duplicate Detection and Resolution

**Decision**: Normalize national identity and phones and return explainable duplicate candidates. A strong national-ID match or possible phone/name/date match triggers a resolution workflow: use the existing applicant, cancel, or create a justified exception with exact permission. Never merge silently.

**Rationale**: Shared phones and data-entry mistakes create false positives, while silent duplicate creation or merging risks privacy and record corruption.

**Alternatives considered**:

- Hard-block every candidate: rejected because legitimate shared contact information exists.
- Warn without recording resolution: rejected because duplicate exceptions need accountability.
- Automatically merge: rejected because it can combine different people irreversibly.

## Academic Selection and Eligibility

**Decision**: Use a discriminated academic selection. Professional Program requires one matching batch; Diploma and Course forbid a batch. Record offering/batch revision references and re-evaluate active offering, batch status/window/seats/parent, registration branch, and study branch at selection, submission, and approval.

**Rationale**: Eligibility is time-sensitive. Stable IDs/revisions and reason codes make changes explainable without copying mutable catalog aggregates.

**Alternatives considered**:

- Validate only on selection: rejected because seats, dates, branches, and lifecycle can change before approval.
- Determine type from localized labels: rejected because configuration and translation would change behavior.
- Copy full product/batch records into Admissions: rejected because ownership and current eligibility would drift.

## Dependent Selection Changes

**Decision**: Changing offering or batch requires confirmation that enumerates affected branches, requirements, documents, financial preparation, and readiness. On confirmation, append a selection revision and explicitly clear or recalculate incompatible dependent values.

**Rationale**: Cross-section dependencies make silent resets unsafe and invisible stale values worse.

**Alternatives considered**:

- Recalculate silently: rejected because employees can lose entered work without understanding why.
- Preserve all dependent values: rejected because documents, branches, and prices may no longer apply.

## Document Requirements, Versions, and Verification

**Decision**: Snapshot applicable requirement IDs/revisions for the case. Each logical requirement slot owns append-only file versions; every immutable verification decision targets exactly one version. Replacement creates the next version and resets current verification to Pending. Approval records the exact verified version IDs.

**Rationale**: A verified file must never be replaceable without invalidating the verification. Snapshot and history provide auditable evidence while allowing current policy to evolve.

**Alternatives considered**:

- Overwrite the existing file: rejected because decision evidence disappears.
- Attach verification to the requirement slot: rejected because it could accidentally apply to different bytes.
- Retroactively invalidate approved records when policy changes: rejected because historical decisions must remain stable.

## File Handling in the Frontend Phase

**Decision**: Build requirement-aware document UI on the shared dropzone/preview controls. Mock services retain cloned file metadata and deterministic preview references, enforce configured MIME/size rules, and simulate interrupted/retryable uploads; real storage, signed downloads, malware scanning, and content inspection remain future adapter responsibilities.

**Rationale**: This phase can prove selection, validation, version, verification, permission, and error behavior without pretending browser memory is durable secure storage.

**Alternatives considered**:

- Add real storage now: rejected as explicitly out of scope.
- One undifferentiated multi-file area: rejected because requirement completeness and verification cannot be proven.
- Store file data in page state: rejected because it bypasses services and makes future migration invasive.

## Financial Preparation and Approval Snapshot

**Decision**: Represent monetary values as normalized non-negative decimal strings with configured currency/precision. Exactly one discount mode is authoritative per edit; derive the counterpart and required amount in integer minor units. Every accepted change creates a revision, and approval captures an immutable financial snapshot with its source offering/batch revision.

**Rationale**: Binary floating point and independently editable discount values create inconsistent totals. A snapshot prevents later catalog or batch pricing changes from rewriting an approved agreement.

**Alternatives considered**:

- Store JavaScript numbers as financial truth: rejected because of rounding risk.
- Edit percentage and amount independently: rejected because they can conflict.
- Look up current price during future enrollment: rejected because historical terms would drift.

## Lifecycle, Corrections, and Enrollment Boundary

**Decision**: Use one pure transition table with exact permissions, readiness gates, reasons, optimistic versions, and one immutable event per success. Core flow is Draft → Submitted → Under Review → Approved → Enrolled. Submitted/Under Review may return to Draft with reason; Under Review may become Rejected; Rejected may reopen to Draft; Draft/Rejected/eligible Approved may archive. `Approved → Enrolled` is reserved for a future idempotent enrollment-confirmation command with a matching snapshot and external reference. Archived is terminal.

**Rationale**: Operational corrections are legitimate, but arbitrary status selection would bypass approval gates and history. Admissions must expose readiness without creating a Student or reserving a seat itself.

**Alternatives considered**:

- Free status dropdown: rejected because it bypasses authorization and readiness.
- Strict forward-only flow: rejected because real records need controlled correction.
- Create Student immediately on approval: rejected because successful enrollment is a separate future process.

## Concurrency and Immutable History

**Decision**: Every mutation supplies an expected integer version. Stale versions return a typed conflict with safe current context and require refresh/reconciliation. Selection revisions, document versions/decisions, financial revisions, lifecycle events, duplicate resolutions, and approval snapshots are append-only; failed commands append nothing.

**Rationale**: Review and document decisions are high-value concurrent actions. Last-write-wins could silently erase another employee's work.

**Alternatives considered**:

- Last-write-wins: rejected because it loses decisions.
- Timestamp-only comparison: rejected because equal/coarse timestamps are ambiguous.
- Optimistic UI for approval: rejected because the snapshot and readiness must be confirmed atomically.

## Service, Query State, and Scale

**Decision**: Define a transport-neutral `AdmissionsService` with intent-specific commands and narrow summary/detail/readiness/history projections. TanStack Query keys are rooted at `['admissions']`; normalized list queries include effective organization/branch scope. Services own Arabic/English normalization, filtering, stable sorting, pagination, totals, export projection, cancellation, permission checks, and deterministic scenarios.

**Rationale**: Pages remain unchanged when a backend arrives, list screens never receive full documents/history, and 10,000 records remain practical.

**Alternatives considered**:

- Generic CRUD using unconstrained partial objects: rejected because lifecycle and section permissions would be bypassed.
- Filter fixtures in screens: rejected for scale, scope, and adapter migration.
- Store server records in Zustand: rejected because asynchronous domain state belongs to TanStack Query.

## Form and Review UX

**Decision**: Use one RHF provider and composed Zod draft schema across persistent sections rather than hiding cross-dependent fields in a wizard. Detail/review exposes a concise readiness summary and service-derived actions. Offering changes, lifecycle decisions, destructive document changes, and archival use focus-managed confirmations.

**Rationale**: Personal, academic, branch, document, and financial rules cross section boundaries. Persistent sections keep error context visible and support incremental drafts.

**Alternatives considered**:

- Independent form per card: rejected because cross-section validation and atomic drafts would diverge.
- Tabs/wizard as the only navigation: rejected because hidden errors and dependent consequences become hard to discover.
- Put business validation inside controls: rejected because shared components must stay reusable.

## List and Table UX

**Decision**: Reuse the controlled shared table with essential default columns only: applicant/reference, academic target, branch/owner, status, updated time, and actions. Use a responsive filter area for branch, product, batch, status, and employee assignments; active filters remain visible and removable. Mixed-direction identifiers use bidi isolation.

**Rationale**: The operational queue needs powerful filtering without permanently overloading the row or recreating the recent wide-table identity alignment issue.

**Alternatives considered**:

- Show every filterable field as a column: rejected because scanability collapses.
- Custom table: rejected because the platform mandates one implementation.
- Whole-cell LTR direction: rejected because it dislocates secondary identifiers in RTL.

## Permissions, Privacy, and Branch Scope

**Decision**: Use granular stable keys: `admissions.view`, `admissions.create`, `admissions.update`, `admissions.archive`, `admissions.export`, `admissions.assign`, `admissions.academic.manage`, `admissions.finance.view`, `admissions.finance.manage`, `admissions.documents.view`, `admissions.documents.manage`, `admissions.documents.verify`, `admissions.submit`, `admissions.review`, `admissions.approve`, `admissions.reject`, `admissions.return`, and `admissions.enrollment-readiness`. Derive organization/branch scope only from employee context and minimize PII/document metadata per projection. A future `admissions.enrollment.confirm` key belongs to the authoritative Enrollment integration, not this frontend phase.

**Rationale**: Admissions spans separated operational duties and sensitive personal evidence. Role names, navigation hiding, or one manage key are insufficient.

**Alternatives considered**:

- Role-name checks: rejected because roles are configurable.
- One broad manage permission: rejected because document verification, finance, and approval need separation of duties.
- Trust query scope supplied by components: rejected because callers could broaden access.

## Accessibility, RTL, Responsive, and Failure States

**Decision**: Use semantic forms/fieldsets, error summaries with first-error focus, named icon actions, keyboard-operable upload and verification controls, live readiness/upload/finance feedback, focus-managed dialogs, 44px practical touch targets, and text-plus-color statuses. Arabic RTL remains at the page level; national IDs, phones, codes, dates, filenames, and money are isolated. Editor/review rails collapse to one column on tablet, while only table viewports scroll horizontally. Define explicit loading, true/filtered empty, forbidden, not-found, unavailable, validation, stale, partial-bulk, interrupted-upload, retry, and success states.

**Rationale**: These are functional constitutional requirements and the document-heavy workflow must remain understandable without mouse, color, or desktop width.

**Alternatives considered**:

- Toast-only failures: rejected because field/readiness errors need persistent actionable context.
- Desktop-only side rail: rejected because tablet is supported.
- Hover-only document actions: rejected because touch and keyboard users cannot depend on hover.
