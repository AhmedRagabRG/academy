<!--
SYNC IMPACT REPORT
==================
Version change: TEMPLATE (unfilled) → 1.0.0
Bump rationale: Initial ratification. The file previously contained only unresolved
placeholder tokens; this is the first concrete constitution, so MAJOR/MINOR/PATCH
semantics start at 1.0.0 rather than describing a delta.

Modified principles (placeholder → concrete):
  [PRINCIPLE_1_NAME] → I. Domain First
  [PRINCIPLE_2_NAME] → II. Modular Architecture
  [PRINCIPLE_3_NAME] → III. API Contract First (NON-NEGOTIABLE)
  [PRINCIPLE_4_NAME] → IV. Service Layer
  [PRINCIPLE_5_NAME] → V. Repository Pattern
  (expanded beyond the 5-slot template to the 20 principles supplied by the project owner:
   VI. Validation, VII. Authorization, VIII. Consistent API Responses, IX. File Storage,
   X. Audit Ready, XI. Transactions, XII. Type Safety, XIII. Error Handling, XIV. Pagination,
   XV. Soft Deletes, XVI. Mock Independence, XVII. Documentation, XVIII. Clean Code,
   XIX. Future Extensibility, XX. Simplicity)

Added sections:
  [SECTION_2_NAME] → "API Contract Bindings (Non-Negotiable)" — concrete wire rules derived
    from docs/api-data-requirements.html, which Principle III designates as source of truth.
  [SECTION_3_NAME] → "Development Workflow & Quality Gates"
  [GOVERNANCE_RULES] → "Governance"

Removed sections: none (template comment scaffolding removed as intended).

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gates filled in
  ✅ .specify/templates/spec-template.md — API contract alignment requirement added
  ✅ .specify/templates/tasks-template.md — layered/principle-driven task categories added
  ✅ README.md — project governance pointer added
  ✅ .claude/skills/speckit-*/SKILL.md — reviewed; no agent-specific (CLAUDE-only) references
     requiring genericization were found

Deferred TODOs:
  TODO(ENVELOPE_CONFIRMATION): docs/api-data-requirements.html §3.1 records an open decision
    between (a) the {success,data,meta} envelope and (b) bare {items,total,page,pageSize,
    totalPages} payloads. This constitution ratifies (a), which is the option the document
    itself assumes and uses in every example. Consequence: the frontend must add the
    unwrapList/unwrap adapter described in §3.1. Confirm with the frontend owner before the
    first list endpoint ships.
  TODO(PAGE_SIZE_NAMING): §3.1 flags that the frontend calls the field `pageSize` while the
    envelope calls it `limit`. This constitution ratifies the document's adapter exactly:
    `pageSize` on the request query string, `limit` inside the response `meta`. Confirm, or
    unify on a single name, before the first list endpoint ships.
-->

# Al-Salam Academy Backend Constitution

## Core Principles

### I. Domain First

The backend MUST be designed around business domains, not CRUD resources.

Business rules MUST live inside the domain layer. A rule MUST NOT be duplicated across
controllers, external services, or client code. Where the same rule is needed in two places,
it MUST be extracted into one owning domain service and called from both.

**Rationale**: The frontend already models this system as eight business domains with their
own facades and error vocabularies. A CRUD-shaped backend would force domain logic upward
into controllers or outward into the client, where it cannot be tested or governed.

### II. Modular Architecture

Each business domain MUST exist as an independent NestJS module.

Each module owns its controllers, services, DTOs, entities, validation, policies,
repositories, and events.

Modules MUST communicate only through public services or domain events. Cross-module database
access is prohibited: a module MUST NOT read or write another module's tables, and MUST NOT
import another module's repositories.

### III. API Contract First (NON-NEGOTIABLE)

`docs/api-data-requirements.html` is the single source of truth for every HTTP endpoint.

Implementation MUST follow the documented endpoint paths, request payloads, response
payloads, pagination format, filtering, sorting, error responses, and naming conventions.

Controllers MUST implement the documented contracts without modification. Any deviation
requires an explicit written request from the project owner and a corresponding amendment to
the requirements document — never a silent divergence in code.

Where the requirements document itself records an open decision, the resolution MUST be
recorded in this constitution (see "API Contract Bindings") before implementation begins.

### IV. Service Layer

