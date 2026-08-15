# Feature Specification: Organization & Settings

**Feature Branch**: `002-organization-settings`

**Created**: 2026-07-31

**Status**: Draft

**Input**: Administrative configuration for organization profile, branches, departments,
academic calendar, internal users, roles, permissions, and general settings using mock services.

## User Scenarios & Testing

### User Story 1 - Configure the Organization (Priority: P1)

As a Super Admin or Organization Admin, I can maintain the organization's identity, contact,
location, locale, and default settings so every operational module receives authoritative
organization context.

**Independent Test**: Open organization settings, edit valid profile and general-setting values,
save them, and verify that the mock service returns the updated configuration after reload.

**Acceptance Scenarios**:

1. **Given** an authorized administrator views the organization profile, **When** valid changes
   are saved, **Then** progress, success feedback, and refreshed values are shown.
2. **Given** required, email, phone, or locale values are invalid, **When** save is attempted,
   **Then** accessible field-level errors prevent submission.
3. **Given** the logo or cover is replaced, **When** a supported file is selected, **Then** a
   preview is shown and the choice remains behind the organization service boundary.

### User Story 2 - Manage Organizational Structure (Priority: P1)

As an administrator, I can create and update branches and departments, archive or reactivate
branches, and activate or deactivate departments so operational records use configurable
organizational units.

**Independent Test**: Create, edit, archive, reactivate, search, filter, sort, and paginate branch
and department records without deleting a branch.

**Acceptance Scenarios**:

1. **Given** a unique valid branch, **When** it is created, **Then** it appears in the shared data
   table and is available to dependent selectors.
2. **Given** an active branch, **When** archive is confirmed, **Then** its state becomes archived
   without deleting its identity or relationships.
3. **Given** a duplicate branch code, **When** save is attempted, **Then** submission is rejected
   with a specific validation message.

### User Story 3 - Configure the Academic Calendar (Priority: P1)

As an administrator, I can manage academic years and their terms so date-bound educational work
uses one active year and correctly nested terms.

**Independent Test**: Create and activate years on `/settings/academic-years`; then open
`/settings/academic-terms`, filter by parent year, create and edit a term, and verify that the
previous active year is no longer active and every term remains attached to exactly one year.

**Acceptance Scenarios**:

1. **Given** another academic year is active, **When** an administrator activates a different
   year, **Then** the prior year becomes inactive in the same service operation.
2. **Given** an end date precedes its start date, **When** save is attempted, **Then** validation
   blocks the operation.
3. **Given** a term is created, **When** it is saved, **Then** it belongs to exactly one academic
   year and its dates fall within that year's range.
4. **Given** an administrator opens the standalone academic-terms route, **When** they search,
   filter, sort, or paginate, **Then** the parent academic year remains visible and filterable.

### User Story 4 - Manage Administrative Access (Priority: P2)

As an administrator, I can maintain internal users, custom roles, and module-grouped permissions
so access configuration is reusable and ready for future backend authorization.

**Independent Test**: Create and edit a user, assign multiple roles, then open
`/settings/permissions`, select a role, configure its permission matrix, and verify inherited
permission previews and permission-aware controls.

**Acceptance Scenarios**:

1. **Given** valid user details, **When** one or more roles are assigned, **Then** the user exposes
   the combined inherited permission keys without storing a password.
2. **Given** a role permission matrix, **When** permissions are saved, **Then** assignments remain
   grouped by module and action.
3. **Given** an administrator lacks an action permission, **When** the corresponding screen is
   viewed, **Then** the action is absent or disabled with an accessible explanation.
4. **Given** the permissions route is opened directly, **When** a role is selected, **Then** its
   grouped assignments load and save through the permission service contract.

### User Story 5 - Find and Review Administrative Records (Priority: P2)

As an administrator, I can search, filter, sort, paginate, and inspect loading, empty, and error
states across all lists so large configurations remain usable.

**Independent Test**: Exercise each list with matching, non-matching, loading, failed, sorted,
filtered, and paginated mock results on desktop, laptop, and tablet.

### Edge Cases

- An archived branch remains referenced by an existing user or default setting.
- A branch selected as the default is archived.
- An academic year overlaps another year or activation is attempted concurrently.
- A term falls outside its parent year or overlaps another term in the same year.
- A role is deactivated while assigned to users.
- The last administrative role loses a critical settings permission.
- A user has roles with overlapping permissions.
- Uploaded image type or size is unsupported.
- Search contains Arabic and left-to-right fragments such as codes or email addresses.
- Mock service save fails after optimistic form interaction.

