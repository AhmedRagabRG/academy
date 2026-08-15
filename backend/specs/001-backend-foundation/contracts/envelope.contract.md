# Contract: Response Envelopes

**Applies to**: every endpoint in the system, now and forever. This is the contract that makes
constitution Principle VIII enforceable.

**Producers**: `ResponseEnvelopeInterceptor` (success) and `AllExceptionsFilter` (error), both
registered globally. No controller constructs either shape.

**Guarantee**: exactly two response shapes exist. There is no third — not for unknown routes, not for
malformed bodies, not for unhandled exceptions, not for the health endpoint (SC-003).

---

## Success — single resource

```json
{
  "success": true,
  "data": { "...": "..." }
}
```

`data` is whatever the handler returned, unmodified. A handler returning `null` produces
`"data": null` — this is a valid success, and is exactly what the session-restore endpoint will rely
on (FR-033).

**HTTP status**: `200` for reads and updates, `201` for creates, `204` never (a body is always sent).

---

## Success — list

```json
{
  "success": true,
  "data": [ { "...": "..." } ],
  "meta": { "total": 137, "page": 1, "limit": 20, "totalPages": 7 }
}
```

**Field naming is non-obvious and deliberate**: the request carries `pageSize`, the response `meta`
carries `limit`. This mirrors the frontend adapter in requirements §3.1 exactly. It is flagged in the
constitution as `TODO(PAGE_SIZE_NAMING)` and should be confirmed before the first list endpoint
ships.

| Field | Meaning |
|---|---|
| `total` | Total matching records across all pages, after filtering and branch scoping |
| `page` | 1-based current page, echoing the request |
| `limit` | Page size in effect after clamping |
| `totalPages` | `ceil(total / limit)`; `0` when `total` is `0` |

---

## Success — cursor list

For the two timeline reads only (Students timeline, Student Finance timeline):

```json
{
  "success": true,
  "data": { "items": [], "nextCursor": "opaque-string" }
}
```

`nextCursor` is absent on the final page. The cursor is opaque to clients and MUST NOT encode
anything a client could tamper with meaningfully.

---

## Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "توجد بيانات غير صالحة. راجع الحقول المميزة.",
    "details": [
      { "field": "identity.primaryPhone", "message": "صيغة رقم الهاتف غير صحيحة" }
    ]
  }
}
```

| Field | Required | Rules |
|---|---|---|
| `code` | yes | Machine-readable. Clients switch on this and never parse `message` |
| `message` | yes | Arabic, human-readable, UTF-8 unescaped |
| `details` | no | Present for field-level failures. `field` uses **dot paths matching client form field names** (`identity.primaryPhone`, `pricing.basePrice.amount`) so they map straight onto form state |

### Conflict errors carry `currentVersion`

Optimistic concurrency failures add a first-class field on the `error` object — not nested inside
`details`, because three separate frontend error-detail types read it directly:

```json
{
  "success": false,
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "تم تعديل هذا السجل بواسطة موظف آخر. حدّث الصفحة ثم أعد المحاولة.",
    "details": [{ "field": "expectedVersion", "message": "currentVersion=5" }],
    "currentVersion": 5
  }
}
```

### Upload errors carry their limits

```json
{ "success": false, "error": { "code": "FILE_TOO_LARGE", "message": "حجم الملف يتجاوز الحد المسموح به",
  "details": [{ "field": "file", "message": "5242880" }], "limit": "5242880" } }

{ "success": false, "error": { "code": "UNSUPPORTED_FILE_TYPE", "message": "نوع الملف غير مدعوم",
  "acceptedTypes": "application/pdf, image/jpeg, image/png" } }
```

---

## Error code → HTTP status mapping

The foundation delivers one exception class per row. Business code raises the named exception; the
global filter maps it. **Business code never chooses a status code.**

| Category | Representative codes | Status | Exception class |
|---|---|---|---|
| Validation | `VALIDATION_ERROR`, `amount-invalid`, `invalid-date-range` | `422` | `ValidationException` |
| Authentication | `UNAUTHORIZED`, `invalid_credentials` | `401` | `UnauthenticatedException` |
| Authorization | `FORBIDDEN` | `403` | `ForbiddenException` |
| Branch scope | `out-of-scope` | `403` | `OutOfScopeException` — **distinct class, distinct code** |
| Not found | `NOT_FOUND` | `404` | `NotFoundException` |
| Concurrency | `VERSION_CONFLICT` | `409` | `VersionConflictException` (carries `currentVersion`) |
| Duplicate | `DUPLICATE_CODE`, `DUPLICATE_VALUE` | `409` | `DuplicateException` |
| Invalid transition | `INVALID_TRANSITION`, `not-editable`, `archived-read-only` | `409` | `InvalidTransitionException` |
| Readiness gate | `NOT_READY` | `409` | `NotReadyException` |
| Dependency missing | `DEPENDENCY_NOT_FOUND` | `422` | `DependencyNotFoundException` |
| Record in use | `DEPENDENCY_IN_USE`, `ENTITY_IN_USE` | `409` | `DependencyInUseException` |
| File too large | `FILE_TOO_LARGE` | `413` | `FileTooLargeException` |
| Unsupported type | `UNSUPPORTED_FILE_TYPE` | `422` | `UnsupportedFileTypeException` |
| Unreadable file | `file-unreadable` | `422` | `FileUnreadableException` |
| CSRF failure | `CSRF_INVALID` | `403` | Mapped from `csrf-csrf`'s error |
| Unexpected | `INTERNAL_ERROR` | `500` | Catch-all — logs everything, tells the client nothing |

**`out-of-scope` is not a variant of `FORBIDDEN`.** The UI shows a different message for "this record
exists but is not yours" versus "you lack this permission". Collapsing them breaks that (FR-048).

---

## Non-negotiable behaviours

1. **Nothing internal leaks.** No stack trace, database message, query fragment, filesystem path, or
   internal identifier appears in any error response. The `500` case logs the full detail server-side
   and returns a generic Arabic message (FR-020, SC-010).
2. **Framework defaults are overridden.** A `404` from an unmatched route and a `400` from a malformed
   JSON body both pass through the global filter and emerge in the envelope above — not in the Express
   or Nest default shape.
3. **Arabic is unescaped.** `Content-Type: application/json; charset=utf-8`, with Arabic codepoints
   transmitted literally (FR-025).
4. **Over-range pages succeed.** Requesting page 99 of a 7-page result returns `200` with
   `"data": []` and correct `meta` — never a `4xx` (FR-022).
5. **Page size clamps silently.** A requested `pageSize` above 100 is reduced to 100; it is neither
   honoured nor rejected.

---

## Swagger representation

Because the interceptor wraps at runtime while `@nestjs/swagger` reflects the declared return type,
documentation would otherwise describe the unwrapped payload and lie about the wire format. Two
composite decorators solve this (research D-14):

- `@ApiEnvelopeResponse(Model)` — documents `{ success, data: Model }`
- `@ApiPaginatedResponse(Model)` — documents `{ success, data: Model[], meta }`
- `@ApiErrorResponses(...codes)` — documents the error shapes an endpoint can produce

Every endpoint must carry one success decorator and the relevant error decorators (FR-062).
