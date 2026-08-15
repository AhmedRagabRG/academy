---

description: "Task list for Backend Foundation implementation"
---

# Tasks: Backend Foundation

**Input**: Design documents from `/specs/001-backend-foundation/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Test tasks ARE included. The specification requires them — FR-078 mandates an end-to-end
test setup, and 11 of the 17 success criteria are defined as verifiable only by test
(SC-003 "verified by a contract test", SC-010 "verified across every error path exercised in tests",
SC-011 "verified by scanning captured log output from a test run"). This is not a TDD preference; the
acceptance criteria cannot be met without them.

**Organization**: Tasks are grouped by user story. Your six work packages map onto them as follows —
every item you listed is covered, in a sequence that keeps each story independently testable.

| Your work package | Lands in |
|---|---|
| 1 – Initialize Project Foundation | Phase 1 (Setup) + Phase 3 (US1 health) |
| 2 – Configure Database Layer | Phase 2 (Foundational) |
| 3 – Build Core Infrastructure | Phase 4 (US2) + Phase 7 (US5 logging) |
| 4 – Build Security Foundation | Phase 5 (US3) |
| 5 – Build Storage & Documentation | Phase 6 (US4) + Swagger in Phase 4 (US2) |
| 6 – Validation & Finalization | Phase 8 (Polish) |

Two of your items are re-homed deliberately: **Swagger** sits with US2 because it documents the
response envelope and is meaningless before the envelope exists; **logging** splits — basic startup
logging lands in US1 (an acceptance scenario needs it), structured request logging in US5.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5, mapping to the user stories in spec.md
- File paths are exact and relative to the repository root

## Path Conventions

Single backend project. Source at `src/`, Prisma at `prisma/`, tests at `test/`.

---

## ⚠️ Read before starting

Three things will bite you if you skip them:

1. **T012 is a spike, not a formality.** Prisma 7's error codes are unverified against a driver
   adapter (research D-02). Six later tasks assume `P2002`/`P2003`/`P2025` exist. Do it early — a
   negative result changes `prisma-error.mapper.ts` and nothing else, *if* you find out now.
2. **Prisma 7 ≠ Prisma 6.** Recalled snippets and most tutorials describe v6 and will not work.
   Follow research D-01: driver adapter + `prisma.config.ts` + generated client from an explicit
   output path.
3. **Docker is not installed on this machine** and containerization is listed Out of Scope in
   spec.md. T007 is included because you asked for it, scoped to a dev-database convenience only —
   see Deviations at the end.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Turn the bare NestJS scaffold into the project skeleton the plan describes.

- [X] T001 Install runtime dependencies: `npm i @nestjs/config @nestjs/jwt @nestjs/swagger @nestjs/terminus @prisma/client @prisma/adapter-pg argon2 class-transformer class-validator cookie-parser csrf-csrf nestjs-pino pino-http`
- [X] T002 [P] Install dev dependencies: `npm i -D prisma pino-pretty @types/cookie-parser @types/multer`
- [X] T003 Enable TypeScript strict mode in `tsconfig.json` — set `"strict": true`, remove `noImplicitAny: false`, `strictBindCallApply: false`, `noFallthroughCasesInSwitch: false` (research D-03, FR-076)
- [X] T004 Fix strict-mode fallout in the existing scaffold (`src/main.ts`, `src/app.module.ts`, `src/app.controller.ts`, `src/app.service.ts`) and confirm `npm run build` passes
- [X] T005 [P] Create the directory skeleton from plan.md: `src/config/`, `src/core/{auth,authorization,decorators,exceptions,filters,interceptors,events}/`, `src/shared/{repository,pagination,dto,swagger,types,utils,constants}/`, `src/database/`, `src/storage/`, `src/health/`, `src/modules/` — add `src/modules/.gitkeep`
- [X] T006 [P] Delete the scaffold demo files `src/app.controller.ts`, `src/app.service.ts`, `src/app.controller.spec.ts`; reduce `src/app.module.ts` to module wiring only
- [X] T007 [P] Create `docker-compose.yml` exposing a PostgreSQL 16 service for local development, with a named volume and credentials matching `.env.example` (see Deviations — Docker is unavailable on this machine, so this cannot be verified here)
- [X] T008 [P] Create `.env.example` listing every variable from FR-007 with safe placeholders: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `COOKIE_DOMAIN`, `CORS_ORIGINS`, `UPLOAD_DIR`, `UPLOAD_MAX_BYTES`, `FILES_PUBLIC_BASE_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SWAGGER_ENABLED`
- [X] T009 [P] Add to `.gitignore`: `.env`, `uploads/`, `prisma/generated/`
- [X] T010 [P] Add npm scripts to `package.json`: `prisma:generate`, `prisma:migrate`, `prisma:deploy`, `seed`, and confirm `lint` and `test:e2e` work
- [X] T011 [P] Configure `test/jest-e2e.json` to load `.env.test`, and create `.env.test.example` pointing at a separate `alsalam_test` database (the e2e suite truncates tables — it must never target the dev database)

**Checkpoint**: `npm run build` and `npm run lint` pass on an empty but correctly shaped project.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configuration, database access, and the shared type vocabulary. Everything below depends
on this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database spike — do this first

- [X] T012 **SPIKE**: Verify Prisma 7 error behaviour against a live PostgreSQL database. Write a throwaway script that forces a unique violation, a foreign-key violation, and a missing-record update through a driver-adapter client. Record in `research.md` under D-02 whether `PrismaClientKnownRequestError` carries `P2002`/`P2003`/`P2025`. If it does not, switch T023's implementation to SQLSTATE mapping (`23505`, `23503`) per the documented fallback

### Configuration

- [X] T013 [P] Create `src/config/env.validation.ts` — a `class-validator`-decorated class covering every variable in T008, with a `validate()` function that throws naming the offending variable (FR-006, research D-10)
- [X] T014 [P] Create `src/config/config.types.ts` — typed interfaces for each config namespace (app, database, jwt, cookie, cors, upload, swagger, seed)
- [X] T015 Create `src/config/configuration.ts` — namespaced `registerAs` factories returning the types from T014 (FR-005)
- [X] T016 Wire `ConfigModule.forRoot({ isGlobal: true, validate, load })` in `src/app.module.ts`; confirm a missing required variable aborts startup (FR-006)

### Prisma and the database layer

- [X] T017 Create `prisma.config.ts` at the repository root using `defineConfig` with `experimental: { adapter: true }`, `engine: 'js'`, and an `async adapter()` returning `new PrismaPg({ connectionString })` (research D-01)
- [X] T018 Create `prisma/schema.prisma` — datasource `postgresql`, generator with explicit `output`, the `EntityStatus` enum, and the `Account`, `Role`, `RefreshToken` models exactly as specified in [data-model.md](data-model.md), including unique constraints on `Account.email` and `Role.code` and indexes on `Account.roleId`, `RefreshToken.accountId`, `RefreshToken.expiresAt`
- [X] T019 Generate the initial migration (`npx prisma migrate dev --name initial_foundation`) and commit `prisma/migrations/`
- [X] T020 Create `src/database/prisma.service.ts` — extends the generated `PrismaClient`, constructed with the `PrismaPg` adapter, implementing `OnModuleInit`/`OnModuleDestroy` for connection lifecycle (FR-009)
- [X] T021 [P] Create `src/database/transaction.manager.ts` implementing the `TransactionManager` contract from [contracts/internal-contracts.md](contracts/internal-contracts.md) — `run<T>(work: (tx: Prisma.TransactionClient) => Promise<T>)` (FR-012)
- [X] T022 [P] Create `src/database/prisma-error.mapper.ts` translating database errors to domain exceptions per T012's finding — duplicate, dependency-not-found, dependency-in-use (FR-013)
- [X] T023 Create `src/database/database.module.ts` exporting `PrismaService`, `TransactionManager`, and the error mapper

### Shared type vocabulary

- [X] T024 [P] Create `src/shared/types/money.ts` — the `Money` interface (decimal string, currency, precision) per data-model.md (FR-074)
- [X] T025 [P] Create `src/shared/types/caller-context.ts` — the `CallerContext` interface, including the empty-context constant used when no credential is present (FR-033)
- [X] T026 [P] Create `src/shared/types/file-descriptor.ts` — the `FileDescriptor` interface matching requirements §7.2 (FR-054)
- [X] T027 [P] Create `src/shared/types/pagination.ts` — `PageQuery`, `PageResult<T>`, `CursorResult<T>` (FR-022, FR-023)
- [X] T028 [P] Create `src/shared/constants/index.ts` — `DEFAULT_PAGE_SIZE = 20`, `MAX_PAGE_SIZE = 100`, `API_PREFIX = 'api/v1'`, accepted MIME types, cookie names
- [X] T029 Create `src/shared/repository/base.repository.ts` — the abstract `BaseRepository` from internal-contracts.md with `paginate`, `assertVersion`, `scopeToBranches`, `withTransaction`. **This is the only class outside `src/database/` permitted to hold a `PrismaService`** (FR-002, FR-003)

### Password hashing and seed

- [X] T030 [P] Create `src/core/auth/password.service.ts` — argon2id `hash`/`verify` with parameters from config (FR-034, research D-04). Placed here because the seed script depends on it
- [X] T031 Create `prisma/seed.ts` — idempotent `upsert` of one `Role` (`code: "internal-employee"`) and one `Account` from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, password hashed via T030, per data-model.md (FR-011, FR-017)
- [X] T032 [P] Unit test `test/unit/password.service.spec.ts` — correct password verifies, incorrect does not, plaintext never appears in the hash output (US3 acceptance scenario 7)

**Checkpoint**: The service connects to PostgreSQL, migrations apply to a fresh database, and the seed
runs twice with identical results.

---

## Phase 3: User Story 1 - Run the service and prove it is alive (Priority: P1) 🎯 MVP

**Goal**: A developer can start the service and confirm both API and database are live.

**Independent Test**: Run setup and start commands, call the health endpoint, confirm both checks
report up. Stop the database, call again, confirm it reports down with a non-success status.

### Tests for User Story 1

- [X] T033 [P] [US1] E2e test `test/e2e/health.e2e-spec.ts` — healthy returns 200 with both checks up; response contains no hostname, port, version, credential, or driver text (FR-065)
- [X] T034 [P] [US1] E2e test `test/e2e/config-startup.e2e-spec.ts` — for each required variable, unsetting it aborts startup with a message naming that variable (SC-013)

### Implementation for User Story 1

- [X] T035 [P] [US1] Create `src/health/prisma.health-indicator.ts` — a Terminus `HealthIndicator` issuing `SELECT 1` through `PrismaService` with a timeout, returning a fixed Arabic message on failure (research D-13)
- [X] T036 [US1] Create `src/health/health.controller.ts` — `GET /api/v1/health`, marked `@Public()`, aggregating the api and database indicators per [contracts/health.contract.md](contracts/health.contract.md)
- [X] T037 [US1] Create `src/health/health.module.ts` importing `TerminusModule` and `DatabaseModule`; register in `src/app.module.ts`
- [X] T038 [US1] Set the global API prefix `api/v1` in `src/main.ts` (FR-018)
- [X] T039 [US1] Add startup logging in `src/main.ts` — environment, port, and documentation URL, using the built-in Nest logger for now (replaced by structured logging in US5) (FR-070)
- [X] T040 [US1] Verify quickstart checks 1–3 and 16 pass

**Checkpoint**: The service runs, reports health honestly, and refuses to boot misconfigured. **This is
a shippable MVP** — the repository is a live, observable service.

---

## Phase 4: User Story 2 - Every endpoint speaks one language (Priority: P2)

**Goal**: Envelope, errors, validation, pagination, and documentation all arrive automatically.

**Independent Test**: Add a scratch endpoint returning a bare object and another accepting a DTO.
Confirm the envelope wraps automatically, unknown properties are rejected, and errors carry dot-path
fields — with zero plumbing code in the controller.

### Tests for User Story 2

- [X] T041 [P] [US2] E2e test `test/e2e/envelope.e2e-spec.ts` — success wraps as `{success,data}`; list wraps with `meta{total,page,limit,totalPages}`; **unknown route and malformed JSON body both emerge in the standard error envelope, not the framework default** (SC-003)
- [X] T042 [P] [US2] E2e test `test/e2e/validation.e2e-spec.ts` — undeclared property rejected 422; two invalid nested fields both reported with dot paths (`identity.primaryPhone`) (FR-021)
- [X] T043 [P] [US2] E2e test `test/e2e/pagination.e2e-spec.ts` — defaults 1/20; `pageSize=500` clamps to 100; page 99 of a 7-page set returns 200 with empty data and correct meta, **not a 4xx** (FR-022)
- [X] T044 [P] [US2] Unit test `test/unit/arabic-normalize.spec.ts` — folding cases for `آأإٱ→ا`, `ى→ي`, `ة→ه`, diacritic stripping, Arabic-Indic digit folding (FR-073)

### Implementation for User Story 2

- [X] T045 [P] [US2] Create `src/core/exceptions/` — a base `DomainException` plus one subclass per row of the error-code table in [contracts/envelope.contract.md](contracts/envelope.contract.md): `ValidationException`, `UnauthenticatedException`, `ForbiddenException`, `OutOfScopeException`, `NotFoundException`, `VersionConflictException` (carrying `currentVersion`), `DuplicateException`, `InvalidTransitionException`, `NotReadyException`, `DependencyNotFoundException`, `DependencyInUseException`, `FileTooLargeException`, `UnsupportedFileTypeException`, `FileUnreadableException` (FR-024)
- [X] T046 [US2] Create `src/core/filters/all-exceptions.filter.ts` — the single error-envelope producer. Handles domain exceptions, `HttpException`, validation failures, and unknown errors; emits `{success:false,error:{code,message,details}}`; adds `currentVersion` for conflicts and `limit`/`acceptedTypes` for upload failures; **logs full detail server-side and returns a generic Arabic message for unhandled errors** (FR-020, SC-010)
- [X] T047 [US2] Create `src/core/interceptors/response-envelope.interceptor.ts` — wraps handler returns as `{success:true,data}`; detects `PageResult` and emits `meta` with `pageSize` mapped to `limit` (FR-019, contracts/envelope.contract.md)
- [X] T048 [US2] Register the global `ValidationPipe` in `src/main.ts` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, and an `exceptionFactory` producing dot-path field names (FR-026 to FR-029)
- [X] T049 [US2] Register the filter and interceptor globally in `src/main.ts`; set `charset=utf-8` so Arabic is unescaped (FR-025)
- [X] T050 [P] [US2] Create `src/shared/pagination/pagination.helper.ts` — clamping, offset calculation, `PageResult` construction, over-range handling returning an empty page (FR-022)
- [X] T051 [P] [US2] Create `src/shared/pagination/page-query.dto.ts` — `page`/`pageSize` DTO with `class-validator` bounds and Swagger annotations
- [X] T052 [P] [US2] Create `src/shared/utils/arabic-normalize.ts` — `normalizeArabic` and `normalizeDigits` folding identically to the client (FR-073)
- [X] T053 [P] [US2] Create `src/shared/utils/money.util.ts` — `toMinorUnits`/`fromMinorUnits` using `bigint`; no floating-point arithmetic anywhere (FR-074)
- [X] T054 [P] [US2] Create `src/shared/utils/date-range.util.ts` — `inclusiveEndOfDay` so a date-only upper bound includes that whole day (FR-075)
- [X] T055 [P] [US2] Create `src/shared/utils/idempotency.util.ts` — the reusable key-based resolution helper used by uploads (FR-058)
- [X] T056 [P] [US2] Create `src/shared/dto/` — `ApiResponseDto`, `ApiErrorDto`, `PaginationMetaDto` for Swagger schema generation
- [X] T057 [US2] Create `src/shared/swagger/api-envelope.decorator.ts` — `@ApiEnvelopeResponse(Model)`, `@ApiPaginatedResponse(Model)`, `@ApiErrorResponses(...codes)` using `ApiExtraModels` + `getSchemaPath` + `allOf` (research D-14, FR-062)
- [X] T058 [US2] Configure Swagger in `src/main.ts` — `DocumentBuilder` with cookie auth scheme, served at `/api/docs`, gated by `SWAGGER_ENABLED` (FR-059 to FR-061)
- [X] T059 [US2] Apply the envelope decorators to the health endpoint in `src/health/health.controller.ts` so documentation shows the wrapped shape
- [X] T060 [US2] Add a temporary scratch module at `src/modules/_scratch/` exercising bare return, list return, DTO validation, and a thrown domain exception — **to be deleted in T093**
- [X] T061 [US2] Verify quickstart checks 4–7, 18, and 19 pass

**Checkpoint**: Every response in the system uses one of exactly two shapes, automatically.

---

## Phase 5: User Story 3 - Protect an endpoint by declaring intent (Priority: P3)

**Goal**: Authentication, permissions, and branch scoping, all declarative.

**Independent Test**: Seed an account, issue cookies, and exercise protected and branch-scoped scratch
endpoints across four caller states — expecting four distinct documented outcomes with no
authorization code in the endpoints.

### Tests for User Story 3

- [X] T062 [P] [US3] E2e test `test/e2e/auth-lifecycle.e2e-spec.ts` — the full SC-006 chain: password verifies → cookies issued and `HttpOnly` → protected endpoint accepts → expired access + valid refresh yields a new access cookie → revoked refresh is refused → **archived account's still-valid access token is refused** (FR-037, FR-038)
- [X] T063 [P] [US3] E2e test `test/e2e/authorization.e2e-spec.ts` — the four caller states produce 401, 403 `FORBIDDEN`, 200, and 403 **`out-of-scope`**; assert the *code*, not just the status (SC-005)
- [X] T064 [P] [US3] E2e test `test/e2e/csrf-cors.e2e-spec.ts` — state-changing request without a valid CSRF token is refused; unlisted origin is refused; `GET` remains exempt (SC-007, FR-043)

### Implementation for User Story 3

- [X] T065 [P] [US3] Create `src/core/auth/token.service.ts` — issue/verify access and refresh JWTs via `@nestjs/jwt` with independent TTLs; refresh carries a `jti` matching its stored record (FR-030, research D-05)
- [X] T066 [P] [US3] Create `src/core/auth/refresh-token.repository.ts` extending `BaseRepository` — create, find-valid-by-id, revoke, prune-expired. **Stores a hash of the token, never the token** (data-model.md, FR-038)
- [X] T067 [P] [US3] Create `src/core/auth/cookie.service.ts` — `setCredentialCookies`/`clearCredentialCookies` with `HttpOnly`, configurable `SameSite`/`Secure`, and the refresh cookie's path scoped to the refresh route (FR-031, FR-032, FR-039, research D-06)
- [X] T068 [P] [US3] Create `src/core/auth/account.repository.ts` extending `BaseRepository` — find-active-by-email and find-active-by-id with the role joined
- [X] T069 [US3] Create `src/core/auth/auth.guard.ts` — reads the access cookie, verifies it, **loads the account on every request** so an archived account is refused, and populates `CallerContext`. Resolves to an *empty* context rather than an error when no cookie is present (FR-033, FR-035, FR-037)
- [X] T070 [P] [US3] Create `src/core/decorators/public.decorator.ts`, `require-permissions.decorator.ts`, and `current-caller.decorator.ts` (FR-044, FR-046)
- [X] T071 [US3] Create `src/core/authorization/permissions.guard.ts` — the single guard enforcing `@RequirePermissions` with AND semantics; **protected by default**, `@Public()` the explicit exception (FR-045, FR-046)
- [X] T072 [P] [US3] Create `src/core/authorization/permission-key.ts` — validates the `module[.resource].action` shape without asserting catalogue membership (FR-047, assumption A-007)
- [X] T073 [P] [US3] Create `src/core/authorization/branch-scope.service.ts` — `applyToQuery` filters lists silently; `assertInScope` throws `OutOfScopeException`; `organizationWide` bypasses both (FR-048)
- [X] T074 [P] [US3] Create `src/core/authorization/record-permissions.helper.ts` — computes the per-record permissions object detail responses must carry (FR-049)
- [X] T075 [US3] Register `AuthGuard` and `PermissionsGuard` globally in `src/app.module.ts` via `APP_GUARD`; confirm the health endpoint still resolves as `@Public()`
- [X] T076 [US3] Wire `cookie-parser` in `src/main.ts` **before** any CSRF middleware (order matters — `csrf-csrf` depends on it)
- [X] T077 [US3] Configure `csrf-csrf` `doubleCsrfProtection` as global middleware in `src/main.ts`, exempting `GET`/`HEAD`, and map its rejection to `CSRF_INVALID` through the global filter (FR-041, research D-07)
- [X] T078 [US3] Configure CORS in `src/main.ts` with `credentials: true` and an explicit origin allow-list from config; **reject wildcard-with-credentials outright** (FR-042, research D-08)
- [X] T079 [US3] Create `src/core/auth/auth.module.ts` and `src/core/authorization/authorization.module.ts`; wire into `src/core/core.module.ts`
- [X] T080 [US3] Extend the scratch module from T060 with protected and branch-scoped endpoints for verification
- [X] T081 [US3] Verify quickstart checks 8–10 pass

**Checkpoint**: Authorization is declarative, fails closed, and distinguishes out-of-scope from
forbidden.

---

## Phase 6: User Story 4 - Accept an upload without touching the filesystem (Priority: P4)

**Goal**: File persistence behind one replaceable service.

**Independent Test**: Upload an accepted file and retrieve it via the returned descriptor URL. Then
upload oversized, unsupported-type, and zero-byte files, confirming three distinct refusals.

### Tests for User Story 4

- [X] T082 [P] [US4] E2e test `test/e2e/storage.e2e-spec.ts` — the six-row matrix from quickstart check 11, including a `.pdf`-named file containing PNG bytes (server sniffing wins) and two uploads sharing an original filename (neither overwrites)
- [X] T083 [P] [US4] Unit test `test/unit/file-signature.spec.ts` — magic-byte detection for PDF, JPEG, PNG, and rejection of unknown signatures

### Implementation for User Story 4

- [X] T084 [P] [US4] Create `src/storage/storage.service.interface.ts` — the `StorageService` interface and `STORAGE_SERVICE` injection token (FR-051, contracts/internal-contracts.md)
- [X] T085 [P] [US4] Create `src/storage/file-signature.ts` — table-driven magic-byte sniffing for PDF (`%PDF`), JPEG (`FF D8 FF`), PNG (`89 50 4E 47`); no external dependency (research D-11, FR-056)
- [X] T086 [P] [US4] Create `src/storage/upload.constraints.ts` — per-purpose type and size limits (`catalog-asset`, `organization-logo`, `student-photo`, `student-document`, `admission-document`, `expense-attachment`) sourced from config (FR-052)
- [X] T087 [US4] Create `src/storage/local-storage.service.ts` — the **only** path-aware code in the codebase. Generates collision-proof names, retains the original in the descriptor, validates size and sniffed type, treats zero-byte as `file-unreadable`, and honours an idempotency key (FR-050, FR-053 to FR-058)
- [X] T088 [US4] Configure static serving of `UPLOAD_DIR` under `FILES_PUBLIC_BASE_URL` in `src/main.ts` so descriptors are retrievable **without adding a controller** (FR-055 — see Deviations)
- [X] T089 [US4] Create `src/storage/storage.module.ts` binding `STORAGE_SERVICE` to `LocalStorageService`; ensure `UPLOAD_DIR` existence and writability are checked at startup, not first upload (edge case in spec.md)
- [X] T090 [US4] Add a temporary upload endpoint to the scratch module using `FileInterceptor` with `memoryStorage()` and a size cap (research D-12) — **deleted in T093**
- [X] T091 [US4] Verify quickstart checks 11 and 12 pass

**Checkpoint**: Uploads work, refuse correctly in four distinct ways, and no business code knows a
path exists.

---

## Phase 7: User Story 5 - Trace what the service did (Priority: P5)

**Goal**: Structured, correlated, redacted logging plus audit-ready event emission.

**Independent Test**: Issue a successful request and a failing one. Confirm shared correlation
identifiers, full server-side diagnostics, a sanitized client response, and no credential in any log
line.

### Tests for User Story 5

- [X] T092 [P] [US5] E2e test `test/e2e/logging.e2e-spec.ts` — request and error log entries share a correlation id; the client response for an unhandled failure contains no stack trace, database text, or path; captured log output contains no password, cookie, or authorization value (SC-010, SC-011, SC-012)

### Implementation for User Story 5

- [X] T093 [US5] Configure `nestjs-pino` in `src/app.module.ts` — auto request logging, generated request id, `pino-pretty` in development only, JSON otherwise (FR-066, FR-067, research D-09)
- [X] T094 [US5] Configure pino `redact` paths for `req.headers.cookie`, `req.headers.authorization`, `*.password`, `*.passwordHash`, `*.token` (FR-069)
- [X] T095 [US5] Wire the correlation id into `src/core/filters/all-exceptions.filter.ts` so an error log carries the same identifier as its request entry (FR-068)
- [X] T096 [P] [US5] Create `src/core/events/domain-event.bus.ts` implementing the `DomainEventBus` contract — emit only, **no subscriber registered** (FR-071, Principle X)
- [X] T097 [US5] Verify quickstart checks 13 and 14 pass

**Checkpoint**: Every request is traceable and no credential has ever been written to a log.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Your work package 6 — architecture review, cleanup, and final gates.

- [X] T098 **Delete all scratch code**: remove `src/modules/_scratch/` entirely and confirm `src/modules/` contains only `.gitkeep` (FR-080)
- [X] T099 Run the layering audit from quickstart check 15 — `grep -rln "PrismaService\|prisma\." src/ --include=*.ts | grep -vE "src/database/|repository"` must return nothing (Principle V)
- [X] T100 Run the storage audit from quickstart check 12 — `grep -rn "from 'fs'\|from 'node:fs'\|path.join" src/ --include=*.ts | grep -v "src/storage/"` must return nothing (Principle IX)
- [X] T101 Run the type audit — `grep -rn ": any\|<any>\|as any" src/ --include=*.ts` must return nothing, or each hit carries an inline justification (Principle XII, SC-015)
- [X] T102 [P] Verify every endpoint carries a Swagger envelope decorator and its documented error responses (FR-062)
- [X] T103 [P] Prune unused dependencies from `package.json`; confirm nothing installed in T001/T002 went unused
- [X] T104 [P] Write the reference module pattern into `src/modules/README.md` — the layering a new module must follow, with the four-file skeleton (controller, service, repository, DTOs) as documentation, **not working code** (FR-004)
- [X] T105 [P] Replace the stock NestJS content in `README.md` with real setup, run, migrate, seed, and test procedures (FR-079)
- [X] T106 Run the full quickstart — all 19 checks
- [X] T107 Verify all 14 constitution gates in [plan.md](plan.md) Constitution Check, and update any that shifted during implementation
- [X] T108 Final gate: `npm run build && npm run lint && npm run test && npm run test:e2e` all green

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup — **blocks every user story**
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on Foundational. Independent of US1, though US1 first gives a running service to test against
- **US3 (Phase 5)**: depends on Foundational **and US2** — the guards raise domain exceptions that only US2's filter can render
- **US4 (Phase 6)**: depends on Foundational **and US2** — same reason
- **US5 (Phase 7)**: depends on US2 (correlation id wires into US2's filter)
- **Polish (Phase 8)**: depends on all desired stories

### Honest note on story independence

The template's ideal is fully independent stories. That does not hold cleanly here, and pretending
otherwise would produce a misleading plan: **US3, US4, and US5 all depend on US2's error envelope**,
because a guard or storage service that raises an exception no filter can render produces a raw
framework error. This is inherent to foundation work — the shared pipeline is genuinely shared.

US1 and US2 *are* independent of each other and can proceed in parallel after Phase 2.

### Critical path

```
Setup → Foundational (T012 spike first) → US2 → US3 → Polish
                                       ↘ US4
                                       ↘ US5
                    → US1 (parallel with US2)
