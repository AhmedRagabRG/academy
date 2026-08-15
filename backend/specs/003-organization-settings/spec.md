# Feature Specification: Organization & Settings

**Feature Branch**: `[003-organization-settings]`

**Created**: 2026-08-02

**Status**: Ready for planning

**Input**: User description: "Manage organization branches, departments, academic years, configurable lookup values, organization-wide settings, search, filtering, pagination, validation, archival, and authorization."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Maintain Branches and Departments (Priority: P1)

An authorized administrator maintains the organizational structure used by employee assignments and future operational records. They can find, create, edit, activate, deactivate, and archive branches and departments without losing historical references.

**Why this priority**: Branches and departments establish the ownership and reporting structure required by every later business module.

**Independent Test**: Create one branch and one department, locate each through search and filters, update them with their current versions, change their statuses, and prove that archival preserves detail access while excluding them from default active choices.

**Acceptance Scenarios**:

1. **Given** an authorized administrator and valid unique data, **When** a branch or department is created, **Then** the complete record is returned with active status, version, and audit attribution.
2. **Given** multiple records, **When** the administrator searches, sorts, filters by status, or changes page, **Then** only matching records are returned with accurate pagination.
3. **Given** a current record version, **When** mutable fields are edited, **Then** the record is updated and its version advances without accepting server-owned or status fields.
4. **Given** an unreferenced branch or department, **When** it is archived, **Then** it remains retrievable for historical use and is excluded from default active selections.
5. **Given** a branch or department still required by active records, **When** archival is attempted, **Then** the operation is refused without changing the record.

---

### User Story 2 - Control the Academic Calendar (Priority: P2)

An authorized administrator maintains academic years and their academic terms, and selects the single year currently governing platform defaults and academic operations.

**Why this priority**: A consistent active academic period is necessary before catalog, admissions, student, and finance records can use shared calendar context.

**Independent Test**: Create two academic years and several non-overlapping terms, filter terms by year, activate each year in turn, and verify that exactly one year is active, invalid or overlapping term dates and duplicate codes are rejected, and historical periods remain available.

**Acceptance Scenarios**:

1. **Given** valid unique dates and code, **When** an academic year is created, **Then** it is available for future activation and historical selection.
2. **Given** one active academic year and another eligible year, **When** the administrator activates the other year, **Then** the previous year becomes inactive and exactly one year remains active.
3. **Given** an archived year, **When** activation is attempted, **Then** the operation is refused without changing the currently active year.
4. **Given** an end date before the start date or a duplicate code, **When** saving is attempted, **Then** validation identifies the offending field and no record is changed.
5. **Given** an academic year, **When** an administrator manages its terms, **Then** they can create, view, edit, filter, activate, deactivate, and archive terms without permanently deleting historical records.
6. **Given** two terms in the same academic year, **When** their inclusive date ranges overlap, **Then** the later create or update is rejected without changing either term.

---

### User Story 3 - Configure Reusable Lookup Values (Priority: P3)

An authorized administrator maintains reusable classifications such as qualifications, study modes, lead sources, academic grades, payment methods, and expense categories so future modules consume one authoritative value set.

**Why this priority**: Centralized classifications prevent business modules from inventing duplicate labels and codes.

**Independent Test**: Add, edit, order, deactivate, reactivate, and archive values in two lookup groups, then verify active consumers see the new values while historical records continue resolving inactive or archived labels.

**Acceptance Scenarios**:

1. **Given** a supported lookup group, **When** a unique value is created, **Then** it becomes available to consumers without a software release.
2. **Given** active and archived values, **When** a consumer requests selectable values, **Then** active values are selectable and historical values remain resolvable but disabled.
3. **Given** an expense category with non-archived child sub-categories, **When** the category is archived, **Then** the operation is refused until every child is archived, and no child is orphaned.
4. **Given** an authorized administrator, **When** they manage lookup groups and values, **Then** they can create, view, edit, reorder, activate, deactivate, and archive them without a software release.
5. **Given** a form requiring a configurable business classification, **When** its choices are displayed, **Then** they come from authoritative active lookup values rather than a duplicated hardcoded list.

---

### User Story 4 - Maintain Operational Defaults (Priority: P4)

