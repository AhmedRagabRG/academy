# Phase 0 Research: Ticket Management

**Feature**: 011-ticket-management | **Date**: 2026-08-09

All planning questions are resolved. These decisions reflect the repository's existing feature patterns, installed versions, local Next.js 16 guidance, and official dependency documentation.

## R1 — Use a service repository, not a Zustand ticket store

**Decision**: `TicketService` is the authoritative boundary over a deterministic session-persisted mock repository. TanStack Query owns all read data and mutations. Zustand stores only saved views and board presentation preferences; selected ticket identity remains in the URL.

**Rationale**: Tickets behave like server state even before a backend exists. Keeping the mock behind the same async contract preserves loading/error/abort/concurrency behavior and makes a future HTTP adapter replaceable. A second entity copy in Zustand would drift from query caches and detail routes.

**Alternatives considered**: A single Zustand store for entities and UI state (rejected: duplicates future server-state responsibilities); local component arrays (rejected: cannot coordinate board, dashboard, and detail); direct fixture imports (rejected by frontend separation).

## R2 — Independent cursor queries per workflow status

**Decision**: Each visible board column uses an infinite query keyed by scope fingerprint, status, normalized search, filters, and page size. The mock service filters and authorizes before sorting/paging, returns 20 tickets plus `nextCursor`, and supplies total counts separately. Mobile loads only the selected status.

**Rationale**: A busy Backlog must not block Done or Waiting. Independent cursors match future API behavior, satisfy infinite scrolling, and make per-column loading/error/end states honest. Stable sort `(updatedAt descending, ticketNumber descending, id)` prevents duplicates between pages.

**Alternatives considered**: One global page grouped client-side (rejected: can starve columns and misstate totals); load all fixtures (rejected by scale goal); virtualization at launch (deferred until measured because it complicates dragging and screen-reader position).

## R3 — One canonical status command, many interaction adapters

**Decision**: Drag, keyboard dragging, mobile selection, and the card's “move to” menu all call `changeStatus({ ticketId, toStatusId, expectedVersion, actor })`. Add dnd-kit's core/sortable/utilities packages with pointer and keyboard sensors, a semantic handle, Arabic instructions/announcements, Escape cancellation, and focus restoration.

**Rationale**: A single command prevents drag and menus from acquiring different permission or activity rules. Dnd-kit provides sensor and accessibility primitives, while the explicit menu gives reliable parity for users who cannot or prefer not to drag.

**Alternatives considered**: Native HTML drag-and-drop (rejected for weak touch/keyboard behavior); custom pointer implementation (rejected for complexity/accessibility risk); drag only (rejected because primary workflow must be universally operable).

## R4 — Optimistic moves with exact rollback and version checking

**Decision**: On status mutation, cancel affected queries, snapshot source/destination pages and counts, move the summary optimistically, and invoke the service with `expectedVersion`. On refusal/failure, restore snapshots and announce failure; on success, reconcile the returned version and invalidate scoped dashboard/detail/activity queries.

**Rationale**: This meets the 300 ms feedback target while preserving authoritative permission and concurrency checks. Version conflicts prevent a stale detail page from silently overwriting another mock-session change.

**Alternatives considered**: Wait for mutation before moving (rejected against feedback target); last-write-wins (rejected: loses activity truth); invalidate everything without snapshots (rejected: flicker and poor failure recovery).

## R5 — Scope first, capability second, service always authoritative

**Decision**: Resolve the broadest visibility grant (`all > team > assigned`) into a scope fingerprint. Apply it inside every service read before searching, paging, aggregating, or resolving filter options. Separately derive per-ticket capabilities for the UI, but enforce them again on every command.

**Rationale**: Hiding buttons does not protect data. Applying scope first prevents leaks through counts, search, filters, direct detail routes, or archived views. Derived capabilities give consistent affordances without becoming security authority.

**Alternatives considered**: UI-only filtering (rejected); role-name checks (rejected because permissions are configurable); all unauthorized controls disabled (rejected as clutter—hide undiscoverable actions and explain expected contextual actions).

