# Contracts: Admissions

These are internal frontend, route, service, dependency, and future-consumer contracts. No HTTP/OpenAPI surface is invented because live backend, file storage, Student, Enrollment, and Finance integrations are outside this phase.

## Public Feature Boundary

`features/admissions/index.ts` exports route-facing screens, navigation/permission contributions, consumer-safe Admission summary/readiness/enrollment types, the service contract, and deterministic test scenario controls. Route pages and future consumers import only this boundary. Fixtures, mock adapter internals, schemas, hooks, and presentational components remain private.

Admissions consumes Organization, Academic Catalog, and Program Batch facts through Admissions-owned narrow reader ports backed by those modules' public exports. It never imports their fixtures, internal schemas, screens, or mutable editor DTOs.

## Route Contract

| Route | Purpose | Required permission |
| --- | --- | --- |
| `/admissions` | Scoped admission queue, search, filters, pagination, export | `admissions.view`; export additionally requires `admissions.export` |
| `/admissions/create` | Applicant resolution and Draft admission creation | `admissions.create` |
| `/admissions/[admissionId]` | Case detail, readiness, documents, decisions, history | `admissions.view` plus section-specific view/action keys |
| `/admissions/[admissionId]/edit` | Sectioned Draft editor | `admissions.update` plus assignment/academic/document/finance keys |

Next.js 16 pages await promise-based params, validate identifiers, and pass strings to feature screens. Direct routes return forbidden for known but unauthorized records and not-found for absent or cross-organization identifiers without disclosing protected facts. Pages own metadata, breadcrumbs, loading, and route error context; they do not access data or permission fixtures.

Successful creation replaces the blank create history entry with the canonical detail route. Submitted, Under Review, Approved, Enrolled, and Archived records opened through `/edit` render state-specific locked/correction guidance instead of exposing invalid editable controls.

## Service Context

The adapter receives authenticated context outside command payloads:

- organization ID and employee ID
- effective permission keys
- authorized branch IDs and explicit organization-wide capability
- locale, time zone, currency, precision
- stable scope fingerprint for query caching

Commands never accept actor, organization, roles, permissions, or arbitrary scope. The current mock context is explicitly a UX/test simulation; a future backend is authoritative.

## Admissions Service Facade

All operations are asynchronous, accept cancellation on reads where applicable, return cloned typed projections, and throw/return only safe typed `AdmissionsError` values. No permanent-delete operation exists.

### Reads

- `listAdmissions(query, signal?) -> PaginatedResult<AdmissionSummary>`
- `getAdmission(admissionId, signal?) -> AdmissionDetail`
- `getAdmissionLookups(selectionContext?, signal?) -> AdmissionLookups`
- `findDuplicateApplicants(candidate, signal?) -> DuplicateCandidate[]`
- `getReadiness(admissionId, action, signal?) -> AdmissionReadiness`
- `listDocuments(admissionId, signal?) -> AdmissionDocumentProjection[]`
- `listDocumentHistory(admissionId, documentId, historyQuery, signal?) -> PaginatedResult<DocumentVersionEvent>`
- `listLifecycleHistory(admissionId, historyQuery, signal?) -> PaginatedResult<AdmissionLifecycleEvent>`
- `listFinancialHistory(admissionId, historyQuery, signal?) -> PaginatedResult<FinancialPreparationSummary>`
- `getEnrollmentReadiness(admissionId, signal?) -> EnrollmentReadinessSummary`
- `exportAdmissions(query, signal?) -> AdmissionExportProjection`

### Commands

