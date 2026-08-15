# Data Model: Organization & Settings

This is a frontend domain and service-contract model, not a database schema. Every mutable entity
uses an opaque ID, future `organizationId`, integer `version`, and `AuditMetadata`.

## Shared Value Objects

### AuditMetadata

`createdAt`, `updatedAt` are ISO timestamps; `createdBy`, `updatedBy` are opaque actor IDs.
Creation fields are immutable. Every successful write increments `version` and updates modification fields.

### FileAsset

Contains `id`, `fileName`, `mimeType`, `size`, and service-owned `url`/preview reference. Supported
profile media types are JPEG, PNG, and WebP. Maximum size: logo 5 MB; cover 10 MB.

### StatusDefinition

| Field | Rules |
|---|---|
| `id`, `entityKind` | Required; unique within scope |
| `labelAr`, `labelEn` | Configurable display labels |
| `behavior` | Service-owned `active`, `inactive`, or `archived` classification |
| `colorToken`, `sortOrder` | Configurable presentation metadata |
| `selectable` | Controls availability for future assignments |

### ContactPoint

Ordered `phone | email` value with label and `isPrimary`. Values are normalized; at most one
primary contact exists per type.

### ListQuery and PaginatedResult

`ListQuery` contains normalized search, typed filters, one supported sort/direction, one-based page,
and allowed page size. `PaginatedResult<T>` contains items, total, page, pageSize, and totalPages.

## OrganizationProfile

Singleton per organization with canonical organization name, Arabic name (required), English name
(optional), description,
logo, cover, ordered contacts, website, address, ISO country code, city, IANA timezone, ISO 4217
currency, BCP-47 language preferences, and one default language contained in those preferences.
Website is an HTTP/HTTPS URL. Updates require `expectedVersion`.

## Branch

Fields: ID, organization ID, required name, normalized uppercase code, address, contacts, nullable
manager user ID, working hours, status ID, version, and audit metadata. Code is unique
case-insensitively within the organization.

`WorkingHours` has at most one entry per weekday. Closed days have no times; open days require
start before end in organization time. Cross-midnight work uses two day entries.

### Branch Transition

```text
active <-> archived
```

No deletion. Archival retains manager/user references, excludes the branch from new assignments,
and is blocked while it is the default unless reassignment occurs atomically.

## Department

Fields: ID, organization ID, unique normalized name, optional description, status ID, version, and
audit metadata. Active and inactive states are reversible. Inactive departments retain historical
user links but cannot receive new assignments.

## AcademicYear

Fields: ID, organization ID, required name, inclusive ISO date-only start/end, status ID, version,
and audit metadata. Start must not follow end. Ranges cannot overlap within the organization.

### Academic Year Transition

```text
inactive --activateAcademicYear--> active
active   --activate another------> inactive
active   --deactivate------------> inactive
```

The service invariant is zero or one active year. Activating a year atomically deactivates the
prior active year and sets the new year as default. Deactivating the only active year clears the default.

## AcademicTerm

Fields: ID, required immutable `academicYearId`, required name, inclusive ISO date-only start/end,
status ID, version, and audit metadata. A term belongs to exactly one existing year, remains within
the parent's dates, and cannot overlap another term of the same year. Activating a term requires
an active parent, but multiple terms are not otherwise forced into a single-active rule.

`AcademicTermListItem` is a read projection for the standalone route. It includes parent academic
year label and status and remains filterable by `academicYearId`; it does not duplicate ownership.

## InternalUser

Fields: ID, organization ID, required full name, normalized unique email, optional validated phone,
optional profile asset, branch ID, department ID, status ID, version, and audit metadata. Passwords
are absent. New assignments for an active user require active branch, department, and at least one
active role. Inactive users retain assignments and contribute no effective permissions.

## Role

Fields: ID, organization ID, unique normalized name, optional description, status ID, version, and
audit metadata. Active and inactive states are reversible. Inactive roles remain assigned for
history but cannot be newly assigned or contribute permissions.

## PermissionGroup and Permission

Groups contain stable module key, Arabic/English labels, description, and order. Permissions
contain opaque ID, stable unique key, group ID, configurable action key/labels/description/order,
and status. The catalog is data supplied by services, not a closed UI enum.

The standalone permission matrix is a read projection joining the selected Role, the permission
catalog, and RolePermissionAssignment records. Saving still targets role assignments atomically.

## Assignment Entities

`UserRoleAssignment` and `RolePermissionAssignment` contain their two foreign IDs, version, and
audit metadata. Each pair is unique. Role permission replacement is atomic. Effective permissions
equal the deduplicated union of active permissions on active roles assigned to an active user.

Safety rule: a mutation cannot leave zero active users with the critical administration
permissions needed to manage settings, users, roles, and permissions.

## GeneralSettings

Singleton per organization: default language, IANA timezone, ISO currency, date format, number
format, non-empty unique working days, active default branch ID, and zero-or-one active default
academic year ID. Defaults must reference active entities and updates require `expectedVersion`.

## Relationships

```text
OrganizationProfile 1 ── * Branch
OrganizationProfile 1 ── * Department
OrganizationProfile 1 ── * AcademicYear 1 ── * AcademicTerm
Branch 1 ── * InternalUser * ── 1 Department
InternalUser * ── * Role * ── * Permission
OrganizationProfile 1 ── 1 GeneralSettings
```

## Typed Service Failures

- `validation`: normalized field or cross-field errors
- `duplicate`: code, email, or normalized name conflict
- `not-found`: missing aggregate or reference
- `permission`: unavailable mock affordance; future authorization mapping
- `dependency`: default or assignment prevents transition
- `state`: invalid lifecycle transition or administrator lockout risk
- `version-conflict`: expected version differs
- `unexpected`: safe retryable or non-retryable fallback without internal details

All mutations are all-or-nothing. UI labels and colors never determine service behavior.
