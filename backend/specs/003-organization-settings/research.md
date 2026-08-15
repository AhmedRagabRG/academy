# Research: Organization & Settings

## 1. Canonical Contract Amendment

**Decision**: Preserve every documented Organization & Settings path and wire convention. Before
implementation, amend `docs/api-data-requirements.html` for the owner-approved profile PATCH,
configurable lookup administration, department and academic-year `code` fields, lookup/profile
permissions, and academic-term overlap behavior.

**Rationale**: The constitution makes the requirements document authoritative and forbids silent
drift. The feature decisions are approved, but their exact additions must exist in that source before
controllers ship.

**Alternatives considered**: Implement against the spec alone (rejected as a contract-gate failure);
retain read-only profile/static lookups (rejected by the owner's clarified scope).

## 2. Existing Route and List Conventions

**Decision**: Retain `/api/v1`, global envelopes, request `page`/`pageSize`, response `meta.limit`,
default 20, maximum 100, and successful empty over-range pages. Use documented generic management
routes for branches, departments, academic years, and academic terms; keep terms filterable by
`academicYearId`. Static standards remain a bounded `GET /settings/lookups` feed.

**Rationale**: This preserves frontend compatibility and the constitution's pagination binding.

**Alternatives considered**: One new generic master-data endpoint (rejected because it hides
entity-specific validation); unpaginated administration lists (rejected by the constitution).

## 3. Configurable Lookup Contract

**Decision**: Keep static settings standards separate from configurable business data. Add paginated
lookup groups at `/settings/lookup-groups` and value administration at
`/settings/lookups/:groupCode`, with detail, update, status/archive, and atomic reorder operations.
Use `settings.lookups.view|create|update`; status, archive, and reorder share update authority.

**Rationale**: The root feed already supplies closed platform standards. Stable group-code value
paths match the requested routing without breaking that feed or hardcoding business dropdowns.

**Alternatives considered**: Replace the existing lookup feed (breaking); store arbitrary lookup JSON
(weak integrity and concurrency); invent permission keys per group (unbounded catalogue growth).

## 4. Lookup Hierarchy, Uniqueness, and Ordering

**Decision**: Lookup groups have globally normalized unique codes and may identify a parent group.
Values have `(groupId, normalizedCode)` uniqueness, normalized duplicate-label prevention,
non-negative `sortOrder`, and an optional parent value consistent with the configured group
hierarchy. Sort order need not be unique; reads deterministically order by sort order, normalized name,
then ID. Multi-row reorder is transactional and version checked.

**Rationale**: Stable identifiers survive archival, duplicate positions do not make reordering
fragile, and explicit hierarchy supports categories/sub-categories without group-code branches.

**Alternatives considered**: Unique sort positions (collision-heavy); same-group arbitrary trees
(permits invalid taxonomy); cascading archive (large implicit mutations and ambiguous events).

## 5. Lookup Archival and Consumer Semantics

**Decision**: Refuse group archival while non-archived values exist and refuse parent-value archival
while non-archived children exist. Inactive/archived values remain directly resolvable but are absent
or disabled in new-record choices. Codes remain reserved after archival.

**Rationale**: Historical records retain meaning while new data cannot select retired values.

**Alternatives considered**: Cascade archive (hidden multi-record change); release archived codes
(historical ambiguity); physical deletion (prohibited).

## 6. Exclusive Active Academic Year

**Decision**: Enforce at most one active, non-archived year with a PostgreSQL partial unique index.
Activation executes at serializable isolation with bounded retry, version-checks the target,
deactivates the prior year, activates the target, and updates defaults in one transaction. Services
enforce at least one active year after initial configuration and refuse direct deactivation/archive of
the last active year.

**Rationale**: The transaction expresses the business transition while the database constraint closes
concurrency races Prisma cannot model declaratively.

**Alternatives considered**: Unique status column (would permit only one inactive row); service-only
count/update (race-prone); using only a default-year pointer (conflicts with documented year status).

## 7. Academic-Term Date Integrity

**Decision**: Store dates as PostgreSQL `DATE`. Validate `startDate <= endDate`, containment within the
parent year, and no inclusive overlap among sibling terms. Add a GiST exclusion constraint using
`btree_gist` and `daterange(startDate,endDate,'[]')`, including historical terms so archived calendar
truth cannot be contradicted. Services pre-check for field-friendly errors; the constraint handles
concurrent races.

**Rationale**: Inclusive ranges mean a term starting on another term's end date overlaps. A database
constraint is the only reliable concurrent guarantee.

**Alternatives considered**: Service query only (race); expanded per-day rows (unbounded); excluding
archived terms (permits contradictory historical calendars).

## 8. Organization Singleton and Profile Aggregate

**Decision**: Persist one Organization row with an enforced singleton key, immutable legal name/code,
version, and profile scalar fields. Store logo/favicon/cover as nullable safe file-descriptor JSON.
Normalize contacts and social links into ordered child rows. Treat working hours as a profile value
with a documented structured representation. Profile PATCH replaces/merges children atomically and
increments the organization version once.

**Rationale**: The explicit singleton avoids convention-only identity; normalized collections provide
stable IDs, ordering, primary-contact constraints, and clean aggregate validation.

**Alternatives considered**: Fixed UUID only (not enforced); all collections in JSON (weak integrity);
child-specific concurrency versions (poor profile editing experience).

## 9. General Settings Singleton

**Decision**: Store one settings row keyed to Organization with language, time zone, currency,
formats, working days, default branch/year, version, and audit fields. Validate referenced defaults
through Organization repositories and update the aggregate atomically. Year activation synchronizes
the default academic year in the same transaction.

**Rationale**: Operational defaults change independently from public identity but must never contain
ineligible references or disagree with the active year.

**Alternatives considered**: Merge into Organization (unrelated concurrency conflicts); free-form
key/value settings (weak typing and validation).

## 10. Optimistic Concurrency and Transactions

**Decision**: Every update filters by ID and expected version, increments once, and rereads on zero
affected rows to distinguish not-found from `VERSION_CONFLICT`. Multi-record writes use the shared
transaction manager with transaction-aware repositories. Serialization/unique/exclusion failures map
to stable domain errors; failed operations emit no success event.

**Rationale**: This matches existing platform conventions and prevents lost or partial updates.

**Alternatives considered**: Timestamp ETags (weaker semantics); pervasive pessimistic locking
(unnecessary contention); repository-owned transactions (prevents service composition).

## 11. Cross-Module References

**Decision**: Organization validates manager references and Identity dependencies through an exported
Identity public service. Future modules expose equivalent dependency ports. Organization exports
narrow master-data read/resolution services, never repositories.

**Rationale**: Modules may communicate through public services but cannot query one another's tables.

**Alternatives considered**: Cross-module foreign keys/count queries (constitution violation); no
dependency checks (breaks archival rules); duplicating employee data (violates source-of-truth scope).

## 12. Search, Scope, and Disclosure

**Decision**: Persist normalized searchable forms or use equivalent indexed normalization. Apply
branch scope only to branch-owned records, not organization-wide departments/calendar/lookups/profile.
Branch details outside scope use `out-of-scope`. Responses derive labels server-side, include computed
record permissions, and never return paths or client-supplied labels as authoritative.

**Rationale**: This follows the constitution without incorrectly hiding global master data.

**Alternatives considered**: Apply branch filtering to every entity (incorrect); resolve labels in
clients (contract drift); expose filesystem paths (storage violation).