- `createDraft({ applicantInput, duplicateResolution?, admissionInput }) -> AdmissionDetail`
- `updateDraft({ admissionId, input, expectedVersion }) -> AdmissionDetail`
- `archiveApplicant({ applicantId, reason, expectedVersion }) -> ApplicantSummary`
- `changeAcademicSelection({ admissionId, selection, confirmedConsequences, reason, expectedVersion }) -> AdmissionDetail`
- `prepareFinancials({ admissionId, input, expectedVersion }) -> AdmissionDetail`
- `uploadDocument({ admissionId, requirementId, file, idempotencyKey, expectedVersion }) -> AdmissionDocumentProjection`
- `replaceDocument({ admissionId, documentId, file, reason, idempotencyKey, expectedVersion }) -> AdmissionDocumentProjection`
- `withdrawDocument({ admissionId, documentId, versionId, reason, expectedVersion }) -> AdmissionDocumentProjection`
- `verifyDocument({ admissionId, documentId, versionId, decision, reason?, expectedVersion }) -> AdmissionDocumentProjection`
- `transitionAdmission({ admissionId, toStatus, reason?, expectedVersion }) -> AdmissionDetail`
- `bulkTransitionAdmissions({ admissionIds, toStatus, reason?, expectedVersions }) -> BulkAdmissionOutcome`

The future Enrollment adapter alone may provide `confirmEnrollment({ admissionId, approvalSnapshotId, externalEnrollmentReference, idempotencyKey, expectedVersion })`. It must recheck authoritative eligibility/capacity and is not implemented as a user action in this phase.

Generic CRUD and unconstrained `Partial<Admission>` writes are prohibited. Each command validates exact permission, scope, state, dependencies, version, and payload before appending history.

## Dependency Reader Contracts

### Organization Directory Reader

Returns active selectable plus historical-resolved branches, departments, employees eligible for each assignment role, lead sources, academic grades, qualifications, identity policy, minor/guardian policy, document types/policies, locale, time zone, currency/precision, and effective scope. Stable keys and IDs drive behavior; inactive records remain resolvable but not newly selectable.

Foundation gap to address during implementation: current public Organization exports do not yet expose lead sources, grades, admission-document policies, explicit organization ID, or consumer-safe lookup DTOs. Add public projections/adapters rather than hardcoding them in Admissions.

### Academic Offering Reader

Returns list-optimized active/historical offerings with stable kind (`professional-program`, `professional-diploma`, `training-course`), ID/version/status, localized labels and code, eligible branches, current price/registration fee/currency, pricing revision identity, and document-policy references. Offering kind is never inferred from Arabic or English display text.

Foundation gap to address: expose a consumer-safe admission offering projection instead of reusing the editor-heavy Catalog detail or display-derived type names.

### Batch Admission Eligibility Reader

Evaluates `{ programId, batchId, registrationBranchId, studyBranchId, evaluatedOn }` and returns matching parent, registration-open/window status, seats, branch assignments, batch version, financial revision ID, normalized terms, evaluation identity/time, eligible flag, and ordered stable reason codes.

Admissions calls it at selection, submission, and approval and renders its reasons; it never reconstructs batch lifecycle/capacity rules. Frontend results are advisory. Future Enrollment performs atomic backend revalidation and seat claim.

Foundation gap to address: enrich the existing public Batch eligibility projection with IDs, evaluation context, both branch roles, currency, and immutable terms/revision identity.

## DTO and Privacy Contract

- `AdmissionSummary` is narrow and excludes full national ID, full notes, document filenames/links, finance history, and decision history.
- `AdmissionDetail` is section-aware and may omit/redact financial or document values when their view permissions are absent.
- `AdmissionLookups` contains only options already intersected with organization/branch scope plus historical labels required by the current case.
- Sensitive values never appear in query keys, URLs, Sonner messages, logs, safe error context, or export filenames.
- Documents have separate view/manage/verify permissions. A verification permission alone does not imply broad export or unrestricted applicant access.
- Enrollment readiness excludes raw files, file URLs, unrestricted notes, duplicate candidates, and unrelated applicant admissions.

## Editor and Validation Contract

