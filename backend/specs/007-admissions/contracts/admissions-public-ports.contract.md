# Public Ports Contract: Admissions Integrations

Ports expose stable domain facts, never Prisma models or repositories. Callers pass organization/caller scope where relevant, and dependency failures remain distinguishable from ineligible outcomes.

## Ports Consumed by Admissions

### Catalog Offering Port

- Resolve offering ID, kind, version, code/label, active state, branch availability, current exact pricing revision, and document-policy identity/snapshot.
- Resolve historical offering identity/version for immutable admission display.
- Never allow Admissions to infer fixed product type or pricing by table access.

### Program Batches Port

- Evaluate batch eligibility for offering, registration branch, study branch, and evaluation date.
- Return batch/program match, status, version, labels/codes, available seats, registration window, branch roles, academic year, current financial revision ID, and exact pricing snapshot.
- Resolve previously pinned batch/revision identities after later changes.

### Organization Master Data Port

- Resolve and list active/historical branches, departments, qualifications, lead sources, grades, currency/precision, and published applicant identity rules.
- Preserve disabled historical labels while marking them unselectable.

### IAM Employee Reference Port

- Resolve bounded employee/manager IDs to active state, name, organization, branch scope, and assignment eligibility.
- It must not expose credentials, sessions, password data, role internals, or an employee repository.

### Storage Port

- Validate/signature-check and store admission documents with bounded size and closed MIME types.
- Return stable file descriptors; support read/preview and compensation removal for newly orphaned uploads.
- Business code never receives or persists local filesystem paths.

## Port Exported to Future Student Management

### Admissions Enrollment Port

`getEnrollmentReadiness(admissionId, caller)` returns either all refusal reasons or a stable handoff containing:

- admission ID/reference/version and approval snapshot ID;
- applicant enrollment identity;
- academic offering kind/ID/version and optional batch ID/version;
- registration/study branches and department/customer-service assignment;
- verified document version IDs and requirement snapshot ID;
- financial revision ID, currency, precision, and required amount.

`acknowledgeEnrollment(admissionId, approvalSnapshotId, externalStudentReference, expectedVersion)`:

- succeeds only for the matching approved snapshot;
- is idempotent for the same external reference;
- rejects a different reference or stale snapshot/version;
- transitions the admission to enrolled and appends lifecycle/timeline atomically;
- does not create, update, or query Student persistence.

## Failure Semantics

- Unknown/inactive references return typed not-found/dependency outcomes.
- Eligibility failures are business results, not dependency outages.
- Temporary dependency/storage outages are retryable and never converted to empty lookup data, zero seats, or successful readiness.
- Ports must not disclose data outside organization/branch scope or log PII.
