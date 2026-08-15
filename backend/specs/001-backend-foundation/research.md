# Phase 0 Research: Backend Foundation

**Date**: 2026-08-02 | **Plan**: [plan.md](plan.md)

Sixteen decisions. Each records what was chosen, why, and what was rejected. Versions were verified
against the npm registry on 2026-08-02; library behaviour was checked against current upstream
documentation rather than recalled.

---

## D-01: Prisma major version — **Prisma 7.9.1 with `@prisma/adapter-pg`**

**Decision**: Use Prisma 7 (current: 7.9.1) with the PostgreSQL driver adapter and a
`prisma.config.ts`.

**Rationale**: Prisma 7 no longer builds a client from a connection string alone. `PrismaClient`
requires either a driver adapter or an Accelerate URL; without one it throws
`PrismaClientInitializationError` with code `P2038`. Configuration moves to `prisma.config.ts` using
`defineConfig({ experimental: { adapter: true }, engine: 'js', async adapter() { ... } })`. Starting
on the current major avoids an upgrade later, once eight modules of queries exist and the migration
surface is at its largest.

**Consequences the plan must absorb**:
- Extra dependency `@prisma/adapter-pg` and a root `prisma.config.ts`.
- The generated client goes to an explicit `output` path and is imported from there, not from
  `@prisma/client` by convention.
- Most Prisma tutorials and LLM-recalled snippets describe v6 and will be wrong. Implementation must
  follow the v7 adapter pattern.

**Alternatives considered**:
- **Prisma 6 (6.19.x)** — far more documented patterns, no adapter ceremony, and every NestJS+Prisma
  guide applies directly. Rejected as the default because it starts the project a major version
  behind on the single hardest dependency to move later. This is a *cheap* decision to reverse today
  and an expensive one to reverse in six months; if the owner prefers the better-trodden path, now is
  the moment to say so.
- **TypeORM / Drizzle / Kysely** — not considered. Constitution V names Prisma.

---

## D-02: Prisma error translation — **verify P-codes against a live database first** ⚠️

**Decision**: Implement `prisma-error.mapper.ts` translating `P2002` (unique violation) →
duplicate exception, `P2003` (foreign key violation) → dependency exception, `P2025` (record not
found) → not-found exception, per FR-013. **Verify empirically in the first implementation task** that
Prisma 7's driver-adapter engine still raises `PrismaClientKnownRequestError` carrying these codes.

**Implementation verification (2026-08-02)**: confirmed against local PostgreSQL 14 using Prisma
7.9.1 with `@prisma/adapter-pg`. Forced unique, foreign-key, and missing-record update failures
reported `P2002`, `P2003`, and `P2025` respectively. The SQLSTATE fallback is not required.

**Rationale**: FR-013 forbids raw driver output reaching clients, and the whole duplicate/dependency
half of the error catalogue depends on these codes being available. Prisma's own documentation notes
that its newer experimental architecture surfaces a generic `SqlQueryError` lacking specific codes
and model metadata. That note describes `prisma-next`, a separate project — not Prisma 7 ORM — so the
codes are *expected* to hold. But "expected" is not "verified", and this is load-bearing.

**Fallback if the codes do not survive**: read the underlying PostgreSQL `SQLSTATE` from the adapter's
error cause (`23505` unique, `23503` foreign key) and map on that instead. Slightly lower-level, fully
deterministic, and independent of Prisma's error modelling.

**Alternatives considered**: Catching at the repository level per query and translating by hand.
Rejected — it duplicates translation logic across every repository, violating Principle XVIII.

---

## D-03: TypeScript strict mode — **enable fully, as the first task**

**Decision**: Set `"strict": true` in `tsconfig.json` and remove the three opt-outs currently present:
`noImplicitAny: false`, `strictBindCallApply: false`, `noFallthroughCasesInSwitch: false`.

**Rationale**: The existing config sets only `strictNullChecks`. Constitution XII and FR-076 require
full strict mode. The scaffold is five files, so the migration cost is near zero now and grows with
every file added.

