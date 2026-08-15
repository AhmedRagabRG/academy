# Phase 0 Research: Identity & Access Management

**Date**: 2026-08-02 | **Plan**: [plan.md](plan.md)

All specification clarifications are resolved. These decisions cover the remaining technical and
integration choices needed for implementation.

## D-01: Evolve the foundation records in place

**Decision**: Extend the existing `Account`, `Role`, and `RefreshToken` data through migrations.
Retain account and role IDs and migrate each existing `Account.roleId` into one `AccountRole` row
before removing the single-role column.

**Rationale**: The foundation deliberately created provisional authentication records for extension,
not replacement. An in-place migration preserves seeded identities and foreign-key stability.

**Alternatives considered**: New parallel Employee tables (duplicates identity and complicates
tokens); retaining both `roleId` and assignments (creates two competing sources of truth).

## D-02: Explicit many-to-many role and permission relationships

**Decision**: Use explicit `AccountRole` and `RolePermission` relationship records with unique
compound keys. Store permission definitions in `Permission`; remove scalar `permissionKeys` after
backfilling canonical relationships.

**Rationale**: Multiple roles are required now, assignments need queryable dependency checks, and the
permission catalogue is configurable. Explicit relations make uniqueness and role-in-use rules
enforceable without array scans.

**Alternatives considered**: Scalar UUID/key arrays (weak referential integrity and awkward filters);
implicit joins (cannot carry assignment timestamps or future assignment metadata cleanly).

## D-03: Branch and department references remain external IDs

**Decision**: Keep authorized branch IDs as an account scalar UUID array for this release and store
`departmentId` as an optional UUID reference without a database foreign key. Resolve labels through
an Organization public service when available; never query Organization repositories.

**Rationale**: Organization entities are explicitly outside scope and their tables do not yet exist.
The Identity module still needs stable references for frontend contracts and branch scoping.

**Alternatives considered**: Inventing Organization tables (scope violation); denormalized client
labels as source of truth (untrusted and becomes stale); blocking IAM until Organization ships
(unnecessary because UUID references are sufficient).

## D-04: Refresh-token row is the logical session

**Decision**: Evolve `RefreshToken` into the persisted session record while retaining its table/model
identity for migration compatibility. Its UUID is both stable session ID and refresh `jti`. Rotation
updates the token hash and expiry on the same row; access tokens carry the session ID.

**Rationale**: This satisfies stable session inventory, independent revocation, and replay protection
without a redundant Session-to-RefreshToken one-to-one pair. A rotated old token no longer matches
the stored hash.

**Alternatives considered**: A new session row plus many refresh-token rows (valuable for token-family
forensics but unnecessary for current requirements); changing session ID on every refresh (breaks
stable device/session management).

## D-05: Refresh rotation is transactional and replay-safe

**Decision**: Verify the presented refresh JWT, lock/update the matching valid session using its
current hash as a compare condition, issue a replacement with the same session ID, and atomically
store the new hash, expiry, and last activity. A zero-row update is treated as invalid credentials.

**Rationale**: Two concurrent uses of one refresh token cannot both succeed, and a captured old token
fails after rotation.

**Alternatives considered**: Stateless refresh JWTs (logout/revocation is advisory); update without a
hash compare (concurrent replay can mint two valid credentials).

## D-06: Authorization resolves live state on every protected request

**Decision**: Extend the existing auth guard to load the account, active role assignments, active
roles, and permission relationships for each credentialed request. Build `CallerContext` from the
union of active-role permissions and reject a session/account that is revoked, expired, inactive, or
archived.

**Rationale**: The specification requires permission/status changes to apply on the next request.
Embedding permissions only in a long-lived token would violate that requirement.

**Alternatives considered**: Token-only permissions (stale authorization); cache-first resolution
(adds invalidation complexity not justified at current scale).

## D-07: Account status vocabulary remains compatible

**Decision**: Use the platform `active | inactive | archived` API vocabulary. “Suspended” is the
business action that transitions an account to `inactive`; activation transitions `inactive` to
`active`. Archived is terminal within this feature.

**Rationale**: The existing shared enum and frontend settings contract already use those three values.
Adding a fourth persisted status would break the platform-wide entity convention without adding a
distinct behavior.

**Alternatives considered**: Add `SUSPENDED` enum value (contract drift); separate suspension record
(unnecessary unless scheduled/temporary suspensions are later required).

## D-08: Password policy is configurable and centrally enforced

**Decision**: Add configuration for minimum length (default 12) and require at least one letter and
one number. Apply it to create/reset/change operations through one password-policy service. Never log
password DTOs; keep the existing argon2id hashing parameters.

**Rationale**: The spec leaves policy configurable and requires consistent validation. Centralizing
the rule avoids drift between admin and self-service flows.

**Alternatives considered**: Hard-coded rules in each DTO (duplication); maximum-complexity rules
(poor usability without a stated compliance requirement); compromised-password network checks
(external integration is out of scope).

## D-09: Administrative reset accepts a temporary password

**Decision**: `POST /settings/users/:userId/reset-password` accepts `newPassword`,
`confirmPassword`, and `expectedVersion`; it never generates or returns a secret. Success revokes all
target sessions and increments the employee version.

**Rationale**: Returning a generated password would expose a credential in responses/logs. A caller-
supplied temporary secret fits the existing administrative workflow and can be conveyed out of band.

**Alternatives considered**: Email reset links (requires email delivery outside scope); generated
password response (violates secret exposure constraints).

## D-10: Session metadata uses conservative request-header parsing

**Decision**: Derive bounded browser/device labels from the User-Agent header using a small pure
parser with `Unknown browser`/`Unknown device` fallbacks; normalize proxy-aware IP through the
framework's trusted request IP. Store raw user-agent only if bounded and never return it.

**Rationale**: Labels are informational, not security evidence. A new parsing dependency is not
needed for the named browser/device families in acceptance tests.

**Alternatives considered**: Third-party parser (extra dependency and update burden); trusting
client-supplied device names (spoofable and inconsistent).

## D-11: Permission catalogue is canonical data, not control flow

**Decision**: Maintain the exact documented permission catalogue as version-controlled seed data and
persist it idempotently. Labels/descriptions/group ordering are editable data; stable keys cannot be
renamed or invented through this feature. Role assignment validates against active catalogue rows.

**Rationale**: This reconciles configurable definitions with the constitution's closed permission
key set and lets the settings matrix render the full catalogue.

**Alternatives considered**: Hard-coded six-action Cartesian product (known to be wrong); arbitrary
runtime key creation (guards and frontend would disagree).

## D-12: Self-service profile mutation is intentionally narrow

**Decision**: The self-profile update accepts full name, phone, avatar descriptor, and
`expectedVersion`. Email, position, department, roles, branches, organization scope, and status are
administrator-owned. Avatar bytes are uploaded through the foundation file endpoint first.

**Rationale**: It follows the finalized specification and keeps file handling out of Identity.

**Alternatives considered**: Multipart profile endpoint (duplicates storage); allowing email changes
(requires separate verification and session-security rules not specified).

## D-13: Events emit only after committed state

**Decision**: Services complete database transactions, then emit one domain event describing the
committed operation. Failed transactions emit no success event; failed-login is the one security
event emitted for a refused operation and contains no password or existence signal.

**Rationale**: Audit consumers must never record state that rolled back. Failed login remains a
required audit-ready event despite no state mutation.

**Alternatives considered**: Emit inside transaction (subscriber side effects cannot roll back);
database outbox (stronger delivery but audit persistence is explicitly future scope).