An authorized administrator reviews immutable legal identity, updates approved public profile fields, and updates operational defaults such as language, time zone, date and number formats, working days, default branch, and default academic year.

**Why this priority**: Shared defaults keep dates, language, currency, and organizational context consistent throughout the platform.

**Independent Test**: Read the organization profile and general settings; update branding, contacts, communication details, and every permitted default using current versions; prove name and code changes are rejected; and verify consumers receive the committed values.

**Acceptance Scenarios**:

1. **Given** an authenticated authorized administrator, **When** organization identity is requested, **Then** its immutable name and code plus current contacts, public address, branding descriptors, working hours, and social links are returned.
2. **Given** valid active default references and a current version, **When** general settings are updated, **Then** all values change together and the version advances.
3. **Given** an inactive or unknown default branch or academic year, **When** settings are saved, **Then** the update is rejected without partial changes.
4. **Given** an administrator submits profile changes containing organization name or organization code, **When** the request is validated, **Then** those immutable fields are rejected and no profile data changes.
5. **Given** a current profile version and valid approved fields, **When** logo, favicon, cover image, contact emails, phone numbers, website, address, working hours, or social links are updated, **Then** all accepted changes commit together and the version advances.

### Edge Cases

- Two administrators submit updates from the same original version.
- A code differs from an existing code only by case or surrounding whitespace.
- An administrator requests a page beyond the final page or a page size above the platform limit.
- Arabic search text contains alternate alef/yaa/taa-marbuta forms, diacritics, or Arabic-Indic digits.
- The currently active academic year is archived, deactivated, or changed while another administrator attempts activation.
- An academic term falls outside its parent academic year.
- Two academic terms meet on the same boundary date or an update causes a term to overlap a sibling term.
- A manager, default branch, or default academic year becomes inactive between validation and save.
- An archived value is still referenced by historical records in another module.
- A lookup label is duplicated within one group but is valid in a different group.
- The primary contact is removed while another contact of the same type exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized administrators to list, view, create, edit, and change the status of branches.
- **FR-002**: A branch MUST contain a unique normalized code, name, address, phone, email, working hours, optional manager reference, status, version, and audit attribution.
- **FR-003**: Branch codes MUST be compared case-insensitively after trimming and MUST remain unique across active, inactive, and archived records.
- **FR-004**: The system MUST allow authorized administrators to list, view, create, edit, and change the status of departments.
- **FR-005**: A department MUST contain a unique normalized code, name, description, status, version, and audit attribution.
- **FR-006**: Department codes MUST be compared case-insensitively after trimming and MUST remain unique across active, inactive, and archived records.
- **FR-007**: Branch and department archival MUST preserve records for historical references and MUST NOT permanently delete them.
- **FR-008**: Archival MUST be refused when an active dependency would be left invalid, using a non-disclosing dependency error and leaving all state unchanged.
- **FR-009**: The system MUST allow authorized administrators to list, view, create, edit, change status, and explicitly activate academic years.
- **FR-010**: An academic year MUST contain a unique normalized code, name, start date, end date, status, version, and audit attribution.
- **FR-011**: An academic year's end date MUST be on or after its start date.
- **FR-012**: Academic-year codes MUST remain unique across every status.
- **FR-013**: Exactly one non-archived academic year MUST be active after initial configuration.
- **FR-014**: Activating an academic year MUST deactivate the previously active year as one indivisible operation.
- **FR-015**: An archived academic year MUST NOT be activated, and the last active year MUST NOT be deactivated without activating a replacement.
- **FR-016**: The system MUST allow authorized administrators to list, view, create, edit, filter by academic year and status, and change the status of academic terms.
- **FR-017**: An academic term MUST contain a parent academic-year reference, name, start date, end date, status, version, and audit attribution.
- **FR-018**: Each academic term MUST fall entirely within its parent academic year's inclusive date range.
- **FR-019**: Academic terms belonging to the same academic year MUST NOT have overlapping inclusive date ranges; terms in different academic years are evaluated independently.
- **FR-020**: Academic terms MUST be archived rather than permanently deleted so historical references remain resolvable.
- **FR-021**: The system MUST provide a bounded settings lookup feed containing languages, time zones, currencies, countries, locales, and weekdays required by settings forms.
- **FR-022**: The system MUST allow authorized administrators to list, view, create, edit, reorder, activate, deactivate, and archive configurable lookup groups and values.
- **FR-023**: A configurable lookup value MUST contain a name, code, sort order, status, version, audit attribution, and one owning lookup group.
- **FR-024**: A lookup group MUST have a stable unique code, display name, status, version, and audit attribution and MUST define the namespace in which value codes are unique.
- **FR-025**: Lookup value codes MUST be unique within their group after normalization; the same code MAY exist in different groups.
- **FR-026**: Parent-child lookup groups such as expense categories and sub-categories MUST preserve referential integrity during status changes and archival.
- **FR-027**: Configurable business dropdowns MUST resolve choices from the authoritative lookup catalogue rather than duplicated hardcoded choices in consuming modules.
- **FR-028**: Active lookup values MUST be selectable for new records; inactive and archived values MUST remain historically resolvable but MUST NOT be selectable for new records.
- **FR-029**: The system MUST expose organization identity without exposing local file paths.
- **FR-030**: Organization name and organization code MUST be immutable after initial setup and MUST be rejected if submitted in an update.
- **FR-031**: Authorized administrators MUST be able to update only organization logo, favicon, cover image, contact emails, phone numbers, website, address, working hours, and social links using optimistic concurrency.
- **FR-032**: Organization profile changes MUST validate safe branding descriptors, contact formats, website and social-link addresses, and required primary-contact rules before saving.
- **FR-033**: The system MUST allow authorized administrators to read and update operational general settings using optimistic concurrency.
- **FR-034**: General settings MUST include default language, time zone, currency, date format, number format, at least one working day, default branch, and default academic year.
- **FR-035**: Default branch and academic-year references MUST resolve to eligible active records at save time.
- **FR-036**: A profile or settings update affecting multiple values or references MUST either complete entirely or leave the prior state unchanged.
- **FR-037**: Every management list MUST support search, explicit allow-listed sorting, status filtering, one-based pagination, a default page size of 20, and a maximum page size of 100.
- **FR-038**: Default management lists MUST exclude archived records unless archived or all statuses are explicitly requested.
- **FR-039**: Search MUST be case-insensitive for codes and emails and MUST normalize common Arabic letter forms, diacritics, and Arabic-Indic digits for Arabic names and descriptions.
- **FR-040**: A page beyond the available range MUST return an empty successful result with accurate pagination totals.
- **FR-041**: Every mutable persisted record MUST carry a version, and every update or status action MUST require the expected version.
- **FR-042**: A stale update MUST be refused with the current record version and MUST NOT overwrite a concurrent change.
- **FR-043**: Unknown, server-owned, derived-label, audit, identity, version, and dedicated-status fields MUST be rejected on mutation requests.
- **FR-044**: Required fields, formats, references, code uniqueness, duplicate labels where applicable, and date consistency MUST be validated before saving.
- **FR-045**: Validation failures MUST identify form fields using stable field paths and user-readable Arabic messages.
- **FR-046**: Every protected operation MUST require authentication and its documented organization/settings permission; read and write permissions MUST remain independently enforceable.
- **FR-047**: Branch-scoped callers MUST see only records within their authorized branch scope where the record is branch-owned; organization-wide callers MAY see all permitted records.
- **FR-048**: Detail access outside a caller's authorized branch scope MUST return the distinct out-of-scope refusal.
- **FR-049**: Successful create, update, activation, status, lookup, and settings operations MUST produce one audit-ready event containing actor, target, operation time, and resulting state after commit.
- **FR-050**: Records consumed by another module MUST reference this module's authoritative identifiers rather than duplicate master records.
- **FR-051**: Responses MUST preserve UTF-8 Arabic content, use date-only calendar values and UTC audit timestamps, and exclude internal paths and implementation details.
- **FR-052**: The module MUST return complete documented record shapes and resolved labels while deriving labels from authoritative identifiers rather than trusting client-supplied labels.