Controllers MUST contain no business logic.

A controller is responsible only for: binding and validating the request, enforcing
authorization, calling exactly one service entry point, and formatting the response.

All business logic MUST live inside services. A conditional that encodes a business rule
appearing in a controller is a violation, regardless of its size.

### V. Repository Pattern

Database access MUST NOT occur inside controllers.

Services MUST communicate with the database only through repositories. Repositories are the
only layer permitted to import or call Prisma.

Required call direction:

```text
Controller → Service → Repository → Prisma
```

Skipping a layer, or reversing the direction, is a violation.

### VI. Validation

Every request entering the system MUST be validated.

Structural validation MUST use `class-validator` and `class-transformer` and MUST live in
DTOs. A global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` enabled MUST
reject unknown properties.

Business validation (state transitions, cross-entity invariants, quota and balance rules)
MUST live inside services, never in DTOs.

### VII. Authorization

Every protected endpoint MUST enforce permissions.

Authorization is role-based and permission-key-driven. Permission checks MUST be expressed
through Guards and decorators, never through inline conditionals in controller or service
bodies.

Authorization logic MUST NOT be duplicated. One guard implementation enforces the permission
model for the whole application.

### VIII. Consistent API Responses

All successful responses MUST use one response format. All errors MUST use one error format.

No endpoint may return an ad-hoc JSON structure. The exact shapes are fixed in "API Contract
Bindings" below and are enforced by a global response interceptor and a global exception
filter, not by per-controller assembly.

### IX. File Storage

Uploaded files MUST be stored on the local server and managed through a dedicated storage
service.

Business modules MUST NOT construct, join, or otherwise manipulate filesystem paths. They
receive and persist file descriptors only.

Supported uploads are images, documents, and PDFs.

The storage implementation MUST sit behind an interface so it can be replaced (for example
with object storage) without touching any business module.

### X. Audit Ready

The backend MUST be prepared for audit logging.

Every business operation that creates, transitions, or archives a record MUST emit a domain
event carrying the actor, the target, the operation, and the resulting state.

Audit persistence MAY be added later. Adding it MUST NOT require modifying business logic —
only subscribing to the already-emitted events.

### XI. Transactions

Any business operation affecting more than one entity MUST execute inside a database
transaction.

Partial writes are prohibited. If any step of a multi-entity operation fails, the whole
operation MUST roll back.

Transaction boundaries are owned by the service layer; repositories MUST accept an ambient
transaction client so a service can compose several repository calls atomically.

### XII. Type Safety

TypeScript `strict` mode MUST remain enabled.

`any` is prohibited. Where a type genuinely cannot be expressed, `unknown` MUST be used with
a narrowing guard. A remaining `any` requires an inline comment justifying it and MUST be
raised in review.

DTOs, entities, services, and repositories MUST be fully typed. Implicit `any` from missing
return types is a violation.

### XIII. Error Handling

Unhandled exceptions are prohibited.

Business failures MUST be raised as dedicated exception classes carrying the documented error
code, never as generic `Error` or bare `HttpException` with an ad-hoc message.

A global exception filter MUST translate every exception into the single documented error
envelope. No stack trace, SQL fragment, or internal identifier may reach a client response.

### XIV. Pagination

Every listing endpoint MUST support pagination.

The pagination format is fixed by the requirements document and restated in "API Contract
Bindings". No listing endpoint may return an unbounded result set, including lookups and
dropdown feeds that are exempt from paging — those MUST be bounded closed sets by nature and
MUST be documented as such.

### XV. Soft Deletes

Business entities MUST be archived rather than permanently deleted wherever the domain allows
it.

Archived records MUST remain queryable for reporting and auditing, and MUST be excluded from
default list results unless the caller explicitly asks for them.

### XVI. Mock Independence

Business logic MUST NOT depend on mock data.

Mock or seed implementations MAY exist for development only, MUST sit behind the same
interfaces as the real implementations, and MUST be replaceable without changing any service.

### XVII. Documentation

Every module MUST maintain clear DTOs, explicit validation rules, Swagger documentation for
every endpoint, and meaningful method names.

Swagger MUST document the real response and error shapes, including status codes and error
codes — not just a 200 with a bare type.

Code MUST be understandable without external explanation.

### XVIII. Clean Code

Business code MUST prioritize readability over cleverness.

Duplication MUST be avoided. Composition MUST be preferred over inheritance. Methods MUST
stay small and single-purpose.

### XIX. Future Extensibility

Every module MUST be designed so that future features can be added without modifying existing
business logic. Favor extension over modification.

Adding a new document type, status, permission key, or payment method MUST NOT require
editing an existing service's control flow.

### XX. Simplicity

Implement only the behavior defined in the current specification.

Speculative abstractions, premature optimizations, and features outside the approved scope are
prohibited.

When requirements are unclear, work MUST stop and clarification MUST be requested. Assumptions
MUST NOT be silently encoded into implementation.

## API Contract Bindings (Non-Negotiable)

These bindings are the concrete reading of Principle III. They are derived from
`docs/api-data-requirements.html` and apply to every module without exception.

### Base path and modules

All endpoints are served under `/api/v1`. The system has exactly eight business modules:
Authentication & Session, Organization & Settings, Academic Catalog, Program Batches,
Admissions, Students, Student Finance, and Accounting (Expenses). A Dashboard surface exists
as a read-only projection. No other top-level module may be introduced without an amendment.

### Response envelope

Success responses MUST be `{ "success": true, "data": <payload> }`, with `meta` added for
lists. This ratifies option (a) of requirements §3.1 — see the deferred TODO in the sync
impact report at the top of this file.

List responses MUST carry:

```json
{ "success": true, "data": [], "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 } }
```

The envelope MUST be applied by a single global interceptor. Controllers MUST return bare
payloads.

### Pagination

- Offset pagination on every list. Query parameters are `page` (1-based) and `pageSize`.
- Default `pageSize` is `20`. Maximum `pageSize` is `100` and MUST be enforced server-side.
- An out-of-range page MUST return HTTP 200 with an empty `data` array and correct `meta`.
  It MUST NOT return a 4xx.
- Cursor pagination is permitted only for the two documented timeline reads (Students
  timeline, Student Finance timeline) and uses `{ "items": [], "nextCursor": "…" }`.

### Money

Money MUST be `{ amount: string, currency: string, precision: number }` where `amount` is a
decimal string (e.g. `"18000.00"`), `currency` is ISO 4217, and `precision` is the minor-unit
digit count. Monetary values MUST NOT be serialized as floats anywhere, and arithmetic MUST
be performed in integer minor units.

### Identifiers, dates, and text

- IDs are UUID strings. Numeric IDs are prohibited in any request or response.
- Timestamps are ISO 8601 UTC with milliseconds: `"2026-08-01T10:00:00.000Z"`.
- Calendar dates are date-only: `"2026-10-31"`. A date-only upper bound in a range filter
  MUST be inclusive to the end of that day.
- Arabic is the primary content language. Responses MUST be
  `application/json; charset=utf-8` with unescaped Arabic codepoints.
- Server-side search MUST apply the same normalization the client applies: fold
  `آ أ إ ٱ → ا`, `ى → ي`, `ة → ه`, strip diacritics, and fold Arabic-Indic digits to ASCII.

### Optimistic concurrency

Every persisted business entity MUST carry `version: number`. Every mutating request MUST
carry `expectedVersion: number`. A mismatch MUST return HTTP 409 with code
`VERSION_CONFLICT` and MUST include `currentVersion` as a first-class field on the error
object, not only inside `details`.

### Idempotency

Retries MUST NOT create duplicates for these operation families:

| Operation | Client key |
|---|---|
| Student document upload / replace | `uploadAttemptId` |
| Admission document upload / replace | `idempotencyKey` |
| Expense attachment upload | `uploadAttempt` |
| Raise invoices | natural key `(enrollmentId, purpose)` |
| Student intake from admission | natural key `approvalSnapshotId` |

For expense attachments the idempotency check MUST run *before* the version assert, so a
genuine retry resolves as a no-op rather than a 409.

### Permissions

The permission key set is the documented catalogue of namespaced keys in the form
`module[.resource].action`. The backend MUST recognize exactly that set — no missing keys, no
invented keys.

Detail responses MUST include a computed per-record permissions object. An absent or empty
permissions object blanks the entire action surface of a detail screen and is therefore a
contract violation, not a cosmetic omission.

### Branch scoping

Every list endpoint MUST filter to the caller's `authorizedBranchIds` unless the caller is
`organizationWide`. A detail request for a record outside the caller's scope MUST be refused
with the distinct code `out-of-scope`, never a generic `forbidden`.

### Error envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "<Arabic message>",
    "details": [{ "field": "identity.primaryPhone", "message": "<Arabic message>" }]
  }
}
```

- `details[].field` MUST use dot paths that match the client form field names
  (`identity.primaryPhone`, `pricing.basePrice.amount`).
- `message` MUST be Arabic. Clients switch on `code` and never parse prose, so codes MUST come
  from each module's closed union.
- Status mapping MUST follow the catalogue: validation `422`; authentication `401`;
  authorization and out-of-scope `403`; not found `404`; concurrency, duplicates, invalid
  transitions, readiness gates and in-use conflicts `409`; oversized upload `413`.
- Retryable codes MUST be marked as such, because the UI shows a Retry affordance only for
  those.

### Empty versus unavailable

"No records" is a fact, not a zero. Endpoints that expose `hasNoRecords` MUST set it
explicitly. Summary reads that can fail MUST use the discriminated union
`{state:"available",…} | {state:"unavailable",reason} | {state:"forbidden"}` and MUST NOT
substitute zeros for a failed lookup.

### File uploads

- Three module upload surfaces exist (student documents, admission documents, expense
  attachments) plus one generic `POST /api/v1/files/upload` taking `file` and `purpose`.
- The server MUST re-validate MIME type and size regardless of client-side checks.
- A zero-byte file is the distinct failure `file-unreadable`, not a type or size error.
- Size and type limits MUST be published through the lookups payload so the UI advertises the
  real numbers.
- Oversized uploads return `413 FILE_TOO_LARGE`; unsupported types return
  `422 UNSUPPORTED_FILE_TYPE`.

### Session endpoints

`GET /api/v1/auth/session` MUST return `{ "success": true, "data": null }` when the caller is
unauthenticated. It MUST NOT be a 401 error path — the client types it as
`Promise<EmployeeContext | null>` and a thrown error surfaces as a crash instead of a redirect.

## Development Workflow & Quality Gates

Every change MUST pass these gates before it is considered done:

1. **Contract gate** — the endpoint matches `docs/api-data-requirements.html` in path, method,
   request shape, response shape, and error codes.
2. **Layering gate** — no Prisma import outside a repository; no business logic in a
   controller; no cross-module repository import.
3. **Type gate** — `npm run build` passes under `strict`, with no new `any`.
4. **Lint gate** — `npm run lint` passes.
5. **Validation gate** — every new endpoint has a DTO with `class-validator` rules, and every
   protected endpoint has a permission guard.
6. **Documentation gate** — Swagger reflects the real success and error shapes.
7. **Transaction gate** — every multi-entity write is wrapped in a transaction.

A change that violates a principle MUST NOT be merged on the argument that it is small,
temporary, or will be cleaned up later. Either the change is corrected, or this constitution
is amended first.

## Governance

This constitution supersedes all other development practices for this repository. Where it
conflicts with habit, convenience, or a tool's default scaffolding, this document wins.

**Amendment procedure.** Amendments MUST be proposed as an explicit change to this file,
MUST state the motivating problem, and MUST be approved by the project owner. An amendment
that changes an API contract binding MUST be accompanied by the matching change to
`docs/api-data-requirements.html`; the two MUST NOT drift.

**Versioning policy.** This document uses semantic versioning:

- **MAJOR** — a principle is removed or redefined in a backward-incompatible way, or a
  ratified contract binding changes in a way that breaks existing clients.
- **MINOR** — a new principle or section is added, or existing guidance is materially
  expanded.
- **PATCH** — clarification, wording, or typo fixes that do not change meaning.

**Compliance review.** Every pull request MUST be reviewed against the seven quality gates
above. Any complexity that appears to violate Principle XX MUST be justified in the plan's
Complexity Tracking table or removed. Unresolved `TODO(...)` markers in this file MUST be
closed before the affected area ships.

**Runtime guidance.** `docs/api-data-requirements.html` is the contract reference for all
implementation work. `.specify/templates/plan-template.md` carries the Constitution Check
gates derived from this document.

**Version**: 1.0.0 | **Ratified**: 2026-08-02 | **Last Amended**: 2026-08-02
