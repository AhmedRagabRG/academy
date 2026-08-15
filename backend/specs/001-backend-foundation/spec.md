# Feature Specification: Backend Foundation

**Feature Branch**: `001-backend-foundation`

**Created**: 2026-08-02

**Status**: Ready for Planning

**Input**: User description: "Build the backend foundation for the Education Operations Platform using NestJS. This feature establishes the project's architecture, infrastructure, shared components, authentication foundation, database integration, file storage, API standards, and development tooling. No business modules are implemented in this feature."

## Overview

This feature delivers the load-bearing structure that every future business module plugs into. It
implements no business behaviour and exposes no business endpoint. Its users are the developers who
will build the eight business modules described in `docs/api-data-requirements.html`, and the
operators who will run the service.

The measure of success is negative: after this feature ships, a developer adding an endpoint should
write **no** code for response shaping, error translation, validation wiring, pagination, permission
checking, branch scoping, file persistence, or API documentation. Those concerns are solved once,
here, or they will be re-solved inconsistently eight times.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A developer can run the service and prove it is alive (Priority: P1)

A developer clones the repository, follows the documented setup steps, provides environment
configuration, and starts the service. They call the health endpoint and receive a response
confirming both that the API is serving traffic and that the database connection is live. If the
database is unreachable, the health endpoint says so explicitly rather than reporting healthy.

**Why this priority**: Nothing else can be built or verified until the service starts and reaches
its database. This is the smallest slice that delivers standalone value — it turns an empty
repository into a running, observable service.

**Independent Test**: With a PostgreSQL instance available, run the documented setup and start
commands, then call the health endpoint and confirm it reports both API and database as available.
Stop the database, call it again, and confirm it reports the database as unavailable with a
non-success status.

**Acceptance Scenarios**:

1. **Given** valid environment configuration and a reachable database, **When** the service is
   started and the health endpoint is called, **Then** the response confirms API availability and
   database connectivity.
2. **Given** the database is unreachable, **When** the health endpoint is called, **Then** the
   response reports the database as unavailable and the endpoint does not report overall health.
3. **Given** a required configuration value is missing or malformed, **When** the service starts,
   **Then** startup fails immediately with a message naming the offending variable — the service
   never boots into a half-configured state.
4. **Given** the service has started, **When** a developer reads the startup output, **Then** it
   states the environment, the port, and the API documentation URL.
5. **Given** a fresh empty database, **When** the documented migration and seed commands are run,
   **Then** the schema is current and one administrative account exists with a hashed password.

---

### User Story 2 - Every endpoint speaks one language without its author writing it (Priority: P2)

A developer adds a trivial endpoint to a scratch module. Without adding any serialization, error
handling, or documentation code, the endpoint's success response arrives in the single documented
envelope, its validation failures arrive in the single documented error envelope with field-level
detail, unknown fields in the request body are rejected, and the endpoint appears in the generated
API documentation with its request and response shapes.

**Why this priority**: This is the contract compliance engine. Principle VIII forbids ad-hoc
response shapes, and the only durable way to enforce that is to make the correct shape automatic and
the incorrect shape impossible. Every module built afterwards inherits or violates this.

**Independent Test**: Add a throwaway endpoint that returns a bare object and a second that accepts a
DTO. Confirm the first is wrapped in the success envelope with no envelope code in the controller,
and the second rejects an unknown property and a malformed field with the documented error envelope
and dot-path field names.

**Acceptance Scenarios**:

1. **Given** a controller returning a bare payload, **When** the endpoint is called successfully,
   **Then** the client receives the standard success envelope with the payload nested inside it.
2. **Given** a controller returning a paginated result, **When** a list endpoint is called, **Then**
   the response carries the standard list envelope including total, page, limit, and total pages.
3. **Given** a request body containing a property not declared on the DTO, **When** the request is
   submitted, **Then** it is rejected with the validation error code and status.
4. **Given** a request with two invalid nested fields, **When** it is submitted, **Then** the error
   response lists both, each identified by a dot path matching the client's form field name.
5. **Given** a page number beyond the last page of a list, **When** the list is requested, **Then**
   the response succeeds with an empty collection and correct pagination metadata — not an error.
6. **Given** a requested page size above the maximum, **When** the list is requested, **Then** the
   page size is clamped to the maximum rather than honoured or rejected.
