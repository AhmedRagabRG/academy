# Contract: Health Endpoint

The only HTTP endpoint this feature exposes. It is operational infrastructure, not part of the
frontend contract in `docs/api-data-requirements.html`.

---

## `GET /api/v1/health`

**Authentication**: none. Marked `@Public()`, so the global permissions guard skips it (FR-065).
An uptime monitor or orchestrator probe must be able to call it without credentials.

**CSRF**: exempt — `GET` is not state-changing (FR-043).

**Request**: no parameters, no body.

### Response — healthy (`200`)

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "info": {
      "api":      { "status": "up" },
      "database": { "status": "up" }
    },
    "error": {},
    "details": {
      "api":      { "status": "up" },
      "database": { "status": "up" }
    }
  }
}
```

### Response — database unreachable (`503`)

```json
{
  "success": true,
  "data": {
    "status": "error",
    "info":  { "api": { "status": "up" } },
    "error": { "database": { "status": "down", "message": "فشل الاتصال بقاعدة البيانات" } },
    "details": {
      "api":      { "status": "up" },
      "database": { "status": "down", "message": "فشل الاتصال بقاعدة البيانات" }
    }
  }
}
```

**Why `success: true` on a `503`**: the *request* succeeded — the service answered the question it was
asked, and the answer is "a dependency is down". The envelope's `success` flag reports whether the
call completed, and `data.status` reports what it found. Routing a degraded health report through the
error envelope would make it indistinguishable from a genuine request failure, and would give monitors
no structured detail about *which* dependency failed.

The `503` status is what an orchestrator acts on (FR-064). The body is what a human reads.

---

## Checks performed

| Check | Method | Passing condition |
|---|---|---|
| `api` | Process is serving the request | Reaching the handler at all |
| `database` | `SELECT 1` through the Prisma client | Query returns without error inside the timeout |

The database indicator is hand-written rather than Terminus's bundled Prisma indicator, which may not
track Prisma 7's adapter-based client (research D-13).

---

## Disclosure rules (FR-065)

The response MUST NOT contain:

- connection strings, hostnames, ports, or database names
- credentials of any kind
- application, framework, or database version numbers
- stack traces or driver error text

The `message` on a failed check is a fixed Arabic string. The underlying driver error is logged
server-side under the request's correlation identifier and never returned.

---

## Verification

| Scenario | Expected |
|---|---|
| Database up | `200`, both checks `up` |
| Database stopped | `503`, `database` down, `api` up |
| Response inspected for leakage | No hostname, version, credential, or driver text present |
| Called with no credentials | Succeeds — never `401` |
| Called with an invalid CSRF token | Succeeds — `GET` is exempt |
