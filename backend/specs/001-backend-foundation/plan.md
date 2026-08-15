# Implementation Plan: Backend Foundation

**Branch**: `001-backend-foundation` | **Date**: 2026-08-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-backend-foundation/spec.md`

## Summary

Establish every cross-cutting mechanism the eight future business modules depend on, and expose
exactly one endpoint (health) to prove the stack is live.

The technical approach is to make correct behaviour automatic and incorrect behaviour structurally
awkward: one global interceptor owns the success envelope, one global filter owns the error envelope,
one global pipe owns validation, one guard owns permissions, one service owns file persistence, and
one abstract base class owns repository access to Prisma. A developer adding an endpoint later
inherits all of it by default and has to work to escape it.

Three findings from research shape the build materially:

1. **Prisma 7 requires a driver adapter.** The current release (7.9.1) no longer instantiates a
   client from a connection string alone — it needs `@prisma/adapter-pg` and a `prisma.config.ts`.
   This changes the database setup step substantially versus every Prisma 6 tutorial.
2. **TypeScript strict mode is currently OFF.** `tsconfig.json` sets `strictNullChecks` but leaves
   `noImplicitAny: false` and `strictBindCallApply: false`. Constitution XII and FR-076 require full
   strict, so this is a real (small) migration, not a no-op.
3. **NestJS officially sanctions `csrf-csrf`** (double-submit cookie) for the CSRF requirement the
   cookie decision introduced, which settles the open design choice flagged at spec time.

## Technical Context

**Language/Version**: TypeScript 5.7 on Node.js 22.18 (ES2023 target, NodeNext modules)

**Primary Dependencies**: NestJS 11 · Prisma 7.9 + `@prisma/adapter-pg` · `@nestjs/jwt` ·
`argon2` · `csrf-csrf` · `cookie-parser` · `nestjs-pino` · `@nestjs/terminus` · `@nestjs/swagger` ·
`class-validator` / `class-transformer` · `multer` (via `@nestjs/platform-express`)

**Storage**: PostgreSQL 14+ (local install confirmed: PostgreSQL 14.19 via Homebrew; no Docker on
this machine). Files on local filesystem under a configured directory.

**Testing**: Jest 30 (already configured) + Supertest for e2e. E2e suite requires a live PostgreSQL
database; a dedicated test database is created and migrated by the test setup.

**Target Platform**: Linux/macOS server process, HTTP over Express adapter

**Project Type**: Single backend service (web API)

**Performance Goals**: None specified and none invented. Constitution XX forbids speculative
optimization. The only latency-adjacent requirement is that the health endpoint answer quickly enough
for an orchestrator probe (sub-second under normal conditions).

**Constraints**: TypeScript strict mode mandatory · no `any` · no Prisma access outside repositories
· no business logic in controllers · every response through one of two envelopes · Arabic UTF-8
unescaped · money never floating-point

**Scale/Scope**: ~80 functional requirements, 5 user stories, 1 exposed endpoint, 3 database tables,
0 business modules. Sizing target: the foundation should be small enough that a developer can read
all of `core/` and `shared/` in an afternoon.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Source: `.specify/memory/constitution.md` v1.0.0.

**Initial evaluation (pre-research)** and **post-design re-evaluation** are identical except where
noted; the design did not introduce new violations.

| # | Gate | Principle | Status |
|---|------|-----------|--------|
| 1 | Feature is scoped to one business domain module; no cross-module DB access | I, II | **PASS** — no business modules exist; `modules/` ships empty |
| 2 | Every endpoint matches `docs/api-data-requirements.html` | III | **N/A** — no documented endpoint is implemented. Health is operational infrastructure outside the frontend contract (spec §API Contract Alignment) |
| 3 | Controllers hold no business logic; layering is Controller → Service → Repository → Prisma | IV, V | **PASS** — enforced by `BaseRepository` being the only Prisma consumer; health controller delegates to a service |
| 4 | Every request has a DTO with `class-validator`; business rules in services | VI | **PASS** — global `ValidationPipe`; health takes no input |
| 5 | Every protected endpoint has a permission guard; no duplicated authz logic | VII | **PASS** — global `PermissionsGuard`; health is explicitly `@Public()` |
| 6 | Responses use the single success/error envelope; no ad-hoc JSON | VIII, XIII | **PASS** — global interceptor + global filter |
| 7 | Uploads go through the storage service; no filesystem paths in business code | IX | **PASS** — `StorageService` behind `STORAGE_SERVICE` token |
| 8 | Multi-entity writes are transactional; domain events emitted for audit | X, XI | **PASS** — `TransactionManager` + `DomainEventBus`; no multi-entity write exists yet to violate it |
| 9 | `strict` mode holds; no new `any` | XII | **PASS after remediation** — strict is currently OFF and must be enabled as task 1 (see Complexity Tracking C-4) |
| 10 | Every list endpoint is paginated per the documented format | XIV | **N/A** — no list endpoint exists. Contract and helpers are delivered for future use |
| 11 | Deletion is archival where the domain allows it | XV | **PASS** — `status` + `archivedAt` on the base entity convention; no hard delete anywhere |
| 12 | No dependency on mock data; mocks behind interfaces | XVI | **PASS** — seed data is real database rows, not in-code mocks; storage is interface-backed |
| 13 | Swagger documents real success and error shapes | XVII | **PASS** — `ApiEnvelopeResponse` / `ApiErrorResponse` decorators wrap the generic envelope |
| 14 | No speculative abstraction; unclear requirements clarified, not assumed | XIX, XX | **PASS with watch items** — see Complexity Tracking |

**Contract bindings re-check**: envelope ✅ · pagination defaults 20/100/empty-200 ✅ · `Money`
decimal string ✅ · UUID string IDs ✅ · ISO 8601 UTC ✅ · `expectedVersion` + `currentVersion` ✅
(mechanism only) · idempotency ✅ (mechanism only) · per-record permissions helper ✅ · branch scoping
with distinct `out-of-scope` ✅ · Arabic UTF-8 + search folding ✅.

## Project Structure

### Documentation (this feature)

```text
specs/001-backend-foundation/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — 16 technical decisions
├── data-model.md        # Phase 1 output — 3 tables + shared type contracts
├── quickstart.md        # Phase 1 output — validation guide
├── contracts/           # Phase 1 output
│   ├── envelope.contract.md      # Success/error/pagination wire contracts
│   ├── health.contract.md        # The one exposed endpoint
│   └── internal-contracts.md     # Interfaces future modules build against
├── checklists/
│   └── requirements.md
└── tasks.md             # Created by /speckit-tasks — NOT by this command
```

### Source Code (repository root)

```text
src/
├── main.ts                      # Bootstrap: global pipes/filters/interceptors, cookies, CORS, CSRF, Swagger
├── app.module.ts                # Root wiring
│
├── config/                      # FR-005..008 — typed, validated configuration
│   ├── configuration.ts         # Namespaced config factories
│   ├── env.validation.ts        # class-validator schema; fails startup on bad input
│   └── config.types.ts
│
├── core/                        # Cross-cutting request machinery
│   ├── auth/
│   │   ├── token.service.ts             # Issue/verify access + refresh (FR-030)
│   │   ├── password.service.ts          # argon2id hash/verify (FR-034)
│   │   ├── cookie.service.ts            # Set/clear credential cookies (FR-031,032,039)
│   │   ├── refresh-token.repository.ts  # Persistence for revocation (FR-038)
│   │   ├── caller-context.ts            # Request-scoped identity (FR-035)
│   │   └── auth.module.ts
│   ├── authorization/
│   │   ├── permissions.guard.ts         # The single guard (FR-045)
│   │   ├── permission-key.ts            # module[.resource].action format (FR-047)
│   │   ├── branch-scope.service.ts      # Scoping + out-of-scope refusal (FR-048)
│   │   └── record-permissions.helper.ts # Per-record permissions object (FR-049)
│   ├── decorators/
│   │   ├── require-permissions.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── current-caller.decorator.ts
│   ├── exceptions/              # One class per documented error category (FR-024)
│   ├── filters/
│   │   └── all-exceptions.filter.ts     # The single error envelope producer (FR-020)
│   ├── interceptors/
│   │   ├── response-envelope.interceptor.ts  # The single success envelope producer (FR-019)
│   │   └── request-logging.interceptor.ts
│   ├── events/
│   │   └── domain-event.bus.ts          # Audit-ready emission (FR-071)
│   └── core.module.ts
│
├── shared/                      # Reusable, framework-light building blocks
│   ├── repository/base.repository.ts    # The ONLY Prisma consumer (FR-002)
│   ├── pagination/              # Offset + cursor contracts and helpers (FR-022,023)
│   ├── dto/                     # Envelope, error, pagination DTOs for Swagger
│   ├── swagger/api-envelope.decorator.ts
│   ├── types/                   # Money, Brand<>, CallerContext, FileDescriptor
│   ├── utils/                   # arabic-normalize, money, date-range, idempotency
│   └── constants/
│
├── database/
│   ├── prisma.service.ts        # Client lifecycle with driver adapter (FR-009)
│   ├── transaction.manager.ts   # Ambient transaction context (FR-012)
│   ├── prisma-error.mapper.ts   # P-codes → domain exceptions (FR-013)
│   └── database.module.ts
│
├── storage/
│   ├── storage.service.interface.ts     # STORAGE_SERVICE token (FR-051)
│   ├── local-storage.service.ts         # The only path-aware code (FR-050)
│   ├── file-signature.ts                # Magic-byte sniffing (FR-056)
│   ├── upload.constraints.ts
│   └── storage.module.ts
│
├── health/
│   ├── health.controller.ts     # The single exposed endpoint (FR-063)
│   ├── prisma.health-indicator.ts
│   └── health.module.ts
│
└── modules/                     # EMPTY. Business modules land here.
    └── .gitkeep