7. **Given** any endpoint exists, **When** the API documentation is opened, **Then** that endpoint is
   listed with its request shape, success shape, and documented error responses, without the
   developer registering it anywhere.

---

### User Story 3 - A developer protects an endpoint by declaring intent, not by writing checks (Priority: P3)

A developer marks an endpoint with a permission requirement using a declaration. Callers without a
valid session are refused as unauthenticated; callers with a session but without the permission are
refused as unauthorized; callers reaching a record outside their authorized branches are refused with
the distinct out-of-scope signal. The developer writes no conditional logic to achieve any of this.

**Why this priority**: Principle VII forbids duplicated authorization logic, and the requirements
document mandates a distinct out-of-scope refusal that differs from a generic refusal. If branch
scoping is not solved in the foundation, all six branch-scoped modules will re-implement it and
drift.

**Independent Test**: Seed an account, verify its password, issue session cookies for it, then
exercise three throwaway endpoints — unprotected, permission-protected, and branch-scoped — with no
cookie, a cookie for an account lacking the permission, a cookie for an account holding it, and a
cookie for an account whose authorized branches exclude the target record. Confirm four distinct,
documented outcomes without any authorization code in the endpoints themselves.

**Acceptance Scenarios**:

1. **Given** no session cookie, **When** a protected endpoint is called, **Then** the caller is
   refused as unauthenticated with the documented code and status.
2. **Given** a valid session whose account lacks the declared permission, **When** the endpoint is
   called, **Then** the caller is refused as unauthorized.
3. **Given** a valid session whose account holds the declared permission, **When** the endpoint is
   called, **Then** the request proceeds.
4. **Given** a valid session whose authorized branches exclude the requested record's branch,
   **When** the record is requested, **Then** the caller is refused with the distinct out-of-scope
   code — never the generic unauthorized code.
5. **Given** a session marked organization-wide, **When** any branch's record is requested, **Then**
   branch scoping does not restrict the caller.
6. **Given** a handler needs the caller's identity, role, permissions, or branch scope, **When** it
   runs, **Then** that context is available to it without re-reading or re-decoding the credential.
7. **Given** a seeded account's plaintext password and its stored hash, **When** verification runs,
   **Then** a correct password verifies and an incorrect one does not — and the plaintext is never
   stored or logged.
8. **Given** an expired access cookie and a valid refresh cookie, **When** the refresh mechanism is
   invoked, **Then** a new access cookie is issued without the caller re-authenticating.
9. **Given** a state-changing request carrying valid session cookies but no valid CSRF token,
   **When** it is submitted, **Then** it is refused — a cookie alone is not sufficient authority to
   mutate state.

---

### User Story 4 - A developer accepts an upload without touching the filesystem (Priority: P4)

A developer accepts a file on an endpoint and hands it to the shared storage service. They receive a
descriptor — identifier, stored name, original name, type, size, and retrievable URL — which they
persist on their own record. They never construct a path, create a directory, or generate a filename.
Files that are too large, of an unsupported type, or empty are refused with their own distinct,
documented outcomes.

**Why this priority**: Principle IX requires storage to be replaceable without touching business
code, which only holds if business code never sees a path. Three module upload surfaces plus one
generic surface depend on this.

**Independent Test**: Upload an accepted file through a throwaway endpoint and confirm a descriptor is
returned and the file is retrievable via the returned URL. Then upload an oversized file, an
unsupported type, and a zero-byte file, confirming three distinct documented refusals.

**Acceptance Scenarios**:

1. **Given** a file within the configured size and type limits, **When** it is submitted, **Then** a
   descriptor is returned and the stored file is retrievable through the descriptor's URL.
2. **Given** two uploads of files with identical original names, **When** both are stored, **Then**
   neither overwrites the other.
3. **Given** a file exceeding the configured size limit, **When** it is submitted, **Then** it is
   refused with the oversized-file code and status.
4. **Given** a file of an unsupported type, **When** it is submitted, **Then** it is refused with the
   unsupported-type code and status, and the response states the accepted types.
5. **Given** a zero-byte file, **When** it is submitted, **Then** it is refused as unreadable — a
   distinct outcome from both size and type refusals.
6. **Given** a client-declared file type that contradicts the file's actual content, **When** it is
   submitted, **Then** the server's own inspection decides the outcome, not the client's claim.