## R6 — Immutable activity is written atomically

**Decision**: A private repository operation mutates the ticket and appends one structured activity event together. No public command updates or deletes activity. Returned data is cloned. Refused operations produce no event.

**Rationale**: Immutability must be structural, not a UI convention. Co-location ensures current state and history cannot diverge and supplies future audit/AI context.

**Alternatives considered**: Append from UI hooks (rejected: bypassable and failure-prone); editable timeline entries (contradicts the spec); prose-only audit messages (rejected because future consumers need typed before/after context).

## R7 — Assignment supports four states with membership validation

**Decision**: Assignment stores optional `teamId` and `employeeId`. If both exist, the employee must be an active member of the selected team. Changing team clears or blocks an incompatible employee. Every actual assignment change records old/new values.

**Rationale**: This implements all four stated assignment states while preventing a misleading combination. IDs remain stable while projections carry display snapshots for history.

**Alternatives considered**: Permit any team/employee pair (rejected as operationally ambiguous); employee implies and overwrites team (rejected because “both” is explicitly supported); one assignee union (cannot represent both).

## R8 — Desktop board, mobile status list

**Decision**: Desktop/laptop/tablet render six min-width columns in a horizontally scrollable logical-inline board with sticky headers and independent vertical scroll. Mobile uses a status selector/tabs and one vertical list; details become a full page. Filters move into a sheet. IDs and dates use bidi isolation.

**Rationale**: Compressing six columns destroys readability. The mobile model preserves every workflow with less spatial and gesture burden, while using the same queries and commands.

**Alternatives considered**: Six squeezed mobile columns (rejected); reverse DOM order to simulate RTL (rejected because visual and focus order diverge); stack all columns (usable fallback but slower and unnecessarily heavy).

## R9 — Search, filters, saved views, and counts share one query grammar

**Decision**: Define one normalized `TicketListQuery`. Committed search, filters, archive mode, and selected saved view live in URL search parameters; a filter sheet may keep an unapplied local draft. Search trims whitespace, folds case and Arabic presentation differences supported by the shared normalizer, and covers the six specified fields. Filter groups combine with AND; multiple values within a group use OR. Saved views persist only named query/presentation settings, never ticket results.

**Rationale**: One grammar keeps columns, archives, dashboard counts, saved views, back/forward navigation, shareable routes, and future HTTP query serialization consistent. Storing results would become stale and could cross permission scopes.

**Alternatives considered**: Separate board/dashboard filters (rejected due drift); save entity IDs as the view result (rejected as stale/security-sensitive); unrestricted fuzzy search dependency (unnecessary for the stated scale).

## R10 — Reuse dependency readers and shared primitives

**Decision**: Ticket-owned reader ports resolve teams/employees/departments/branches and related conversation/student/customer summaries through public feature/shared contracts. Reuse existing shared file-dropzone, badges, dialogs, sheets, avatars, states, and application shell. Keep the Kanban board feature-owned until another module demonstrates the same behavior.

**Rationale**: Narrow readers prevent internal module coupling. Prematurely generalizing a single board would burden shared UI with ticket business logic.

**Alternatives considered**: Import other modules' fixtures (rejected); duplicate shared primitives (rejected); create a generic shared Kanban immediately (rejected until a second real consumer establishes its stable API).

## R11 — Test the contract and journeys, not implementation details

**Decision**: Unit-test schemas/policies/query normalization; contract-test every service read/command including scope, activity, concurrency, paging, and rollback conditions; integration-test screen affordances and query state; Playwright-test end-to-end journeys on desktop/tablet/mobile with axe and keyboard-only flows.

**Rationale**: The repository already uses this four-layer strategy. Service-contract tests survive a future adapter replacement, while browser tests cover focus, layout, drag alternatives, route announcements, and RTL behavior unavailable to jsdom.

**Alternatives considered**: Snapshot-heavy component tests (rejected: brittle); E2E-only (slow and weak at policy matrices); unit-only (cannot establish real interaction/accessibility outcomes).
