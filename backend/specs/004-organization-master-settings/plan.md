# Implementation Plan: Organization Master Settings

**Branch**: `004-organization-master-settings` | **Date**: 2026-08-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-organization-master-settings/spec.md`

## Summary

Complete the Organization-owned configuration module for branches, departments, academic years,
explicitly ordered academic terms, configurable lookup groups/values, immutable legal identity, and
operational settings. Extend the existing feature-based NestJS module and Prisma repository layer,
close concurrency races with reviewed PostgreSQL constraints and serializable transactions, expose
only documented `/api/v1` contracts, and export narrow master-data resolvers for future modules.

## Technical Context

**Language/Version**: TypeScript 5.7, strict mode, targeting ES2023 on Node.js

**Primary Dependencies**: NestJS 11, Prisma ORM 7, `class-validator`, `class-transformer`, Swagger,
RxJS, existing Core authorization/event/error/storage abstractions

**Storage**: PostgreSQL; Prisma schema plus reviewed SQL migration for partial unique and exclusion
constraints; safe asset descriptors only (file bytes remain Storage-owned)

**Testing**: Jest 30, ts-jest, Nest testing utilities, Supertest; unit, PostgreSQL integration,
contract/e2e, migration, concurrency, authorization, and regression suites

**Target Platform**: Linux-compatible Node.js web-service runtime with PostgreSQL

**Project Type**: Single backend web service using feature-owned modules

**Performance Goals**: 95% of first-page search/filter operations complete within one second under
expected academy load; common administrative mutations complete interactively without unbounded reads

**Constraints**: `/api/v1` canonical contract; 20 default/100 maximum page size; Arabic-normalized
search; UUIDs; date-only calendar values; optimistic versions on writes; branch scope; no cross-module
repository access; no filesystem paths; all multi-row changes atomic

**Scale/Scope**: One organization singleton; tens of branches/departments/years, hundreds of terms
and lookup values, bounded administration traffic, and reusable reads for all future business modules

## Constitution Check

*GATE: PASS before Phase 0 and PASS after Phase 1 design.*

Source: `.specify/memory/constitution.md` v1.0.0.

| # | Gate | Principle | Status |
|---|------|-----------|--------|
| 1 | One business-domain module; no cross-module DB access | I, II | PASS — Organization owns its tables and uses Identity public reference services only. |
| 2 | Endpoints match the canonical requirements document | III | PASS WITH PREREQUISITE — existing routes remain unchanged; the approved term-order field must be added to the canonical document before implementation. |
| 3 | Controller → Service → Repository → Prisma | IV, V | PASS — controllers bind/guard once; repositories alone access Prisma. |
| 4 | DTO request validation; business rules in services/policies | VI | PASS — structure is validated at ingress; containment, ordering, dependencies, and transitions remain domain rules. |
| 5 | Permission guards on every protected endpoint | VII | PASS — exact documented `settings.*` keys are reused; no inline authorization. |
| 6 | One success/error envelope | VIII, XIII | PASS — global interceptor/filter remain authoritative. |
| 7 | Storage abstraction and path-free descriptors | IX | PASS — Organization persists validated descriptors and never handles paths. |
| 8 | Transactions and post-commit domain events | X, XI | PASS — activation, reorder, child replacement, archive, and term resequencing have explicit boundaries. |
| 9 | Strict types and no `any` | XII | PASS — DTO, repository, public-port, and event types are explicit. |
| 10 | Paginated lists | XIV | PASS — administration lists use page/pageSize and bounded static feeds remain closed sets. |
| 11 | Archival instead of deletion | XV | PASS — lifecycle status retains historical resolution. |
| 12 | No mock dependency | XVI | PASS — seeds/fixtures use the same public interfaces and persistence model. |
| 13 | Real Swagger success/error shapes | XVII | PASS — reusable envelopes plus endpoint-specific DTOs/errors are planned. |
| 14 | No speculative abstraction; all material ambiguity resolved | XIX, XX | PASS — legal identity, lookups, and term-order behavior were owner-approved. |

**Contract bindings re-check**: PASS. Request `page`/`pageSize`, response `meta.limit`, empty
over-range 200, UUID IDs, UTC timestamps, date-only academic values, `expectedVersion` and
`currentVersion`, Arabic UTF-8 messages/search folding, exact permissions, per-record permissions,
branch scope with `out-of-scope`, archival, and global envelopes remain binding. Money and operation
idempotency families are not used by this feature. Explicit term-order mutations are versioned and
atomic.

### Post-design re-check

Phase 1 preserves every gate. The data model adds a deferrable per-year order uniqueness safeguard and
transactional `1..N` maintenance across all retained terms; contracts add the owner-approved field without
inventing a route. The canonical HTML amendment is a blocking implementation task, not an accepted
contract divergence.

## Project Structure

### Documentation (this feature)

```text
specs/004-organization-master-settings/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── structure-calendar.contract.md
│   ├── lookup-administration.contract.md
│   └── organization-profile-settings.contract.md
└── tasks.md
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma
├── migrations/
└── seeds/

src/modules/organization/
├── organization.module.ts
├── branches/{dto,branch.controller.ts,branch.service.ts,branch.policy.ts,branch.repository.ts}
├── departments/{dto,department.controller.ts,department.service.ts,department.policy.ts,department.repository.ts}
├── academic-calendar/{dto,academic-year.*,academic-term.*,academic-calendar.policy.ts}
├── lookups/{dto,lookup.controller.ts,lookup.service.ts,lookup.policy.ts,lookup.repository.ts,organization-lookups.service.ts}
├── profile/{dto,organization-profile.controller.ts,organization-profile.service.ts,organization-profile.repository.ts}
├── settings/{dto,general-settings.controller.ts,general-settings.service.ts,general-settings.repository.ts}
├── events/
├── mappers/
└── types/

test/
├── unit/organization/
├── integration/organization/
└── e2e/organization/
```

**Structure Decision**: Extend the existing single NestJS backend and feature-owned Organization
module. Identity remains the owner of employees and exposes only narrow validation/dependency
services. Organization exports safe master-data read ports, never repositories.

## Delivery Phases

### Phase A — Contract and persistence foundation

Amend the canonical term contract, update Prisma/migration/seed/public types, and verify fresh,
upgrade, rollback, constraint, and repeated-seed behavior before endpoint changes.

### Phase B — Organizational structure

Complete branch/department query, lifecycle, dependency, scope, optimistic-concurrency, permission,
Swagger, and event behavior with contract and integration tests.

### Phase C — Academic calendar

Complete exclusive year activation/default synchronization, inclusive term non-overlap, explicit
per-year order insertion/move with archive/reactivation preservation, and concurrent-race tests.

### Phase D — Configurable lookups

Deliver group/value administration, hierarchy integrity, selectable/historical resolution,
transactional exact-membership reorder, bounded static feed, and downstream-consumer ports.

### Phase E — Profile and general settings

Deliver immutable legal-identity projection, safe branding/contact settings updates, supported
standards, active default validation, aggregate transactions, permissions, and events.

### Phase F — Contract integration and finalization

Run all acceptance scenarios, Swagger/security/disclosure/layering audits, migration/seed parity,
strict type/lint/build tests, and full Foundation/IAM regressions.

## Complexity Tracking

No constitution violations require justification.