7. **Given** the storage implementation is swapped for a different backing store, **When** business
   code is inspected, **Then** no business code requires modification.

---

### User Story 5 - An operator can trace what the service did and why a request failed (Priority: P5)

An operator watching the service sees each request logged with its method, path, outcome status, and
duration, correlated by a per-request identifier that also appears on any error logged during that
request. Unexpected failures are logged with full internal diagnostic detail while the client
receives only the sanitized standard error envelope.

**Why this priority**: Principle XIII forbids leaking internals to clients, and Principle X requires
the service to be audit-ready. Both are far cheaper to establish before eight modules exist than
after.

**Independent Test**: Issue a successful request and a request that triggers an unexpected failure.
Confirm both are logged with a correlation identifier, that the failure's log carries the diagnostic
detail, and that the client response for the failure contains no stack trace, database text, or
internal identifier.

**Acceptance Scenarios**:

1. **Given** any request, **When** it completes, **Then** a log entry records method, path, status,
   and duration under a correlation identifier.
2. **Given** an unexpected failure during a request, **When** it is handled, **Then** the log carries
   the diagnostic detail and the same correlation identifier as the request entry.
3. **Given** an unexpected failure, **When** the client receives the response, **Then** it is the
   standard error envelope containing no stack trace, database message, query text, or internal
   identifier.
4. **Given** a request carrying credentials, session cookies, or an uploaded file, **When** it is
   logged, **Then** neither the credential values, the cookie values, nor the file contents appear in
   the log output.
5. **Given** a business operation completes, **When** the operation is inspected, **Then** it emits a
   domain event carrying actor, target, operation, and resulting state — recordable later without
   modifying the operation.

---

### Edge Cases

- **Configuration is absent or invalid at startup** — the service must refuse to start and name the
  offending variable, rather than failing later on first use.
- **The database becomes unreachable while the service is running** — in-flight requests must fail
  with the documented database-failure outcome, and the health endpoint must reflect the loss.
- **A database constraint violation surfaces from a write** — it must be translated into the
  documented duplicate or dependency error code, never surfaced as a raw driver error.
- **A multi-step operation fails partway** — every step must roll back; no partial write may persist.
- **Two callers update the same record concurrently** — the second must be refused with the conflict
  outcome carrying the record's current version, not silently overwrite the first.
- **A retried operation carrying an idempotency key arrives twice** — the second must resolve to the
  first's result rather than creating a duplicate or raising a conflict.
- **An unauthenticated caller asks for the session** — the answer must be a successful empty result,
  not an authentication error, because the client treats an error here as a crash rather than a
  redirect to sign-in.
- **A session cookie arrives for an account that has since been archived** — it must be refused as
  unauthenticated; a valid signature is not proof of a currently valid account.
- **A refresh cookie is presented after its stored record was revoked** — it must be refused, which
  is only possible because refresh state is persisted rather than purely stateless.
- **A request arrives from an origin not on the allowed list** — it must be refused before any
  credentialed handling, since cookies would otherwise be attached automatically.
- **The upload directory is missing or not writable** — uploads must fail with a clear server-side
  outcome, and the condition must be detectable at startup rather than on first upload.
- **A route that does not exist is requested** — the response must still use the standard error
  envelope, not the framework's default shape.
- **A request body is malformed beyond parsing** — it must be refused through the standard error
  envelope.
- **Arabic text is submitted and returned** — it must survive the round trip unescaped and unaltered.
- **A date-only upper bound is used in a range filter** — the bound must be inclusive to the end of
  that day, or records dated on the final day silently disappear from results.

## Requirements *(mandatory)*

### Functional Requirements

**Architecture and layering**

- **FR-001**: The codebase MUST be organized into distinct areas for core cross-cutting concerns,
  shared reusable components, database access, file storage, and business modules, with business
  modules added later into a designated location.
- **FR-002**: The architecture MUST enforce the call direction Controller → Service → Repository →
  data access, and MUST provide a base repository abstraction that new modules extend.
- **FR-003**: Database access primitives MUST be reachable only from the repository layer; the
  structure MUST make a violation visible in review rather than plausible-looking.
- **FR-004**: A documented reference module or scaffold MUST demonstrate the required layering so
  future modules have an unambiguous pattern to copy.

**Configuration**

