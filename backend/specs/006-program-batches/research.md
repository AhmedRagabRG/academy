# Research: Program Batches

## Decision 1 — Dedicated Program Batches Domain Module

**Decision**: Implement `ProgramBatchesModule` as the owning business module. It is a semantic child of Academic Catalog but communicates with Catalog and Organization only through public ports.

**Rationale**: The constitution defines Program Batches as one of eight domains and prohibits cross-module repository access. Batches have their own lifecycle, permissions, financial history, and consumer boundary, so placing them inside Catalog would blur ownership.

**Alternatives considered**:

- Put all batch code under `src/modules/catalog`: rejected because it turns a separate lifecycle domain into a Catalog sub-resource and complicates future Admissions ownership.
- Let the batch repository query Catalog/Organization tables: rejected by the modular architecture gate.

## Decision 2 — Canonical Nested Routes Win Over Illustrative Paths

**Decision**: Retain `/api/v1/programs/:programId/batches` administration routes and `/api/v1/batches/:batchId/*` consumer/history routes from requirements §4.4.

**Rationale**: The frontend and validated specification already bind these exact paths. The input plan's `/products/{productId}/batches` paths were examples, not an approved contract amendment.

**Alternatives considered**:

- `/products/:productId/batches` or `/catalog/products/:productId/batches`: rejected as a breaking contract change.
- Address every batch independently: rejected because administration must prove parent ownership and prevent cross-program disclosure.

## Decision 3 — Relational Aggregate with Immutable Revision Ownership

**Decision**: Persist a ProgramBatch root, branch assignments, complete financial revisions with revision-owned plans/installments/offers, and append-only lifecycle events. Schedule values remain scalars on the root.

**Rationale**: Schedule is one-to-one and always loaded. Revision-owned children allow exact historical reconstruction and database validation without mutating prior commercial agreements.

**Alternatives considered**:

- One large JSON batch document: rejected because uniqueness, ordering, exact value, revision, and dependency constraints become application-only.
- Mutable current financial child rows plus occasional snapshots: rejected because a missed snapshot could retroactively alter Admissions data.

## Decision 4 — Exact Scaled Integers for Money and Percentages

**Decision**: Store amounts and percentage values as scaled integers plus precision. Currency is required for money and absent for percentages. Boundary mappings expose decimal strings.

**Rationale**: This extends Catalog's exact Money decision, avoids floating-point loss, supports deterministic comparisons, and preserves every revision exactly.

**Alternatives considered**:

- JavaScript numbers: rejected because they cannot round-trip all decimal values safely.
- Unscaled text only: rejected because positive/range/arithmetic checks would be weaker and sorting/calculation expensive.
- Database decimal mapped through floating-point: rejected because it can reintroduce unsafe runtime arithmetic.

## Decision 5 — Financial Revisions Are Append-Only Database Records

**Decision**: Every financial edit creates a complete new revision and new revision-owned children, then atomically switches `currentFinancialRevisionId`. Database triggers reject update/delete of revisions, revision children, and lifecycle history.

**Rationale**: Admissions pins a financial revision. Immutability must survive service bugs and future maintenance, not rely only on convention.

**Alternatives considered**:

- Application-only immutability: rejected as insufficient for a financial audit boundary.
- Cascade deletion from archived batches: rejected because batches are never deleted and historical revisions must survive.
- JSON-only revision snapshots: considered viable for display, but rejected as the sole representation because relational constraints and ordered child integrity matter.

## Decision 6 — Persist Maximum Capacity; Derive Everything Else Live

**Decision**: Persist only `maximumStudents`. Obtain `currentStudents` from the enrollment dependency port and derive available seats and state on every relevant read/mutation.

**Rationale**: Admissions will own enrollment truth. Storing a mutable current count in the batch domain creates drift and permits unsafe administrative edits.

**Alternatives considered**:

- Persist a counter on ProgramBatch: rejected because it duplicates enrollment truth.
- Cache the count without reconciliation: rejected because readiness and Admissions eligibility must use current data.

**Fixed state calculation**:

1. `OVER_CAPACITY` when current students exceed maximum.
2. `FULL` when available seats equal zero.
3. `NEARLY_FULL` when available seats are positive and `availableSeats * 10 <= maximumStudents`.
4. `AVAILABLE` otherwise.

Integer multiplication avoids percentage rounding and encodes the clarified, non-configurable 10% rule.

## Decision 7 — Live Enrollment and Dependency Port

**Decision**: Inject a `BATCH_ENROLLMENT_DEPENDENCY_PORT` exposing live current count and active archival dependencies. Until Admissions is installed, a replaceable non-production implementation represents the known empty state; production must refuse startup or return unavailable without an authoritative provider.

