# HTTP Contract: Admissions

All paths are beneath `/api/v1`. JSON successes use the global `{success:true,data,meta?}` envelope and closed Arabic errors use `{success:false,error}`. IDs are UUIDs, timestamps are UTC ISO strings, dates are `YYYY-MM-DD`, Money amounts are decimal strings, and every mutation carries `expectedVersion` except creation, which uses durable idempotency/duplicate resolution.

## Shared Rules

- Admission lists use `page` and `pageSize` (1/20 defaults, 100 maximum) and return `meta.{total,page,limit,totalPages}`. Over-range pages return empty HTTP 200.
- Search folds Arabic variants, diacritics, and Arabic-Indic digits.
- List summaries mask phones to the last four digits and exclude national ID, address, documents, and financials.
- Detail/history sections are branch-scoped and permission-filtered. Responses include record `permissions` where documented.
- Stale writes return `409 VERSION_CONFLICT` with first-class `currentVersion`.
- Cancellation is `toStatus:"archived"` with a required reason. There is no `cancelled` value or DELETE endpoint.

## Admission Administration

### List and Export

- `GET /admissions` — `admissions.view`. Query: `search`, scalar `branchId`, `offeringId`, `batchId`, `status`, `admissionsEmployeeId`, `customerServiceEmployeeId`, `customerServiceManagerId`, `sortBy=updatedAt|applicantName|reference|status`, `sortOrder`, `page`, `pageSize`.
- `GET /admissions/export` — `admissions.export`. Applies the same filters/scope and returns UTF-8 CSV with BOM. Sensitive columns follow export permission policy.

### Detail, Duplicate Check, Create, Update

- `GET /admissions/:id` — `admissions.view`; returns applicant, assignment, current selection/financial when permitted, requirement snapshot, documents when permitted, readiness, histories, lifecycle, audit/version, and available actions.
- `POST /admissions/duplicates` — `admissions.create`; request is applicant input; response candidates contain applicant ID/label and reasons `same-national-id|same-phone`.
- `POST /admissions` — `admissions.create`; request `{input:{applicant,assignment,selection,financial,notes},duplicateResolution?,idempotencyKey}`. All seven assignment IDs are required; grade is optional. Response 201 full draft/version 1.
- `PATCH /admissions/:id` — `admissions.update`, plus `admissions.assign`, `admissions.academic.manage`, or `admissions.finance.manage` when those sections change. Request `{input,expectedVersion}`. Direct aggregate edit is draft-only; protected/server-derived fields are rejected.

Duplicate resolution is `use-existing` with `applicantId` or `create-exception` with required reason. Program selection requires batch; Diploma/Course forbid it. The server resolves labels, snapshots policy/pricing, derives Money, and never trusts status/history/IDs/audit fields.

## Status and Revision Actions

- `PATCH /admissions/:id/status` — body `{toStatus,reason?,expectedVersion}`.
- `POST /admissions/bulk-status` — body `{items:[{admissionId,toStatus,reason?,expectedVersion}]}`; HTTP 200 item outcomes, never all-or-nothing.
- `PATCH /admissions/:id/selection` — `admissions.academic.manage`; body `{selection,confirmedConsequences,reason,expectedVersion}`. Appends selection/financial revisions and reconciles document policy.
- `PATCH /admissions/:id/financials` — `admissions.finance.manage`; body `{input:{discountMode,discountValue,reason?},expectedVersion}`. Appends a financial revision.
- `PATCH /applicants/:applicantId/archive` — `admissions.archive`; body `{reason,expectedVersion}`.

| Action | Destination | Permission | Required condition |
|--------|-------------|------------|--------------------|
| Submit | submitted | `admissions.submit` | submit readiness |
| Start review | under-review | `admissions.review` | reviewer available |
| Approve | approved | `admissions.approve` | approve readiness and eligibility; create snapshot |
| Reject | rejected | `admissions.reject` | reason |
| Return | draft | `admissions.return` | reason; clear reviewer |
| Archive/cancel | archived | `admissions.archive` | reason; non-enrolled |
| Enroll acknowledgement | enrolled | internal Students port | approved snapshot consumed |

## Readiness and History

- `GET /admissions/:id/readiness?action=submit|approve` — relevant action permission; returns `{ready,action,findings,admissionVersion}` and uses the same evaluator as transition.
- `GET /admissions/:id/lifecycle` — `admissions.view`; ordered immutable transition events.
- `GET /admissions/:id/financial-history` — `admissions.finance.view`; ordered immutable canonical Money revisions.
- `GET /admissions/:id/enrollment-readiness` — `admissions.enrollment-readiness`; returns readiness reasons, admission/reference/version/status, approval snapshot ID, applicant summary, academic target, branches, and exact required amount.

## Documents

- `GET /admissions/:id/documents` — `admissions.documents.view`.
- `POST /admissions/:id/documents` — `admissions.documents.manage`; multipart `file`, `requirementId`, `idempotencyKey`, `expectedVersion`.
- `POST /admissions/:id/documents/:documentId/replace` — manage; multipart file/idempotency/version, append version.
- `POST /admissions/:id/documents/:documentId/withdraw` — manage; `{documentVersionId,reason?,expectedVersion}`.
- `POST /admissions/:id/documents/:documentId/verify` — `admissions.documents.verify`; `{documentId,versionId,decision:verified|rejected,reason?,expectedVersion}`; rejection reason required.
- `GET /admissions/:id/documents/:documentId/versions` — view; ordered versions/decisions.
- `POST /admissions/:id/documents/refresh-policy` — academic/document manage permissions; `{expectedVersion}`; reconciles stable requirement keys.

Accepted signatures/MIME are PDF, JPEG, and PNG. Default cap is 5,000,000 bytes; requirement policy may be stricter. Replacement, withdrawal, verification, and refresh preserve immutable history.

## Lookups

`GET /admissions/lookups` — `admissions.view`; bounded response includes branches, employees, managers, departments, lead sources, academic grades, qualifications, offerings, batches, current document policy, currency, and precision. Disabled options remain present with `disabledReason`. Batch choices depend on offering; branch choices depend on offering/batch.

## Closed Errors

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR`, `BATCH_RULE_VIOLATED` | 422 | Structural, applicant, assignment, selection, finance, reason, or pairing failure |
| `VERSION_CONFLICT` | 409 | Stale expectedVersion; includes currentVersion |
| `INVALID_TRANSITION`, `NOT_READY`, `ELIGIBILITY_FAILED` | 409 | Lifecycle/readiness refusal |
| `DUPLICATE_APPLICANT`, `ALREADY_UNDER_REVIEW` | 409 | Unresolved duplicate or reviewer conflict |
| `FORBIDDEN`, `OUT_OF_SCOPE` | 403 | Missing permission or branch scope |
| `NOT_FOUND` | 404 | Unknown/non-disclosable resource |
| `DEPENDENCY_NOT_FOUND` | 422 | Offering, batch, branch, staff, or lookup unavailable |
| `UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE` | 422 / 413 | Upload validation |
| `UPLOAD_FAILED`, `SERVICE_UNAVAILABLE` | 500 / 503 | Retryable storage or dependency failure |

## Approved Canonical Delta

The current §4.5 table labels admission archive reason optional. The approved specification requires a reason because cancellation maps to archival. Implementation must update that table and matching frontend schema/contract tests; all other wire behavior remains canonical.
