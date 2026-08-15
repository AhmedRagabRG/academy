# Feature Specification: Identity & Access Management

**Feature Branch**: `002-identity-access-management`

**Created**: 2026-08-02

**Status**: Ready for planning

**Input**: User description: "Manage employee authentication, accounts, roles, permissions, sessions, passwords, and profiles as the platform's security source of truth."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticate and Restore Work (Priority: P1)

An active employee signs in with an email address and password, receives a secure session, restores that session when returning, and signs out without handling credentials in browser-accessible storage.

**Why this priority**: Every protected platform capability depends on reliable authentication and a complete employee context.

**Independent Test**: Sign in as an active employee, restore the session in a new request, access a protected capability, sign out, and confirm the former session no longer grants access.

**Acceptance Scenarios**:

1. **Given** an active employee with valid credentials, **When** the employee signs in, **Then** the system establishes a session and returns the employee, assigned roles, unioned effective permissions, acting branch, branch scope, and authentication time without returning credential tokens in the response body.
2. **Given** invalid credentials, **When** sign-in is attempted, **Then** access is refused with the documented `invalid_credentials` outcome without revealing whether the email exists.
3. **Given** an archived, suspended, or otherwise inactive employee, **When** sign-in is attempted or an existing session is used, **Then** access is refused and no protected information is returned.
4. **Given** no authenticated session, **When** current session is requested, **Then** the request succeeds with a null employee context.
5. **Given** an authenticated employee, **When** the employee signs out, **Then** the current session is revoked and its credentials are cleared.

---

### User Story 2 - Control Active Sessions (Priority: P2)

An employee reviews where their account is signed in and revokes an unfamiliar session or every other session while keeping the current session active.

**Why this priority**: Session visibility and revocation limit account exposure when a device or credential may be compromised.

**Independent Test**: Establish three sessions, list them, revoke one, revoke all except the current session, and verify only the current session remains usable.

**Acceptance Scenarios**:

1. **Given** multiple active sessions, **When** the employee views sessions, **Then** each entry shows device, browser, IP address, creation time, last activity, expiry, and whether it is current.
2. **Given** a non-current active session, **When** the employee revokes it, **Then** subsequent use of that session is refused without ending the current session.
3. **Given** multiple active sessions, **When** the employee revokes all other sessions, **Then** every session except the current one is refused.
4. **Given** a session belonging to another employee, **When** an employee attempts to revoke it, **Then** the operation is refused without disclosing the other session's details.

---

### User Story 3 - Manage Employee Accounts (Priority: P3)

An authorized administrator creates and maintains employee accounts, branch assignments, organizational profile details, status, role assignment, avatar, and credentials without deleting historical employee records.

**Why this priority**: Administrators need controlled onboarding and offboarding before other business modules can safely assign work to employees.

**Independent Test**: Create an employee, retrieve and edit the profile, search and filter the list, suspend and reactivate the account, reset its password, then archive it and verify it cannot sign in.

**Acceptance Scenarios**:

1. **Given** valid profile and assignment data, **When** an authorized administrator creates an employee, **Then** a unique active employee record is created with one or more active roles and at least one assigned branch.
2. **Given** employees in different roles, branches, departments, and statuses, **When** an administrator searches, sorts, filters, or changes page, **Then** only matching records in the administrator's allowed scope are returned with accurate pagination.
3. **Given** an existing employee and the expected record version, **When** an administrator edits allowed fields, **Then** the profile is updated and server-owned identity and audit fields remain unchanged.
4. **Given** an active employee, **When** an administrator suspends or archives the account, **Then** all of that employee's sessions cease granting protected access.
5. **Given** an archived employee, **When** an administrator requests permanent deletion, **Then** no deletion capability is offered or performed.

---

### User Story 4 - Manage Roles and Permissions (Priority: P4)

An authorized administrator creates and edits roles, assigns configurable permissions from the platform catalogue, inspects effective employee permissions, and archives unused roles.