**Known friction**: `strictPropertyInitialization` conflicts with the DTO and entity class-field style
that `class-validator` requires. The standard resolutions are the definite-assignment assertion
(`field!: string`) on DTO properties, or `declare` for Prisma-derived types. This is a deliberate,
narrow exception to the "avoid non-null assertions" guidance — it applies to DTO declarations only,
never to runtime value access.

**Alternatives considered**: Enabling strict flags incrementally. Rejected — partial strict is the
state we are already in, and it is exactly what let the gap go unnoticed.

---

## D-04: Password hashing — **argon2id via `argon2` (0.45.1)**

**Decision**: `argon2` with the `argon2id` variant, parameters from configuration with
OWASP-aligned defaults.

**Rationale**: Argon2id is the current first-choice recommendation for new password storage,
resistant to both GPU and side-channel attack, and is the winner of the Password Hashing Competition.
It has no 72-byte input truncation limit.

**Alternatives considered**:
- **bcrypt** — still acceptable and more ubiquitous, but silently truncates input beyond 72 bytes and
  has weaker memory-hardness. Rejected for a greenfield system with no legacy hashes to match.
- **scrypt (Node built-in)** — zero dependencies, but parameter tuning is more error-prone and it is
  less commonly reviewed in this role.

**Note**: `argon2` is a native module requiring a build toolchain or a prebuilt binary. If that causes
friction in the eventual deployment environment, `@node-rs/argon2` is a drop-in Rust-backed
alternative.

---

## D-05: JWT and the auth guard — **`@nestjs/jwt` + a custom cookie-reading guard, no Passport**

**Decision**: Use `@nestjs/jwt` for signing and verification, and write a plain `AuthGuard` that reads
the access token from the request cookie, verifies it, loads the account, and populates the caller
context.

**Rationale**: Passport's value is its strategy ecosystem for many auth mechanisms. We have exactly
one mechanism, and it is a cookie we control. `passport-jwt` would add two dependencies, a strategy
class, and an extractor configuration to accomplish what fifteen lines of guard does directly and
more legibly. Constitution XVIII prefers readability; Principle XX forbids speculative abstraction.

**Alternatives considered**:
- **`@nestjs/passport` + `passport-jwt`** — the more conventional NestJS choice and better-documented.
  Rejected as ceremony for a single strategy. Revisit if SSO or OAuth is ever added, at which point
  Passport earns its place.