### Key Entities

- **Organization Profile**: The single organization identity. Its legal name and code are immutable after setup; logo, favicon, cover image, contact emails, phone numbers, website, address, working hours, and social links are versioned administrator-managed fields.
- **General Settings**: The versioned operational defaults shared across modules, including formats, working days, default branch, and default academic year.
- **Branch**: An operational location with unique code, address, phone, email, working hours, manager reference, status, history, and downstream assignments.
- **Department**: An organizational unit with unique code, name, description, status, history, and downstream assignments.
- **Academic Year**: A named and coded date range with exclusive active-state semantics and historical status.
- **Academic Term**: A non-overlapping date range contained within one academic year, with independent status and historical retention.
- **Lookup Group**: A stable configurable classification family such as qualification, study mode, lead source, grade, payment method, or expense category.
- **Lookup Value**: An ordered coded label within a lookup group, optionally linked to a parent value, with status and historical availability.

### API Contract Alignment *(mandatory when the feature exposes HTTP endpoints)*

- **Documented endpoints covered**: `GET /api/v1/organization/profile`; `GET` and `PATCH /api/v1/settings/general`; list, detail, create, update, and status operations under `/api/v1/settings/branches`, `/api/v1/settings/departments`, `/api/v1/settings/academic-years`, and `/api/v1/settings/academic-terms`; `POST /api/v1/settings/academic-years/:id/activate`; `GET /api/v1/settings/lookups`.
- **Requirements document sections**: §3.1 response/pagination contract; §3.7 permissions; §3.8 branch scope; §4.2 Organization & Settings; §5.2 route inventory; §8 request/response types; §9 documented inconsistencies.
- **Owner-authorized contract additions**: Add a versioned organization-profile update operation limited to branding, contacts, website, address, working hours, and social links; add administrative lookup-group and lookup-value list, detail, create, update, reorder, status, and archive operations; add branch email and department/academic-year code fields to their existing contracts. Organization name and code remain immutable. Exact paths and request/response shapes MUST be added to `docs/api-data-requirements.html` before implementation.
- **Contract decisions resolved**: Academic terms are included with full lifecycle management and non-overlap rules. Business lookup values are configurable and authoritative for applicable dropdowns. Organization legal identity remains immutable while approved public profile fields are editable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized administrator can create and locate a valid branch or department in under 2 minutes, including confirmation through search and filtering.
- **SC-002**: In all tested activation sequences, exactly one eligible academic year remains active and no partial status transition is observable.
- **SC-003**: One hundred percent of duplicate-code, invalid-date, stale-version, missing-permission, out-of-scope, and in-use archival scenarios are refused without changing persisted business state.
- **SC-004**: Ninety-five percent of branch, department, academic-year, academic-term, and configurable lookup searches display the first result page within 1 second under the agreed operating data volume.
- **SC-005**: Every management list tested returns accurate totals, never exceeds 100 records per page, and returns a successful empty page when the requested page is beyond the available range.
- **SC-006**: One hundred percent of archived master records used in historical test data remain resolvable while being unavailable for new active selections.
- **SC-007**: Administrators can update all permitted general settings in one submission in under 2 minutes, and every downstream settings read reflects the committed version.
- **SC-008**: One hundred percent of protected operations tested reject callers lacking the required permission, and branch-owned records outside scope are never disclosed.
- **SC-009**: All successful business mutations tested produce exactly one complete audit-ready event after commit; failed mutations produce no success event.
- **SC-010**: No tested response exposes local file paths, server-owned secrets, internal errors, or client-supplied derived labels as authoritative data.
- **SC-011**: At least 90% of representative administrators complete each primary management journey correctly on their first attempt during acceptance testing.

## Assumptions

- Identity & Access Management supplies authenticated caller context, permission enforcement, administrator accounts, manager references, and branch scope.
- Employee, role, and permission administration remain owned by the Identity module even though their screens share the `/settings` area.
- Academic Catalog, Admissions, Students, Finance, Accounting, CRM, and AI consume this master data but do not own or duplicate it.
- Permanent deletion is unavailable; archival is the terminal user-managed state unless an explicit reactivation rule permits otherwise.
- Codes are stored in a canonical trimmed form and compared case-insensitively.
- Calendar overlap between different academic years is allowed; terms are constrained against siblings within the same parent year and against their parent year's boundaries.
- Existing records may retain references to inactive or archived master data for display and reporting.
- Uploaded branding assets are created through the platform file service; this module stores only safe file descriptors.
- The operating volume is expected to remain within 10,000 branches, departments, academic periods, and lookup values combined, which is sufficient for the stated user-facing performance outcome.
