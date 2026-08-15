# Feature Specification: Organization Master Settings

**Feature Branch**: `[004-organization-master-settings]`

**Created**: 2026-08-02

**Status**: Ready for planning

**Input**: User description: "Manage branches, departments, academic years, academic terms, and organization-wide settings as shared master data for the Education Operations Platform."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintain Organizational Structure (Priority: P1)

An authorized administrator creates and maintains branches and departments so employees and future business records can consistently reference the academy's operational structure.

**Why this priority**: Branches and departments are foundational master data required by Identity and every later operational module.

**Independent Test**: Create a branch and department, find them through search and filters, update them with the current version, change their status, and verify archived records remain historically available.

**Acceptance Scenarios**:

1. **Given** an authorized administrator and unused unique codes, **When** the administrator creates a branch and department with valid information, **Then** both records become available to authorized consumers.
2. **Given** existing records, **When** the administrator searches, sorts, filters, or pages the corresponding list, **Then** the matching records appear in a stable and accurate order.
3. **Given** an active branch or department, **When** the administrator archives it, **Then** it is excluded from active choices but remains available for historical references.
4. **Given** a duplicate code or stale record version, **When** the administrator submits a mutation, **Then** no change is saved and a clear conflict is returned.

---

### User Story 2 - Control the Academic Calendar (Priority: P2)

An authorized administrator creates academic years and their terms, then activates the appropriate calendar records so academic operations use one coherent schedule.

**Why this priority**: A valid calendar is required before Academic Catalog, Admissions, Students, and Finance can schedule or classify activity.

**Independent Test**: Create two years and several terms, filter terms by year, validate date boundaries and overlap rules, activate one year, and verify no second year remains active.

**Acceptance Scenarios**:

1. **Given** valid start and end dates, **When** the administrator creates an academic year, **Then** the year is saved in a non-active state until explicitly activated.
2. **Given** multiple eligible years, **When** one year is activated, **Then** it becomes the sole active academic year and any previously active year becomes inactive.
3. **Given** an academic year, **When** a term is created within its date boundaries, **Then** the term belongs only to that year and appears in year-filtered results.
4. **Given** a term date range outside its year or overlapping another term in the same year, **When** it is submitted, **Then** the request is rejected without partial changes.
5. **Given** an archived year or term, **When** active choices are requested, **Then** the archived record is excluded while remaining historically resolvable.

---

### User Story 3 - Maintain Shared Organization Settings (Priority: P3)

An authorized administrator views the organization identity and updates approved branding and operational defaults so every module presents and applies consistent organization-wide settings.

**Why this priority**: Shared defaults prevent modules from introducing contradictory language, time-zone, currency, date, branding, and reference choices.

**Independent Test**: Read the organization profile and settings, update every approved field using the current version, verify active defaults, and prove an invalid field or reference leaves the aggregate unchanged.

**Acceptance Scenarios**:

1. **Given** an authorized administrator, **When** organization settings are opened, **Then** the current identity, branding, locale, time-zone, currency, date format, and defaults are displayed.
2. **Given** valid approved settings and the current version, **When** the administrator saves changes, **Then** all business modules receive the same updated values.
3. **Given** an unsupported locale standard, invalid asset descriptor, inactive default reference, or stale version, **When** an update is submitted, **Then** the entire update is rejected and existing settings remain intact.
4. **Given** the organization legal identity has been established during initial system setup, **When** an administrator attempts to change its name, **Then** the request is rejected and the legal identity remains unchanged.

---

### User Story 4 - Configure Reusable Lookup Values (Priority: P4)

An authorized administrator maintains lookup groups and their ordered values so business modules use configurable classifications instead of hardcoded choices.

**Why this priority**: Configurable lookups let the organization adapt shared business classifications without software changes while preserving one authoritative catalogue.

**Independent Test**: Create a lookup group and several values, update their labels and ordering, archive a value, and verify active consumers receive only selectable values while historical references remain resolvable.

**Acceptance Scenarios**:

1. **Given** an unused group code, **When** the administrator creates a lookup group, **Then** it becomes available for authorized value administration and downstream consumption.
2. **Given** a lookup group, **When** the administrator creates uniquely coded values with explicit sort orders, **Then** active values are returned in deterministic order.
3. **Given** an ordered set of values, **When** the administrator submits a valid complete reorder, **Then** all affected values change order atomically.
4. **Given** a lookup group or value referenced historically, **When** it is archived, **Then** it is no longer selectable but its label remains resolvable.
5. **Given** a duplicate normalized code, invalid hierarchy, stale version, incomplete reorder, or record with blocking dependencies, **When** a mutation is submitted, **Then** no partial change is retained.

---

### User Story 5 - Consume Authoritative Master Data (Priority: P5)

