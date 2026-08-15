# Implementation Plan: Identity & Access Management

**Branch**: `002-identity-access-management` | **Date**: 2026-08-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-identity-access-management/spec.md`

## Summary

Deliver the platform's identity source of truth by extending the Backend Foundation's provisional
`Account`, `Role`, and `RefreshToken` records into a complete Identity module. The implementation
adds multi-role employees, configurable permission records, independently revocable sessions,
authentication and self-service endpoints under `/api/v1/auth`, and administrative users/roles/
permissions endpoints under `/api/v1/settings`.

The design keeps authentication primitives in `src/core/auth/`, while all employee, role,
permission, session, and profile business rules live in one `src/modules/identity/` module. Services
own transactions and events; repositories own every Prisma query. Existing global guards continue
to authorize all future modules, but resolve current account status and permission unions from the
Identity module on every protected request.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 22.18, ES2023 target, strict mode

**Primary Dependencies**: NestJS 11, Prisma 7.9 with `@prisma/adapter-pg`, `@nestjs/jwt`, argon2,
class-validator/class-transformer, csrf-csrf, cookie-parser, nestjs-pino, Swagger

**Storage**: PostgreSQL 14+ for employees, roles, permissions, assignments, and sessions; existing
local storage service for avatar descriptors

**Testing**: Jest 30 and Supertest; unit tests for policies/services, repository integration tests
against a dedicated PostgreSQL test database, and endpoint-level e2e tests

**Target Platform**: Linux/macOS HTTP service using the existing NestJS Express adapter

**Project Type**: Single backend web service

**Performance Goals**: Sign-in/session restore visible to users within 1 second under normal load;
paginated administrative lists within 1 second for 95% of acceptance runs; authorization state
changes effective on the next protected request

**Constraints**: No token in response bodies or browser-readable storage; every protected request
revalidates employee and role eligibility; refresh replay must fail; all database access through
repositories; all multi-record security changes transactional; no permanent deletion of employees
or roles; exact permission catalogue only

**Scale/Scope**: One business module, 24 public operations, 7 persisted entity/relationship types,
five user stories, 54 functional requirements; designed for thousands of employees and concurrent
sessions without introducing speculative distributed infrastructure

## Constitution Check

*GATE: Passed before research and re-checked after design.*

Source: `.specify/memory/constitution.md` v1.0.0.

| # | Gate | Principle | Status |
|---|------|-----------|--------|
| 1 | Feature is scoped to one business domain module; no cross-module DB access | I, II | **PASS** — Identity owns only its tables and consumes branch/department UUID references without querying Organization tables |
| 2 | Every endpoint matches `docs/api-data-requirements.html` | III | **PASS with owner amendment** — existing auth/settings contracts are preserved; eight additions were explicitly approved in the finalized spec and must be copied into the canonical document before shipping |
| 3 | Controllers hold no business logic; layering is Controller → Service → Repository → Prisma | IV, V | **PASS** — controllers bind DTOs and call one service method; identity repositories alone query Prisma |
| 4 | Every request has a DTO with validation; business rules live in services | VI | **PASS** — DTOs own structural rules; role eligibility, transitions, password/session policy, and dependencies remain service rules |
| 5 | Every protected endpoint has a permission guard; no duplicated authz logic | VII | **PASS** — global guards remain authoritative; self-service requires authentication and admin endpoints declare `settings.*` keys |
| 6 | Responses use the single success/error envelope | VIII, XIII | **PASS** — existing global interceptor/filter wrap all new controllers |
| 7 | Uploads go through the storage service | IX | **PASS** — profile updates accept a previously stored avatar descriptor; no identity code handles paths |
| 8 | Multi-entity writes are transactional; domain events emitted | X, XI | **PASS** — account status/password/role changes and session invalidation share service-owned transactions and emit events after success |
| 9 | `strict` mode holds; no new `any` | XII | **PASS** — generated and handwritten surfaces remain fully typed |
| 10 | Every list endpoint is paginated | XIV | **PASS** — users and roles use offset pagination; sessions and permission catalogue are documented bounded self-service/closed sets |
| 11 | Deletion is archival where the domain allows it | XV | **PASS** — employees/roles archive; session revocation is operational state, and expired sessions may be pruned |
| 12 | No dependency on mock data | XVI | **PASS** — tests may mock interfaces; runtime uses repositories and seeded canonical permissions |
| 13 | Swagger documents real success/error shapes | XVII | **PASS** — every endpoint uses foundation envelope decorators and explicit DTO models |
| 14 | No speculative abstraction; unclear requirements clarified | XIX, XX | **PASS** — session ownership, multi-role cardinality, and route ownership were resolved during specification |

**Contract bindings re-check**: envelope ✅; pagination 20/100/empty-200 ✅; UUID and UTC ✅;
expected/current version ✅; per-record permissions ✅; branch scope/out-of-scope ✅; Arabic UTF-8 and
search folding ✅. Money and business-operation idempotency are not used. Session lists and the
permission catalogue are bounded non-paginated sets by explicit contract.

## Project Structure

### Documentation (this feature)

```text
specs/002-identity-access-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── authentication.contract.md
│   ├── sessions-profile.contract.md
│   └── administration.contract.md
└── tasks.md
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma
├── migrations/
└── seed.ts

src/
├── core/
│   ├── auth/                         # credential/cookie primitives and global auth guard
│   └── authorization/                # global permission and branch-scope enforcement
└── modules/identity/
    ├── identity.module.ts
    ├── auth/
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   └── dto/
    ├── sessions/
    │   ├── sessions.controller.ts
    │   ├── session.service.ts
    │   ├── session.repository.ts
    │   └── dto/
    ├── employees/
    │   ├── employees.controller.ts
    │   ├── employee.service.ts
    │   ├── employee.repository.ts
    │   ├── employee.policy.ts
    │   └── dto/
    ├── roles/
    │   ├── roles.controller.ts
    │   ├── role.service.ts
    │   ├── role.repository.ts
    │   ├── permission.repository.ts
    │   └── dto/
    ├── profile/
    │   ├── profile.controller.ts
    │   ├── profile.service.ts
    │   └── dto/
    ├── events/
    ├── mappers/
    └── types/

test/
├── unit/identity/
├── integration/identity/
└── e2e/identity/
```

**Structure Decision**: One `identity` business module owns the domain and is internally grouped by
capability to keep files readable. Authentication cryptography/cookies remain reusable core
infrastructure, but orchestration moves into Identity services. `/auth` and `/settings` are route
surfaces, not separate domain modules. This avoids cross-module repository access while preserving
the established frontend contract.

## Delivery Phases

1. **Schema evolution and compatibility** — migrate provisional single-role accounts and refresh
   tokens into multi-role employee/session structures without losing seeded data.
2. **Permission and caller resolution** — seed the canonical catalogue, compute active-role unions,
   and update the global guard/caller context.
3. **Authentication and sessions** — login, restore, logout, rotation, inventory, and revocation.
4. **Employee administration** — list/detail/create/update/status/reset with scope, concurrency,
   transactions, and events.
5. **Role administration** — list/detail/create/update/status, permission replacement, effective
   permission reads, and in-use protection.
6. **Self-service** — profile read/update and password change, including avatar descriptors and
   other-session revocation.
7. **Contract, security, and regression validation** — Swagger, redaction, CSRF/CORS, replay,
   concurrency, layering, and full foundation regression suite.

## Complexity Tracking

No constitution violations require justification. The explicit join entities are required by the
approved multi-role model and configurable permission catalogue; they are domain relationships, not
speculative abstractions.
