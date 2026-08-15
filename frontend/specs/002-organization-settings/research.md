# Research: Organization & Settings

All technical unknowns were resolved during Phase 0.

## Module and Route Boundary

**Decision**: Use one `organization-settings` feature with a `/settings` landing route and nine
deep-linkable child routes: organization, branches, departments, academic years, academic terms,
users, roles, permissions, and general settings.

**Rationale**: Organization defaults, branch/department references, academic calendar, users,
roles, and permissions share transactional invariants but still need unique route, title,
breadcrumb, and permission context. Pages stay Server Components; interactive screens are narrow
Client Components, following the repository-local Next.js 16 guidance.

Academic terms are a sibling route with academic-year filtering/context; permissions are a sibling
route that edits assignments for a selected role. Year/role details may deep-link into these
prefiltered screens. **Alternatives considered**: Separate top-level features would create
premature coupling. A single tabbed client page would harm deep linking, permissions, performance,
and maintainability.

## Service and Query Boundary

**Decision**: Define a composed typed service facade with per-aggregate operations and one mock
adapter. TanStack Query uses hierarchical key factories. Lists accept typed query objects and
return paginated results.

**Rationale**: Only the adapter imports fixtures; future API replacement does not alter pages or
components. Server-shaped pagination prevents a later table rewrite.

**Alternatives considered**: Direct fixture imports violate separation. Zustand would duplicate
server-like cache. A generic CRUD service would erase business-specific commands.

## Shared Table Strategy

**Decision**: Extend the single shared TanStack Table with a controlled/manual mode, stable row
IDs, controlled search/filter/sort/page callbacks, error state, action slots, total counts, and
selection reconciliation while preserving its existing local mode.

**Rationale**: All future administrative lists need API-compatible behavior and one interaction
model. Only the table container may scroll horizontally on tablet.

**Alternatives considered**: Feature-local tables violate reuse; client-only filtering does not
scale; unrelated card layouts on tablet break semantic and interaction consistency.

## Configurable Statuses and Lifecycle

**Decision**: Entities reference configurable `StatusDefinition` records. A service-owned
`active | inactive | archived` behavior classification enforces rules; display labels, colors,
order, and available definitions remain data.

**Rationale**: This satisfies dynamic configuration without allowing renamed labels to break
business invariants. Branches archive/reactivate; departments, users, and roles activate/deactivate.

**Alternatives considered**: Hardcoded UI enums violate the constitution. Deleting or clearing
references destroys operational history.

## Academic Calendar

**Decision**: Store inclusive ISO date-only ranges. Reject overlapping years and overlapping terms
within a year. Terms must stay within exactly one immutable parent year. `activateAcademicYear`
atomically deactivates the prior year and makes the target the default.

**Rationale**: It guarantees zero or one active year and avoids ambiguous operational calendars.
No single-active-term rule is invented because the specification does not require one.

**Alternatives considered**: Multiple UI mutations risk two active years. Timestamps introduce
timezone errors. Parallel ranges are operationally ambiguous without an explicit future policy.

## Reference Integrity and Defaults

**Decision**: Relationships use opaque immutable IDs. Archived/inactive records remain visible on
existing records but cannot receive new assignments. Archiving the default branch is blocked until
another active default is selected. Defaults must always reference active records.

**Rationale**: Historical relationships remain intact while new operations use valid choices.

**Alternatives considered**: Cascading deletion or silent clearing damages audit readiness;
allowing stale defaults makes dependent modules unreliable.

## Users, Roles, and Permissions

**Decision**: Users and roles have explicit many-to-many assignment records. Effective permissions
are the deduplicated union from active roles of an active user. Permission groups and actions are
configurable records. Prevent changes that would leave no active administrator able to manage
roles, permissions, and settings.

**Rationale**: Derived permissions avoid drift; explicit joins are audit-ready; lockout protection
preserves administrative continuity. Mock UI gating is an affordance, not a security boundary.

**Alternatives considered**: Flattening permissions on users becomes stale. Deny semantics are
unnecessary in this phase. An unlabeled dense permission grid is inaccessible.

## Validation and Concurrency

**Decision**: Feature Zod schemas normalize and validate fields/cross-fields; services enforce
uniqueness, dependencies, state, and atomicity. Writes include `expectedVersion`. Phone is optional
but format-validated when present. Image contracts allow JPEG/PNG/WebP; logo 5 MB, cover 10 MB.

**Rationale**: The specification does not make phone mandatory. Version tokens prepare for API
conflicts. Upload limits are explicit, testable, and configurable.

**Alternatives considered**: Duplicated component validation drifts. Silent last-write-wins loses
administrator changes. Optimistic invariant-heavy writes can show impossible intermediate states.

## Accessibility, RTL, and Responsive UI

**Decision**: Reuse platform primitives; use semantic fieldsets for permission groups, logical
properties, bidi isolation for codes/contact data, first-error focus, dialog focus return, live
status, reachable actions at 200% zoom, and tablet table-container scrolling only.

**Rationale**: Accessibility and RTL are functional gates, not visual polish.

**Alternatives considered**: Per-screen controls duplicate behavior. Hiding critical tablet
actions or replacing tables with unrelated cards breaks workflow consistency.

## Testing Strategy

**Decision**: Combine schema/service/query unit tests, component and contract tests, Playwright
journeys, axe scans, and manual screen-reader/zoom validation. The mock adapter exposes deterministic
success, empty, validation, conflict, dependency, and unexpected failure modes for tests.

**Rationale**: Invariant-heavy configuration requires proof below and above the UI boundary.

**Alternatives considered**: End-to-end tests alone poorly isolate business failures; unit tests
alone cannot prove focus, RTL, responsive layout, or complete administrator journeys.
