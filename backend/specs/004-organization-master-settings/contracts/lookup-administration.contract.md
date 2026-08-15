# Contract: Configurable Lookups

All paths are under `/api/v1`, authenticated, enveloped, and permission guarded. Static platform
standards and configurable business values remain distinct.

## Static settings feed

`GET /settings/lookups` requires `settings.general.view` and returns one bounded closed object:
`languages`, `timeZones`, `currencies`, `countries`, `locales`, `dateFormats`, `numberFormats`, and
`weekdays`. It is not paginated and has no mutation endpoint.

## Lookup groups

- `GET /settings/lookup-groups`
- `POST /settings/lookup-groups`
- `GET /settings/lookup-groups/:id`
- `PATCH /settings/lookup-groups/:id`
- `PATCH /settings/lookup-groups/:id/status`

List query: `search`, `status`, `sort=code|name|updatedAt`, `sortOrder`, `page`, `pageSize`; standard
pagination applies. Create is `{code,name,parentGroupId?,status}`. Update is
`{name?,parentGroupId?,expectedVersion}`; group code is stable after creation. Status body is
`{status,expectedVersion}`. Detail includes value count, child-group count, audit/version fields, and
computed record permissions.

Archive is refused while any non-archived value or child group exists.

## Lookup values by group code

- `GET /settings/lookups/:groupCode`
- `POST /settings/lookups/:groupCode`
- `GET /settings/lookups/:groupCode/:id`
- `PATCH /settings/lookups/:groupCode/:id`
- `PATCH /settings/lookups/:groupCode/:id/status`
- `PUT /settings/lookups/:groupCode/order`

List query: `search`, `status`, `parentValueId?`, `sort=sortOrder|name|code|updatedAt`, `sortOrder`,
`page`, `pageSize`. Create is `{name,code,sortOrder,parentValueId?,status}`. Update accepts
`name?`, `sortOrder?`, `parentValueId?`, and `expectedVersion`; code is stable. Status uses the shared
status request. Value response adds group ID/code, version/audit fields, and computed permissions.

Codes and normalized labels are unique inside one group across all statuses. Parent values must match
the group's configured parent group and cannot form cycles. Parent archive is refused while any
non-archived child exists. Inactive/archived values remain directly resolvable but consumer choices
mark them disabled or omit them from new selection.

Reorder request:

```json
{
  "items": [
    { "id": "uuid", "sortOrder": 10, "expectedVersion": 2 },
    { "id": "uuid", "sortOrder": 20, "expectedVersion": 4 }
  ],
  "expectedGroupVersion": 7
}
```

IDs must be unique, belong to the path group, and carry current versions. The operation updates every
item and the group atomically and returns the affected values ordered by `sortOrder`, normalized name,
then ID. Repeated sortOrder values are allowed; negative values are rejected.

## Consumer projections

Organization exports a bounded typed read service for downstream modules. Every configurable business
dropdown (qualifications, study modes, lead sources, academic grades, payment methods, expense
categories/sub-categories, and future approved groups) resolves from this source. Consumers store the
lookup value ID and may resolve historical inactive/archived labels; they do not copy master rows or
hardcode active choices.

## Permissions and errors

- Read: `settings.lookups.view`
- Create group/value: `settings.lookups.create`
- Edit, reorder, status, archive: `settings.lookups.update`

Errors use the shared catalogue: `VALIDATION_ERROR` 422, `DUPLICATE_VALUE` 409, `NOT_FOUND` 404,
`FORBIDDEN` 403, `ENTITY_IN_USE` 409, `INVALID_STATE` 409, and `VERSION_CONFLICT` 409 with
`currentVersion`. All messages/details are Arabic and disclose no foreign-group contents.