prisma/
├── schema.prisma                # 3 tables only (FR-015)
├── migrations/
└── seed.ts                      # Idempotent (FR-011, FR-017)

prisma.config.ts                 # Prisma 7 adapter configuration

test/
├── e2e/                         # Envelope, validation, auth, authz, storage, health
└── unit/
```

**Structure Decision**: Single project at repository root, using the five top-level areas named in
the feature description (`core`, `shared`, `database`, `storage`, `modules`) plus two additions:

- `config/` — the description lists configuration as its own concern (FR-005–008) and it must load
  before `core/` can be constructed. Nesting it inside `core/` would create a bootstrap-order
  dependency that reads backwards.
- `health/` — the one exposed endpoint. It does not belong in `modules/`, which the description
  reserves for business modules and requires to ship empty.

`modules/` contains only a `.gitkeep` and the reference pattern documented in `quickstart.md`.

## Complexity Tracking

> Filled because four items warrant explicit justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| **C-1**: Three database tables (`Account`, `Role`, `RefreshToken`) exist despite "no business models" | Project owner's explicit decision (spec Q2 → option B). Without them, password hashing has nothing to verify against and the seed script has nothing to seed, so SC-006 (end-to-end credential lifecycle) is unprovable | Zero-model option (Q2 → A) was offered and declined. Mitigation: FR-016 forbids any endpoint touching them, and A-011 commits to extension-not-replacement by the Users module |
| **C-2**: CSRF protection and credentialed CORS are in scope though absent from the original description | Direct consequence of the owner's cookie decision (spec Q1 → option A). Browsers attach cookies automatically, so without CSRF protection any third-party site could issue authenticated state-changing requests. This is load-bearing, not hardening | Omitting it was rejected as shipping a known vulnerability. Bearer tokens (Q1 → B) would have avoided it but were declined |
| **C-3**: Prisma 7 driver adapter + `prisma.config.ts` adds setup surface versus a plain connection string | Prisma 7.9.1 is the current release and requires an adapter — a client constructed without one throws `P2038`. Pinning to Prisma 6 would start the project one major version behind on a dependency that is expensive to upgrade later, once eight modules of queries exist | Pinning Prisma 6 is the genuine alternative and is recorded in research.md D-01 with its trade-offs. Recommendation is 7; the owner can overrule cheaply *now* and expensively later |
| **C-4**: Enabling TypeScript `strict` touches the existing scaffold files | Constitution XII and FR-076 mandate it. The scaffold is 5 files; the cost is trivial now and compounds with every file added | Leaving strict off violates a non-negotiable principle. There is no acceptable alternative |

**Watch items for `/speckit-tasks`** (not violations, but the places this plan could drift):

- The `Account`/`Role` tables must not grow CRUD services "while we're in there". FR-016 is the fence.
- `shared/utils/` must not become a junk drawer. Only the four utilities the spec names (Arabic
  normalization, money, date-range, idempotency) are in scope.
- The reference pattern in `modules/` is documentation, not a working module. If it acquires an
  endpoint, scope has been crossed.

## Phase 0: Research

**Status**: Complete → [research.md](research.md)

16 decisions recorded with rationale and rejected alternatives. The load-bearing ones: Prisma 7 with
`@prisma/adapter-pg` (D-01), argon2id for password hashing (D-04), `@nestjs/jwt` with a custom
cookie-reading guard rather than Passport (D-05), `csrf-csrf` double-submit (D-07), in-house
magic-byte sniffing instead of the ESM-only `file-type` package (D-11), and `class-validator` for
environment validation to avoid a second validation library (D-10).

One item carries residual risk and is called out there rather than papered over: whether Prisma 7's
driver-adapter engine still raises `PrismaClientKnownRequestError` with the `P2002`/`P2003`/`P2025`
codes that FR-013's error translation depends on (D-02). It must be verified against a live database
in the first implementation task, with a documented fallback if it does not hold.

## Phase 1: Design & Contracts

**Status**: Complete

- [data-model.md](data-model.md) — the three tables, the base entity convention (`version`,
  `status`, `archivedAt`), and the shared type contracts (`Money`, `CallerContext`, `FileDescriptor`,
  pagination shapes).
- [contracts/envelope.contract.md](contracts/envelope.contract.md) — the success, error, and
  pagination wire contracts every future endpoint must satisfy, with the full error-code → HTTP
  status mapping.
- [contracts/health.contract.md](contracts/health.contract.md) — the one exposed endpoint.
- [contracts/internal-contracts.md](contracts/internal-contracts.md) — the TypeScript-level
  interfaces future modules build against (`StorageService`, `BaseRepository`, `TransactionManager`,
  `DomainEventBus`, the decorators).
- [quickstart.md](quickstart.md) — prerequisites, setup, and the runnable checks that prove each of
  the 17 success criteria.

**Post-design constitution re-check**: no new violations. The Constitution Check table above reflects
the final design.

## Next Command

`/speckit-tasks` — to generate the dependency-ordered task list. Expect Phase 1 (Setup) to lead with
enabling TypeScript strict mode and installing Prisma 7, and Phase 2 (Foundational) to be unusually
large for this feature, since the "foundation" *is* the foundational phase.