- **FR-005**: All configuration MUST be sourced from environment variables and exposed through a
  single strongly typed accessor; no component may read raw environment values directly.
- **FR-006**: Configuration MUST be validated at startup, and startup MUST fail with a message naming
  the offending variable when a required value is missing or malformed.
- **FR-007**: Configuration MUST cover, at minimum: runtime environment and port, database
  connection, credential signing secrets and lifetimes, cookie attributes (secure flag, same-site
  policy, domain), allowed request origins, upload directory and limits, the public base URL used to
  construct file URLs, and the seeded administrative account's credentials.
- **FR-008**: An example environment file MUST be committed listing every variable with safe
  placeholder values; real secrets MUST NOT be committed.

**Database**

- **FR-009**: The service MUST connect to PostgreSQL through an ORM providing a generated typed
  client, and MUST manage its connection lifecycle with the application lifecycle.
- **FR-010**: A versioned migration workflow MUST exist such that a fresh database can be brought to
  the current schema by a documented command, and such that migrations run in deployment without
  interactive prompts.
- **FR-011**: A seed script MUST exist and MUST be safe to run repeatedly without creating
  duplicates.
- **FR-012**: A transaction mechanism MUST be provided that lets a service compose multiple
  repository calls atomically, with repositories accepting an ambient transaction context.
- **FR-013**: Database errors MUST be translated into the documented error codes — duplicate,
  dependency-missing, dependency-in-use — and MUST NOT reach the client as raw driver output.
- **FR-014**: The base entity conventions MUST include a numeric version field for optimistic
  concurrency and an archival status, so that no module reinvents them.
- **FR-015**: A minimal persistence schema MUST exist for the authentication mechanism only, limited
  to an account record, a role record, and a refresh-credential record. These MUST follow the base
  entity conventions and MUST be designed for extension by the future Users and Roles module rather
  than replacement.
- **FR-016**: No endpoint of any kind may read or write the account, role, or refresh-credential
  records in this feature, other than through the authentication mechanism itself. No create, read,
  update, delete, or list endpoint for them may be exposed.
- **FR-017**: The seed script MUST create one role and one administrative account whose password is
  stored as a hash, using credentials supplied by configuration, so that the authentication and
  authorization mechanisms can be exercised end to end.

**API contract pipeline**

- **FR-018**: All endpoints MUST be served under a versioned base path, applied globally rather than
  repeated per controller.
- **FR-019**: A single global mechanism MUST wrap every successful response in the standard success
  envelope; controllers MUST return bare payloads and MUST NOT construct envelopes.
- **FR-020**: A single global mechanism MUST translate every failure — expected or not — into the
  standard error envelope carrying a code, an Arabic message, and field-level details where
  applicable.
- **FR-021**: Failure detail field identifiers MUST use dot paths matching the client's form field
  names.
- **FR-022**: A shared pagination contract MUST be provided covering request parameters, a default
  page size, an enforced maximum page size, and the standard list metadata; requesting a page beyond
  the last MUST return an empty successful result rather than a failure.
- **FR-023**: A shared cursor-pagination contract MUST be provided for the timeline-style reads that
  require it.
- **FR-024**: Dedicated exception types MUST exist for each documented error category, so business
  code raises a named failure rather than assembling a response.
- **FR-025**: Responses MUST be UTF-8 with Arabic characters unescaped.

**Validation**

- **FR-026**: Request validation MUST be applied globally so that no endpoint can opt out by
  omission.
- **FR-027**: Validation MUST reject undeclared properties rather than ignoring them.
- **FR-028**: Incoming values MUST be transformed to their declared types before a handler runs.
- **FR-029**: Validation failures MUST be rendered through the standard error envelope with the
  documented validation code and status.

**Authentication foundation**

- **FR-030**: The service MUST be able to issue and verify a short-lived access credential and a
  long-lived refresh credential, with independently configurable lifetimes.
- **FR-031**: Both credentials MUST be transported as HTTP-only cookies set and cleared by the
  server. No credential value may be readable by client-side script, and clients MUST NOT be required
  to store or attach credentials themselves.
- **FR-032**: Credential cookies MUST be marked HTTP-only and same-site restricted, MUST be marked
  secure in every non-local environment, and the refresh cookie's path MUST be scoped so it is sent
  only to the refresh operation rather than on every request.
