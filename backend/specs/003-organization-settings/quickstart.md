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
- `docs/api-data-requirements.html` amended for the owner-approved profile, lookup, and code contracts

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

### 6. Academic-term boundaries and overlap

Create terms fully contained in a parent year. Reject start-after-end, outside-parent ranges, and
inclusive overlaps—including a term starting on a sibling's end date. Prove overlapping dates in
different years are allowed. Launch concurrent overlapping creates/updates and verify at most one
commits. Filter by academicYearId/status; verify server-resolved academicYearName and historical
archived detail.

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

## Implementation validation record

### Baseline — 2026-08-02

- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run test -- --runInBand`: passed, 15 tests.
- `npm run test:e2e -- --runInBand`: passed, 29 tests.

### Organization implementation checkpoint — 2026-08-02

- Organization migration deployed successfully to the test database.
- Organization master-data seed completed successfully twice.
- Database constraint integration slice passed 5 tests.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm run test -- --runInBand`: passed, 7 suites and 18 tests.
- `npm run test:e2e -- --runInBand`: passed, 10 suites and 29 tests.
- Implemented endpoint slices: branches, departments, academic years, and academic terms.
- Still open: lookup administration, organization profile, general settings, full Organization
  contract/security/concurrency tests, and final acceptance audit.

### Final implementation validation — 2026-08-02

- Completed lookup-group/value administration, atomic reorder, hierarchy/dependency rules, the bounded
  standards feed, and the exported historical/selectable resolver.
- Completed immutable legal-profile reads, atomic branding/contact/social updates with safe descriptors,
  and complete general-settings updates with active default validation.
- Added the four owner-approved Organization permission keys; the amended canonical catalogue now has
  129 unique keys, including 29 under `settings`.
- Applied all five migrations to `alsalam_test`; no pending migration remained. Ran the Organization
  master-data seed twice successfully against that same database and verified singleton/default/constraint
  parity and preservation of Identity data.
- Contract and DTO coverage includes branches, departments, years, terms, lookup groups/values,
  organization profile, general settings, permission guards, safe descriptor disclosure, validation,
  pagination, Arabic normalization, exclusive active-year synchronization, and non-overlap invariants.
- Static architecture audits found no Prisma access outside repositories, `any`, filesystem APIs, internal
  Identity repository imports, or path construction under `src/modules/organization`.
- `npm audit --omit=dev` reports two high-severity `js-yaml` findings nested under `@nestjs/swagger`;
  the offered fix requires a breaking dependency change, so no unreviewed forced change was applied.
- Acceptance checks 1–16 were exercised through unit, integration, endpoint-metadata, migration, repeated
  seed, security/disclosure, architecture, and full regression gates. Final database evidence uses
  `alsalam_test`; earlier `.env`/`.env.test` target drift was identified and corrected.
- Final production gate: `npm run build` passed; `npm run lint` passed; unit tests passed (15 suites,
  39 tests); e2e tests passed (32 suites, 105 tests); the complete Foundation, Identity, and Organization
  integration set passed (27 suites, 52 tests).
- Final review sign-off: contract paths and permissions, repository-only Prisma access, service-owned
  business rules/transactions, validation allow-lists, Swagger metadata, strict typing, archival,
  concurrency versions, and module boundaries conform to the approved specification and constitution.