A future business module requests active organization master data and receives bounded, authoritative choices rather than duplicating branch, department, calendar, or classification values.

**Why this priority**: Central consumption preserves consistency and historical meaning as the platform grows.

**Independent Test**: Request active master-data choices, confirm archived values are not selectable, and confirm historical records can still resolve their saved labels.

**Acceptance Scenarios**:

1. **Given** active and archived master records, **When** a downstream module requests selectable values, **Then** only eligible active records are returned in stable order.
2. **Given** a historical record referencing an archived master value, **When** that record is displayed, **Then** its saved reference remains resolvable.
3. **Given** configurable lookup groups and values, **When** a downstream module requests a classification catalogue, **Then** it receives the Organization-owned active values rather than hardcoded or duplicated choices.

### Edge Cases

- A branch manager becomes suspended, archived, or outside the caller's authorized branch scope.
- An administrator archives a branch or department still referenced by employees or operational defaults.
- Two administrators activate different academic years concurrently.
- A term touches another term's boundary date; date ranges are inclusive, so the records overlap on that day.
- An academic year is shortened after existing terms have been created within its former boundaries.
- Search contains Arabic spelling variants, diacritics, or Arabic-Indic digits.
- The requested page is beyond the final page; the result is empty while pagination totals remain correct.
- An administrator submits unknown, derived, immutable, or unsafe file-path fields.
- Two academic terms in the same year are assigned the same order, or a mutation would leave a gap in the sequence.
- A lookup hierarchy mutation would create a cycle or place a value under a parent from another group.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized administrators to create, view, update, activate, inactivate, and archive branches without permanently deleting them.
- **FR-002**: Each branch MUST have a unique code, name, address, phone, email, optional eligible manager, status, and version.
- **FR-003**: The system MUST allow authorized administrators to create, view, update, activate, inactivate, and archive departments without permanently deleting them.
- **FR-004**: Each department MUST have a unique code, name, description, status, and version.
- **FR-005**: Branch and department lists MUST support Arabic-normalized search, approved sorting, status filtering, stable pagination, and caller branch scope.
- **FR-006**: Active branch managers MUST reference eligible employees, and records in active use MUST NOT be archived when doing so would invalidate a required reference.
- **FR-007**: The system MUST allow authorized administrators to create, view, update, activate, inactivate, and archive academic years.
- **FR-008**: Each academic year MUST have a unique name and code, date-only start and end dates, status, and version; its end date MUST NOT precede its start date.
- **FR-009**: Exactly one eligible academic year MUST be active after activation, including when activation requests occur concurrently.
- **FR-010**: Activating an academic year MUST update the organization-wide default academic year as one indivisible operation.
- **FR-011**: The system MUST allow authorized administrators to create, view, update, activate, inactivate, and archive academic terms.
- **FR-012**: Each academic term MUST belong to exactly one academic year, carry a name, date-only start and end dates, numeric order, status, and version, and remain wholly contained within its year.
- **FR-013**: Active or inactive terms in the same academic year MUST NOT overlap on any inclusive calendar date, including a shared boundary date.
- **FR-014**: Academic-term lists MUST support filtering by academic year, search, approved sorting, status filtering, and pagination.
- **FR-015**: Academic-term order values MUST be unique within each academic year and MUST form a contiguous sequence without duplicates or gaps after every create, reorder, move, archive, or reactivation operation.
- **FR-016**: The system MUST expose the organization profile and operational settings to authorized users using the shared response and authorization rules.
- **FR-017**: Approved organization-setting updates MUST be atomic and protected by optimistic concurrency.
- **FR-018**: Operational settings MUST support default language, time zone, currency, date format, working days, default branch, and default academic year, with default references restricted to eligible active records.
- **FR-019**: Organization branding assets MUST be represented by safe public descriptors and MUST NOT disclose filesystem paths or storage secrets.
- **FR-020**: Every protected operation MUST enforce the exact permission assigned to its resource and action, and detail reads MUST include computed per-record permissions.
- **FR-021**: Every successful response, validation failure, conflict, missing record, and out-of-scope refusal MUST use the platform-wide response conventions and documented Arabic error vocabulary.
- **FR-022**: Every state-changing business operation MUST be audit-ready by producing actor, target, operation, time, and resulting-state information only after a successful commit.
- **FR-023**: Archived master data MUST be excluded from default active choices but remain queryable and resolvable for historical use.
- **FR-024**: Downstream modules MUST consume Organization-owned master data rather than storing independent copies.
- **FR-025**: Unknown request fields, derived labels, immutable fields, and stale versions MUST be rejected without partial writes.
- **FR-026**: The system MUST allow authorized administrators to create, view, update, activate, inactivate, and archive configurable lookup groups and lookup values.
- **FR-027**: Lookup-group codes MUST be unique within the organization, and lookup-value codes and normalized names MUST be unique within their group.
- **FR-028**: Each lookup value MUST include a name, code, sort order, lifecycle status, version, and optional valid parent value from the same group.
- **FR-029**: Lookup groups and values MUST support search, filtering, stable pagination, deterministic ordering, and historical label resolution.
- **FR-030**: A lookup hierarchy MUST NOT contain cycles, and archival MUST be refused when unresolved active dependencies would be invalidated.
- **FR-031**: Reordering lookup values MUST validate exact membership and current versions and MUST apply the complete new order atomically.
- **FR-032**: Downstream modules MUST obtain configurable business classifications from the Organization-owned lookup catalogue rather than hardcoded dropdown values.

