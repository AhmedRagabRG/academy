# Phase 1 Data Model: Identity & Access Management

**Date**: 2026-08-02 | **Plan**: [plan.md](plan.md)

This model evolves the Backend Foundation records without replacing their identities. API status
values are lowercase; persisted enum values remain uppercase.

## Entity: Account (Employee)

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key, server-owned |
| `email` | string | Trimmed, lowercase, valid, case-insensitively unique |
| `passwordHash` | string | Required, never selected into public DTOs |
| `displayName` | string | Trimmed, minimum 3 characters |
| `phone` | string | `^\+?[0-9]{8,15}$` |
| `position` | string? | Administrator-owned, trimmed when present |
| `departmentId` | UUID? | External Organization reference; no cross-module FK yet |
| `departmentName` | string? | Read-model label resolved from Organization, never trusted on write |
| `branchIds` | UUID[] | At least one unless `organizationWide=true`; external references |
| `organizationWide` | boolean | Default false |
| `avatar` | JSON/file descriptor? | `{id,fileName,originalName,mimeType,size,url}`; no path |
| `status` | EntityStatus | `ACTIVE`, `INACTIVE`, `ARCHIVED` |
| `version` | integer | Starts 1; increments on every successful employee write |
| `archivedAt` | timestamp? | Required when archived, otherwise null |
| `createdAt`, `updatedAt` | timestamp | UTC, server-owned |
| `createdBy`, `updatedBy` | UUID? | Actor attribution; null only for system seed/migration |

**Relationships**: many roles through `AccountRole`; many sessions through `RefreshToken`.

**Transitions**:

```text
ACTIVE → INACTIVE → ACTIVE
ACTIVE → ARCHIVED
INACTIVE → ARCHIVED
ARCHIVED → (no transition in this feature)
```

Changing to `INACTIVE` or `ARCHIVED` and revoking all sessions is one transaction. An active or
inactive account must retain at least one active role. Archived records are excluded by default but
remain queryable with an explicit status filter.

## Entity: Role

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `code` | string | Lowercase kebab-case, unique, stable after creation |
| `displayName` | string | Trimmed, minimum 2, unique after normalization |
| `description` | string | Trimmed; may be empty only when explicitly submitted |
| `status` | EntityStatus | Active/inactive/archived |
| `version` | integer | Optimistic concurrency |
| `archivedAt` | timestamp? | Set on archive |
| `createdAt`, `updatedAt` | timestamp | UTC |
| `createdBy`, `updatedBy` | UUID? | Actor attribution |

**Relationships**: many accounts through `AccountRole`; many permissions through
`RolePermission`.

**Rules**: assigned roles cannot be archived while any non-archived account assignment exists.
Inactive roles contribute no effective permissions and make an account ineligible if no other active
role remains. Code cannot change after creation.

## Entity: Permission

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `key` | string | Unique canonical `module[.resource].action` key; immutable |
| `moduleKey` | string | Catalogue grouping |
| `actionKey` | string | Final action segment |
| `label` | string | Arabic administrative label |
| `description` | string | Arabic explanation |
| `displayOrder` | integer | Stable ordering within group |
| `active` | boolean | Inactive keys cannot be newly assigned |
| `createdAt`, `updatedAt` | timestamp | UTC |

The catalogue seed is the exact documented set. The administrative surface reads definitions and
may update display metadata in a future feature; this release assigns existing definitions only.

## Relationship: AccountRole

| Field | Type | Rules |
|---|---|---|
| `accountId` | UUID | FK to Account, cascade only for test/provisioning cleanup |
| `roleId` | UUID | FK to Role, restrict delete |
| `assignedAt` | timestamp | UTC |
| `assignedBy` | UUID? | Administrative actor |

Primary key/unique constraint: `(accountId, roleId)`. Duplicate assignments are impossible.

## Relationship: RolePermission

