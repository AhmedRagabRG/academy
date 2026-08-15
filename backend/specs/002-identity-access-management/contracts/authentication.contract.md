# Contract: Authentication

All paths are under `/api/v1`, all bodies use the foundation envelope, and cookies are httpOnly.

## `POST /api/v1/auth/login` — Public

Request: `{ "email": "employee@example.com", "password": "…" }`. Email is valid; password is
non-empty. Success `200` returns `EmployeeContext` and sets access/refresh cookies. Tokens never
appear in data. Errors: `422 VALIDATION_ERROR`, `401 invalid_credentials`, `403 ACCOUNT_INACTIVE`,
`500 SERVER_ERROR` (retryable).

## `GET /api/v1/auth/session` — Public restoration

Returns `200` with `EmployeeContext` for a valid current session, otherwise `200` with `data:null`.
Invalid/expired cookies are cleared. This endpoint never returns 401 merely because authentication is
absent. The response also exposes a fresh `x-csrf-token` header for subsequent state-changing
requests; the token is bound to the current credential context and is not an authentication token.

## `POST /api/v1/auth/refresh` — Refresh-cookie credential

Empty body. Atomically rotates the current refresh credential on the same session and sets new
cookies. Returns `200 data:null`. Refuses missing, expired, revoked, replayed, or ineligible-account
credentials with `401 UNAUTHORIZED` and clears cookies.

## `POST /api/v1/auth/logout` — Authenticated

Empty body. Revokes the current session if identifiable, always clears cookies, and returns
`200 data:null`. Repetition is idempotent from the client's perspective.

## EmployeeContext shape

```json
{
  "employee": { "id": "uuid", "displayName": "أحمد محمد", "email": "a@example.com",
    "avatarUrl": "/files/avatar.png", "roleIds": ["uuid"], "branchIds": ["uuid"] },
  "roles": [{ "id": "uuid", "code": "admin", "displayName": "مدير", "status": "active" }],
  "permissionKeys": ["settings.users.view"],
  "branch": { "id": "uuid", "code": "main", "displayName": "الفرع الرئيسي", "status": "active" },
  "authorizedBranchIds": ["uuid"], "organizationWide": false,
  "authenticatedAt": "2026-08-02T10:00:00.000Z"
}
```

Role-derived arrays are stable-sorted and duplicate-free. The existing singular `role` response must
be migrated in the canonical API document/frontend adapter to `roles` plus `permissionKeys` before
multiple roles ship.
