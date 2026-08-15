# Quickstart Validation: Identity & Access Management

This guide validates the finished feature against [spec.md](spec.md). Payload details are in
[contracts/](contracts/) and persistence invariants in [data-model.md](data-model.md).

## Prerequisites

- Node.js 22 and dependencies installed
- PostgreSQL running
- Dedicated development and test databases
- `.env` and `.env.test` populated from their examples with distinct database URLs
- Backend Foundation migrations and this feature's migration available

Never point the e2e suite at development or production data.

## Setup

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run seed
npm run seed
```

Confirm the repeated seed leaves one row per canonical permission key and does not duplicate the
initial account, role, or assignments. Apply the same migrations to the test database before e2e.

## Automated gates

```bash
npm run build
npm run lint
npm run test -- --runInBand
npm run test:e2e -- --runInBand
```

All commands must exit zero. The e2e suite must use real PostgreSQL for transaction, uniqueness,
concurrency, refresh replay, and relation tests.

## Acceptance checks

### 1. Login and secret handling

Sign in with the seeded active employee. Expect 200, access and refresh `HttpOnly` cookies, and an
employee context containing every assigned role and the unioned permission set. Confirm response and
captured logs contain neither password, token, cookie value, nor password hash. Repeat with unknown
email and wrong password; both must return identical `401 invalid_credentials` bodies.

### 2. Restore, refresh, and logout

Request current session with no cookies and expect `200 data:null`. Log in, restore successfully,
refresh, and verify the logical session ID remains listed while the old refresh credential is
rejected. Logout and verify both cookies clear and the session no longer authorizes requests.

### 3. Multiple active sessions

Log in three times with distinguishable user agents/IPs. List sessions and verify current-first order
and complete safe metadata. Revoke one other session and prove only it fails. Revoke all others and
prove the current session survives. Attempt to revoke another account's UUID and compare its response
byte-for-byte with an unknown UUID response.

### 4. Live authorization

Assign two roles with overlapping permissions to one employee. Verify the effective list is the
duplicate-free union. Remove a permission from one role: it remains effective if the other role has
it, then disappears on the next request after removal from both. Inactivate all but one role and
confirm the account stays eligible; attempt to remove the last active role and expect refusal.

### 5. Employee administration

With the correct admin permission, create an employee with multiple roles and branches; retrieve the
detail and verify resolved role/assignment labels and no password field. Edit the employee using the
current version. Repeat from the stale original version and expect `409 VERSION_CONFLICT` with
`currentVersion`. Verify duplicate email is case-insensitive.

### 6. Employee list and scope

Create employees across roles, branches, departments, and statuses. Exercise each filter, both sort
directions, Arabic-normalized name search, email search, default 1/20 pagination, page-size clamp to
100, and an over-range empty 200 response. A branch-scoped caller sees only authorized branches; an
out-of-scope detail returns the distinct `out-of-scope` code.

### 7. Status lifecycle

Suspend an active employee with at least two sessions and verify status update plus all-session
revocation commit together. Reactivate and sign in again. Archive and verify sign-in/protected access
remain refused and no delete endpoint exists. Simulate a transaction failure and confirm neither
status nor session rows partially change.

### 8. Administrative password reset

Reset another employee's password using version and confirmation. Verify every target session is
revoked, old password fails, new password succeeds, version increments, and no secret is echoed.
Wrong confirmation and stale version leave hash/session state unchanged.

### 9. Role and permission administration

Create, list, retrieve, and edit a role. Replace permissions with the full-set operation and verify
the employee's effective permissions update. Reject unknown/inactive IDs. Attempt to archive an
assigned role and expect `409 ENTITY_IN_USE`; remove assignments, archive it, and verify it disappears
from default active lookups while remaining queryable by archived status.

### 10. Permission catalogue

Fetch the catalogue and compare its keys exactly with the canonical documented manifest: no missing,
duplicate, or invented keys. Confirm grouping/order is stable and all Arabic labels render as UTF-8.

### 11. Self-service profile

Read the current profile, then update display name, phone, and avatar descriptor with the current
version. Attempt to submit email, status, roles, branches, position, department, organization scope,
or audit fields and expect 422 field errors. Upload avatar bytes through the foundation storage
surface separately and confirm Identity stores only the returned descriptor.

### 12. Self-service password change

With two active sessions, change the password from the current session. Confirm current survives,
the other session is revoked, old password fails, and new password succeeds. Wrong current password,
weak password, mismatched confirmation, and stale version must change nothing.

### 13. CSRF, CORS, cookies, and disclosure

Exercise every state-changing endpoint without a valid CSRF token and from an unlisted origin; both
must be refused. GET remains exempt. Verify cookie Secure/SameSite/domain/path settings match
configuration and refresh cookie path permits refresh/logout as designed. Scan every error case for
stack traces, SQL, paths, hashes, and tokens.

### 14. Audit readiness and correlation

Capture domain events for login, logout, failed login, password reset/change, employee create/update,
role update, permission replacement, and session revocation. Each successful operation emits exactly
one event after commit with actor, target, operation, time, and resulting state. Failure emits no
success event. Request/error logs share one correlation ID and redact credentials.

### 15. Architecture audits

```bash
rg -n "PrismaService|prisma\." src/modules/identity -g '*.ts' | rg -v 'repository'
rg -n ": any|<any>|as any" src/modules/identity src/core -g '*.ts'
rg -n "node:fs|path\.join" src/modules/identity -g '*.ts'
```

All must return no unjustified hits. Review controllers to confirm each binds input, declares
authorization/Swagger, and calls one service entry point. Confirm multi-record writes use the shared
transaction manager.

### 16. Contract amendment gate

Before the feature is considered shippable, update `docs/api-data-requirements.html` with the eight
owner-approved additions recorded in [spec.md](spec.md), and update the authentication context from a
singular role to multiple `roles` plus unioned `permissionKeys`. Compare every route, payload, error,
and status against the contract files in this directory.

## Completion condition

The feature is ready only when all 16 checks pass, the full Backend Foundation regression suite
remains green, migrations work on both a fresh database and an existing foundation database, and no
unresolved clarification or contract drift remains.

## Implementation validation record (2026-08-02)

- The unchanged foundation baseline passed build, lint, 15 unit tests, and 29 e2e tests before IAM changes.
- Migration `20260802020000_identity_access_management` deployed successfully to `alsalam_test`.
- Prisma Client generation and the idempotent IAM seed completed successfully against `alsalam_test`.
- The post-implementation gate passed build, lint, 15 unit tests, and 29 e2e tests.
- IAM adds Arabic-normalized employee and role search through migrations
  `20260802200000_identity_search_normalization` and
  `20260802201000_identity_role_normalization`.
- The canonical permission manifest contains exactly 125 unique keys with the documented module
  totals and stable display ordering; the idempotent seed completed twice without duplicates.
- A fresh temporary PostgreSQL database accepted all five migrations and two seed runs. A separate
  foundation-only database containing a legacy single-role employee upgraded through IAM and
  Organization migrations and produced exactly one preserved `AccountRole` assignment. Both
  temporary verification databases were removed after the checks.
- The dedicated IAM matrix passes 12 PostgreSQL integration suites (28 tests), including concurrent
  refresh replay, transaction rollback, relationship uniqueness, Arabic search, and post-commit
  events.
- Unit, endpoint-contract, CSRF/CORS, logging-redaction, Swagger, and foundation regression coverage
  are included in the standard unit and e2e commands. The final command counts are recorded when the
  completion gate is run.
- Final gate: build and lint passed; 11 unit suites (31 tests), 12 PostgreSQL IAM integration suites
  (30 tests), and 22 e2e suites (66 tests) passed.
- `npm audit --omit=dev --audit-level=high` reports two high-severity `js-yaml` findings through
  `@nestjs/swagger@11.4.6`. npm offers only a forced dependency change to Swagger 11.4.5; no
  unreviewed breaking/downgrade operation was applied. The finding remains documented for dependency
  maintenance.