**Why this priority**: Centralized role administration makes access policy understandable and consistently enforceable across all modules.

**Independent Test**: Create a role, assign permissions, assign it to an employee, verify effective access, remove a permission, and confirm access changes immediately; then test role archival rules.

**Acceptance Scenarios**:

1. **Given** a unique role name and description, **When** an authorized administrator creates a role, **Then** the role is available for assignment with an initially explicit permission set.
2. **Given** a role and a set of recognized permission identifiers, **When** an administrator replaces the role's permissions, **Then** assigned employees inherit exactly the new effective set.
3. **Given** a role assigned to one or more non-archived employees, **When** archival is requested, **Then** archival is refused until those assignments are resolved.
4. **Given** a role not assigned to any non-archived employee, **When** archival is confirmed, **Then** it is excluded from new assignments but remains available for historical reporting.
5. **Given** an employee without a required permission, **When** a protected operation is attempted, **Then** access is refused even if the interface exposed the action.

---

### User Story 5 - Maintain My Profile and Password (Priority: P5)

An authenticated employee views their own profile, changes permitted personal details and avatar, and changes their password after proving knowledge of the current password.

**Why this priority**: Self-service reduces administrator workload while maintaining ownership boundaries around roles, branches, department, position, and account status.

**Independent Test**: View the current profile, update allowed personal fields, change the avatar, change the password, and verify old credentials and invalid sessions no longer work as specified.

**Acceptance Scenarios**:

1. **Given** an authenticated employee, **When** the employee views their profile, **Then** current contact, organizational assignment, avatar, role, branches, and status are shown.
2. **Given** valid permitted profile changes, **When** the employee saves them, **Then** the values are updated without allowing changes to role, branches, department, position, or status unless explicitly administrator-managed.
3. **Given** the correct current password and a valid new password, **When** password change is submitted, **Then** the new password works, the old password fails, and other sessions are revoked.
4. **Given** an incorrect current password, **When** password change is attempted, **Then** no credential or session state changes.

### Edge Cases

- Two administrators attempt to update the same employee or role from the same original version.
- An employee is suspended, archived, or has permissions removed while already using an active session.
- A role is archived or changed between credential issuance and the next protected request.
- An employee attempts to revoke the current session through the single-session operation.
- A refresh attempt is replayed after logout, revocation, expiry, password change, or account suspension.
- Two employee records are submitted with email addresses differing only by case or surrounding whitespace.
- Search contains Arabic letter variants, diacritics, or Arabic-Indic digits.
- A requested employee page exceeds the final available page.
- An administrator tries to remove an employee's last active role or last required branch assignment.
- An avatar is empty, oversized, unsupported, or claims a content type that does not match its contents.
- A client submits server-owned fields, unknown permission identifiers, or derived branch/department labels.

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication and authorization

- **FR-001**: The system MUST authenticate employees using normalized email and password credentials.
- **FR-002**: Successful authentication MUST establish short-lived and renewable credentials in httpOnly cookies and MUST NOT include either credential in a response body or browser-readable storage.
- **FR-003**: A successful sign-in MUST return an employee context containing the employee's assigned role identifiers and resolved roles, the duplicate-free union of their permission identifiers, acting branch, authorized branch identifiers, organization-wide scope, and authentication time.
- **FR-004**: Authentication failures MUST use the same response for an unknown email and an incorrect password.
- **FR-005**: Archived, suspended, inactive, or role-inactive employees MUST NOT sign in or use an existing credential to access a protected capability.
- **FR-006**: The current-session operation MUST return the employee context when authenticated and null when unauthenticated; unauthenticated restoration MUST NOT be treated as an error.
- **FR-007**: Logout MUST revoke the current renewable credential and clear all authentication cookies.
- **FR-008**: Session renewal MUST accept only an unexpired, unrevoked credential belonging to an eligible employee and MUST rotate or otherwise invalidate the credential used for renewal against replay.
- **FR-009**: Every protected operation MUST require both authentication and all declared permissions, with public operations explicitly identified.
- **FR-010**: Permission removal, employee suspension, employee archival, role inactivation, and session revocation MUST affect the next protected request without waiting for the original access credential to expire.

