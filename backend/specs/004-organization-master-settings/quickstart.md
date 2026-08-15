# Quickstart Validation: Organization & Settings

This guide validates [spec.md](spec.md) using the interfaces in [contracts/](contracts/) and
invariants in [data-model.md](data-model.md). It is a release validation guide, not implementation
code.

## Prerequisites

- Node.js 22 and project dependencies installed
- PostgreSQL running with isolated development and test databases
- Backend Foundation and Identity migrations applied
- `.env` and `.env.test` configured with different database URLs
- An active administrator with the new Organization/Settings permission keys
- `docs/api-data-requirements.html` amended for the owner-approved profile, lookup, code, and explicit
  academic-term order/move contracts

Never run destructive or concurrency tests against development or production data.

## Setup

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run seed
```

Confirm the second seed creates no duplicate singleton, branch, department, academic period, lookup
group/value, or assignment rows. Confirm migration deployment succeeds on both a fresh database and a
copy of the prior Identity schema.

## Automated gates

```bash
npm run build
npm run lint
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```

The Organization integration/e2e slice must use real PostgreSQL for partial uniqueness, exclusion,
transactions, optimistic concurrency, and race tests.

## Acceptance checks

### 1. Canonical contract and module boundary

Compare every path, method, field, status, permission, envelope, pagination key, and error code with
the three feature contracts and amended requirements document. Confirm Organization exposes no
employee, role, permission, authentication, or permanent-delete endpoint. Audit source imports to
prove Organization does not import Identity repositories or Prisma outside Organization repositories.

### 2. Branch lifecycle and scope

Create a branch with unique code, email/contact details, working hours, and an eligible manager. Find
it by Arabic-normalized name and case-insensitive code, sort both directions, page results, update with
the current version, inactivate/reactivate, and archive when unused. Verify a duplicate archived code
is still rejected. Verify an in-use archive returns `ENTITY_IN_USE`. A branch-scoped caller sees only
authorized branches and gets `out-of-scope` for another branch's detail.

### 3. Department lifecycle

Create, search, filter, update, status-change, and archive a department. Verify normalized code
uniqueness across all statuses, stale-version conflict with currentVersion, archived exclusion by
default, historical detail resolution, and in-use archive rollback.

### 4. Pagination and Arabic search

For each management list, verify page 1/pageSize 20 defaults, pageSize clamp to 100, accurate
`meta.limit`, stable allow-listed sorting, status filtering, and an over-range empty 200 response.
Search Arabic names containing alternate alef/yaa/taa-marbuta forms, diacritics, and Arabic-Indic
digits and confirm normalized matches.

### 5. Academic-year exclusive activation

Create two inactive valid years, activate the first, then the second. Verify exactly one active year
and that general settings point to it. Refuse archived activation and direct deactivation/archive of
the last active year. Launch concurrent activation requests from the same versions; verify one
deterministic committed state, no two active rows, stable domain errors/retries, and no partial default.

### 6. Academic-term boundaries, overlap, and order

Create terms fully contained in a parent year. Reject start-after-end, outside-parent ranges, and
inclusive overlaps—including a term starting on a sibling's end date. Prove overlapping dates in
different years are allowed. Launch concurrent overlapping creates/updates and verify at most one
commits. Filter by academicYearId/status; verify server-resolved academicYearName and historical
archived detail.

For a year with N retained terms, create at positions 1 and N+1 and verify atomic sibling shifts and
the exact sequence `1..N+1`. Move terms to the first, middle, and last positions through versioned
updates and verify interval shifts, version increments, and deterministic default sorting. Reject
foreign-year, out-of-range, non-positive, or stale moves without partial changes. Move a term between
years and verify source compaction plus destination insertion in one commit.
Archive/reactivate a term and confirm its historical order is preserved. Run concurrent insert and
move requests and prove both year sequences remain unique and contiguous.

### 7. Lookup groups and values

Create two lookup groups and values with the same value code across groups; confirm both succeed.
Attempt a duplicate normalized code or label inside one group and expect `DUPLICATE_VALUE`. Search,
filter, paginate, update, inactivate/reactivate, and archive values. Verify retired values remain
directly resolvable but are not selectable for new records.

### 8. Lookup hierarchy and archival dependencies

Configure expense categories as a parent group and sub-categories as its child. Create linked values.
Reject wrong-group parents and cycles. Refuse parent-value archive while a non-archived child exists;
archive children first, then the parent. Refuse group archive while values or child groups remain.
Verify no orphan or partial status change after simulated failures.

### 9. Atomic lookup reorder

Reorder several values with current item/group versions. Verify deterministic returned order and
version increments. Allow tied sort positions with stable name/ID tie-breaking. Reject negative
positions, duplicate/wrong-group IDs, stale item versions, or a stale group version and prove the
entire prior ordering remains unchanged.

### 10. Static versus configurable lookup consumption

Fetch `/settings/lookups` and verify the bounded language/time-zone/currency/country/locale/format/
weekday standards remain compatible. Fetch configurable business values through their group code and
verify representative downstream dropdown services use the authoritative active values, not copied
hardcoded arrays. Historical ID resolution must still return disabled labels.

### 11. Organization profile immutability and update

Read the profile and verify name/code are present. Update logo, favicon, cover, contact emails, phone
numbers, website, address, working hours, and social links with the current version. Confirm safe
descriptors only, stable contact IDs/order/primary rules, and one version increment. Submit name/code,
unknown fields, local paths, invalid contacts/URLs, duplicate social platforms, or stale version and
verify no profile child/scalar partially changes.

### 12. General settings

Read and update every setting using supported values, unique non-empty working days, an active branch,
and the active academic year. Reject unsupported standards, inactive/unknown defaults, duplicate/empty
working days, stale version, and a non-active default year. Simulate a failure and confirm the prior
aggregate remains intact.

### 13. Authorization and disclosure

Exercise every read/write family without authentication, with view only, and with missing write
permission. Verify protected-by-default behavior and the exact `settings.organization`, `branches`,
`departments`, `academicYears`, `academicTerms`, `lookups`, and `general` permission keys. Scan success,
validation, conflict, dependency, and unexpected responses/logs for SQL, stack traces, internal paths,
unsafe file values, or another scope's data.

### 14. Events and transaction timing

Capture events for create, update, status/archive, year activation, lookup reorder, profile update,
and settings update. Each committed operation emits exactly one event after commit with actor, target,
operation, time, and resulting state. Failed and rolled-back operations emit no success event.

### 15. Swagger and response shapes

Review generated Swagger for all success envelopes, paginated metadata, DTO field examples, 201/200
statuses, Arabic validation details, and documented 403/404/409/422/500 codes. Confirm detail responses
include computed per-record permissions and no response trusts submitted derived labels.

### 16. Architecture and safety audits

```bash
rg -n "PrismaService|prisma\." src/modules/organization -g '*.ts' | rg -v 'repository'
rg -n ": any|<any>|as any" src/modules/organization test/{unit,integration,e2e}/organization -g '*.ts'
rg -n "node:fs|path\.join" src/modules/organization -g '*.ts'
rg -n "AccountRepository|EmployeeRepository|RoleRepository" src/modules/organization -g '*.ts'
```

All commands must return no unjustified matches. Review controllers to ensure they bind/validate,
declare authorization/Swagger, and call exactly one service entry point. Review multi-record services
for shared transaction-manager use and transaction-aware repository calls.

## Completion condition

The feature is ready only when all 16 scenarios pass; the canonical document contains every approved
addition; fresh/upgraded migrations and repeated seeds are verified; concurrent year/term tests prove
database safeguards; and the complete Backend Foundation plus Identity regression suites stay green.

## Inherited baseline record

### Baseline — 2026-08-02

- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run test -- --runInBand`: passed, 15 tests.
- `npm run test:e2e -- --runInBand`: passed, 29 tests.