- **FR-033**: When no credential cookie is present, the request MUST resolve to an empty caller
  context rather than an error, so that a session-restore endpoint can later return a successful
  empty result instead of an authentication failure.
- **FR-034**: Passwords MUST be stored only as salted one-way hashes; plaintext MUST never be
  persisted or written to logs.
- **FR-035**: A verified credential MUST populate a request-scoped caller context carrying identity,
  role, permission keys, authorized branches, and the organization-wide flag.
- **FR-036**: Expired, malformed, and tampered credentials MUST each be refused as unauthenticated
  through the standard error envelope.
- **FR-037**: A credential referencing an account that no longer exists or is archived MUST be
  refused as unauthenticated, regardless of the credential's own validity.
- **FR-038**: Refresh credentials MUST be persisted so that an individual credential can be revoked,
  and a presented refresh credential with no valid stored record MUST be refused.
- **FR-039**: A mechanism MUST exist to clear both credential cookies server-side, so that the
  sign-out endpoint delivered later terminates a session rather than merely asking the client to
  forget it.
- **FR-040**: Sign-in, session-restore, sign-out, and refresh *endpoints* are OUT OF SCOPE here; this
  feature delivers only the mechanisms they will use.

**Request-origin and cross-site protection**

- **FR-041**: Because credentials are sent automatically by the browser, every state-changing request
  MUST be protected against cross-site request forgery, and a request failing that check MUST be
  refused through the standard error envelope.
- **FR-042**: Cross-origin access MUST be restricted to an explicitly configured list of origins with
  credentials permitted. A wildcard origin MUST NOT be accepted in combination with credentials.
- **FR-043**: Safe, non-state-changing requests MUST NOT require a cross-site token, so that reads
  and the session-restore call remain simple.

**Authorization foundation**

- **FR-044**: A declarative mechanism MUST exist for marking an endpoint as requiring one or more
  named permission keys, with no imperative permission logic in handlers.
- **FR-045**: A single guard implementation MUST enforce those declarations for the entire
  application.
- **FR-046**: A declarative mechanism MUST exist for marking an endpoint as public, so that protected
  is the default and public is the deliberate exception.
- **FR-047**: The permission key format MUST be the namespaced `module[.resource].action` form used
  by the requirements document, and the mechanism MUST accommodate the full documented catalogue
  without code changes per key.
- **FR-048**: A reusable branch-scoping mechanism MUST be provided that restricts results to the
  caller's authorized branches unless the caller is organization-wide, and that refuses an
  out-of-scope record with the distinct out-of-scope code rather than the generic unauthorized code.
- **FR-049**: A reusable helper MUST exist for computing the per-record permissions object that
  detail responses are required to carry.

**File storage**

- **FR-050**: A dedicated storage service MUST own all file persistence; business code MUST NOT
  construct paths, create directories, or generate filenames.
- **FR-051**: Files MUST be stored on the local filesystem under a configured directory, and the
  storage service MUST sit behind an interface allowing replacement without business-code changes.
- **FR-052**: Storage MUST accept images, documents, and PDFs, with type and size limits configurable
  per upload purpose.
- **FR-053**: Stored files MUST receive collision-proof generated names while the original filename
  is retained in the returned descriptor.
- **FR-054**: The storage service MUST return a descriptor containing identifier, stored name,
  original name, type, size, and a retrievable URL.
- **FR-055**: Stored files MUST be retrievable through the URL in the descriptor.
- **FR-056**: The server MUST validate type and size independently of any client-supplied claim, and
  MUST treat a zero-byte file as a distinct unreadable failure.
- **FR-057**: Upload failures MUST use the documented oversized and unsupported-type codes and
  statuses, with the unsupported-type response stating the accepted types.
- **FR-058**: A reusable idempotency mechanism MUST be provided so that a retried upload carrying the
  same client-supplied key resolves to the already-stored result instead of creating a duplicate.

**API documentation**

- **FR-059**: Interactive API documentation MUST be generated and served, and its availability MUST
  be controllable by environment so it can be disabled in production.
- **FR-060**: Documentation MUST describe the cookie-based authentication scheme, and the
  documentation UI MUST be able to exercise protected endpoints using credentials it has obtained.
- **FR-061**: Endpoints MUST appear in the documentation automatically as modules are added, with no
  central registry to maintain.