#### Session management

- **FR-011**: The system MUST retain independently revocable session records for each authenticated employee.
- **FR-012**: Each session MUST expose a non-sensitive identifier, derived device label, browser label, IP address, creation time, last activity time, expiry time, and current-session indicator.
- **FR-013**: An employee MUST be able to list only their own active sessions, ordered with the current session first and then by most recent activity.
- **FR-014**: An employee MUST be able to revoke one owned non-current session.
- **FR-015**: An employee MUST be able to revoke all owned sessions except the current session in one operation.
- **FR-016**: Revoking an expired, already-revoked, unknown, or foreign session MUST NOT disclose whether that session belongs to another employee.
- **FR-017**: The Identity module MUST own `POST /api/v1/auth/refresh`, `GET /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/:id`, and `DELETE /api/v1/auth/sessions` in addition to the documented login, logout, and current-session operations.
- **FR-018**: `POST /api/v1/auth/refresh` MUST rotate the current renewable credential, preserve the same logical session identity, update its activity time, and return no credential in the response body.
- **FR-019**: `GET /api/v1/auth/sessions` MUST return only the caller's active sessions and MUST require authentication but no administrative permission.
- **FR-020**: `DELETE /api/v1/auth/sessions/:id` MUST revoke one owned non-current session and return a successful null result; attempting to target the current, unknown, expired, revoked, or foreign session MUST produce a non-disclosing refusal.
- **FR-021**: `DELETE /api/v1/auth/sessions` MUST revoke every active session belonging to the caller except the session authorizing the request and return the number revoked.

#### Employee administration

- **FR-022**: Authorized administrators MUST be able to create employee accounts with full name, normalized unique email, phone number, position, department, assigned branches, avatar, status, and one or more role assignments.
- **FR-023**: Full name MUST contain at least 3 trimmed characters; email MUST be valid and case-insensitively unique; phone MUST contain 8–15 digits with an optional leading plus sign.
- **FR-024**: Every employee MUST have at least one assigned active role and at least one active branch assignment unless granted organization-wide scope.
- **FR-025**: Authorized administrators MUST be able to retrieve an employee detail containing all resolved role names, branch and department labels, unioned effective permissions, status, version, and audit attribution.
- **FR-026**: Authorized administrators MUST be able to update employee profile and assignment fields using optimistic concurrency; server-owned fields and derived labels MUST be ignored or rejected on write.
- **FR-027**: Employee lists MUST support Arabic-normalized search by full name and case-insensitive email, sorting by an explicit allow-list, filtering by role, branch, status, and department, and offset pagination with the platform defaults.
- **FR-028**: Employee lists MUST be restricted to the caller's branch scope unless the caller has organization-wide scope.
- **FR-029**: Authorized administrators MUST be able to activate, suspend, and archive an employee through explicit state transitions; employee records MUST never be permanently deleted.
- **FR-030**: Suspending or archiving an employee MUST revoke or invalidate all active sessions atomically with the status change.
- **FR-031**: Authorized administrators MUST be able to reset an employee password through `POST /api/v1/settings/users/:userId/reset-password` without learning or receiving the resulting password hash; the operation MUST invalidate all of the target employee's sessions.
- **FR-032**: Employee creation, update, status change, and password reset MUST emit audit-ready domain events identifying actor, target, operation, time, and resulting state.

#### Roles and permissions

