# Quickstart Validation: Admissions

This guide validates [spec.md](spec.md), [data-model.md](data-model.md), and [contracts/](contracts/). It describes release evidence, not implementation code.

## Prerequisites

- Node.js 22, installed dependencies, and isolated PostgreSQL development/test databases
- Foundation, IAM, Organization, Catalog, and Program Batches migrations/seeds applied
- active branches/departments/lookups/employees, all three offering kinds, and one registration-open Program batch
- an administrator with the full Admissions permission catalogue and limited users for scope/redaction checks
- writable isolated local storage and representative PDF/JPEG/PNG/invalid/oversized fixtures

Never run destructive migration, concurrency, upload-cleanup, archive, or scale checks against production data.

## Setup and Automated Gates

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run seed
npm run lint
npm run build
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```

Run Admissions integration suites against the isolated PostgreSQL test database. Record exact suite counts and environmental limitations after implementation.

## Validation Scenarios

### 1. Contract and Permission Surface

Compare every route, field, envelope, status, error, and permission to [admissions-http.contract.md](contracts/admissions-http.contract.md) and §4.5. Confirm no DELETE, cancelled status, standalone cancel endpoint, separate file-opening-fee field, structured notes API, payment, or Student creation exists. Amend §4.5/archive frontend validation so archive reason is consistently required.

### 2. Migration, Constraints, and Seed Idempotency

Validate fresh deployment and upgrade from Program Batches, plus rollback reconstruction on a disposable database. Inspect UUIDs, checks, indexes, restrictive references, current-pointer ownership, durable idempotency, unique revisions/result versions, archive reason, and append-only triggers. Run seeds twice without duplication.

### 3. Applicant Identity and Duplicate Resolution

Exercise Arabic/digit normalization, phone/national-ID patterns, alternate identity, minor guardian rule, DOB/graduation boundaries, and profile image. Verify same national ID/phone returns candidates; `use-existing` reuses; authorized `create-exception` with reason creates a distinct applicant; no unconditional unique constraint blocks the approved exception.

### 4. Atomic Draft Creation

Create a draft for Program, Diploma, and Course. Verify required assignments, correct batch pairing, unique reference, version 1, initial selection/eligibility and financial revisions, document policy/rows, lifecycle/timeline, labels, and one post-commit event. Inject failures at each child write and prove complete rollback and safe storage compensation.

### 5. List, Search, Filter, Sort, Pagination, Export, and Scope

Seed at least 10,000 admissions across canonical scalar filters. Verify Arabic-folded search, deterministic ordering, page defaults/max/over-range, branch scope, archived behavior, masked phone, PII/finance/document omission, exact record permissions, and filtered UTF-8 BOM CSV export. No undocumented academic-year/date filters appear.

### 6. Draft Update and Concurrency

Update applicant, assignment, notes, selection, and finance while draft. Confirm one version increment, relevant immutable revisions, and timeline entries without note contents. Reject server-owned fields, submitted edits, stale versions, foreign scope, inactive staff/master data, and injected partial failures. Race two updates; exactly one wins.

### 7. Selection Eligibility and Consequences

Test Program batch-required and Diploma/Course batch-forbidden behavior; inactive/closed/mismatched products/batches; dates, seats, and registration/study branches. Verify re-evaluation at selection/submission/approval. Dedicated selection change must require exact consequence acknowledgement, append selection/financial revisions, refresh policy, and retain history.

### 8. Exact Financial Revisions

Round-trip supported Money precisions without numbers/floats. Test none/percentage/amount discounts, 0/100% boundaries, excessive amounts, negative/fractional errors, and required-amount arithmetic. Verify registration fees include file-opening fees, every edit appends one immutable revision, and later Catalog/Batch changes do not alter old admissions.

### 9. Document Policy and Upload Lifecycle

Validate missing rows, stage requirements, PDF/JPEG/PNG signatures, per-requirement size overrides, unsupported/oversized files, durable idempotent retries, replacement, withdrawal, failed storage, compensation, current version, version history, verify/reject permissions and reasons, and policy refresh reconciliation. Direct history update/delete must fail.

### 10. Readiness and Review Ownership

Evaluate submit/approve with multiple simultaneous findings and confirm all are returned. Resolve findings and prove transition uses the same evaluator. Race review starts and ensure one active reviewer. Return to draft clears reviewer and requires reason.

### 11. Lifecycle, Bulk Status, Archive, and Timeline

Exercise every edge in [data-model.md](data-model.md), action permission, reason rule, terminal state, and expectedVersion. Cancellation must archive with reason and preserve history. Bulk operations return HTTP 200 with one result per item and retain successful independent actions. Every material change produces one safe chronological timeline entry and status changes produce matching lifecycle entries.

### 12. Approval and Enrollment Readiness

Approve only a complete eligible admission. Verify the approval snapshot is written once with exact selection/assignment/financial/policy/verified-version references. Enrollment readiness blocks every incomplete/non-approved case. Through the public port, retry the same Student acknowledgement and receive one result; a different reference is refused. Admissions never creates Student data.

### 13. Authorization, Privacy, Errors, and Logging

Test all 18 permission keys independently, field/action-sensitive combinations, branch `OUT_OF_SCOPE`, non-disclosing not-found, finance/document redaction, closed errors, Arabic UTF-8 messages, CSRF/CORS, and upload failures. Scan logs/events/Swagger/responses for national IDs, full phones, addresses, note text, file contents/paths, SQL, stacks, secrets, and internal minor-unit values.

### 14. Architecture and Full Regression

```bash
rg -n "PrismaService|prisma\." src/modules/admissions -g '*.ts' | rg -v 'repository'
rg -n ": any|<any>|as any" src/modules/admissions test/{unit,integration,e2e}/admissions -g '*.ts'
rg -n "node:fs|path\.join" src/modules/admissions -g '*.ts'
rg -n "ProductRepository|ProgramBatchRepository|BranchRepository|EmployeeRepository" src/modules/admissions -g '*.ts'
```

No unjustified match is allowed. Run full Foundation, IAM, Organization, Catalog, and Program Batches regression, Prisma validation/generation, lint, build, fresh/upgrade migration, repeated seed, contract E2E, concurrency, disclosure, and 10,000-record scale evidence.

## Completion Record

Record migration environments, seed result, unit/integration/E2E counts, upload compensation/idempotency evidence, concurrency winners, scale timings, architecture scans, disclosure results, canonical archive-reason amendment, and any environmental limitations. The feature is ready only when all fourteen groups pass with no unresolved contract or constitution deviation.

### 2026-08-02 implementation run

- Prisma generation, validation, and development migration deployment passed against PostgreSQL.
- The complete seed chain ran twice without duplication; Admissions produced five deterministic draft fixtures and all mandatory lookup families returned active values.
- ESLint and the strict NestJS production build passed.
- Unit regression: 38 suites / 129 assertions passed.
- Admissions integration: 10 suites / 43 assertions passed, including migration, permission catalogue, architecture boundaries, concurrency, append-only history, storage compensation, and the rolled-back scale benchmark.
- Full E2E regression: 55 suites / 242 assertions passed, including lifecycle, security, lookups, enrollment readiness, and real multipart document coverage.
- Live authenticated smoke checks passed for list and the consolidated lookup endpoint. The lookup response includes branches, employees, managers, departments, lead sources, grades, qualifications, offerings, batches, document policy, currency, and identity rules.
- Architecture scans found Prisma access only in Admissions repositories, no foreign repository imports, no feature filesystem access, and no explicit `any` types.
- The frontend archive contract now requires an archive reason and no cancelled state or cancellation endpoint was introduced.
- The isolated test database passed the lifecycle/enrollment concurrency suite: exactly one compare-and-swap winner, one immutable lifecycle/timeline pair, independent ordered bulk results, one approval snapshot, and idempotent same-reference enrollment acknowledgement.
- A disposable 10,000-admission transaction returned a bounded 100-row page through the operational organization/status/time index within the 2-second test budget; the transaction was deliberately rolled back and left zero benchmark rows.
- Injected storage failures confirmed database/file compensation behavior without leaving orphaned document versions.