- **FR-062**: Documentation MUST show the real envelope-wrapped success shape and the documented
  error shapes, not the bare handler return type.

**Health**

- **FR-063**: A health endpoint MUST be exposed that reports API availability and database
  connectivity as separately identifiable results.
- **FR-064**: The health endpoint MUST report a non-success overall state when a checked dependency
  is unavailable.
- **FR-065**: The health endpoint MUST be reachable without authentication and MUST NOT disclose
  connection strings, credentials, versions, or internal hostnames.

**Logging**

- **FR-066**: Application logging MUST be centralized and configurable by level per environment.
- **FR-067**: Every request MUST be logged with method, path, status, and duration, correlated by a
  per-request identifier.
- **FR-068**: Every unexpected failure MUST be logged with full diagnostic detail under the same
  correlation identifier as its request.
- **FR-069**: Credential values, cookie headers, password fields, and file contents MUST NOT appear
  in logs.
- **FR-070**: Startup MUST log the environment, port, and documentation URL.
- **FR-071**: A domain-event mechanism MUST be provided so business operations can announce actor,
  target, operation, and result for later audit recording without modifying the operation.

**Shared components**

- **FR-072**: Shared components MUST include, at minimum: a base repository, pagination helpers,
  response and error helpers, application-wide constants, and common utilities.
- **FR-073**: Shared utilities MUST include the Arabic text normalization used for search — folding
  alef, yeh, and teh-marbuta variants, stripping diacritics, and folding Arabic-Indic digits to
  ASCII — so server-side search matches client-side expectations.
- **FR-074**: Shared utilities MUST include a money representation as a decimal string with currency
  and precision, with arithmetic performed in integer minor units; floating-point money is
  prohibited.
- **FR-075**: Shared utilities MUST include date-range handling in which a date-only upper bound is
  inclusive to the end of that day.

**Tooling and quality**

- **FR-076**: TypeScript strict mode MUST be enabled and the build MUST pass under it.
- **FR-077**: Linting and formatting MUST be configured and MUST pass on the delivered codebase.
- **FR-078**: A test setup MUST exist capable of exercising the foundation's behaviour end to end.
- **FR-079**: Setup, run, migrate, seed, and test procedures MUST be documented in the repository.

**Scope boundaries**

- **FR-080**: No business module, business endpoint, or business entity may be implemented by this
  feature, beyond the minimal authentication-support schema permitted by FR-015. The only exposed
  endpoint is the health endpoint.

### Key Entities

- **Application Configuration**: The typed, validated set of runtime settings — environment, port,
  database connection, credential secrets and lifetimes, cookie attributes, allowed origins, upload
  directory and limits, public file base URL, seeded administrative credentials. Sourced from the
  environment; the single source for all settings.
- **Account**: The minimal record an authenticating person maps to — identity, sign-in identifier,
  password hash, role reference, branch scope, and status. Deliberately minimal; the Users module
  will extend it, not replace it.
- **Role**: The minimal grouping that carries a set of permission keys. Deliberately minimal; the
  Roles module owns its full lifecycle later.
- **Refresh Credential Record**: The persisted state that makes a long-lived credential revocable —
  its identity, the account it belongs to, its expiry, and whether it has been revoked. Without this,
  sign-out could not truly end a session.
- **Caller Context**: The request-scoped identity of whoever is making the call — identity, role,
  permission keys, authorized branches, organization-wide flag. Produced from a verified credential;
  consumed by guards, scoping, and any handler needing to know who is asking. Empty rather than
  absent when no credential is present.
- **Standard Response Envelope**: The single successful response shape, carrying a success indicator
  and the payload, plus pagination metadata for lists.
- **Standard Error Envelope**: The single failure shape, carrying a machine-readable code, a
  human-readable Arabic message, and optional field-level details keyed by dot path.
- **Pagination Request and Result**: The shared shape of a paged query and its outcome — page, page
  size, total, total pages — plus the cursor variant for timeline reads.
- **File Descriptor**: The record of a stored file — identifier, stored name, original name, type,
  size, retrievable URL. The only representation of a file that business code ever handles.
- **Domain Event**: The announcement of a completed business operation — actor, target, operation,
  resulting state — emitted for later audit recording.

### API Contract Alignment *(mandatory when the feature exposes HTTP endpoints)*