- **FR-033**: Authorized administrators MUST be able to create, view, edit, list, search, sort, filter, and archive roles without permanently deleting them.
- **FR-034**: Role names or stable codes MUST be unique according to the platform's documented normalization rules.
- **FR-035**: A role MUST contain a display name, description, status, version, and explicit set of recognized permission identifiers.
- **FR-036**: The permission catalogue MUST expose the complete documented platform permission set grouped for administrative display; invented and unknown identifiers MUST be rejected.
- **FR-037**: Replacing a role's permission set MUST be atomic, version-checked, and immediately reflected in effective authorization.
- **FR-038**: A role assigned to any non-archived employee MUST NOT be archived; the refusal MUST identify the role as in use without exposing unrelated employee data.
- **FR-039**: Employees MAY hold multiple active roles from the initial release, represented by `roleIds[]`; their effective permissions MUST be the flat, duplicate-free union of permissions across all assigned active roles.
- **FR-040**: Removing or archiving assignments MUST NOT leave a non-archived employee without at least one active role.
- **FR-041**: Role creation, update, permission replacement, and archival MUST emit audit-ready domain events.

#### Profile and password management

- **FR-042**: `GET /api/v1/auth/profile` MUST return the authenticated employee's profile and organizational assignments.
- **FR-043**: `PATCH /api/v1/auth/profile` MUST allow an employee to update only full name, phone number, and avatar descriptor using optimistic concurrency; roles, branches, department, position, organization scope, email, and status remain administrator-controlled.
- **FR-044**: Avatar changes MUST use the platform file rules and preserve only a file descriptor on the employee record.
- **FR-045**: Passwords MUST be stored only as one-way password hashes and MUST never be returned or logged.
- **FR-046**: `POST /api/v1/auth/change-password` MUST require the correct current password, a valid new password, and confirmation of the new password.
- **FR-047**: A successful self-service password change MUST preserve the current session and revoke every other active session; an administrator password reset MUST revoke every session belonging to the target employee.
- **FR-048**: Password validation failures MUST identify actionable field errors without exposing password values or hashes.
- **FR-049**: Employee and role administration MUST remain under `/api/v1/settings/users`, `/api/v1/settings/roles`, and `/api/v1/settings/permissions`; the `/api/v1/auth` surface MUST own only authentication, session management, self-profile, and self-service password operations.

#### Common behavior

- **FR-050**: Every write MUST reject an outdated expected version with the current version supplied in the conflict response.
- **FR-051**: Every success, validation failure, authorization refusal, conflict, and unexpected failure MUST use the platform response envelopes and Arabic user-facing messages.
- **FR-052**: All timestamps MUST be returned in the platform's UTC format and all identifiers MUST be UUID strings.
- **FR-053**: No response or log entry may contain a password, password hash, credential token, cookie value, stack trace, or internal data-store detail.
- **FR-054**: Multi-record changes, including employee status plus session invalidation and role permission replacement, MUST complete entirely or leave all records unchanged.

### Key Entities

- **Employee**: An internal staff identity with contact details, organizational assignment, avatar, status, branch scope, role assignment, version, and lifecycle attribution.
- **Role**: A named, versioned access-policy grouping with status and an explicit permission set; it may be assigned to employees and archived only when unused.
- **Permission**: A configurable catalogue entry identified by a stable namespaced key and grouped by platform module and action for administration.
- **Employee Role Assignment**: The many-to-many relationship between employees and roles. Each non-archived employee has at least one active role; effective permissions are unioned across all active assignments.
- **Employee Branch Assignment**: The relationship granting an employee access to one or more branches, with organization-wide scope as an explicit bypass.
- **Session**: An independently revocable authenticated login associated with an employee, credential identifier, device/browser description, IP address, activity times, expiry, and revocation state.
- **Password Credential**: The employee's one-way password representation and credential-change state; plaintext passwords are transient input only.
- **Avatar Descriptor**: Metadata referencing an employee image without exposing local storage paths.

### API Contract Alignment *(mandatory when the feature exposes HTTP endpoints)*