### Key Entities

- **Organization Profile**: The academy's legal identity, approved branding assets, public contact presentation, and organization-wide version.
- **General Settings**: Shared locale, time-zone, currency, date, working-day, branch, and academic-year defaults.
- **Branch**: An operational location with a unique code, contact details, manager assignment, lifecycle status, and historical references.
- **Department**: An organizational unit with a unique code, description, lifecycle status, and employee references.
- **Academic Year**: A bounded calendar period that owns terms and may become the sole active/default year.
- **Academic Term**: A non-overlapping date range contained by exactly one academic year, with a unique contiguous order within that year.
- **Lookup Group**: An Organization-owned configurable classification family with a unique code, lifecycle status, optional hierarchy, and version.
- **Lookup Value**: An ordered selectable or historical value belonging to one lookup group, with a unique code and optional same-group parent.
- **Master-Data Reference**: A stable relationship from another module to an Organization-owned record, preserving historical resolution after archival.

### API Contract Alignment *(mandatory when the feature exposes HTTP endpoints)*

- **Documented endpoints covered**: `GET/PATCH /api/v1/organization/profile`; `GET/PATCH /api/v1/settings/general`; list, detail, create, update, and status operations under `/api/v1/settings/branches`, `/api/v1/settings/departments`, `/api/v1/settings/academic-years`, `/api/v1/settings/academic-terms`, and the approved configurable lookup group/value routes; `POST /api/v1/settings/academic-years/:id/activate`.
- **Requirements document sections**: §3 shared API conventions; §4.2 Organization & Settings; §5.2 Organization & Settings frontend-to-backend mapping; approved Organization & Settings contract amendment.
- **Contract gaps found**: The owner resolved all three differences: organization name remains immutable after initial setup; configurable lookup administration remains in scope; and academic terms gain explicit unique contiguous ordering per academic year. The canonical requirements document MUST be amended with the term-order contract before implementation of that field begins. No undocumented endpoint is assumed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized administrator can complete a valid branch, department, year, or term creation in under two minutes without technical assistance.
- **SC-002**: At least 95% of searches and filtered list requests show the first result page within one second under expected operational load.
- **SC-003**: In 100% of concurrent academic-year activation trials, exactly one eligible year remains active and matches the organization default.
- **SC-004**: In 100% of invalid date, overlap, duplicate, dependency, scope, and stale-version trials, no partial change is retained.
- **SC-005**: All 16 defined acceptance and edge-condition test groups complete without exposing internal paths, secrets, stack traces, or another branch's data.
- **SC-006**: Every representative downstream module obtains active branch, department, academic-year, and academic-term choices from the shared master-data source, with no duplicated business choice catalogue.
- **SC-007**: Archived master-data references remain resolvable in 100% of historical-reference verification cases while being absent from active selections.
- **SC-008**: At least 90% of representative administrators complete the primary maintenance flows correctly on their first attempt in acceptance testing.
- **SC-009**: In 100% of academic-term lifecycle and reorder trials, each year's resulting order is unique and contiguous from the first position through its final term.
- **SC-010**: In 100% of representative lookup-consumer checks, selectable classifications come from the Organization-owned active catalogue and archived historical labels remain resolvable.

## Assumptions

- Authentication, employee identity, roles, permissions, and caller branch scope are supplied by the existing Identity & Access Management module.
- Only authorized administrators may mutate Organization & Settings data; other authorized consumers may receive read-only master-data projections.
- Calendar dates are inclusive date-only values, and archived records are retained indefinitely unless a later retention policy explicitly changes this.
- The shared platform response envelope, pagination behavior, Arabic validation messages, optimistic concurrency, and permission catalogue remain binding.
- File upload/storage mechanics are outside this feature; it accepts only already-created safe asset descriptors.
- Organization name and code are established during initial system setup and remain immutable afterward.
- Academic-term order is administrator-defined, starts at the first position, and remains a contiguous integer sequence within each academic year.
- Configurable lookup groups and values remain Organization-owned master data and are fully administrable within this feature.
- Users, Admissions, Students, Finance, Accounting, CRM, and AI behavior remain outside this feature even when those modules consume its master data.