- **Documented endpoints covered**: None. This feature implements no endpoint from
  `docs/api-data-requirements.html`. The single endpoint it exposes — the health endpoint — is
  operational infrastructure requested by the project owner and is not part of the frontend contract.
- **Requirements document sections consumed as binding constraints**: §3.1 response envelope, §3.2
  pagination, §3.3 money, §3.4 identifiers/dates/text and Arabic normalization, §3.5 optimistic
  concurrency, §3.6 idempotency, §3.7 permission key format, §3.8 branch scoping, §3.9 error
  envelope, §4.1 session semantics, §7 file uploads, §8 error catalogue.
- **Contract gaps found and resolved**:
  1. The requirements document never specifies credential transport, while describing session
     restore as a successful empty result rather than an authentication error. **Resolved**: HTTP-only
     cookies for both credentials (FR-031 through FR-033), which satisfies the documented session
     semantics without the client handling credentials at all. Consequence: cross-site request
     forgery protection and a credentialed cross-origin policy become part of this feature
     (FR-041 through FR-043), and the frontend must send credentialed requests.
  2. §7.2 shows an uploaded file's URL on an external CDN host, while the constitution and this
     feature mandate local storage. **Resolved** by assumption A-005: local storage serves files
     under a configurable public base URL, leaving the descriptor shape identical and the host
     swappable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer new to the repository can go from clone to a responding health endpoint in
  under 15 minutes using only the committed documentation, with no undocumented step.
- **SC-002**: Adding a new endpoint requires zero lines of response-envelope, error-translation,
  pagination, or documentation-registration code — verified by adding a sample endpoint and counting.
- **SC-003**: 100% of endpoints — including failures, unknown routes, and unhandled errors — return
  one of exactly two documented response shapes. Verified by a contract test exercising every
  documented status code, with zero exceptions.
- **SC-004**: 100% of the documented error categories in the requirements catalogue have a
  corresponding dedicated exception type that produces the correct code and status.
- **SC-005**: A protected endpoint yields four distinct, correct outcomes across the four caller
  states (no session, session without permission, session with permission, session out of branch
  scope) with zero authorization statements written inside the endpoint.
- **SC-006**: The full credential lifecycle is demonstrable end to end against the seeded account:
  password verifies, session is established, a protected endpoint accepts it, an expired access
  credential is renewed by the refresh credential, and clearing the session causes the same protected
  endpoint to refuse — all without any sign-in endpoint existing.
- **SC-007**: A state-changing request bearing valid session credentials but no valid cross-site
  token is refused, and a request from an unlisted origin is refused before any credentialed
  handling.
- **SC-008**: An upload of each supported category succeeds and is retrievable, while oversized,
  unsupported-type, and zero-byte uploads each produce their own distinct documented refusal — four
  outcomes, four distinct codes.
- **SC-009**: Replacing the storage backend requires changes in exactly one file outside the storage
  area — zero business-code changes.
- **SC-010**: No client-visible failure response contains a stack trace, database message, query
  fragment, file path, or internal identifier — verified across every error path exercised in tests.
- **SC-011**: No log entry contains a password, credential value, or cookie header — verified by
  scanning captured log output from a test run that exercises authentication.
- **SC-012**: Every request appears in the logs with a correlation identifier that also appears on
  any error raised during it, allowing a failure to be traced to its request in one lookup.
- **SC-013**: The service refuses to start when any required configuration value is missing, and the
  failure message names the variable — verified for each required variable.
- **SC-014**: A fresh database reaches the current schema through the documented migration command
  with no manual step, and the seed script run twice produces the same result as run once.
- **SC-015**: The build passes under strict type checking with zero uses of the escape-hatch `any`
  type, and linting passes with zero errors.
- **SC-016**: Arabic text submitted to an endpoint returns byte-identical and unescaped.
- **SC-017**: All fourteen constitution quality gates pass on the delivered codebase.

## Assumptions

Recorded where the description left a gap and a defensible default existed. Each is a decision the
project owner can overturn before planning.

- **A-001**: The requirements document's response envelope (option (a) of §3.1) is the ratified
  contract, per constitution v1.0.0. Success is `{success, data}` with `meta` added for lists.
- **A-002**: Pagination request parameters are `page` and `pageSize`; the response metadata field is
  `limit`, matching the requirements document's adapter exactly. Default page size 20, maximum 100.