### Prior Organization implementation checkpoint — 2026-08-02

- Organization migration deployed successfully to the test database.
- Organization master-data seed completed successfully twice.
- Database constraint integration slice passed 5 tests.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run test -- --runInBand`: passed, 7 suites and 18 tests.
- `npm run test:e2e -- --runInBand`: passed, 10 suites and 29 tests.
- Implemented endpoint slices: branches, departments, academic years, and academic terms.
- This checkpoint is evidence of the starting repository state, not completion of feature 004.

### Feature 004 pre-change baseline — 2026-08-02

- Ignore/configuration coverage is complete for Git, Docker, ESLint, and Prettier.
- Build and lint passed; 7 unit suites/18 tests and 10 e2e suites/29 tests passed.
- Retained: schema/migration/seed foundation and branch, department, year, unordered-term slices.
- Missing: term ordering, profile/settings, lookup administration, consumer ports, and feature 004 tests.

### Feature 004 completion record — 2026-08-02

- Added migration `20260802220000_organization_master_settings`: existing terms are deterministically
  backfilled, `order > 0` is enforced, and `(academicYearId, order)` is a deferred unique constraint.
- Term creation now inserts at `1..N+1`; same-year moves shift the affected interval; cross-year moves
  compact and insert under stable parent locks. Parent year versions protect collection concurrency,
  retained archived terms preserve order, and successful operations emit after commit.
- Added the typed `ORGANIZATION_MASTER_DATA_PORT` with bounded active branch, department, academic-year,
  ordered-term, and lookup choices plus historical ID resolution. The guarded settings feed exposes the
  same authoritative projections without repository leakage.
- Deployed all six migrations to `alsalam_test`; repeated Organization seeds completed twice without
  duplicates. Migration tests verify retained IAM rows, all Organization tables, active-year exclusion,
  inclusive term overlap, positive order, and deferred per-year order uniqueness.
- Real PostgreSQL ordering tests verify insertion, interval moves, exact `1..N`, parent-version bumps,
  and database constraint metadata. Master-data tests verify bounded deterministic active projections,
  historical resolution, and public-port-only consumer dependencies.
- Architecture audits returned no Prisma access outside repositories, `any`, filesystem/path access,
  or Identity repository imports under Organization. Controllers remain guarded and delegate to services.
- Final gates passed: build and lint; unit 15 suites/40 tests; e2e 33 suites/106 tests; complete
  Foundation/IAM/Organization integration 30 suites/57 tests.
- `npm audit --omit=dev` reports two high-severity `js-yaml` findings nested under `@nestjs/swagger`.
  The offered automated fix changes the Swagger dependency and was not force-applied without review.
- Final sign-off covers all 16 acceptance groups: structure lifecycle/scope, calendar activation,
  inclusive overlap and explicit ordering, profile/settings rollback, configurable lookups/reorder,
  authoritative consumption, permissions, disclosure, events, Swagger, migrations, seeds, and layering.