**Design point**: The guard must load the account on each request to satisfy FR-037 (an archived
account's still-valid token must be refused). This means one indexed lookup per authenticated
request — an accepted, deliberate cost, since the alternative is that revoking access does not
actually revoke access until the token expires.

---

## D-06: Cookie transport specifics

**Decision**:

| Cookie | Contents | Attributes |
|---|---|---|
| `access_token` | Short-lived JWT | `HttpOnly`, `SameSite=Lax`, `Secure` (non-local), `Path=/api/v1` |
| `refresh_token` | Long-lived JWT, with a matching database record | `HttpOnly`, `SameSite=Lax`, `Secure` (non-local), `Path=/api/v1/auth/refresh` |

**Rationale**: `HttpOnly` puts the credential out of reach of script, which is the entire point of the
owner's choice. Scoping the refresh cookie's path means it is not transmitted on every ordinary
request, shrinking its exposure. `SameSite=Lax` blocks the cross-site POST that CSRF depends on while
still permitting ordinary top-level navigation to the app.

**`SameSite=Lax` vs `None`**: `Lax` is correct when the browser treats the frontend and API as the
same site (e.g. `app.example.com` and `api.example.com` share `example.com`). If the frontend is
deployed on a genuinely different registrable domain, these cookies will not be sent and the setting
must become `SameSite=None; Secure`. **This is deployment-topology dependent and must be a
configuration value, not a constant** — FR-007 already requires the same-site policy to be
configurable.

**`Secure` in local development**: local HTTP cannot carry `Secure` cookies, so the flag is
configuration-driven and defaults to on everywhere except the local environment.

---

## D-07: CSRF protection — **`csrf-csrf` (4.0.3), double-submit cookie**

**Decision**: Register `doubleCsrfProtection` as global middleware, after `cookie-parser`.

**Rationale**: This is the approach NestJS documents in its own security guide for Express
applications, which settles the synchronizer-vs-double-submit question with the framework's own
answer. Double-submit is stateless — no server-side session store — which suits a JWT-cookie design.
`csurf` is deprecated and unmaintained; `csrf-csrf` is its documented successor.

**Scope**: State-changing methods only (`POST`, `PUT`, `PATCH`, `DELETE`). `GET` and `HEAD` are
exempt, satisfying FR-043 and keeping the session-restore call simple.

**Frontend consequence**: the client must read the CSRF token and echo it in a request header. This is
additional frontend work beyond the envelope adapter, and is recorded in the spec as dependency
D-004.

**Alternatives considered**:
- **Synchronizer token pattern** — requires server-side session state, which this design deliberately
  avoids.
- **Relying on `SameSite=Lax` alone** — tempting, and genuinely blocks the classic cross-site form
  POST. Rejected as sole defence: same-site enforcement varies across browser versions, and defence
  in depth is warranted for credentials that ride automatically on every request.

---

## D-08: CORS — **explicit origin allow-list with credentials enabled**

**Decision**: Configure CORS with `credentials: true` and an explicit origin list read from
configuration. Reject wildcard origins outright.

**Rationale**: `Access-Control-Allow-Origin: *` is specified to be incompatible with credentialed
requests, and the browser will refuse the combination — so a wildcard is not merely unsafe here, it is
non-functional. FR-042 encodes this.

---

## D-09: Logging — **`nestjs-pino` (4.6.1)**

**Decision**: `nestjs-pino` wrapping `pino-http`, with automatic request-id generation, configured
redaction paths, and `pino-pretty` in development only.

**Rationale**: Satisfies FR-067 (per-request method/path/status/duration) and FR-068 (correlation
identifier shared between request and error logs) largely out of the box — `pino-http` assigns a
request id and logs completion automatically. Structured JSON output is what any future log
aggregator wants. Pino's `redact` option directly implements FR-069: `req.headers.cookie`,
`req.headers.authorization`, and `*.password` are redacted at the serializer, so a credential cannot
leak through a careless log call.

**Alternatives considered**:
- **Built-in NestJS `Logger`** — zero dependencies, but no structured output, no request correlation,
  and no redaction. It would meet the letter of FR-066 and fail FR-067 through FR-069.
- **Winston** — capable and configurable, but slower and requires more assembly for request logging.

---

## D-10: Configuration validation — **`class-validator` (not Zod)**

**Decision**: Validate environment variables with a `class-validator`-decorated class, wired into
`ConfigModule.forRoot({ validate })`, exposed through typed namespaced config factories.

**Rationale**: Constitution VI mandates `class-validator` for request DTOs. Introducing Zod for
environment validation would put two validation libraries with two mental models in one codebase for
no gain. One library, one idiom.

**Alternatives considered**: Zod (better inference, nicer errors) and Joi (Nest's other documented
option). Both rejected on consistency grounds, not capability.

---

## D-11: File type detection — **in-house magic-byte signature check**

**Decision**: Write a small `file-signature.ts` that inspects leading bytes for the four types the
requirements document actually permits: PDF (`%PDF`), JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), and
where needed the common document containers.

**Rationale**: FR-056 requires the server to decide type from content rather than from the client's
claim. The obvious dependency, `file-type` (current 22.0.1), is **pure ESM** — importing it from a
CommonJS Nest build requires dynamic `import()` gymnastics that add more complexity than the check
itself. Four signatures is roughly twenty lines of table-driven code with no dependency, no ESM
interop problem, and no supply-chain surface.

**Alternatives considered**:
- **`file-type` package** — correct and exhaustive across hundreds of formats. Rejected: we need four,
  and the ESM/CJS friction outweighs the benefit. Reconsider if the accepted type list ever grows
  substantially.
- **Trusting the client-declared MIME type** — rejected; FR-056 forbids it, and it is trivially
  spoofed.

---

## D-12: Upload handling — **Multer memory storage, service writes to disk**

**Decision**: Accept multipart via `FileInterceptor` with `memoryStorage()`, size-capped at the
configured maximum, then hand the buffer to `StorageService`.