- **A-003**: The API base path is `/api/v1`, matching every endpoint in the requirements document.
- **A-004**: The health endpoint is public and unauthenticated, as it must be callable by an uptime
  monitor or orchestrator probe.
- **A-005**: Files are stored locally and served under a configurable public base URL, so the
  descriptor shape matches §7.2 while the host remains swappable. Files are served through the
  application rather than requiring a separate web server.
- **A-006**: Uploaded files are not virus-scanned in this feature. Scanning is a later concern and
  belongs behind the same storage interface.
- **A-007**: The permission catalogue is not seeded by this feature. The foundation supplies the key
  format, the guard, and the decorators; the concrete keys arrive with the Users/Roles module. The
  seeded role carries whatever minimal key set the foundation's own tests require.
- **A-008**: Refresh-credential rotation policy — whether a refresh issues a new refresh credential
  and invalidates the old one — is deferred to the authentication module. This feature supplies
  issuance, verification, persistence, and revocation capability.
- **A-009**: The frontend and backend are treated as separate origins, so credentialed cross-origin
  requests must work. The frontend will need to send credentialed requests; this is a frontend
  consequence of the cookie decision, alongside the response-envelope adapter.
- **A-010**: The seeded administrative account exists to make the mechanism testable. Its credentials
  come from configuration, and it is not a production provisioning path.
- **A-011**: The account and role records are intentionally minimal and will be extended by the
  Users and Roles module through migration, not replaced. If that module needs a materially
  different shape, the migration cost lands there.
- **A-012**: Rate limiting and general security headers remain outside this feature. Cross-site
  request forgery protection and origin restriction are inside it, because the cookie decision makes
  them load-bearing rather than hardening.
- **A-013**: No caching layer is introduced. Constitution Principle XX forbids speculative
  infrastructure.
- **A-014**: Error messages are authored in Arabic, matching the requirements document, which
  provides pre-written Arabic copy for the documented codes.
- **A-015**: PostgreSQL is available to developers locally by whatever means each developer prefers;
  provisioning it is not part of this feature's deliverable.

## Dependencies

- **D-001**: A reachable PostgreSQL instance is required for the service to start healthily, for
  migrations, for seeding, and for the health check to pass.
- **D-002**: `docs/api-data-requirements.html` is the binding contract reference. Changes to it
  invalidate parts of this foundation.
- **D-003**: `.specify/memory/constitution.md` v1.0.0 governs this feature. Its API Contract Bindings
  section is the authority on every wire-level shape referenced above.
- **D-004**: The frontend must send credentialed requests and must be served from an origin on the
  configured allow-list. This is a coordination dependency created by the cookie decision, not a
  blocker for building the foundation.

## Out of Scope

Explicitly excluded, per the project owner's description:

- All business modules: Users, Roles, Permissions Management, Organization & Settings, Academic
  Catalog, Program Batches, Admissions, Students, Student Finance, Accounting, CRM, AI.
- All business endpoints. The health endpoint is the only endpoint delivered.
- The authentication endpoints themselves — sign-in, session restore, sign-out, refresh — which
  consume this foundation's mechanisms but ship with the authentication module.
- Any endpoint touching the account, role, or refresh-credential records. Those three tables exist
  solely so the authentication mechanism is provable; they get no CRUD surface here.
- All other business entities and their database models.
- Deployment infrastructure, containerization, and CI pipeline configuration.
- Frontend changes of any kind, including the response-envelope adapter and the credentialed-request
  configuration noted above.

## Resolved Decisions

Both open questions were answered by the project owner on 2026-08-02.

- **Credential transport (Q1 → option A)**: HTTP-only cookies carry both the access and refresh
  credentials. Encoded in FR-031 through FR-033 and FR-039. This choice pulled cross-site request
  forgery protection and credentialed origin restriction into scope (FR-041 through FR-043), and
  makes the documented session-restore semantics natural rather than something to work around.
- **Minimal auth persistence (Q2 → option B)**: Account, role, and refresh-credential records are
  included, with no CRUD endpoints. Encoded in FR-015 through FR-017. This makes the authentication
  and authorization mechanisms provable end to end within this feature (SC-006), at the cost of
  softening the "no business models" line — mitigated by FR-016's endpoint prohibition and A-011's
  extension-not-replacement commitment.
