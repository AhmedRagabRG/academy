# Research: Academic Catalog

## 1. Canonical Contract Amendment

**Decision**: Preserve every `/api/v1/catalog` path and shared wire convention. Before implementation,
amend the canonical document so Product Types are the three fixed behavioral identities, Business
Categories are Organization-owned but projected through the existing Catalog category contract,
Training Course academic profiles accept `instructorId`, and detail/public projections expose fixed
`supportsBatches`.

**Rationale**: The owner-approved decisions change canonical behavior without requiring new routes.
The constitution forbids implementation until the source-of-truth document reflects them.

**Alternatives considered**: Implement only from the spec (contract violation); add new instructor or
batchability endpoints (unnecessary); silently retain creatable Product Types (contradicts approval).

## 2. Module Ownership and Reference Ports

**Decision**: Catalog owns products, the three Product Type metadata rows, pricing, assignments,
content/media, and lifecycle. Organization owns branches, departments, Business Categories, currency,
study mode, and duration units. Identity owns instructor accounts. Catalog consumes narrow validation,
choice, historical-resolution, and dependency ports; it never imports external repositories. Existing
`/catalog/categories` endpoints act as an authorized Catalog facade over Organization's category port.

**Rationale**: This preserves the frontend contract and declared Organization ownership without
duplicating data or crossing persistence boundaries.

**Alternatives considered**: Duplicate categories in Catalog (two sources of truth); move canonical
routes (frontend break); direct cross-module Prisma queries (constitution violation).

## 3. Fixed Product Types with Editable Metadata

**Decision**: Seed immutable keys `PROFESSIONAL_PROGRAM`, `PROFESSIONAL_DIPLOMA`, and
`TRAINING_COURSE`. Administrators may update names, description, status, field labels, positions, and
required flags only within each identity's closed allowed academic keys. They cannot create a fourth
type, change the key, add unsupported keys, or alter `supportsBatches`. Archive is refused while a
non-archived product references the type.

**Rationale**: Stable discriminants support exhaustive validation and downstream behavior while
maintaining editor presentation through the documented metadata.

**Alternatives considered**: Fully dynamic types (cannot guarantee instructor/batch rules); enums
without rows (cannot edit metadata/history); per-product behavior switches (duplication).

## 4. Unified Product Aggregate

**Decision**: Store product identity/academic scalars on AcademicProduct and normalize pricing,
branch assignments, ordered text, assets, and lifecycle into owned tables. Full create/update commands
replace editable child collections in one service-owned transaction and increment the product version
once. Lifecycle entries are append-only.

**Rationale**: Normalized children provide uniqueness, ordering, dependency queries, and historical
integrity while the aggregate transaction matches the full editor payload.

**Alternatives considered**: One JSON document (weak relational constraints/search); independent child
endpoints (contract mismatch and partial edits); table per Product Type (schema/API duplication).

## 5. Academic Validation and Instructor

**Decision**: A policy selects validation by fixed type key. Programs permit duration, terms,
internship/training/final project/certificate; Diplomas permit duration, sessions, training/certificate;
Courses require positive hours, sessions, and an eligible active `instructorId`. Instructor responses
resolve a display label through Identity but persist only the UUID reference. Other types reject it.

**Rationale**: One product model remains exhaustive and type-safe without copying employee data.

**Alternatives considered**: Free text (no lifecycle identity); cross-module FK (ownership coupling);
polymorphic JSON (weak validation); separate instructor entity (outside scope).

## 6. Money Persistence and Validation

**Decision**: Accept/return canonical Money objects. Validate one currency and precision across the
profile, convert decimal strings to bigint minor units at the boundary, and store each named amount as
`BigInt` plus profile currency/precision. All amounts are non-negative; numbers are rejected.

**Rationale**: Integer arithmetic prevents rounding and preserves exact canonical serialization.

**Alternatives considered**: PostgreSQL decimal (exact but risks implicit number conversion); JSON
Money objects (weak query/sort); floating point (constitution violation).

## 7. Product Code and Aggregate Concurrency

**Decision**: Normalize code uppercase and reserve it globally across statuses. Every update filters by
`expectedVersion`. First activation sets `codeLockedAt`, changes status, increments once, and appends
one lifecycle entry in a transaction. Code changes after locking raise `CODE_LOCKED` even when the
submitted code differs only by normalization.