- **Documented endpoints covered**: `POST /api/v1/auth/login`; `GET /api/v1/auth/session`; `POST /api/v1/auth/logout`; `GET /api/v1/settings/users`; `GET /api/v1/settings/users/:userId`; `POST /api/v1/settings/users`; `PATCH /api/v1/settings/users/:userId`; `PATCH /api/v1/settings/users/:userId/status`; `GET /api/v1/settings/roles`; `GET /api/v1/settings/roles/:roleId`; `POST /api/v1/settings/roles`; `PATCH /api/v1/settings/roles/:roleId`; `PATCH /api/v1/settings/roles/:roleId/status`; `PUT /api/v1/settings/roles/:roleId/permissions`; `GET /api/v1/settings/permissions/catalog`; `GET /api/v1/settings/users/:userId/effective-permissions`.
- **Requirements document sections**: §3.1 response envelope and pagination; §3.7 permission catalogue and branch scoping; §4.1 Authentication & Session; §4.2 Organization & Settings.
- **Owner-authorized contract additions**: `POST /api/v1/auth/refresh`; `GET /api/v1/auth/sessions`; `DELETE /api/v1/auth/sessions/:id`; `DELETE /api/v1/auth/sessions`; `GET /api/v1/auth/profile`; `PATCH /api/v1/auth/profile`; `POST /api/v1/auth/change-password`; `POST /api/v1/settings/users/:userId/reset-password`. These additions preserve `/auth` for authentication and self-service and `/settings` for administration.
- **Contract decisions resolved**: Multiple assigned roles are supported from launch through `roleIds[]`; effective permissions are unioned. Organization, branch, and department records remain external dependencies rather than IAM-owned administration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of employees with valid credentials can sign in and reach their authorized workspace on the first attempt in under 30 seconds.
- **SC-002**: A revoked, expired, suspended, archived, or otherwise invalid session is refused on 100% of protected requests tested after the invalidating event.
- **SC-003**: Current-session restoration returns an employee context or a successful null result in 100% of authenticated and unauthenticated test scenarios, with no credential exposed in response data.
- **SC-004**: An employee can identify and revoke an unfamiliar session in under 60 seconds, and the revoked session fails its next protected action.
- **SC-005**: Authorized administrators can create a valid employee account in under 3 minutes and locate it by name, email, role, branch, department, and status.
- **SC-006**: Employee list results and counts are correct for every supported filter, sort, branch-scope, and over-range pagination scenario in acceptance testing.
- **SC-007**: Changes to employee status, role permissions, password, or session revocation affect authorization by the next protected request in 100% of tested cases.
- **SC-008**: Unauthorized users are refused for 100% of employee, role, permission, password-reset, and cross-account session operations tested.
- **SC-009**: Concurrent edits never silently overwrite one another; every stale employee or role update tested returns a conflict containing the current record version.
- **SC-010**: No tested response, application log, session listing, or administrative view exposes a plaintext password, password hash, credential, cookie value, or local file path.
- **SC-011**: Repeating employee status changes, password resets, role permission replacements, or bulk session revocations after a simulated partial failure leaves no partially updated business state.
- **SC-012**: Every defined login, logout, failed-login, password, employee, role, permission, and session-revocation operation produces one complete audit-ready event in acceptance testing.

## Assumptions

- The Backend Foundation provides validated configuration, response envelopes, persistence, credential primitives, authorization guards, branch scoping, file storage, transactions, and domain-event emission.
- Email/password is the only sign-in method for this release; multi-factor authentication, single sign-on, invitation workflows, and account self-registration remain out of scope.
- Super Admin and Executive Manager are the only administrative actor types in this feature, and their exact authority is determined by permission keys rather than hard-coded role names.
- Employee email matching is case-insensitive after trimming and normalization.
- Password policy values and credential lifetimes are centrally configurable; planning will bind them to existing platform configuration rather than hard-code business policy.
- Session device and browser labels are derived from request metadata and are informational, not trusted identity evidence.
- Organization, branch, and department records are owned by the Organization module; IAM consumes their public references and does not create or modify them.
- Audit persistence remains out of scope, but every security-sensitive operation emits the event needed for a future subscriber.
- Permanent deletion of employees, roles, sessions retained for security history, and permission definitions is not exposed by this feature.