**Rationale**: The batch feature must be buildable before Admissions without coupling to mock fixtures or pretending a failure means zero.

**Alternatives considered**:

- Import an Admissions repository later: rejected by domain boundaries.
- Treat unavailable as zero: rejected by the constitution's empty-versus-unavailable rule.
- Store placeholder enrollment rows in Batches: rejected as duplicate ownership.

## Decision 8 — Catalog and Organization Public Ports

**Decision**: Use `CATALOG_PUBLIC_PORT` for program identity/batchability/labels/default pricing and `ORGANIZATION_MASTER_DATA_PORT` for academic years, branches, and `program-intakes`. Add a narrow Organization settings-defaults port for currency/precision.

**Rationale**: Each domain remains the source of truth and can evolve without exposing repositories. Catalog's existing public record already owns fixed batchability.

**Alternatives considered**:

- Duplicate the Professional Program rule in Batches: rejected because Catalog owns type behavior.
- Import `GeneralSettingsService` or Organization repositories: rejected because it exposes internal module implementation.
- Hardcode intake seasons/currency: rejected because both are organization-owned choices.

## Decision 9 — Serializable Aggregate Transactions and Compare-and-Swap

**Decision**: Use existing bounded `runSerializable` transactions. Update the root with `(id, programId, expectedVersion, currentStatus)` compare-and-swap, append revision/history only after a successful root mutation, and rely on unique constraints as final race guards.

**Rationale**: Multi-row creation, replacement, revision numbering, code locking, and lifecycle transitions must have one winner and no orphan history.

**Alternatives considered**:

- Read then update at default isolation: rejected because concurrent transitions/revisions can both pass validation.
- Global application mutex: rejected because it fails across processes.
- Emit events inside transactions: rejected because rolled-back operations could appear successful.

## Decision 10 — Permanent Program-Scoped Code Lock

**Decision**: Normalize codes by trim/uppercase and enforce unique `(programId, code)`. Set `codeLockedAt` once on first registration opening and never clear it.

**Rationale**: The contract permits the same code in another program and requires permanent immutability after first opening. A timestamp gives audit evidence beyond a boolean.

**Alternatives considered**:

- Global code uniqueness: rejected by §4.4.
- Unlock on registration closure: rejected because historical Admissions references require stable identity.
- Boolean only: rejected because it loses when the lock occurred.

## Decision 11 — Shared Pure Readiness, Capacity, and Eligibility Policies

**Decision**: Implement pure capacity/transition functions and one readiness evaluator reused by the readiness endpoint, registration opening, eligibility, and public ports. Eligibility takes an explicit evaluation date.

**Rationale**: A single rule source prevents UI/read/transition drift and makes date-dependent decisions deterministic in tests.

**Alternatives considered**:

- Reimplement checks in each service/controller: rejected by Domain First and testability.
- Use server current time only: rejected because tests and Admissions retries would not be deterministic.

## Decision 12 — Field-Sensitive and Transition-Sensitive Authorization

**Decision**: Keep base endpoint guards, then use one reusable authorization policy to require capacity, pricing, or branch manage permissions only when those sections change. Status actions map to their exact permission, with a distinct correction permission for reopening.

**Rationale**: The existing global guard uses AND semantics; attaching every manage key to aggregate PATCH would over-restrict basic edits. Central diff/action authorization remains reusable and avoids controller business logic.

**Alternatives considered**:

- Require all manage permissions for every update: rejected as incompatible with the permission catalogue's separation of duties.
- Inline permission conditionals in controllers: rejected by the constitution.

## Decision 13 — Stable Public Admissions Boundary

**Decision**: Export `PROGRAM_BATCHES_PUBLIC_PORT` for eligibility, active selection resolution, historical identity, current revision reference, and immutable revision snapshot reads. Admissions never imports the batch repository.

**Rationale**: Admissions requires stable selection data and later batch edits must not mutate consumer-owned snapshots.

**Alternatives considered**:

- Make Admissions call internal HTTP from the same backend: rejected as unnecessary network coupling.
- Give Admissions direct batch table access: rejected by ownership and future evolvability.

## Decision 14 — Verification Strategy

**Decision**: Combine pure unit tests, live PostgreSQL constraint/migration tests, transactional and concurrency integration tests, contract/security E2E tests, public-port boundary tests, and a 10,000-row query scenario.

**Rationale**: The highest risks are domain boundaries, exact money, append-only history, concurrency, and contract drift; compilation-only evidence cannot establish them.

**Alternatives considered**:

- Unit tests only: rejected because constraints and serializable races require PostgreSQL.
- E2E only: rejected because exhaustive date/money/state matrices would be slow and opaque.
