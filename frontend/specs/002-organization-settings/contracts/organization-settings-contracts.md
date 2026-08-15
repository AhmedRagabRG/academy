# Contracts: Organization & Settings

These are internal frontend/service/UI contracts. No HTTP or OpenAPI contract is defined because
live backend integration is out of scope.

## Public Feature Boundary

`features/organization-settings/index.ts` exports route screens, permission/navigation
contributions, including route-facing `AcademicTermsScreen` and `PermissionsScreen`, types needed
by consumers, and testing adapter controls. Pages import only this
boundary. Fixtures, mock adapter internals, and schemas not needed by consumers remain private.

## Service Facade

All operations return Promises and typed results or typed `OrganizationSettingsError` failures.

- Profile: `getOrganizationProfile`, `updateOrganizationProfile`
- Branches: `listBranches`, `getBranch`, `createBranch`, `updateBranch`, `changeBranchStatus`
- Departments: `listDepartments`, `getDepartment`, `createDepartment`, `updateDepartment`, `changeDepartmentStatus`
- Calendar: `listAcademicYears`, `createAcademicYear`, `updateAcademicYear`, `activateAcademicYear`,
  `deactivateAcademicYear`, `listAcademicTerms(query)` with optional `academicYearId` filter,
  `getAcademicTerm`, `createTerm`, `updateTerm`, `changeTermStatus`
- Users: `listUsers`, `getUser`, `createUser`, `updateUser`, `changeUserStatus`, `replaceUserRoles`
- Roles: `listRoles`, `getRole`, `createRole`, `updateRole`, `changeRoleStatus`, `replaceRolePermissions`
- Permissions: `getPermissionCatalog`, `getRolePermissions(roleId)`,
  `replaceRolePermissions(roleId, permissionIds, expectedVersion)`, and
  `getEffectivePermissions(userId)`. Catalog definitions are seeded configurable data in this
  phase; the standalone screen manages role assignments rather than catalog-definition CRUD.
- Settings: `getGeneralSettings`, `updateGeneralSettings`
- Lookups: `getOrganizationLookups` for service-driven statuses, locales, countries, time zones,
  currencies, formats, branches, departments, users, roles, and academic years

Create/update commands contain normalized form values; update and state commands carry
`expectedVersion`. Business-specific operations are explicit rather than generic CRUD.

## List Contract

Each list operation accepts `{ search?, filters, sort?, page, pageSize }` and returns
`{ items, total, page, pageSize, totalPages }`. Page is one-based. Searchable and sortable fields
are declared per aggregate. The service owns normalization, Arabic-aware matching, filtering,
sorting, and pagination. Pages never filter fixture arrays.

## Query Key and Cache Contract

Use a feature key factory rooted at `['organization-settings']` with profile, lookup,
`academicYears.list/detail`, `academicTerms.list(query)/detail`, `permissions.catalog`,
`permissions.role(roleId)`, effective-permission, other aggregate list/detail, and general-setting branches.
Mutations invalidate the narrow affected list/detail/lookup/default/effective-permission keys.
Invariant-heavy writes are pessimistic: keep form input, show pending state, commit service result,
then invalidate/refetch. Do not expose impossible optimistic calendar or permission states.

## Error Contract

Failures contain `code`, `kind`, safe Arabic message key, optional field-error map, `retryable`, and
optional dependency summary. Expected field errors map into RHF; conflict/state/dependency errors
remain visible near the action and through Sonner; unexpected details are never exposed.

Mock adapter modes reproduce success, latency, empty list, field validation, duplicate, version
conflict, dependency conflict, permission failure, and unexpected error without page flags.

## Form Contract

- RHF owns values/touched/dirty/submission state and consumes one feature Zod schema.
- Shared inputs render labels, descriptions, errors, disabled state, and accessible relationships.
- The first invalid field receives focus; submission uses `aria-busy`; server field errors persist
  until correction or resubmission.
- Email, phone, URL, codes, dates, and numbers use appropriate `dir="ltr"` or bidi isolation.
- Unsaved changes are retained after service failures; successful saves reset dirty state.
- Media selection reuses react-dropzone and `FileAsset` preview contracts.

## Controlled Data Table Contract

The shared table supports both existing local mode and controlled/manual mode. Controlled mode
receives rows, total count, stable `getRowId`, query state, search/filter/sort/page state and
callbacks, loading/error/empty render state, column visibility, row and bulk actions, and retry.
Selection is reconciled when query results change. Only the table viewport may horizontally
scroll; headers, accessible sort state, selection labels, and pagination remain semantic.

## Permission Contract

Navigation and actions use stable permission keys supplied by catalog records. Effective access is
the union from active roles assigned to an active user. Permission-matrix groups use fieldsets and
module-level select-all with accessible checked/indeterminate state. Mock checks control affordances
only; the future backend remains the authorization authority.

## State-Transition Contract

- Branch: active ↔ archived; no delete; default archival blocked without reassignment.
- Department, user, role: active ↔ inactive; relationships retained; inactive targets unavailable
  for new assignments.
- Academic year: activation is atomic and maintains zero-or-one active/default year.
- Term: immutable parent; valid contained non-overlapping range; activation requires active parent.
- Administrative safety: no mutation may remove the final effective critical administrator.

Confirmation dialogs state consequences and affected dependencies, expose pending state, support
Escape/cancel, and return focus to the initiating control.

## Navigation Contract

The feature contributes a settings navigation group and nine child records through configuration:
organization, branches, departments, academic years, academic terms, users, roles, permissions,
and general settings. Each uses its own view key, including `settings.academicTerms.view` and
`settings.permissions.view`; create/update/status/export/approve permissions remain separate.
Each record has stable ID, Arabic title, localization key, Lucide icon key, route, permission key,
and optional children. Routes own metadata and breadcrumbs; action permission decisions do not
live in pages.

| Route | View permission |
|---|---|
| `/settings` | `settings.view` |
| `/settings/organization` | `settings.organization.view` |
| `/settings/branches` | `settings.branches.view` |
| `/settings/departments` | `settings.departments.view` |
| `/settings/academic-years` | `settings.academicYears.view` |
| `/settings/academic-terms` | `settings.academicTerms.view` |
| `/settings/users` | `settings.users.view` |
| `/settings/roles` | `settings.roles.view` |
| `/settings/permissions` | `settings.permissions.view` |
| `/settings/general` | `settings.general.view` |

## Future Adapter Contract

Opaque IDs, `organizationId`, versions, audit actors, ISO/BCP/IANA values, paginated DTOs, explicit
commands, and typed errors remain transport-neutral. Replacing the mock implementation with REST,
GraphQL, or server functions must not change page or presentational-component contracts.