| Field | Type | Rules |
|---|---|---|
| `roleId` | UUID | FK to Role |
| `permissionId` | UUID | FK to Permission |
| `assignedAt` | timestamp | UTC |
| `assignedBy` | UUID? | Administrative actor |

Primary key/unique constraint: `(roleId, permissionId)`. Permission replacement deletes and creates
relationship rows inside the same transaction after version assertion.

## Entity: RefreshToken (Session)

The existing model becomes the logical session; `id` remains stable across refresh rotation.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Session ID and refresh JWT `jti` |
| `accountId` | UUID | FK to Account, indexed |
| `tokenHash` | string | SHA-256 hash of current refresh credential only |
| `device` | string | Derived bounded label, fallback `Unknown device` |
| `browser` | string | Derived bounded label, fallback `Unknown browser` |
| `ipAddress` | string | Normalized IPv4/IPv6, never used alone for trust |
| `userAgent` | string? | Bounded internal diagnostic value, never returned |
| `createdAt` | timestamp | Initial login time; unchanged by refresh |
| `lastActivityAt` | timestamp | Updated on rotation and throttled protected activity |
| `expiresAt` | timestamp | Current refresh expiry, indexed |
| `revokedAt` | timestamp? | Null while active |
| `revokeReason` | enum/string? | logout, individual, all-others, password, status, admin-reset |

**Validity predicate**: row exists; not revoked; expiry is future; account is ACTIVE; at least one
assigned role is ACTIVE; presented hash matches current `tokenHash`.

**Transitions**:

```text
ACTIVE → ROTATED (same row, new tokenHash/expiry/activity) → ACTIVE
ACTIVE → REVOKED
ACTIVE → EXPIRED (time-derived)
REVOKED/EXPIRED → no reactivation
```

Expired sessions may be physically pruned because they are operational credentials, not business
entities. Revoked sessions may be retained for the configured security-history interval.

## Read Models

### EmployeeContext

Contains employee public fields, `roleIds`, resolved active role summaries, unioned and sorted
`permissionKeys`, acting branch, `authorizedBranchIds`, `organizationWide`, `authenticatedAt`, and
current `sessionId`. Password and raw session data never appear.

### EmployeeDetail

Adds position, department ID/name, avatar, all assigned role names, status, version, audit fields,
and a computed record permissions object for administrator actions.

### SessionDescriptor

Contains `id`, device, browser, masked/normalized IP address according to contract, creation,
activity, expiry, and `current`. It excludes token hash, raw credential, and raw user agent.

### PermissionGroup

Contains group key/label and ordered permission descriptors. It is a bounded closed catalogue, not a
general list endpoint.

## Migration Sequence

1. Add nullable employee/profile/audit fields and session metadata fields with safe backfill values.
2. Create `Permission`, `AccountRole`, and `RolePermission` tables and indexes.
3. Seed canonical permission rows.
4. Backfill one `AccountRole` from every existing `Account.roleId`.
5. Backfill `RolePermission` from every existing `Role.permissionKeys` value; abort if a key is not
   canonical rather than silently dropping it.
6. Make newly required fields non-null after backfill.
7. Remove `Account.roleId` and `Role.permissionKeys` only after parity checks pass.

Rollback before step 7 is additive. After step 7, rollback must reconstruct scalar values from join
rows before dropping the relationship tables.

## Indexes and Constraints

- Unique normalized account email; indexes on account status and department.
- GIN/index support for branch ID filtering only if query measurements justify it; no speculative
  index is required initially.
- Unique role code and normalized display name; role status index.
- Unique permission key; `(moduleKey, displayOrder)` index.
- Compound primary keys on both join tables plus reverse indexes on `roleId`/`permissionId`.
- Session indexes on `(accountId, revokedAt, expiresAt)` and `lastActivityAt`.
- Database constraints enforce non-negative version and basic session timestamp ordering where
  supported; cross-row “at least one active role” remains a transactional service invariant.
