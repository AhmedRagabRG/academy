# Contract: Sessions and Self-Service Profile

All operations require authentication. They require no administrative permission and are restricted
to the caller's own account/session records.

## `GET /api/v1/auth/sessions`

Returns a bounded array of active session descriptors, current first and then latest activity. Each
item contains `id`, `device`, `browser`, `ipAddress`, `createdAt`, `lastActivityAt`, `expiresAt`, and
`current`. No token, token hash, or raw user-agent is returned.

## `DELETE /api/v1/auth/sessions/:id`

Revokes one owned non-current session and returns `200 data:null`. Current-session targets return
`409 INVALID_TRANSITION`. Unknown, expired, revoked, or foreign IDs return the same `404 NOT_FOUND`
response to avoid ownership disclosure.

## `DELETE /api/v1/auth/sessions`

Revokes all caller sessions except the current one. Returns
`200 {"success":true,"data":{"revokedCount":2}}`. Repetition succeeds with count zero.

## `GET /api/v1/auth/profile`

Returns the caller's complete public employee profile, resolved roles/department/branches, effective
permissions, status, version, and audit timestamps. Password and session internals are absent.

## `PATCH /api/v1/auth/profile`

Request fields: `displayName?`, `phone?`, `avatar?`, and required `expectedVersion`. At least one
mutable field is required. Unknown or administrator-owned fields are rejected `422`. Success returns
the updated profile. Stale version returns `409 VERSION_CONFLICT` with `currentVersion`.

## `POST /api/v1/auth/change-password`

Request: `currentPassword`, `newPassword`, `confirmPassword`, `expectedVersion`. Confirmation must
match and policy must pass. Success updates the hash, increments version, preserves the current
session, revokes every other session, and returns `200 data:null`. Wrong current password uses
`401 invalid_credentials`; validation uses dot-path details; stale version uses the standard conflict.
