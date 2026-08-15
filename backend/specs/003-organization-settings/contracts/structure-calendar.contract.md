# Contract: Organization Structure and Academic Calendar

All paths are under `/api/v1`. Every operation is authenticated, uses the global success/error
envelope, requires its `settings.*` permission, and returns no local path or client-authored derived
label. Create returns 201; reads and mutations return 200.

## Shared list contract

`GET /settings/{kind}` where `{kind}` is `branches`, `departments`, `academic-years`, or
`academic-terms`.

Query: `search?`, `status=active|inactive|archived|all?`, `sort?`, `sortOrder=asc|desc?`, `page?`,
`pageSize?`; terms also accept `academicYearId?`. Request page defaults to 1 and pageSize to 20; max
100. Response data is the record array and envelope meta is
`{total,page,limit,totalPages,hasNextPage,hasPreviousPage}`. Over-range is 200 with an empty array.
Archived rows are excluded by default.

Allow-lists:

| Kind | Search | Sort | Permission |
|------|--------|------|------------|
| branches | name, code | name, code, updatedAt | `settings.branches.view` |
| departments | name, code | name, code, updatedAt | `settings.departments.view` |
| academic-years | name, code | name, code, startDate, updatedAt | `settings.academicYears.view` |
| academic-terms | name | name, startDate, updatedAt | `settings.academicTerms.view` |

Branch lists/details apply caller scope. A branch outside scope returns `403 out-of-scope`. Other
entities are organization-wide master data and are permission-filtered, not branch-filtered.

## Shared detail, update, and status

- `GET /settings/{kind}/:id` returns the complete record plus computed `permissions`.
- `PATCH /settings/{kind}/:id` accepts mutable fields plus mandatory `expectedVersion`.
- `PATCH /settings/{kind}/:id/status` accepts
  `{status:"active|inactive|archived",expectedVersion}` and returns the updated record.

Identity, audit, version, derived-label, and status fields on ordinary PATCH are rejected. There is no
DELETE endpoint. Archived detail remains readable with permission.

## Branches

- `POST /settings/branches`

Create fields: `name`, `code`, `address`, `phone`, `email`, `workingHours`, optional `managerId`, and
`status`. Update accepts the same mutable fields except status plus `expectedVersion`.

Response adds UUID `id`, `organizationId`, normalized uppercase `code`, version/audit fields, and
computed record permissions. Manager ID must resolve through Identity; no employee data is copied.
Code is unique case-insensitively across every status. Archive refusal while referenced is
`409 ENTITY_IN_USE`.

## Departments

- `POST /settings/departments`

Create fields: `name`, `code`, `description`, `status`. Update accepts `name`, `code`, `description`,
and `expectedVersion`. Code is unique case-insensitively across every status. Archive refusal while
referenced is `409 ENTITY_IN_USE`.

## Academic years

- `POST /settings/academic-years`
- `POST /settings/academic-years/:id/activate`

Create fields: `name`, `code`, `startDate`, `endDate`, and `status` (`inactive` for normal creation;
the first configured year may be active). Ordinary update accepts name/code/dates plus version but not
status. Dates are `YYYY-MM-DD`, with end on/after start. Code is unique across every status.

Activate request is `{expectedVersion}`. It atomically makes the target active, makes the previous
active year inactive, and synchronizes general settings. Archived targets or direct removal of the
last active year return `409 INVALID_STATE`. Exactly one eligible year remains active.

## Academic terms

- `POST /settings/academic-terms`

Create fields: `academicYearId`, `name`, `startDate`, `endDate`, `status`. Update accepts those mutable
fields and `expectedVersion`. Response includes server-resolved `academicYearName`.

Term dates must be contained by the parent year. Inclusive date ranges must not overlap another term
in the same year, including touching on one date. Different years are independent.

## Errors

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 422 | Field/format/reference/parent-range failure with Arabic details |
| `DUPLICATE_VALUE` | 409 | Normalized code already exists |
| `DATE_OVERLAP` | 409 | Term inclusive range overlaps a sibling |
| `NOT_FOUND` | 404 | Record or eligible dependency absent |
| `FORBIDDEN` | 403 | Required permission absent |
| `out-of-scope` | 403 | Branch exists but is outside caller scope |
| `ENTITY_IN_USE` | 409 | Archive blocked by active references |
| `INVALID_STATE` | 409 | Invalid status/activation transition |
| `VERSION_CONFLICT` | 409 | Stale expectedVersion; includes `currentVersion` |
| `SERVER_ERROR` | 500 | Retryable unexpected failure |