**Rationale**: This prevents lost updates and activation/edit races while preserving identifiers used
by future modules.

**Alternatives considered**: Lock on creation (more restrictive than contract); release archived
codes (historical ambiguity); timestamps as concurrency tokens (weaker semantics).

## 8. Branch Scope and Assignments

**Decision**: Persist unique `(productId,branchId,role)` assignments for registration/study/general.
Validate active branches through Organization. Product lists are visible only when at least one
assigned branch intersects caller scope unless organization-wide; out-of-scope detail is 403. A ready
product needs at least one active registration assignment.

**Rationale**: It follows platform scoping and supports eligibility without duplicating branch data.

**Alternatives considered**: Store branch arrays (weak constraints); scope only writes (data leak);
require all roles on every branch (not required).

## 9. Ordered Content and Assets

**Decision**: Ordered FAQ/requirement/document rows use a content kind and unique positive position per
kind. Assets store safe descriptor fields plus kind/label/position; enforce one primary, gallery max 8,
MIME/size policy, safe URL, and unique position per kind. Uploaded bytes remain Storage-owned.

**Rationale**: One normalized pattern avoids multiple near-identical tables while retaining database
integrity and path-free responses.

**Alternatives considered**: JSON arrays (weak duplicate/order validation); Catalog file operations
(storage violation); separate table for every content kind (duplication).

## 10. Readiness, Lifecycle, and Archival

**Decision**: Compute readiness from current type fields, Money, active dependencies, registration
availability, academic rules, and media/content constraints. Transition policy explicitly allows the
canonical graph and returns field-specific issues. Archive queries downstream dependency ports and is
refused when active references exist. Status and lifecycle append commit atomically; events emit after.

**Rationale**: The same policy powers readiness GET and activation, preventing drift.

**Alternatives considered**: Client readiness (untrusted); duplicated activation checks (drift);
cascade archive (historical breakage).

## 11. Fixed Batchability and Public Snapshots

**Decision**: Derive `supportsBatches` solely from type key: Program true, Diploma/Course false.
Export typed product summary/detail, eligibility, batch capability, and immutable price/config snapshot
services. Consumers store product/version/pricing snapshots at their own business transaction boundary.

**Rationale**: Fixed behavior matches approval, and snapshots prevent later edits from rewriting
historical admissions/enrollment/finance facts.

**Alternatives considered**: Configurable flag (rejected); direct consumer queries (coupling);
Catalog-owned enrollment snapshots (wrong owner).

## 12. Search, Lists, and Disclosure

**Decision**: Persist normalized official/Arabic/English/code search text. Apply array filters and
stable allow-listed sorts; price sorting uses base-price minor units after currency consistency.
Resolve labels server-side and include computed permissions. Never expose paths, employee secrets,
internal Money storage, SQL, or foreign-scope data.

**Rationale**: This meets the frontend and constitution contracts with indexed predictable reads.

**Alternatives considered**: Client filtering (unbounded/stale); arbitrary sort fields (unsafe);
copied labels (drift).

## 13. Video Asset Policy

**Decision**: Treat marketing videos as validated external HTTPS links with label and position, not as
uploaded file descriptors. Primary/gallery images and brochures continue through shared upload and
the published MIME/size limits. Amend the CatalogAsset response/request union so video entries carry
`kind`, `url`, `label`, and `position` without invented file size/MIME values.

**Rationale**: The shared upload policy supports images/documents/PDFs but no video MIME/size contract.
External links satisfy the approved marketing requirement without expanding shared storage scope.

**Alternatives considered**: Guess video upload types/limits (unsafe contract invention); fake file
metadata (misleading); omit videos (spec violation).

## 14. Exact Lifecycle Graph

**Decision**: Allow draft→active/archived; active→hidden/closed/archived; hidden→active/closed/archived;
closed→active/archived; archived is terminal. Every move to active recomputes readiness. Reason is
optional for hide and required for close/archive; code lock never clears.

**Rationale**: This supplies a deterministic graph for all documented actions, permits deliberate
reopening, and prevents archived history from becoming selectable again.

**Alternatives considered**: Treat prose arrows as one-way only (no reactivation despite Activate
action); allow archived restore (contradicts historical terminal semantics); unrestricted transitions.
