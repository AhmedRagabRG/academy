# Contract: Organization Profile and General Settings

All paths are under `/api/v1`, authenticated, and globally enveloped.

## Organization profile

- `GET /organization/profile` — `settings.organization.view`
- `PATCH /organization/profile` — `settings.organization.update` (owner-approved addition)

The response contains UUID `id`/`organizationId`, immutable `name` and `code`, nullable safe `logo`,
`favicon`, and `cover` descriptors, contacts, website, address, working hours, social links, version,
and audit fields. No descriptor contains a local path.

PATCH accepts at least one of:

- `logo`, `favicon`, `cover`: safe file descriptor or `null` to clear;
- `contacts`: complete ordered email/phone collection with stable optional IDs, labels, values,
  primary flags, and sort orders;
- `website`, `address`, `workingHours`, `socialLinks`;
- mandatory `expectedVersion`.

`name`, `code`, identity, audit, and server-owned fields are rejected. Assets are uploaded through the
generic file service before this request. Contacts require valid type-specific formats and at most one
primary per non-empty type. Social-link platforms are unique and URLs use HTTPS. The aggregate update
is atomic and increments Organization.version once.

## General settings

- `GET /settings/general` — `settings.general.view`
- `PATCH /settings/general` — `settings.general.update`

Response fields: `defaultLanguage`, `timeZone`, `currency`, `dateFormat`, `numberFormat`,
`workingDays`, `defaultBranchId`, `defaultAcademicYearId`, version, and audit fields.

PATCH is the complete settings body plus `expectedVersion`. Working days are a non-empty unique subset
of the supported weekday feed. Language/time zone/currency/formats must be supported standards.
Default branch and academic year must exist and be active; the academic-year ID must be the exclusive
active year. The update commits entirely or not at all.

## Errors

`VALIDATION_ERROR` 422 covers formats, immutable/unknown fields, unsafe descriptor shapes, missing
primary contact, and ineligible defaults. `NOT_FOUND` 404 covers the singleton only if bootstrap is
incomplete. `FORBIDDEN` is 403. `VERSION_CONFLICT` is 409 with first-class `currentVersion`.
Unexpected failures are `SERVER_ERROR` 500 and retryable. Arabic field details match request paths.

Successful profile/settings updates emit one post-commit audit-ready event with actor, aggregate,
operation, time, and resulting state.
