# Implementation Plan: Organization & Settings

**Branch**: `[003-organization-settings]` | **Date**: 2026-08-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-organization-settings/spec.md`

## Summary

Add one feature-owned Organization module that manages branches, departments, academic years and
terms, configurable lookup groups and values, the organization public profile, and operational
general settings. The design extends the existing strict NestJS/Prisma/PostgreSQL service through
controller → service → repository boundaries, uses optimistic concurrency and archival throughout,
serializes exclusive academic-year activation, enforces term ranges against both parent boundaries
and sibling overlap, and exposes owner-approved profile/lookup contracts after amending the canonical
requirements document. Identity remains the owner of employees, roles, permissions, and caller scope;
Organization interacts with it only through an exported public reference service.

## Technical Context

**Language/Version**: TypeScript 5.7 in strict mode, Node.js 22, ECMAScript 2023 target

**Primary Dependencies**: NestJS 11, Prisma ORM 7.9, `@prisma/adapter-pg`, `class-validator`,
`class-transformer`, NestJS Swagger, existing global authentication/authorization/envelope layers

**Storage**: PostgreSQL; local storage remains behind the existing storage service and Organization
stores only returned file descriptors

**Testing**: Jest 30, ts-jest, NestJS testing utilities, Supertest, and real PostgreSQL integration/e2e
tests for constraints, transactions, concurrency, and repository behavior

**Target Platform**: Linux-compatible server/container runtime with PostgreSQL; development and test
also run on macOS

**Project Type**: Modular HTTP web service

**Performance Goals**: At least 95% of first-page management and lookup searches complete within one
second at the specified operating volume; bounded dropdown reads remain small enough for one response

**Constraints**: Controller → Service → Repository → Prisma only; UUID identifiers; Arabic-normalized
search; page size 20 by default and 100 maximum; UTC audit timestamps and date-only calendar values;
no permanent business-record deletion; expected-version checks on every write; no cross-module
repository or table access; owner-approved contract additions must amend the canonical API document
before endpoint implementation

**Scale/Scope**: One organization; up to 10,000 combined branches, departments, academic periods,
lookup groups, and lookup values; six owned aggregate families; approximately 30 HTTP operations plus
bounded consumer lookup projections

## Constitution Check

*GATE: PASS before Phase 0 research; re-checked after Phase 1 design below.*

Source: `.specify/memory/constitution.md` v1.0.0.

| # | Gate | Principle | Status |
|---|------|-----------|--------|
| 1 | Feature is scoped to one business domain module; no cross-module DB access | I, II | PASS — Organization owns only master/configuration data; Identity references use an exported public service. |
| 2 | Every endpoint matches `docs/api-data-requirements.html` | III | PASS WITH PRECONDITION — existing routes are retained; owner-approved profile and lookup administration additions must amend the document before code. |
| 3 | Controllers hold no business logic; layering is Controller → Service → Repository → Prisma | IV, V | PASS — source layout and transaction-aware repository contracts preserve the required direction. |
| 4 | Every request has a DTO; business rules live in services | VI | PASS — DTOs own structure while policies/services own status, dependency, calendar, and singleton rules. |
| 5 | Every protected endpoint has a permission guard | VII | PASS — controllers use the global permission decorator and the live IAM permission union. |
| 6 | Responses use the single success/error envelope | VIII, XIII | PASS — controllers return bare typed payloads to the existing interceptor/filter. |
| 7 | Uploads go through the storage service | IX | PASS — profile mutations accept validated file descriptors only and never manipulate paths. |
| 8 | Multi-entity writes are transactional; domain events emitted | X, XI | PASS — activation, profile child replacement, settings changes, and lookup hierarchy operations have service-owned transactions and post-commit events. |
| 9 | `strict` mode holds; no new `any` | XII | PASS — public ports, DTOs, transaction clients, mappings, and events remain explicitly typed. |
| 10 | Every list endpoint is paginated | XIV | PASS — management lists paginate; static standards and consumer lookup projections are documented bounded closed sets. |
| 11 | Deletion is archival | XV | PASS — no permanent delete endpoint exists; archived records remain resolvable. |
| 12 | No dependency on mock data | XVI | PASS — repositories are authoritative; seeds use the production interfaces and are idempotent. |
| 13 | Swagger documents real success and errors | XVII | PASS — explicit request/response DTOs and shared envelope/error decorators cover every operation. |
| 14 | No speculative abstraction; unclear requirements clarified | XIX, XX | PASS — all three scope conflicts were owner-resolved before planning. |

**Contract bindings re-check**: The design retains the global `{success,data,meta}` envelope; request
`pageSize` and response `meta.limit`; default 20 / maximum 100 / empty successful over-range pages;
UUID identifiers; ISO UTC timestamps and date-only calendar strings; `expectedVersion` on every
mutation with first-class `currentVersion` conflicts; computed per-record permissions on details;
branch scope with `out-of-scope`; Arabic errors and Arabic search folding. Money and documented
idempotency operation families are not used by this feature. File fields are safe descriptors.

### Post-Design Re-evaluation

PASS. `research.md`, `data-model.md`, and the contracts define transaction boundaries, dependency
ports, bounded exceptions to pagination, status transitions, permissions, errors, and owner-approved
contract amendments. No constitution violation requires a complexity exception.

## Project Structure

### Documentation (this feature)

```text
specs/003-organization-settings/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── organization-profile-settings.contract.md
│   ├── structure-calendar.contract.md
│   └── lookup-administration.contract.md
└── tasks.md
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma
├── migrations/*_organization_settings/migration.sql
└── seeds/organization-master-data.ts

src/modules/organization/
├── organization.module.ts
├── branches/
│   ├── dto/
│   ├── branch.controller.ts
│   ├── branch.service.ts
│   ├── branch.repository.ts
│   └── branch.policy.ts
├── departments/
│   ├── dto/
│   ├── department.controller.ts
│   ├── department.service.ts
│   ├── department.repository.ts
│   └── department.policy.ts
├── academic-calendar/
│   ├── dto/
│   ├── academic-year.controller.ts
│   ├── academic-year.service.ts
│   ├── academic-year.repository.ts
│   ├── academic-term.controller.ts
│   ├── academic-term.service.ts
│   ├── academic-term.repository.ts
│   └── academic-calendar.policy.ts
├── lookups/
│   ├── dto/
│   ├── lookup.controller.ts
│   ├── lookup.service.ts
│   ├── lookup.repository.ts
│   └── lookup.policy.ts
├── profile/
│   ├── dto/
│   ├── organization-profile.controller.ts
│   ├── organization-profile.service.ts
│   └── organization-profile.repository.ts
├── settings/
│   ├── dto/
│   ├── general-settings.controller.ts
│   ├── general-settings.service.ts
│   └── general-settings.repository.ts
├── events/organization.events.ts
├── mappers/organization.mapper.ts
└── types/organization.types.ts

test/
├── unit/organization/
├── integration/organization/
└── e2e/organization/
```

**Structure Decision**: Use one feature-owned `OrganizationModule` under the existing modular NestJS
service. Capability folders own DTOs, policies, services, repositories, and controllers. The module
exports narrow read services for downstream master-data resolution, not repositories. Prisma changes
remain in the central schema/migration location while all runtime access stays inside Organization
repositories. Identity adds only a public reference/dependency service needed to validate manager
references and archival dependencies; Organization never imports Identity repositories.

## Design Phases

### Phase 0 — Research

Resolve and record:

1. Database-backed enforcement and concurrency behavior for exclusive academic-year activation.
2. Race-safe inclusive term non-overlap and parent-boundary validation.
3. Lookup hierarchy, uniqueness, ordering, archival, and historical-consumer behavior.
4. Singleton organization profile/general-settings persistence and safe child/contact replacement.
5. Cross-module reference validation without cross-module database access.
6. Canonical route, payload, error, permission, pagination, and amendment decisions.

Output: [research.md](research.md)

### Phase 1 — Data Design

Add organization profile/contact/social-link, general settings, branch, department, academic year,
academic term, lookup group, and lookup value persistence. Use normalized unique keys, versions,
archive timestamps, actor attribution, dependency indexes, a partial uniqueness guarantee for the
active academic year, and a database exclusion guarantee for non-archived term overlap. Define
aggregate transitions and external reference boundaries explicitly.

Output: [data-model.md](data-model.md)

### Phase 1 — Interface Contracts

Retain the documented `/api/v1/settings` structure/calendar/general routes and
`/api/v1/organization/profile` read. Amend the canonical document before implementation with:

- `PATCH /api/v1/organization/profile` for approved mutable fields only.
- Configurable lookup-group and lookup-value administration under `/api/v1/settings/lookups` while
  preserving the bounded consumer feed.

Contracts specify permissions, concurrency tokens, pagination, record permissions, Arabic error
codes, safe descriptors, and archive/status semantics.

Output: [contracts/](contracts/)

### Phase 1 — Validation Guide

Validate fresh and upgraded migrations, idempotent seeds, branch/department lifecycle and scope,
exclusive year activation under concurrency, term overlap races, configurable lookup consumption,
immutable legal identity, atomic profile/settings changes, live authorization, disclosure safety,
events, Swagger, and all foundation/IAM regressions.

Output: [quickstart.md](quickstart.md)

## Complexity Tracking

No constitution violations or justified complexity exceptions.
