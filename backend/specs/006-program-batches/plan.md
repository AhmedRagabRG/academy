# Implementation Plan: Program Batches

**Branch**: `[006-program-batches]` | **Date**: 2026-08-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-program-batches/spec.md`

## Summary

Implement Program Batches as the dedicated Batches business module that owns a versioned batch aggregate beneath an eligible Professional Program. The module persists schedules, maximum capacity, branch roles, exact financial profiles, immutable financial revisions, and append-only lifecycle events; derives live enrollment capacity through a public dependency port; and exposes the exact nested administration and Admissions-consumer contracts documented in §4.4. Catalog and Organization data are resolved only through exported public ports. Multi-row writes and lifecycle transitions use serializable transactions, optimistic versions, constraint-backed uniqueness, and post-commit domain events.

## Technical Context

**Language/Version**: TypeScript 5.7 in strict mode, Node.js 22

**Primary Dependencies**: NestJS 11, Prisma ORM 7.9, `@prisma/adapter-pg`, `class-validator`, `class-transformer`, Swagger 11, RxJS

**Storage**: PostgreSQL; exact monetary and percentage values stored as scaled integers, date-only schedule values, normalized relational aggregate tables, immutable revision/history rows

**Testing**: Jest 30 with `ts-jest`; unit, PostgreSQL integration/migration, contract E2E, concurrency, architecture, and 10,000-row query evidence

**Target Platform**: Linux-compatible server process; local development on Node.js 22

**Project Type**: Modular HTTP web service

**Performance Goals**: Batch lists remain usable at 10,000 records; 95% of normal searches, filters, and page changes visibly complete within two seconds; bounded lookup feeds avoid unbounded reads

**Constraints**: Exact canonical API paths and envelopes; pageSize 20/default and 100/max; no cross-module repository access; derived enrollment count never client-writable; exact Money without floating-point arithmetic; all writes versioned and atomic; immutable financial/lifecycle history; fixed 10% capacity rule; no permanent deletion

**Scale/Scope**: One organization, unlimited batches per eligible program, at least 10,000 batches in scale validation, multiple plans/installments/offers/branches per aggregate, six lifecycle states, ten documented endpoints, thirteen existing permission keys

## Constitution Check

*GATE: PASS before Phase 0 and PASS after Phase 1 design.*

Source: `.specify/memory/constitution.md` v1.0.0.

| # | Gate | Principle | Status |
|---|------|-----------|--------|
| 1 | Feature is scoped to one business domain module; no cross-module DB access | I, II | **PASS** — `ProgramBatchesModule` owns only batch tables and consumes Catalog, Organization, and future Admissions through public ports. |
| 2 | Every endpoint matches `docs/api-data-requirements.html` | III | **PASS** — contracts retain `/programs/:programId/batches` administration routes and `/batches/:batchId/*` consumer/history routes from §4.4; the prompt's illustrative `/products/*` paths are not adopted. |
| 3 | Controllers hold no business logic; Controller → Service → Repository → Prisma | IV, V | **PASS** — controllers bind DTOs, guards, and one service call; batch repositories alone access Prisma. |
| 4 | Every request has validated DTOs; business rules live in services/policies | VI | **PASS** — structural/date-shape validation is in DTOs; lifecycle, readiness, capacity, reference, financial, and dependency rules are centralized policies/services. |
| 5 | Every protected endpoint has a permission guard; no duplicated authz logic | VII | **PASS** — guards enforce base permissions; a reusable field/transition authorization policy evaluates the exact action key without controller conditionals. |
| 6 | Responses use the single success/error envelope | VIII, XIII | **PASS** — services return bare payload/PageResult and existing global interceptors/filters produce the canonical envelopes and Arabic closed errors. |
| 7 | Uploads go through storage service | IX | **N/A** — Program Batches has no file-upload surface. |
| 8 | Multi-entity writes are transactional; domain events emitted for audit | X, XI | **PASS** — create/update/revision/transition use serializable transactions and emit only after commit. |
| 9 | `strict` mode holds; no new `any` | XII | **PASS** — closed unions, typed ports, Prisma payload types, and `unknown` narrowing are planned. |
| 10 | Every list endpoint is paginated | XIV | **PASS** — the batch list uses canonical offset pagination; lifecycle/revision histories and editor lookups are documented bounded child/closed feeds. |
| 11 | Deletion is archival | XV | **PASS** — no delete endpoint or cascade delete exists; archive is terminal and historical reads remain available. |
| 12 | No dependency on mock data | XVI | **PASS** — the enrollment/dependency reader is a port; the pre-Admissions zero implementation is replaceable and prohibited as production authority. |
| 13 | Swagger documents real shapes | XVII | **PASS** — every controller operation will declare concrete list/detail/readiness/eligibility/history and closed error envelopes. |
| 14 | No speculative abstraction; requirements clarified | XIX, XX | **PASS** — only §4.4 behavior is designed; the 10% nearly-full rule was explicitly clarified and fixed. |

**Contract bindings re-check**: PASS. The design uses the global `{success,data,meta}` envelope; `page`/`pageSize` query and `meta.limit`; exact Money decimal strings backed by integer minor units; UUID IDs; UTC timestamps and date-only schedules; `expectedVersion` and first-class `currentVersion`; per-record permissions; branch scoping and `out-of-scope`; Arabic UTF-8 errors/search folding. No batch operation requires a documented idempotency key. Empty optional dates normalize to absent.

## Architecture and Ownership

`ProgramBatchesModule` is a top-level domain module, matching the constitution's eight-module model, while remaining a semantic child of Academic Catalog. It owns all batch persistence, policies, DTOs, events, mappings, and public batch readers. It does not import Catalog, Organization, or future Admissions repositories.

```text
HTTP Controller
  → ProgramBatchService / BatchConsumerService
    → ProgramBatchPolicy + typed public reference ports
    → ProgramBatchRepository (transaction-aware)
      → Prisma/PostgreSQL batch tables
```

Public boundaries:

- `CATALOG_PUBLIC_PORT`: resolve parent identity, active state, batchability, label, and product price defaults. Catalog remains the sole owner of fixed batch capability.
- `ORGANIZATION_MASTER_DATA_PORT`: resolve/list academic years, branches, and the `program-intakes` lookup. A narrow settings-defaults port supplies currency and precision without exposing repositories.
- `BATCH_ENROLLMENT_DEPENDENCY_PORT`: future Admissions-owned live current-student count and active-dependency result. A replaceable pre-Admissions implementation returns the known empty state only outside production.
- `PROGRAM_BATCHES_PUBLIC_PORT`: Admissions consumes eligibility, historical batch resolution, selection references, and immutable financial revision snapshots without importing batch repositories.

## Data and Transaction Strategy

- Persist a `ProgramBatch` root with schedule scalars, maximum capacity, status, version, permanent `codeLockedAt`, current revision identity, and audit fields.
- Persist branch assignments as unique `(batchId, branchId, role)` rows.
- Persist each complete financial revision and its own plan/installment/offer children; never update or delete revisions. Switching the root's current revision is the only mutable link.
- Persist lifecycle events as append-only rows unique by `(batchId, resultingVersion)`.
- Store money and percentage values as scaled integers plus precision; map to canonical decimal strings at the boundary.
- Persist only maximum capacity. Read current students live, then derive available seats and state using integer arithmetic: over-capacity first, full second, nearly-full for positive seats where `available * 10 <= maximum`, otherwise available.
- Use program-scoped normalized code uniqueness. Set `codeLockedAt` once with first registration opening and never clear it.
- Create, aggregate update, financial revision, branch replacement, and lifecycle transitions run at serializable isolation with expected-version compare-and-swap. Database uniqueness and append-only triggers remain the final race/integrity guards.
- Re-read live references, enrollment count, and dependencies within the mutation flow. A retryable dependency failure aborts without writes and maps to `SERVICE_UNAVAILABLE`.

## API and Authorization Strategy

The implementation follows [contracts/program-batches-http.contract.md](contracts/program-batches-http.contract.md). Administration is nested under the parent program. Eligibility and immutable histories use the documented batch-centric paths.

- Reads/lookups/readiness/history require `batches.view`.
- Create requires `batches.create`.
- Basic update requires `batches.update`; changed capacity, pricing, or branch sections additionally require their respective manage permissions. Field-diff authorization lives in one reusable service/policy because the global guard uses AND semantics.
- Status transitions map to exactly one action permission: registration open, close, correction/reopen, study start, graduate, or archive.
- `batches.export` remains seeded but no endpoint is implemented.
- Wrong-parent detail returns non-disclosing not-found; foreign branch scope returns `out-of-scope` where the record is otherwise identifiable within the correct parent.

## Validation and Readiness Strategy

- DTOs reject unknown/server-derived fields, parse empty optional dates as absent, and validate localized names, normalized code shape, UUIDs, integers, Money strings, positions, and closed enums.
- Policies validate parent batchability, active Organization references, schedule ordering, capacity against live enrollments, unique active branch roles, exact money/currency/precision, installments/milestones, offers/percentages/dates, and transition graph.
- One pure capacity calculator and one shared readiness evaluator are reused by detail, readiness, registration opening, eligibility, and public ports.
- Registration readiness requires an active eligible program, active academic year/intake, complete ordered schedule, positive capacity, current valid revision, and at least one active registration branch.
- Eligibility evaluates a caller-supplied date deterministically and returns all deduplicated refusal reasons, live available seats, batch version, and current financial revision identity.

## Test Strategy

- Unit: DTO transforms/unknown fields, localized names, schedule boundaries, capacity precedence/10%, exact Money/percentage conversion, installment ordering/milestones, offers, readiness, transitions, and permission mapping.
- Integration: fresh/upgrade/rollback migration parity, normalized code uniqueness, parent isolation, query/filter/sort/pagination, reference validation, atomic aggregate replacement, immutable revisions/history, version races, lifecycle races, dependency failures, branch scope, and public ports.
- E2E contracts: paths/methods/envelopes/statuses/errors/Swagger, base and field-sensitive permissions, deterministic readiness/eligibility, archived-default behavior, CSRF/CORS, and logging disclosure.
- Scale: seed 10,000 batches and record indexed query behavior against SC-012.
- Regression: full Foundation, IAM, Organization, Catalog, and Program Batches unit/integration/E2E suites plus lint/build/Prisma gates.

## Project Structure

### Documentation (this feature)

```text
specs/006-program-batches/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── program-batches-http.contract.md
│   └── program-batches-public-ports.contract.md
└── tasks.md
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma
├── migrations/*_program_batches/migration.sql
└── seeds/program-batches.ts

src/modules/program-batches/
├── program-batches.module.ts
├── batches/
│   ├── program-batch.controller.ts
│   ├── batch-consumer.controller.ts
│   ├── program-batch.service.ts
│   ├── batch-consumer.service.ts
│   ├── program-batch.repository.ts
│   ├── program-batch.policy.ts
│   └── dto/
├── capacity/batch-capacity.service.ts
├── financial/batch-financial.policy.ts
├── lookups/batch-lookups.service.ts
├── events/program-batch.events.ts
├── mappers/program-batch.mapper.ts
└── types/
    ├── program-batch.types.ts
    ├── program-batches-public.port.ts
    ├── batch-reference.port.ts
    └── batch-normalization.ts

src/modules/catalog/types/catalog-public.port.ts
src/modules/organization/types/organization-settings.port.ts
src/core/exceptions/program-batch.exceptions.ts
src/database/prisma-error.mapper.ts
src/app.module.ts

test/unit/program-batches/
test/integration/program-batches/
test/e2e/program-batches/
```

**Structure Decision**: Use a dedicated `src/modules/program-batches` business module rather than placing repository/business logic inside Catalog. This preserves the product→batch domain relationship while satisfying modular ownership, public-port communication, and the constitution's explicit Program Batches module boundary.

## Post-Design Constitution Re-check

All fourteen gates remain **PASS/N/A** after the data model and contracts were completed. No direct cross-module table reads are required; all mutation aggregates have explicit serializable transaction boundaries; append-only data receives database enforcement; all paths match §4.4; the public Admissions boundary prevents future repository coupling; and no files, exports, enrollment writes, or other out-of-scope behavior were introduced.

## Complexity Tracking

No constitution violations require justification.
