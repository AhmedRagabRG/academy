# Data Model: Frontend Foundation

This model describes frontend domain contracts and browser-persisted mock context. It does not
define database tables, API payloads, or real authorization.

## Employee

Represents the mock internal employee visible in the shell.

| Field | Type | Rules |
|---|---|---|
| `id` | opaque string | Required, stable, non-empty |
| `displayName` | string | Required Arabic display label |
| `email` | string | Required, valid email, rendered with bidi isolation |
| `avatarUrl` | string or absent | Optional valid URL |
| `roleIds` | list of Role IDs | At least one in authenticated fixtures |
| `branchIds` | list of Branch IDs | At least one in authenticated fixtures |

## Role

A configurable mock role. It MUST NOT be a closed enum of every future organizational role.

| Field | Type | Rules |
|---|---|---|
| `id` | opaque string | Required and unique |
| `code` | string | Required, stable configuration key |
| `displayName` | string | Required Arabic label |
| `permissionKeys` | list of Permission Keys | Unique entries; may be empty |
| `status` | `active` or `inactive` | Inactive roles cannot be selected |

## Branch

A configurable mock organizational location, not a real tenant boundary.

| Field | Type | Rules |
|---|---|---|
| `id` | opaque string | Required and unique |
| `code` | string | Required, stable configuration key |
| `displayName` | string | Required Arabic label |
| `status` | `active` or `inactive` | Inactive branches cannot be selected |

## Employee Context

The minimum context shared across future modules.

| Field | Type | Rules |
|---|---|---|
| `employeeId` | Employee ID | Must resolve to the authenticated employee |
| `currentRoleId` | Role ID | Must be active and belong to `employee.roleIds` |
| `currentBranchId` | Branch ID | Must be active and belong to `employee.branchIds` |
| `authenticatedAt` | timestamp | Set by mock login; informational only |

## Mock Session

| Field | Type | Rules |
|---|---|---|
| `version` | positive integer | Used to migrate or discard persisted state |
| `status` | session state | See state transition below |
| `context` | Employee Context or absent | Present only when authenticated |

### Session State Transition

```text
anonymous -> authenticating -> authenticated
     ^              |               |
     |              v               v
     +----------- failure <------ sign-out
```

- Missing, corrupt, expired, or unsupported persisted data resolves to `anonymous`.
- Authentication failure never preserves submitted credentials.
- Sign-out clears persisted employee context and returns to `anonymous`.
- Mock authentication MUST be labeled as local demonstration behavior, not security.

## Login Credentials

| Field | Type | Rules |
|---|---|---|
| `email` | string | Required, trimmed, valid email |
| `password` | string | Required for mock comparison; never persisted |

The auth feature owns the authoritative validation schema. Form components consume the schema and
MUST NOT duplicate its constraints.

## Permission Key

An open-ended, non-empty string identifier such as `foundation.view`. It is intentionally not a
closed union so later modules can register permissions without changing the foundation. In this
phase it filters visibility only and does not enforce authorization.

## Navigation Item

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable and unique across the registry |
| `title` | string | Required Arabic label |
| `titleKey` | string | Stable future localization key |
| `iconKey` | Navigation Icon Key | Must resolve through the central Lucide registry |
| `route` | route string or absent | Required for selectable leaves; absent for pure groups |
| `permissionKey` | Permission Key or absent | If present, visibility requires the mock permission |
| `children` | readonly list | Optional; child IDs and routes remain unique |

### Navigation Derivations

- Filter children recursively against the current permission set.
- Remove groups with no visible children and no selectable route.
- Derive active item, page title, and breadcrumb from pathname plus the filtered tree.
- A future feature registers records without importing shell internals.

## Theme Preference

One of `light`, `dark`, or `system`. An invalid persisted value falls back to `system`. When the
value is `system`, runtime presentation follows changes to the device color preference.

## Sidebar Preference

| Field | Type | Rules |
|---|---|---|
| `version` | positive integer | Enables persistence migration |
| `desktopState` | `expanded` or `collapsed` | Persisted across visits |

Tablet overlay visibility is transient local state and MUST NOT be persisted. Invalid persisted
values fall back to the viewport-appropriate default.

## Service Error

| Field | Type | Rules |
|---|---|---|
| `code` | stable string | Required; safe for UI decisions |
| `messageKey` | string | Required safe Arabic-message lookup key |
| `fieldErrors` | field-to-message map or absent | Optional expected validation errors |
| `retryable` | boolean | Controls whether recovery action is offered |

Internal exception details and mock secrets MUST NOT be exposed to users.

## Showcase Record

A generic typed record used only to demonstrate table, filter, status, loading, empty, and error
states. It has a stable ID, Arabic label, configurable status reference, and timestamps needed for
sorting. It MUST NOT be presented as a real Product, Student, Payment, or other business entity.

## Excluded Domain Models

Product, Batch, Student, Enrollment, and Payment are deliberately not modeled in this feature.
Their configurable fields, relationships, permissions, audit context, and workflows require their
own business specifications.