```

### Within each story

- Tests before implementation where written first
- Types before repositories
- Repositories before services
- Services before controllers — never the reverse (Principle V)

---

## Parallel Opportunities

**Phase 1** — T002, T005, T006, T007, T008, T009, T010, T011 can all run together after T001.

**Phase 2** — three independent clusters after T012:
- Config: T013, T014 (then T015 → T016)
- Shared types: T024, T025, T026, T027, T028 all in parallel
- Prisma: T017 → T018 → T019 → T020, then T021 and T022 in parallel

**Phase 4** — the largest parallel block in the project:
```bash
# All independent files, no shared state:
T045 (exceptions)  T050 (pagination helper)  T052 (arabic)
T053 (money)       T054 (date-range)         T055 (idempotency)
T056 (swagger DTOs)
```

**Phase 5** — T065, T066, T067, T068 in parallel, then T069 (needs all four); T070, T072, T073, T074 in parallel.

**Phase 6** — T084, T085, T086 in parallel, then T087.

**Test tasks** within any phase are all `[P]` — different files, no shared state.

---

## Implementation Strategy

### MVP first

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1)
2. **Stop and validate**: the service runs, health reports honestly, misconfiguration aborts startup
3. This is genuinely shippable — a live, observable service on real infrastructure

### Incremental delivery

| Increment | Delivers |
|---|---|
| + US2 | Every future endpoint inherits the contract pipeline. **The highest-leverage increment** |
| + US3 | Endpoints can be protected; business modules can start |
| + US4 | Upload-bearing modules unblocked |
| + US5 | Production-grade observability |
| + Polish | Audits pass, scratch code gone, docs real |

**Recommended stopping point before starting business modules**: end of US3. US4 and US5 can land in
parallel with the first business module if schedule pressure demands it — though shipping a module
before US5 means debugging it without correlated logs.

---

## Deviations from spec.md

Two items in this task list are not what the spec says. Both are deliberate and neither was decided
silently.

**D-1 — Docker (T007)**: spec.md lists containerization under Out of Scope, but your work package 1
asks for Docker support. Your instruction is newer, so it is included — scoped narrowly to a
`docker-compose.yml` providing a local PostgreSQL for development. It is **not** an application
Dockerfile, deployment manifest, or CI configuration; those remain out of scope. Note that Docker is
not installed on this machine, so T007 cannot be verified here and the local Homebrew PostgreSQL
remains the fallback path in quickstart.md.

**D-2 — Static file serving (T088)**: FR-055 requires stored files to be retrievable via the
descriptor URL, while FR-080 permits only the health endpoint. These conflict on a literal reading.
Resolved by serving `UPLOAD_DIR` as static assets rather than adding a controller — files become
retrievable without introducing an endpoint. If you would rather have an explicit
`GET /api/v1/files/:id` controller with permission checks, say so: it is the more controllable design
and the right call if uploaded documents should not be world-readable to anyone holding a URL. **For
student documents and expense attachments, that is probably the correct concern** — but it is a
scope decision, not one I should make inside a task list.

---

## Notes

- `[P]` tasks touch different files and share no state
- Every task names an exact file path
- Commit after each task or logical group
- The scratch module (T060, T080, T090) is a verification scaffold and **must not survive T098**
- Do not let `Account`/`Role` acquire CRUD services during US3 — FR-016 is the fence (plan.md C-1)
- Do not let `src/shared/utils/` become a junk drawer — only the four utilities the spec names