- One RHF form with a composed Admissions Zod schema owns create and Draft update.
- Sections use FormProvider and shared controls; business rules remain in feature schemas/policies.
- Draft save accepts approval-readiness gaps but rejects malformed supplied values.
- Submission and approval invoke separate service-owned readiness evaluations.
- Applicant identity, assignment, academic, finance, and document sections require their exact permission; inaccessible values are omitted or redacted, not merely disabled in the DOM.
- Offering/batch change shows the exact consequences and requires confirmation before dependent values are cleared/recalculated.
- Duplicate candidates pause creation until the employee uses an existing applicant, cancels, or provides a permitted justified exception.
- Submitted/Under Review records require return-to-Draft before incompatible edits. Approved facts are read from the snapshot.
- Typed service field/section/readiness errors map into the form and error summary. First invalid field receives focus.
- Dirty values survive validation, duplicate, dependency, upload, conflict, forbidden, unavailable, and unexpected failures.
- Successful writes reset the form to the returned version before canonical navigation.
- Unsaved-change handling covers browser exit and editor-owned navigation through a shared confirmation pattern.
- IDs, phones, dates, filenames, codes, URLs, and money use bidi isolation in RTL.

## Document Contract

- The shared dropzone/preview handles base input interaction; Admissions owns requirement applicability, versioning, verification, and approval readiness.
- Accepted formats are configured PDF/JPEG/PNG MIME and extension pairs with configured maximum bytes.
- Upload uses an idempotency key; interrupted or failed versions do not replace the current available version.
- Replace appends version N+1 and resets current verification to Pending.
- Verification targets the exact current version; stale version decisions fail safely.
- Rejection and withdrawal require reasons. Verified document withdrawal/replacement requires confirmation and manage permission.
- Approval stores exact verified version IDs. Subsequent policy changes do not rewrite approved evidence.
- Mock preview references are non-production. Future storage must provide private signed access, malware/content scanning, retention, and audit controls.

## Lifecycle and Approval Command Contract

The pure transition table in [data-model.md](../data-model.md) is authoritative. A transition atomically checks:

1. Organization/branch scope and exact permission.
2. `expectedVersion` and current lifecycle state.
3. Allowed source/destination transition and required reason/confirmation.
4. Action readiness, including current dependencies and document versions.
5. For approval, creation of exactly one immutable approval snapshot.
6. Append exactly one lifecycle event and return one incremented version on success.

Failed commands create no event or snapshot. UI renders returned available actions and findings rather than recreating the transition policy.

## Financial Contract

Money crosses boundaries as normalized decimal strings with currency and precision. One discount mode is authoritative; calculation uses integer minor units. Program terms originate from a Batch financial revision; Diploma/Course terms originate from a Catalog pricing revision. Admissions may apply a permitted discount and creates its own revisions. Approval freezes the selected source revision and complete calculated terms.

Finance may later consume the approved snapshot but Admissions does not create payment plans, transactions, receipts, refunds, or ledger entries.

## List, Search, and Bulk Contract

The list reuses the shared controlled TanStack Table with stable row IDs, canonical query state, service-driven search/filter/sort/page, totals/facets, column visibility, selection reconciliation, loading/error/empty/retry states, and permission-aware actions.

Query fields include normalized search, branch/product/batch/status/admissions employee/customer service employee/manager arrays, allowlisted sort/direction, one-based page, and bounded page size. Service processing applies organization/branch scope first, normalized matching, stable ID tie-break sorting, pagination/totals, and page clamping. Changed criteria reset the page and reconcile selection.

Default visible columns remain concise: applicant/reference, academic target, branch/owner, status, updated time, and actions. Search covers permitted applicant name/contact/identity plus admission/product/batch references without revealing which protected field matched.

Only lifecycle-safe actions may be bulk operations. Each record is revalidated independently and `BulkAdmissionOutcome` contains one success/failure item per ID plus totals; partial failure is visible and successful records remain committed.

## Query Key and Invalidation Contract

Use a factory rooted at `['admissions']`:

- `lookups(scopeFingerprint, dependencyContext?)`
- `lists(normalizedQuery, scopeFingerprint)`
- `detail(admissionId, scopeFingerprint)`
- `readiness(admissionId, version, action)`
- `documents(admissionId)`
- `documentHistory(admissionId, documentId, query)`
- `lifecycleHistory(admissionId, query)`
- `financialHistory(admissionId, query)`
- `enrollmentReadiness(admissionId, approvalSnapshotId?)`

Sensitive values never enter keys. Writes set returned detail/projections and invalidate only affected lists, readiness, documents/history, financial history, lifecycle history, enrollment readiness, and dependency projections. Selection change additionally invalidates requirements and financial lookups. No command invalidates the whole application. Superseded reads accept `AbortSignal`.

## Permission Contract

Stable implemented keys are:

- `admissions.view`, `admissions.create`, `admissions.update`, `admissions.archive`, `admissions.export`
- `admissions.assign`, `admissions.academic.manage`
- `admissions.finance.view`, `admissions.finance.manage`
- `admissions.documents.view`, `admissions.documents.manage`, `admissions.documents.verify`
- `admissions.submit`, `admissions.review`, `admissions.approve`, `admissions.reject`, `admissions.return`
- `admissions.enrollment-readiness`

`admissions.enrollment.confirm` is reserved for the future authoritative Enrollment integration. Permission and branch scope are separate checks. Navigation, routes, section data, actions, export, bulk operations, and service commands enforce exact keys; role names and hidden buttons are never treated as authorization.

## Error Contract

`AdmissionsError` has a stable `code`, `kind`, safe Arabic message key, retryable flag, optional field/section errors, safe readiness/dependency context, and current version where disclosure is permitted.

Codes include:

- `validation`, `duplicate-candidate`, `duplicate-active-admission`, `duplicate-resolution-required`
- `stale-version`, `invalid-state`, `invalid-transition`, `readiness-incomplete`
- `offering-ineligible`, `batch-ineligible`, `inactive-dependency`, `scope-forbidden`
- `document-type-invalid`, `document-too-large`, `upload-interrupted`, `document-version-stale`, `documents-incomplete`
- `financial-invalid`, `currency-mismatch`, `discount-invalid`
- `forbidden`, `not-found`, `unavailable`, `partial-bulk-failure`, `unexpected`

Deterministic mock modes cover success, latency, empty, retryable/unavailable, forbidden/scope, not-found, duplicates, stale versions, invalid dependencies/selection/finance, upload interruption, rejected/missing documents, invalid transition/readiness, partial bulk, and unexpected failure. Raw exceptions, sensitive values, and native alerts are prohibited.

## Navigation, Feedback, Accessibility, and Responsive Contract

- Admissions navigation is configuration and permission driven.
- Reads expose loading, true/filtered empty, forbidden, unavailable, not-found, and retry states.
- Commands expose pending state plus Sonner success/failure feedback and persistent inline/readiness errors without duplicate announcements.
- Forms use sections/fieldsets, labels/descriptions, error summaries, first-error focus, and live regions for eligibility, finance, document, and lifecycle changes.
- Dropzones and all preview/replace/remove/verify actions are keyboard operable and have accessible names; confirmation dialogs trap and return focus.
- Status, requirement, and readiness meaning never depends on color alone.
- RTL is native at 1440, 1024, and 768 px and at 200% zoom; only table viewports scroll horizontally; document cards and editor/review rails collapse without hiding actions.

## Future Adapter and Consumer Contract

A REST, GraphQL, or server-function adapter may replace mock services without route/screen changes. Future Enrollment consumes only `EnrollmentReadinessSummary` and performs idempotent authoritative confirmation; future Student creation follows confirmed enrollment. Future Finance consumes only the approved financial snapshot. Reporting, workflows, notifications, audit storage, privacy/retention, and AI receive typed permission-scoped read context and no implicit mutation capability.
