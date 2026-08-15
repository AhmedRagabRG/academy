# Research: Admissions

## Decision 1 — Dedicated Admissions Aggregate Module

**Decision**: Create `AdmissionsModule` with applicant, admissions, documents, readiness, lookup, mapping, event, and public-port subcapabilities.

**Rationale**: Admissions owns a distinct lifecycle, permissions, PII, documents, and enrollment handoff. Existing modules already use controller → service/policy → repository → Prisma.

**Alternatives considered**: Putting Admissions beneath Catalog was rejected because Catalog does not own applicant workflow. Allowing Admissions repositories to query other modules was rejected by module ownership rules.

## Decision 2 — Exact §4.5 Surface, Not Generic CRUD

**Decision**: Implement every canonical admission, duplicate, revision, readiness/history, document, lookup, and export operation. Do not expose DELETE, a cancelled status, a cancellation route, academic-year list filtering, or a separate file-opening-fee field.

**Rationale**: The frontend contract is explicit. The approved clarifications map cancellation to archive, require assignments, retain one notes field, and fold file-opening fees into registration fees.

**Alternatives considered**: A minimal CRUD controller was rejected because it omits the actual workflow. Adding convenient routes/fields was rejected as an unapproved contract migration.

## Decision 3 — Reason-Required Admission Archival

**Decision**: Require a non-empty archive reason for every admission cancellation/archive action and amend the canonical §4.5 status table during implementation.

**Rationale**: This is the user's explicit clarification and supports audit-ready historical cancellation.

**Alternatives considered**: Optional reason follows the old table but contradicts the approved spec. A cancelled state expands the lifecycle and was explicitly rejected.

## Decision 4 — Applicant Duplicate Resolution, Not Hard Uniqueness

**Decision**: Index normalized national ID and phones and detect candidates, but allow explicit `use-existing` or authorized `create-exception` outcomes. Do not enforce unconditional national-ID uniqueness.

**Rationale**: The canonical duplicate workflow permits reviewed exceptions. A hard unique constraint would make that command impossible.

**Alternatives considered**: Unique national ID was rejected despite simple integrity because it conflicts with approved exception handling. Phone uniqueness was rejected because phones can be shared.

## Decision 5 — Required Assignment Snapshot

**Decision**: Require registration/study branches, admissions employee, customer-service employee/manager, department, and lead source at creation; grade is optional. Persist identifiers and resolved labels in the admission snapshot after port validation.

**Rationale**: This matches the frontend command and preserves historical display if master records later deactivate.

**Alternatives considered**: Deferring assignments until submit was explicitly rejected. Direct foreign repository queries were rejected; public reference ports validate current state.

## Decision 6 — Append-Only Academic and Financial Revisions

**Decision**: Keep current pointers on Admission while every selection or financial change inserts a complete immutable revision. Store Money as scaled integer minor units plus currency/precision and expose decimal strings.

**Rationale**: Eligibility and pricing must be reconstructible, and future catalog/batch changes cannot rewrite an applicant's commitment.

**Alternatives considered**: Mutable financial rows and JavaScript floats were rejected for audit and precision risk. A separate file-opening fee was rejected because the contract folds it into registration fees.

## Decision 7 — Snapshot Document Policy and Version Every File

**Decision**: Copy the selected offering policy into immutable requirement rows. Bind one AdmissionDocument per requirement, append file versions and verification decisions, and use current-version pointers.

**Rationale**: Policy and files must remain auditable after catalog changes. Replacement/withdrawal cannot destroy history.

**Alternatives considered**: Reading live Catalog policy was rejected because it changes existing admissions. Overwriting files was rejected because verification history would become invalid.

## Decision 8 — Storage Port with Durable Idempotency and Compensation

**Decision**: Stream uploads through `STORAGE_SERVICE`, signature-check content, persist a PostgreSQL idempotency key, then commit metadata. Remove newly stored bytes if metadata persistence fails.

**Rationale**: LocalStorageService's process-local deduplication does not survive restarts, and filesystem writes cannot share a database transaction.

**Alternatives considered**: Filesystem APIs in the module violate architecture. Database blobs complicate current storage infrastructure. Metadata-first risks durable rows referencing missing content.

## Decision 9 — Serializable Transactions and Compare-and-Swap

**Decision**: Use the existing transaction manager for multi-table writes, require expectedVersion, update only the expected root/status, and rely on unique revision/history/idempotency constraints as race guards.

**Rationale**: Admission actions touch many tables and concurrent reviewers or retries must yield one consistent winner.

**Alternatives considered**: Read-then-write without compare-and-swap and application-only uniqueness were rejected as race-prone.

## Decision 10 — Separate Lifecycle, Timeline, and Domain Events

**Decision**: Persist exact lifecycle transitions separately from a broader immutable timeline. Publish sanitized audit-ready domain events only after commit.

**Rationale**: Lifecycle is a closed projection; timeline covers applicant, assignment, selection, finance, document, decision, notes, and enrollment changes. External event logging must not contain PII.

**Alternatives considered**: One overloaded event JSON feed was rejected because lifecycle contracts and constraints become weak. Logging note/identity content was rejected as a disclosure risk.

## Decision 11 — Readiness and Enrollment Boundary

**Decision**: One readiness evaluator serves submit and approve actions. Approval writes a one-time immutable handoff snapshot. A future Students module consumes it through a bounded idempotent port and acknowledges the external reference.

**Rationale**: The same rules must drive previews and transitions, and Students—not Admissions—owns student creation.

**Alternatives considered**: Duplicated readiness rules risk drift. Direct Student writes violate domain ownership and current scope.

## Decision 12 — Three-Layer Verification

**Decision**: Combine pure unit tests, live PostgreSQL integration/migration/concurrency tests, and E2E contract/security/upload tests, plus 10,000-record scale evidence.

**Rationale**: DTO/policy matrices, database immutability, serializable races, multipart storage, permissions, and PII redaction require different test levels.

**Alternatives considered**: Unit-only cannot prove constraints; E2E-only is too slow and opaque for exhaustive rule matrices.
