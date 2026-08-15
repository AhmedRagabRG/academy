# Quickstart & Validation Guide: Backend Foundation

**Purpose**: prove the foundation works end to end. Every check below maps to a success criterion in
[spec.md](spec.md).

This is a validation guide, not an implementation guide. Commands and expected outcomes only.

---

## Prerequisites

| Requirement | Verified on this machine |
|---|---|
| Node.js 22+ | ✅ v22.18.0 |
| npm 10+ | ✅ 10.9.3 |
| PostgreSQL 14+ | ✅ 14.19 (Homebrew) |
| Docker | ❌ not installed — the local Postgres install is used instead |

Two databases are needed: one for development, one for the e2e suite. The test suite must never run
against the development database — it truncates tables.

```bash
createdb alsalam_dev && createdb alsalam_test
```

---

## Setup

```bash
npm install
```

```bash
cp .env.example .env
```

Then edit `.env` — at minimum `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD`. Every variable is listed in `.env.example` with a safe
placeholder (FR-008).

```bash
npx prisma migrate dev
```

```bash
npm run seed
```

```bash
npm run start:dev
```

Startup logs the environment, port, and documentation URL (FR-070). If a required variable is missing
or malformed, startup **fails here** and names the offending variable — it does not boot into a
half-configured state (FR-006).

---

## Validation checks

### 1. Service is alive — SC-001, FR-063

```bash
curl -s http://localhost:3000/api/v1/health | jq
```

Expect `200`, `success: true`, both `api` and `database` reporting `up`. Full shape:
[contracts/health.contract.md](contracts/health.contract.md).

### 2. Health reports database loss — FR-064

Stop PostgreSQL, then repeat the call.

```bash
brew services stop postgresql@14 && curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/v1/health
```

Expect `503`, with `database` down and `api` still up. Restart Postgres afterwards. Confirm the body
contains no hostname, port, version, or driver error text (FR-065).

### 3. Configuration fails loudly — SC-013

Unset a required variable and start the service. Expect an immediate startup failure naming that
variable. Repeat for each required variable.

### 4. Success envelope is automatic — SC-002, FR-019

Against a temporary scratch endpoint returning a bare object, confirm the response arrives as
`{ "success": true, "data": { ... } }` with **no envelope code in the controller**. Count the lines of
serialization code required: the target is zero.

### 5. Error envelope is universal — SC-003, FR-020

```bash
curl -s http://localhost:3000/api/v1/does-not-exist | jq
```

Expect the standard error envelope — not the Nest or Express default 404 shape. Repeat with a
malformed JSON body and confirm the same envelope. These two cases are where the "exactly two shapes"
guarantee usually breaks.

### 6. Validation rejects and reports correctly — FR-026 to FR-029

Against a scratch endpoint with a DTO, submit (a) an undeclared property and (b) two invalid nested
fields. Expect `422`, code `VALIDATION_ERROR`, and `details[].field` carrying **dot paths**
(`identity.primaryPhone`), because the client maps them straight onto form state.

### 7. Pagination behaves at the boundaries — FR-022

| Input | Expected |
|---|---|
| No parameters | `page: 1`, `limit: 20` |
| `pageSize=500` | `limit: 100` — clamped silently, not rejected |
| `page=99` on a 7-page set | `200` with `"data": []` and correct `meta` — **not** a 4xx |

### 8. Credential lifecycle end to end — SC-006

No sign-in endpoint exists, so this is exercised through the e2e suite rather than curl. Against the
seeded account:

1. The seeded password verifies against its stored hash; a wrong password does not.
2. Credential cookies are issued and are `HttpOnly`.
3. A protected scratch endpoint accepts the cookie.
4. An expired access cookie plus a valid refresh cookie yields a new access cookie.
5. After revoking the refresh record, the same refresh is refused (FR-038).
6. After archiving the account, its still-valid access cookie is refused (FR-037).

```bash
npm run test:e2e -- auth
```

### 9. Authorization produces four distinct outcomes — SC-005

Against protected and branch-scoped scratch endpoints:

| Caller state | Expected |
|---|---|
| No cookie | `401` `UNAUTHORIZED` |
| Cookie, permission absent | `403` `FORBIDDEN` |
| Cookie, permission present | `200` |
| Cookie, record outside authorized branches | `403` **`out-of-scope`** — a distinct code, not `FORBIDDEN` |

The fourth row is the one that regresses. Verify the code, not just the status.

### 10. CSRF and origin restriction hold — SC-007

```bash
curl -s -X POST http://localhost:3000/api/v1/health -o /dev/null -w '%{http_code}\n'
```

A state-changing request with session cookies but no valid CSRF token must be refused. A request from
an origin absent from the allow-list must be refused before any credentialed handling. `GET` must
remain exempt (FR-043).

### 11. Uploads produce four distinct outcomes — SC-008

| Upload | Expected |
|---|---|
| Valid PDF/JPEG/PNG within limits | `201` + descriptor; file retrievable at `descriptor.url` |
| File over the configured limit | `413` `FILE_TOO_LARGE` |
| Unsupported type | `422` `UNSUPPORTED_FILE_TYPE`, response states accepted types |
| Zero-byte file | `422` `file-unreadable` — distinct from both above |
| File renamed `.pdf` but containing PNG bytes | Server's own sniffing decides, not the extension (FR-056) |
| Two uploads sharing an original filename | Neither overwrites the other |

### 12. Storage is genuinely swappable — SC-009

```bash
grep -rn "from 'fs'\|from 'node:fs'\|path.join" src/ --include=*.ts | grep -v "src/storage/"
```

Expect **no results**. Any filesystem access outside `src/storage/` is a Principle IX violation.

### 13. Nothing internal leaks — SC-010, SC-011

Trigger an unhandled exception on a scratch endpoint. The client response must contain no stack
trace, database message, query fragment, file path, or internal identifier. The server log must
contain the full detail under the request's correlation identifier.

```bash
npm run test:e2e 2>&1 | grep -iE "password|passwordHash|set-cookie|authorization: " || echo "clean"
```

Expect `clean` — no credential or cookie value in captured log output (FR-069).

### 14. Requests are traceable — SC-012

Issue a request that fails. Confirm the request log entry and the error log entry share one
correlation identifier, so a failure traces to its request in a single lookup.

### 15. Layering holds — constitution gates 3 and 5

```bash
grep -rln "PrismaService\|prisma\." src/ --include=*.ts | grep -vE "src/database/|repository"
```

Expect **no results**. Prisma outside `src/database/` or a `*.repository.ts` is a Principle V
violation.

### 16. Migrations and seed are reproducible — SC-014

```bash
dropdb alsalam_test && createdb alsalam_test && npx prisma migrate deploy && npm run seed && npm run seed
```

A fresh database must reach the current schema with no manual step, and the second seed run must
produce the same state as the first (FR-011).

### 17. Type and lint gates pass — SC-015

```bash
npm run build && npm run lint
```

Both must pass with zero errors under `strict: true`.

```bash
grep -rn ": any\|<any>\|as any" src/ --include=*.ts || echo "no any"
```

Expect `no any`. Any surviving use requires an inline justification comment (constitution XII).

### 18. Arabic survives the round trip — SC-016

Submit Arabic text to a scratch endpoint and confirm it returns byte-identical and unescaped, with
`Content-Type: application/json; charset=utf-8` (FR-025).

### 19. Documentation is complete and automatic — FR-059 to FR-062

Open `http://localhost:3000/api/docs`. Every endpoint must appear without manual registration, and
each must show the **envelope-wrapped** success shape plus its documented error shapes — not the bare
handler return type. Confirm the docs UI can be disabled by environment.

---

## Definition of done

The foundation is complete when all nineteen checks pass and all fourteen constitution quality gates
hold ([plan.md](plan.md) Constitution Check).

The final check is qualitative and is the one that matters most: **add a scratch endpoint and count
the lines of plumbing it required.** Envelope, error handling, validation, pagination, permission
enforcement, and documentation should all arrive for free. If any of them had to be written by hand,
the foundation has not done its job — regardless of what the tests say.

Remove all scratch endpoints before merging. `src/modules/` ships empty (FR-080).
