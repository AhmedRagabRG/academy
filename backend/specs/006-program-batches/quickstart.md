# Quickstart Validation: Program Batches

This guide validates [spec.md](spec.md), [data-model.md](data-model.md), and [contracts/](contracts/). It is a release-validation guide, not implementation code.

## Prerequisites

- Node.js 22 and installed dependencies
- isolated PostgreSQL development and test databases
- Foundation, IAM, Organization, and Academic Catalog migrations/seeds applied
- one active Professional Program, one Diploma, one Course, representative academic years, `program-intakes`, branches, and an administrator with batch permissions
- replaceable enrollment dependency providers for known-empty, nonzero, active-dependency, and unavailable states

Never run destructive migration, rollback, concurrency, or scale scenarios against production data.

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

Run the repository's integration configuration against the isolated test database. Record exact suite/test counts and environment limitations after implementation.

## Validation Scenarios

### 1. Contract and Permission Surface

Compare every documented route, method, parameter, field, envelope, status, error, and permission with [program-batches-http.contract.md](contracts/program-batches-http.contract.md) and requirements §4.4. Confirm:

- administration paths are nested beneath `/programs/:programId/batches`;
- batch-centric eligibility/lifecycle/revision paths remain as documented;
- no delete, export, upload, `/products/:id/batches`, or undocumented endpoint exists;
- ordinary edits do not require capacity/pricing/branch permissions unless those sections changed;
- transition actions require their exact permission, including correction-only reopening.

### 2. Migration and Constraint Parity

Validate fresh deployment and upgrade from the completed Catalog schema. Reconstruct rollback on a disposable database. Inspect constraints/indexes/triggers for:

- program-scoped normalized code uniqueness;
- positive maximum, values, precision, version, positions, and ordered dates;
- unique branch-role, revision number/source version, installment position, and lifecycle result version;
- restrictive foreign keys and current-revision ownership;
- update/delete denial on financial revisions/children and lifecycle events.

Run the seed twice and prove no duplicate intake values or batch development fixtures.

### 3. Parent Eligibility and Draft Creation

Create one batch beneath an active Professional Program and verify draft/version 1, zero live students from the known-empty provider, derived full availability, revision 1, lifecycle null→draft, stable UUIDs, and one post-commit event. Attempt the same beneath Diploma/Course/inactive/unknown/out-of-scope products and verify closed non-disclosing failures and complete rollback.

### 4. List, Search, Filters, Sort, Pagination, and Scope

Seed batches across programs, Arabic/English names, normalized codes, years, intakes, branches, statuses, and equal sort values. Verify:

- Arabic folding and code search;
- every singular filter and `all` status;
- archived default exclusion/explicit inclusion;
- all four sort fields/directions with stable IDs;
- pageSize default/max and empty over-range 200;
- parent isolation and branch scope;
- derived labels, live capacity, price, branch count, permissions;
- dependency unavailable does not appear as a zero count.

### 5. Aggregate Update and Optimistic Concurrency

Update basic, schedule, capacity, financial, and branch sections together with current version. Confirm one version increment, atomic replacement, stable current data, field-sensitive permissions, and one post-commit aggregate event. Submit stale version, unknown/derived fields, wrong parent, locked code, and an injected child-write failure; verify no partial root/branch/revision/event changes.

### 6. Schedule Boundaries

Test absent/empty optional dates and every equality/ordering boundary:

- registration end strictly follows registration start;
- study start may equal registration end;
- study end strictly follows study start;
- graduation may equal study end.

Verify date-only round-trip independent of server timezone and field-path-specific Arabic validation.

### 7. Capacity and Fixed 10% State

For representative maximum/current pairs, verify integer calculation and precedence:

- available: positive seats above 10%;
- nearly full: positive seats at/below 10%, including non-divisible maxima;
- full: exactly zero seats;
- over capacity: current exceeds maximum.

Reject zero/negative/non-integer maximum, client-supplied derived fields, and lowering below live enrollment. Simulate unavailable count and verify retryable failure/no write.

### 8. Branch Assignments and Historical Resolution

Assign registration/study roles, including both roles for one branch. Reject duplicate pairs, inactive new assignments, unknown/out-of-scope branches, and removal that violates readiness when opening registration. Deactivate a previously assigned branch and verify it remains historically labeled/disabled but is ineligible for new registration.

### 9. Exact Financial Configuration

Round-trip both Money values across supported currencies/precisions without float exposure. Reject exponent/number/negative/excess-scale/mismatched values. Validate installment enabled/disabled behavior, non-empty plans, covered charges, amount/percentage bases, positive ordered installments, schedule-dependent milestones, and offer amount/percentage/date rules including 100% boundary.

### 10. Immutable Financial Revisions

Create revision 1, perform a nonfinancial update (no new revision), then financial updates (exactly one revision each). Verify sequential numbers, source/resulting versions, stable IDs, complete snapshots, current link, and historical resolution. Attempt direct update/delete/child mutation at database level and expect constraint refusal. Pin an older revision in a consumer snapshot and prove later edits do not mutate it.

### 11. Readiness and Code Lock

