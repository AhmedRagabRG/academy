# Contract: Employee, Role, and Permission Administration

Paths retain the existing `/api/v1/settings` frontend surface. Every endpoint is authenticated and
declares the corresponding `settings.users.*`, `settings.roles.*`, or
`settings.permissions.*` permission. Detail operations enforce branch scope with `out-of-scope`.

## Employees

- `GET /api/v1/settings/users`: paginated search/filter/sort. Query: `search`, `roleId`, `branchId`,
  `departmentId`, `status`, `sort`, `sortOrder`, `page`, `pageSize`. Allowed sorts:
  `displayName|email|updatedAt`. Default excludes archived. Response meta uses `limit`.
- `GET /api/v1/settings/users/:userId`: complete detail, resolved roles/labels/effective permissions, and
  computed record permissions.
- `POST /api/v1/settings/users`: creates an employee. Required: `displayName`, `email`, `phone`, `roleIds`,
  `branchIds` unless organization-wide, `status`, and initial `password`; optional: `position`,
  `departmentId`, `avatar`, `organizationWide`. Client labels/audit fields are rejected.
- `PATCH /api/v1/settings/users/:userId`: partial administrator-owned profile/assignment update plus
  required `expectedVersion`; cannot change status or password.
- `PATCH /api/v1/settings/users/:userId/status`: `{status:"active|inactive|archived",expectedVersion}`.
  Inactivation/archive revokes all sessions in the same transaction.
- `POST /api/v1/settings/users/:userId/reset-password`: `{newPassword,confirmPassword,expectedVersion}`;
  updates hash and revokes all target sessions atomically.
- `GET /api/v1/settings/users/:userId/effective-permissions`: flat stable-sorted key union.

Create returns 201; reads/updates return 200. Common errors: validation 422, forbidden/out-of-scope
403, not found 404, duplicate email 409, version conflict 409, invalid transition 409, dependency
not found 422.

## Roles

- `GET /api/v1/settings/roles`: paginated `search`, `status`, `sort`, `sortOrder`, `page`, `pageSize`;
  allowed sort is `displayName|code|updatedAt`.
- `GET /api/v1/settings/roles/:roleId`: role, permission IDs/keys, assignment count, version/audit fields,
  and record permissions.
- `POST /api/v1/settings/roles`: `{code,displayName,description,permissionIds,status}`; returns 201.
- `PATCH /api/v1/settings/roles/:roleId`: partial display name/description plus `expectedVersion`; code,
  status, and permissions use dedicated rules/endpoints.
- `PATCH /api/v1/settings/roles/:roleId/status`: explicit status transition plus version. Archive refuses
  with `ENTITY_IN_USE` if assigned to any non-archived employee.
- `PUT /api/v1/settings/roles/:roleId/permissions`: full replacement
  `{permissionIds:[uuid],expectedVersion}`. Unknown/inactive permission IDs are rejected and the
  operation is atomic.

## Permission catalogue

`GET /api/v1/settings/permissions/catalog` returns the complete bounded canonical catalogue grouped by
module. Each permission has `id`, `key`, `moduleKey`, `actionKey`, Arabic `label`, `description`, and
active state. It is not paginated because it is a finite platform-defined set; no arbitrary key-
creation endpoint exists in this release.

## Concurrency and response rules

Every mutation carries `expectedVersion` except creates. The global envelope/filter own formatting.
Arabic error codes/messages follow the foundation catalogue; responses never include password,
hash, raw session metadata, database errors, or local paths.
