# Quickstart Validation: Academic Catalog

This guide validates [spec.md](spec.md) against [data-model.md](data-model.md) and [contracts/](contracts/).
It is a release-validation guide, not implementation code.

## Prerequisites

- Node.js 22, dependencies installed, isolated PostgreSQL development/test databases
- Foundation, IAM, and Organization migrations/features applied
- Administrator with required catalog permissions and representative branch scope
- Canonical requirements amended for fixed Product Types, Organization-owned categories, instructor
  reference/picker, batchability, study-mode filter, lifecycle graph, and video link policy

Never run destructive, migration, or concurrency checks against production data.

## Setup and automated gates

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run seed
npm run build
npm run lint
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```

The second seed creates no duplicate type/category/product rows. Verify fresh deployment and upgrade
from the completed Organization schema with prior IAM/Organization rows unchanged.

## Acceptance checks

### 1. Contract, permissions, and boundaries

Compare every route/field/error/permission with all three contracts and amended canonical document.
Confirm Product Type POST is absent and `catalog.types.create` removed. Prove Catalog imports no
Identity/Organization repositories and Prisma appears only in Catalog repositories.

### 2. Fixed types and categories

Verify exactly three seeded type identities, derived batchability, immutable identity, and editable
labels/ordered allowed fields. Reject a fourth type and unsupported field key. Create/update/archive an
Organization-owned Business Category through Catalog routes; refuse archive while referenced and
resolve archived labels historically.

### 3. Draft product and list behavior

Create one product of each type with unique normalized codes. Verify draft/version 1 and creation
lifecycle entry. Search official/Arabic/English/code variants; filter by every array filter including
study mode; sort all allow-listed fields; verify defaults, max 100, stable ties, and empty over-range 200.

### 4. Aggregate update and concurrency

Update the full product with current version and confirm root/pricing/branches/content/assets change
atomically with one version increment/event. Submit stale/unknown/derived fields and simulate child
write failure; verify currentVersion and complete rollback.

### 5. Academic type rules and instructor

Exercise allowed/required fields for Program, Diploma, and Course. Reject non-positive values,
unsupported fields, and instructor on non-Course. Assign an active in-scope IAM employee to Course;
reject unknown/inactive/out-of-organization/out-of-scope references without disclosing employee data.

### 6. Money

Test all nine values using exact decimal strings/currency/precision. Reject numbers, exponent strings,
negative values, mismatched currency/precision, unsupported currency, and excessive scale. Round-trip
and minor-unit arithmetic must be exact; price sorting must be deterministic.

### 7. Branch availability and scope

Assign registration/study/general roles, permit multiple roles per branch, and reject duplicate pairs
or inactive branches. A scoped caller sees only intersecting products and gets out-of-scope on foreign
detail. Readiness requires one active registration branch.

### 8. Content and media

Replace ordered FAQs/requirements/documents and verify stable IDs plus contiguous positions. Test one
primary, gallery limit eight, image/PDF MIME/size, safe URLs, external HTTPS videos, duplicate
positions, unsafe paths, and full rollback.

### 9. Readiness and lifecycle

Verify incomplete drafts return exact issues and activation fails. Complete the product, activate,
and confirm atomic code lock/version/lifecycle/event. Exercise every allowed and forbidden graph edge,
reason rules, reactivation readiness, terminal archive, dependency refusal, and failure silence.

### 10. Eligibility and batchability

Check every eligibility reason against active/inactive products and branches/assignments. Verify
Program is always batchable and Diploma/Course never are through detail and public port; confirm no
input can override capability.

### 11. Public consumers and snapshots

Use only exported Catalog services to list selectable branch offerings, resolve archived history,
check readiness/eligibility/batchability, and obtain exact pricing/config snapshots. Prove consumer
snapshots remain unchanged after later Catalog edits.

### 12. Taxonomy evolution

Change field metadata while referenced. Reject a change that invalidates an active product; permit a
draft to become not-ready and verify readiness reflects the current schema. Test taxonomy versions,
dependencies, rollback, and post-commit events.

### 13. Swagger, errors, and disclosure

Verify success/list/error envelopes, 201/200 statuses, Arabic field paths, closed error codes,
currentVersion, readiness issues, retryable 503, permissions, and examples. Scan responses/logs for
paths, secrets, SQL, stacks, internal minor units, copied IAM data, or foreign-scope data.

### 14. Concurrency and migrations

Race normalized-code creation, product update/activation, taxonomy update/activation, and archive/
dependency checks. Verify one consistent commit, constraint-backed uniqueness, no false events, and
bounded retry behavior. Verify rollback reconstruction and every index/check/unique constraint.

### 15. Architecture audits

```bash
rg -n "PrismaService|prisma\." src/modules/catalog -g '*.ts' | rg -v 'repository'
rg -n ": any|<any>|as any" src/modules/catalog test/{unit,integration,e2e}/catalog -g '*.ts'
rg -n "node:fs|path\.join" src/modules/catalog -g '*.ts'
rg -n "AccountRepository|Organization.*Repository|BranchRepository" src/modules/catalog -g '*.ts'
```

No unjustified match is allowed. Controllers bind/validate/guard and call exactly one service method;
multi-entity services use transaction-aware repositories and emit only after commit.

## Completion condition

All 15 scenario groups pass; canonical docs match; fresh/upgraded migration and repeated seed pass;
concurrency/database safeguards hold; and complete Foundation/IAM/Organization/Catalog suites remain
green. Record actual commands, counts, environment limitations, and evidence below during implementation.

## Implementation validation record

### Pre-change baseline — 2026-08-02

- Ignore/configuration coverage passed for Git, Docker, ESLint, and Prettier.
- `npm run build` and `npm run lint` passed.
- Unit: 7 suites, 18 tests passed.
- E2E: 10 suites, 29 tests passed.
- No Catalog source or Catalog test implementation existed before this feature.

### Implementation validation — 2026-08-02

- Prisma schema formatted/generated/validated successfully; the reviewed Catalog migration applied
  to both `alsalam` (upgrade from Organization) and `alsalam_test`.
- Seed ran repeatedly without duplicate Product Types or Business Categories. Exactly three fixed
  type identities and their ordered field metadata are present. The retired
  `catalog.types.create` permission is removed safely from role assignments and the catalogue now
  contains 128 unique keys (20 Catalog keys).
- `npm run lint`, `npm run build`, and Prisma validation pass.
- Unit: 19 suites / 48 tests passed, including Catalog DTO, normalization, exact Money, readiness, and
  transition coverage.
- Integration: 45 suites / 75 tests passed, including Catalog query, taxonomy, branch, content,
  media, lifecycle, public-consumer, migration, seed, and database constraint coverage plus unchanged
  IAM/Organization suites.
- E2E: 36 suites / 135 tests passed, including the 19-route Catalog method/path/permission/Swagger,
  security, and disclosure surfaces plus unchanged Foundation/IAM/Organization contracts.
- Architecture scans returned no Prisma access outside Catalog repositories, no `any`, no filesystem
  access in Catalog, and no cross-module repository import. Catalog uses exported IAM and
  Organization adapters and emits product/taxonomy events only after successful transactions.
- Both development and test PostgreSQL instances were available directly. Docker CLI was not
  installed, so container recreation was not used; migration deployment against both real schemas
  supplied the database evidence instead.