Evaluate incomplete drafts and verify all findings. Complete each missing section and verify ready. Open registration and confirm readiness recheck, permanent `codeLockedAt`, one version/event, and code immutability through all later statuses. Race code edit against first opening and prove only one consistent result.

### 12. Lifecycle and Action Permissions

Exercise every allowed/refused transition edge in [data-model.md](data-model.md), reason requirements, exact permission matrix, terminal archive, and correction-only reopening. Race two transitions from one version; exactly one succeeds and only one lifecycle row/event appears. Force dependency failure and verify no state/history/event change.

### 13. Admissions Eligibility and Dependency Safety

Inject the evaluation date and test every independent/combined refusal reason: parent/batch inactive, registration window not started/ended, branch inactive/not assigned/not registration role, full/over capacity, and dependency unavailable. Eligible output must include live seats, batch version, and current revision. Verify archival refusal with active dependencies and success without them.

### 14. Public Consumer and Architecture Boundaries

Use only `PROGRAM_BATCHES_PUBLIC_PORT` to resolve active selection options, archived identity, readiness, eligibility, current selection reference, revision, and immutable snapshot. Verify Catalog/Organization/Admissions interactions use public ports only and no repository leaks.

Run architecture scans:

```bash
rg -n "PrismaService|prisma\." src/modules/program-batches -g '*.ts' | rg -v 'repository'
rg -n ": any|<any>|as any" src/modules/program-batches test/{unit,integration,e2e}/program-batches -g '*.ts'
rg -n "node:fs|path\.join" src/modules/program-batches -g '*.ts'
rg -n "ProductRepository|BranchRepository|AcademicYearRepository|Admission.*Repository" src/modules/program-batches -g '*.ts'
```

No unjustified match is allowed.

### 15. Scale, Disclosure, and Full Regression

Seed at least 10,000 batches and record indexed parent-scoped search/filter/sort/page behavior against the two-second user outcome. Scan Swagger, responses, and logs for internal scaled integers, SQL, stacks, secrets, foreign-scope data, and unrelated enrollment details. Run the full Foundation/IAM/Organization/Catalog/Batches suites, lint, build, Prisma validation, fresh/upgrade migration, and repeated seed.

## Completion Record

During implementation record:

- migration environments and rollback/parity evidence;
- repeated-seed result;
- unit/integration/E2E suite and test counts;
- concurrency and scale results;
- architecture scan output;
- all environmental limitations;
- final contract, authorization, transaction, type, Swagger, error, disclosure, and clean-code sign-off.

The feature is complete only when all fifteen scenario groups pass and no unresolved contract or constitution deviation remains.

### Implementation Evidence — 2026-08-02

- **Baseline**: the repository had no tracked Git baseline (all project files were untracked), so existing content was preserved and edits were limited to the feature and declared integration points. Ignore files and ESLint ignores already covered Node, Nest build, Prisma generation, environment, coverage, Docker, and editor artifacts.
- **Runtime**: Node.js 22.18.0; PostgreSQL `alsalam` on localhost; application booted successfully in development with every documented Program Batch route registered.
- **Migrations**: Prisma schema validation passed. Upgrade applied migrations `20260803010000_program_batches` and `20260803011000_program_batch_stable_child_ids`. A disposable database received all 9 migrations from empty successfully and was then removed. Local migration status reports up to date.
- **Seeds**: the full seed ran twice consecutively without duplication. Program Batches owns two `program-intakes`, one active eligible demo Professional Program, and one deterministic draft batch fixture.
- **Automated tests**: unit suite passed 26 suites / 73 tests; Program Batch integration suite passed 12 suites / 27 tests; full E2E suite passed 45 suites / 155 tests.
- **Static gates**: Nest production build passed; targeted and full-project ESLint completed without errors after the final fix; Prisma generation and validation passed.
- **Live HTTP contract**: authenticated cookie/CSRF flow returned login 200, lookups 200, create 201, details 200, readiness 200, eligibility 200, archive 200, lifecycle 200, and financial revisions 200. The verification batch was archived rather than deleted; its history contains two lifecycle entries and one immutable financial revision.
- **Database integrity**: a direct revision update was rejected by the append-only trigger. Repeated seed idempotency and fresh-deploy parity passed.
- **Scale**: 10,000 disposable batches were inserted inside a rolled-back transaction. The indexed parent/status page query completed in 3.438 ms locally; the transaction was rolled back and left no scale rows.
- **Architecture scans**: Program Batches accesses Prisma only in `batch.repository.ts`; Catalog and Organization are consumed through public ports; no `any`, filesystem access, foreign repository import, delete endpoint, export endpoint, or upload endpoint exists in the module.
- **Concurrency evidence**: aggregate writes use bounded serializable transactions, compare-and-swap on expected version/status, unique financial source-version constraints, and unique lifecycle resulting-version constraints. Static integration coverage verifies all four guards; PostgreSQL supplies the final one-winner guarantee.
- **Environmental limitation**: Admissions is not installed. Development/test uses the explicit known-empty dependency provider; production returns dependency unavailable until an authoritative Admissions provider replaces it.
