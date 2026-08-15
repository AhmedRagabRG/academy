# Implementation Plan: Academic Catalog

**Branch**: `005-academic-catalog` | **Date**: 2026-08-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-academic-catalog/spec.md`

## Summary

Build a feature-owned Academic Catalog module around one transactional AcademicProduct aggregate.
Products select one of three fixed behavioral Product Types and one configurable Business Category,
validate type-specific academic fields and IAM instructor references, persist exact Money values,
replace ordered branch/content/media children atomically, enforce readiness and lifecycle rules, and
export narrow eligibility/snapshot ports for Program Batches, Admissions, Students, and Finance.

## Technical Context

**Language/Version**: TypeScript 5.7 strict mode, ES2023 target, Node.js runtime

**Primary Dependencies**: NestJS 11, Prisma ORM 7, class-validator/class-transformer, Swagger, RxJS,
existing Core authorization/events/errors, shared Money/FileDescriptor/pagination, Identity and
Organization public reference services

**Storage**: PostgreSQL for catalog aggregates and normalized ordered children; shared storage service
owns file bytes while Catalog stores validated safe descriptors

**Testing**: Jest 30, ts-jest, Nest testing utilities, Supertest, PostgreSQL integration tests,
contract/e2e tests, migration/seed tests, transaction/concurrency tests, and full regressions

**Target Platform**: Linux-compatible Node.js web service with PostgreSQL

**Project Type**: Single backend web service using independent feature modules

**Performance Goals**: 95% of first-page catalog searches/filter changes complete within one second;
detail/readiness/eligibility reads remain interactive under expected academy administrative load

**Constraints**: Canonical `/api/v1/catalog` contract; global envelopes; 20 default/100 max paging;
Arabic-normalized search; UUID IDs; Money decimal strings; expectedVersion writes; branch scope;
no cross-module repository access; no filesystem paths; transactional aggregate writes/events

**Scale/Scope**: One organization, three fixed Product Types, hundreds of configurable categories and
products, tens of branches, bounded ordered content/media collections, and read-heavy downstream use

## Constitution Check

*GATE: PASS before Phase 0 and PASS after Phase 1 design.*

Source: `.specify/memory/constitution.md` v1.0.0.

| # | Gate | Principle | Status |
|---|------|-----------|--------|
| 1 | One domain module; no cross-module DB access | I, II | PASS — Catalog owns only catalog tables and consumes Identity/Organization public ports. |
| 2 | Endpoints match canonical requirements | III | PASS WITH PREREQUISITE — existing routes remain; canonical docs must record fixed types, instructor reference, and batchability before implementation. |
| 3 | Controller → Service → Repository → Prisma | IV, V | PASS — repositories alone access Prisma; controllers bind/guard one service call. |
| 4 | DTO validation and service-owned business rules | VI | PASS — DTOs validate shape; type schemas, readiness, Money consistency, transitions, and dependencies live in policies/services. |
| 5 | Exact permission guards | VII | PASS — documented `catalog.*` keys are reused without invention. |
| 6 | Global success/error envelope | VIII, XIII | PASS — controllers return bare results to the existing interceptor/filter. |
| 7 | Storage abstraction/path-free descriptors | IX | PASS — upload stays shared; Catalog validates descriptors and media policy only. |
| 8 | Transactions and post-commit events | X, XI | PASS — product aggregate replacement and lifecycle writes have explicit service transactions. |
| 9 | Strict types/no `any` | XII | PASS — fixed discriminants, DTOs, projections, ports, and event payloads are typed. |
| 10 | Paginated lists/bounded feeds | XIV | PASS — products/taxonomy page; lookup/media-policy feed is a bounded closed projection. |
| 11 | Archival, no deletion | XV | PASS — products/taxonomy retain historical resolution. |
| 12 | No mock dependency | XVI | PASS — seed fixtures use production repositories/contracts. |
| 13 | Accurate Swagger | XVII | PASS — endpoint-specific success/error/readiness/eligibility shapes are designed. |
| 14 | No speculative behavior | XIX, XX | PASS — dual taxonomy, instructor ownership, and fixed batchability were explicitly resolved. |

**Contract bindings re-check**: PASS. IDs, timestamps, Arabic messages/search, Money, pagination,
version conflicts, record permissions, branch scope/out-of-scope, errors, file descriptors, and global
envelopes remain binding. Catalog operations are not among the constitution's idempotency-key families.

### Post-design re-check

Phase 1 preserves all gates. The model normalizes aggregate children for integrity, stores integer
minor-unit Money values with explicit currency/precision, and uses only public external-reference
ports. Contracts retain canonical routes and isolate the required documentation amendment as the
first implementation task. No complexity exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/005-academic-catalog/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── products.contract.md
│   ├── taxonomy-lookups.contract.md
│   └── catalog-public-ports.contract.md
└── tasks.md
```

### Source Code (repository root)

```text
prisma/{schema.prisma,migrations/,seeds/academic-catalog.ts}

src/modules/catalog/
├── catalog.module.ts
├── products/{dto,product.controller.ts,product.service.ts,product.policy.ts,product.repository.ts}
├── taxonomy/{dto,taxonomy.controller.ts,taxonomy.service.ts,taxonomy.policy.ts,taxonomy.repository.ts}
├── lookups/{catalog-lookups.controller.ts,catalog-lookups.service.ts}
├── events/catalog.events.ts
├── mappers/catalog.mapper.ts
└── types/{catalog.types.ts,catalog-reference.port.ts,catalog-public.port.ts}

src/modules/identity/employees/catalog-reference.service.ts
src/modules/organization/types/catalog-organization.port.ts

test/{unit,integration,e2e}/catalog/
```

**Structure Decision**: Add one Catalog feature module. Identity owns instructor eligibility;
Organization owns branches, departments, Business Categories and configurable study/currency data.
Catalog owns fixed Product Type metadata, products, prices, assignments, content, media, and lifecycle.
Cross-module communication is through narrow exported services only.

## Delivery Phases

1. **Contract/foundation**: amend canonical docs, permissions, schema/migration/seed, public ports,
   normalization, Money, events, errors, and module wiring.
2. **Product MVP**: product list/detail/create/update with taxonomy/reference validation and atomic
   aggregate persistence.
3. **Taxonomy**: maintain the three fixed type definitions and configurable Business Categories.
4. **Profiles**: enforce type-specific academic/instructor, pricing, branch, content, and media rules.
5. **Lifecycle**: readiness, transitions, code locking, lifecycle history, archival dependencies,
   eligibility, and fixed batchability.
6. **Consumption/finalization**: public snapshot/eligibility ports, Swagger/security/disclosure,
   migration/seed parity, acceptance scenarios, and complete regression gates.

## Complexity Tracking

No constitution violations require justification.