**Rationale**: Multer's disk storage writes the file itself and hands back a path — which would put
path knowledge in the controller layer and violate FR-050. Memory storage keeps the controller
handling an opaque buffer, leaving the storage service as the only path-aware code. Maximum upload
size is 10 MB per the requirements document, so buffering is acceptable.

**Zero-byte detection** (FR-056) happens on the buffer length before any write.

**Alternatives considered**: Streaming to disk via `diskStorage`. Rejected for the layering violation.
Revisit only if upload sizes grow far beyond 10 MB.

---

## D-13: Health checks — **`@nestjs/terminus` (11.1.1) with a custom Prisma indicator**

**Decision**: Use Terminus for the health endpoint, with a hand-written indicator issuing
`SELECT 1` through the Prisma client.

**Rationale**: Terminus supplies the aggregation, status shape, and correct HTTP status on
degradation (FR-064). A custom indicator avoids depending on Terminus's bundled Prisma indicator
matching Prisma 7's adapter-based client.

**Envelope interaction**: Terminus produces its own response body shape, which would collide with the
global success envelope. The health controller therefore returns the Terminus result *through* the
envelope like any other payload, so the two-shapes-only guarantee (SC-003) holds without exception.

---

## D-14: Swagger generic envelope documentation — **custom composite decorator**

**Decision**: Build `@ApiEnvelopeResponse(Model)` and `@ApiPaginatedResponse(Model)` composite
decorators using `@ApiExtraModels` plus `getSchemaPath()` and `allOf` composition.

**Rationale**: The global interceptor wraps responses at runtime, but `@nestjs/swagger` reflects the
handler's declared return type — so without intervention the documentation would show the bare
payload and lie about the wire shape, failing FR-062. A composite decorator is the standard solution
and keeps the wrapping declaration to one line per endpoint.

---

## D-15: Money representation — **decimal string in the domain, `DECIMAL` in the database**

**Decision**: The shared `Money` type is `{ amount: string; currency: string; precision: number }`.
Database columns use `Decimal` (Postgres `NUMERIC`), converted to string at the repository boundary.
Arithmetic converts to integer minor units.

**Rationale**: The requirements document is explicit that money crosses the wire as a decimal string
and never as a float. Prisma's `Decimal` type maps to `Decimal.js` in JS, which must not be allowed to
leak into service code as an object with float-ish semantics — converting at the repository boundary
keeps one representation in the domain.

**Note**: No money column exists yet. This decision governs the shared type and the convention that
future modules inherit.

---

## D-16: Arabic search normalization — **application-side folding utility**

**Decision**: Implement `normalizeArabic` and `normalizeDigits` as pure functions in
`shared/utils/`, mirroring the client's folding exactly: `آ أ إ ٱ → ا`, `ى → ي`, `ة → ه`, strip
diacritics, fold Arabic-Indic digits to ASCII.

**Rationale**: FR-073 requires server-side search to match what users saw against the client's
normalization. Doing the folding in the application keeps one authoritative implementation that can be
unit-tested against the client's own cases.

**Deferred, deliberately**: *how* normalized text is indexed and queried — a generated normalized
column, a Postgres expression index, `unaccent`, or `pg_trgm` — is a search-performance decision that
belongs to the first module that actually searches. Constitution XX forbids building it speculatively.
The foundation ships the folding function only.

---

## Residual Risks

| Risk | Impact | Handling |
|---|---|---|
| Prisma 7 error codes may not carry `P2002`/`P2003`/`P2025` through the driver adapter | FR-013 error translation | Verify in first implementation task; SQLSTATE fallback documented in D-02 |
| Prisma 7 is newer ground; fewer NestJS integration examples exist | Slower implementation, more first-principles work | Accepted knowingly. D-01 records Prisma 6 as a live alternative if the owner prefers |
| `SameSite=Lax` fails if frontend and API are on different registrable domains | Authentication silently non-functional in that topology | Made configurable (FR-007); must be confirmed against the real deployment topology before release |
| `argon2` native build may complicate deployment | Build/deploy friction | `@node-rs/argon2` is a drop-in fallback (D-04) |