## Requirements

### Functional Requirements

- **FR-001**: Authorized administrators MUST manage the canonical organization name, Arabic and
  English names, logo, cover, description, contacts, website, address, country, city, time zone,
  currency, and language preferences.
- **FR-002**: The system MUST manage branches with name, unique code, address, contacts, manager,
  working hours, and status.
- **FR-003**: Branches MUST support create, edit, archive, and activate; permanent deletion MUST NOT be offered.
- **FR-004**: The system MUST manage departments with name, description, and status.
- **FR-005**: The system MUST manage academic years with name, start date, end date, and status.
- **FR-006**: Exactly zero or one academic year MAY be active; activating one MUST deactivate the previous active year atomically at the service boundary.
- **FR-007**: The system MUST manage academic terms that belong to exactly one academic year.
- **FR-008**: Term dates MUST be consistent and MUST fall within the parent academic year's date range.
- **FR-009**: The system MUST manage internal users with name, email, phone, profile image, branch,
  department, assigned roles, and status; password management is excluded.
- **FR-010**: Users MUST support create, edit, activate, and deactivate and MAY hold multiple roles.
- **FR-011**: The system MUST manage custom roles with name, description, status, and many-to-many user assignments.
- **FR-012**: Permissions MUST be grouped by configurable module and action and assigned to roles.
- **FR-013**: User effective permissions MUST be derivable from the union of active assigned roles.
- **FR-014**: General settings MUST include default language, time zone, currency, date format,
  number format, working days, default branch, and default academic year.
- **FR-015**: Administrative lists MUST support search, sorting, applicable filters, pagination,
  row selection, business-safe bulk actions, loading, empty, error, and successful states through
  the shared table system. Bulk deletion of branches MUST NOT be offered.
- **FR-016**: Forms MUST use React Hook Form with authoritative Zod schemas for required fields,
  unique codes, valid email and phone formats, and date consistency.
- **FR-017**: Pages MUST access data only through Promise-based feature service functions backed by mock data in this phase.
- **FR-018**: All create, update, activation, archive, and permission actions MUST expose loading,
  success, and failure feedback using shared patterns and Sonner.
- **FR-019**: UI routes and actions MUST be filtered by typed permission keys while acknowledging that mock permission checks are not a security boundary.
- **FR-020**: Entities MUST be audit-ready with typed created-at, updated-at, created-by, and updated-by fields where applicable, without implementing audit history.
- **FR-021**: The module MUST remain RTL-first, keyboard operable, screen-reader compatible, and responsive on desktop, laptop, and tablet.
- **FR-022**: Organization values, branches, departments, roles, statuses, permission groups, and settings MUST be configurable data rather than page constants.
- **FR-023**: The feature MUST NOT implement product catalog, students, enrollments, CRM, finance,
  reports, AI behavior, live identity providers, email, SMS, databases, or live APIs.
- **FR-024**: The module MUST expose independently deep-linkable `/settings`,
  `/settings/organization`, `/settings/branches`, `/settings/departments`,
  `/settings/academic-years`, `/settings/academic-terms`, `/settings/users`, `/settings/roles`,
  `/settings/permissions`, and `/settings/general` routes; every child route MUST define its own
  navigation metadata and typed view permission.

### Key Entities

- Organization Profile
- Organization Contact
- Branch
- Branch Working Hours
- Department
- Academic Year
- Academic Term
- Internal User
- Role
- Permission Group
- Permission
- Role Permission Assignment
- User Role Assignment
- General Settings
- Audit Metadata
- List Query and Paginated Result

## Success Criteria

- **SC-001**: An authorized administrator completes each create or edit workflow in under two minutes without assistance.
- **SC-002**: Every administrative list demonstrates search, filtering, sorting, pagination, loading, empty, and error behavior using the shared table.
- **SC-003**: Tests prove that no operation results in more than one active academic year.
- **SC-004**: Tests prove that a term cannot exist without one parent year or outside its date range.
- **SC-005**: All primary workflows are completable by keyboard with zero serious accessibility violations.
- **SC-006**: All screens operate without horizontal page overflow at representative desktop, laptop, and tablet viewports.
- **SC-007**: Replacing mock service adapters with API adapters requires no page or presentational-component changes.
