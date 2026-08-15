# Tasks: Ticket Management

**Input**: Design documents from `/specs/011-ticket-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Validation**: Automated tasks are included because the specification defines measurable permission, performance, responsive, keyboard, RTL, and accessibility outcomes that require repeatable evidence.

**Organization**: Tasks are dependency-ordered and grouped by the five prioritized user stories. The user's six delivery areas map across these stories: board/cards in US1; workspace/assignment in US2; collaboration in US3; discovery/saved views in US4; permissions/governance/AI in US5; final integration in the polish phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets independent files and does not depend on another incomplete task in the same phase.
- **[Story]**: Maps a task to the corresponding specification user story.
- Every task includes an exact repository-relative file path.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the feature skeleton, dependencies, routes, and public boundaries without implementing ticket behavior.

- [X] T001 Add compatible `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` workspace dependencies in `apps/web/package.json` and update `package-lock.json`
- [X] T002 Create the planned feature directories and public barrel in `apps/web/src/features/tickets/index.ts`
- [X] T003 [P] Add Arabic ticket navigation labels and permission-aware route metadata in `apps/web/src/features/tickets/config/navigation.ts`
- [X] T004 [P] Register the Ticket Management navigation entry through the existing shell registry in `apps/web/src/shared/config/navigation.ts`
- [X] T005 Create thin App Router shells and route-level metadata in `apps/web/src/app/(workspace)/tickets/page.tsx`, `apps/web/src/app/(workspace)/tickets/archived/page.tsx`, and `apps/web/src/app/(workspace)/tickets/[ticketId]/page.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the typed, configurable, permission-aware mock boundary required by every story.

**⚠️ CRITICAL**: No user-story implementation begins until this phase is complete.

- [X] T006 [P] Define branded IDs, pagination, scope, actor, and error primitives in `apps/web/src/features/tickets/types/common.ts`
- [X] T007 [P] Define Ticket, configuration, assignment, comment, attachment, activity, and related-summary entities in `apps/web/src/features/tickets/types/domain.ts`
- [X] T008 [P] Define board, detail, dashboard, capabilities, lookup, and saved-view projections in `apps/web/src/features/tickets/types/projections.ts`
- [X] T009 [P] Define normalized read queries and all typed command payloads from the service contract in `apps/web/src/features/tickets/types/commands.ts`
- [X] T010 [P] Create authoritative Zod schemas for ticket fields, queries, assignments, comments, attachments, and commands in `apps/web/src/features/tickets/schemas/ticket-schemas.ts`
- [X] T011 [P] Centralize Arabic UI copy, permission-denial reasons, errors, empty states, and AI placeholder labels in `apps/web/src/features/tickets/config/ticket-copy.ts` and `apps/web/src/features/tickets/config/ticket-error-copy.ts`
- [X] T012 [P] Define ticket permission keys, broadest-scope resolution, per-ticket capability derivation, and team/employee assignment policy in `apps/web/src/features/tickets/config/ticket-permissions.ts` and `apps/web/src/features/tickets/utils/ticket-scope.ts`
- [X] T013 [P] Define configurable seeded workflow statuses, priorities, tag metadata, stable ordering, and transition helpers in `apps/web/src/features/tickets/config/ticket-configuration.ts` and `apps/web/src/features/tickets/utils/ticket-workflow.ts`
- [X] T014 [P] Define the complete asynchronous `TicketService` interface and stable feature errors in `apps/web/src/features/tickets/services/ticket-service.ts` and `apps/web/src/features/tickets/services/ticket-service-error.ts`
- [X] T015 [P] Define canonical scope-aware TanStack Query keys and targeted invalidation families in `apps/web/src/features/tickets/services/ticket-query-keys.ts`
- [ ] T016 [P] Create narrow public-reader adapters for teams, employees, departments, branches, students, customers, and Inbox conversations in `apps/web/src/features/tickets/services/ticket-dependency-readers.ts` and `apps/web/src/features/tickets/services/ticket-dependency-adapters.ts`
- [X] T017 Build the normalized session repository with versioned `sessionStorage` hydration, indexes, atomic mutations, cloning, and deterministic reset controls in `apps/web/src/features/tickets/services/mock-ticket-repository.ts`
- [X] T018 Implement the mock service's shared authorization, scope-before-query, validation, optimistic-concurrency, and atomic activity writer foundations in `apps/web/src/features/tickets/services/mock-ticket-service.ts`
- [X] T019 Create the future HTTP adapter boundary and active mock/HTTP selector in `apps/web/src/features/tickets/services/http-ticket-service.ts` and `apps/web/src/features/tickets/services/active-ticket-service.ts`
- [X] T020 [P] Add unit tests for schemas, scope precedence, assignment compatibility, workflow configuration, and query keys in `apps/web/tests/unit/tickets/ticket-foundation.test.ts`
- [X] T021 Add contract tests proving every read is scope-filtered before projection and every refused foundational command leaves data/activity unchanged in `apps/web/tests/contract/tickets/ticket-service-foundation.test.ts`

**Checkpoint**: The service boundary, configuration, permissions, persistence, and tests are ready for independent story work.

---

## Phase 3: User Story 1 — Manage Tickets on the Board (Priority: P1) 🎯 MVP

**Goal**: Deliver a production-style, permission-scoped dashboard and Kanban board where authorized users create and move tickets with pointer, keyboard, touch, or a direct status action.

**Independent Test**: With seeded tickets and multiple personas, open `/tickets`, verify the six scoped columns and dashboard, create a ticket, move it by drag and direct action, and confirm immediate status/activity updates plus exact rollback for a denied move.

### Validation for User Story 1

- [X] T022 [P] [US1] Add service contract tests for create, cursor-paged status lists, stable deduplication, status changes, version conflicts, activity writes, and optimistic rollback data in `apps/web/tests/contract/tickets/ticket-board-service.test.ts`
- [X] T023 [P] [US1] Add integration tests for dashboard counts, six columns, card content, create flow, movement alternatives, and loading/empty/error/forbidden states in `apps/web/tests/integration/tickets/ticket-board.test.tsx`
- [X] T024 [P] [US1] Add a desktop pointer-drag plus keyboard/direct-status Playwright MVP journey in `apps/web/playwright/journeys/ticket-board.spec.ts`

### Implementation for User Story 1

- [ ] T025 [P] [US1] Generate realistic base and 500-ticket scale fixtures with all card relationships in `apps/web/src/features/tickets/data/ticket-fixtures.ts` and `apps/web/src/features/tickets/data/ticket-scale-fixtures.ts`
- [X] T026 [US1] Implement ticket creation, scoped status cursor queries, dashboard aggregation, and `changeStatus` in `apps/web/src/features/tickets/services/mock-ticket-service.ts`
- [X] T027 [P] [US1] Create RHF/Zod ticket creation form fields and permission-aware submission in `apps/web/src/features/tickets/forms/ticket-form.tsx`
- [X] T028 [P] [US1] Implement status infinite-query, dashboard-query, create, and optimistic status mutation hooks in `apps/web/src/features/tickets/hooks/use-ticket-board.ts` and `apps/web/src/features/tickets/hooks/use-ticket-mutations.ts`
- [X] T029 [P] [US1] Build Arabic/RTL dashboard summary cards with scoped count definitions in `apps/web/src/features/tickets/components/ticket-dashboard.tsx`
- [X] T030 [P] [US1] Build the complete memoized ticket card with bidi-isolated number, priority cues, relationships, tags, assignments, due date, and comment count in `apps/web/src/features/tickets/components/ticket-card.tsx`
- [ ] T031 [US1] Build independent scroll columns with sticky headers, sentinels, manual load-more fallback, query states, and totals in `apps/web/src/features/tickets/components/ticket-board-column.tsx`
- [X] T032 [US1] Implement the dnd-kit board context, pointer/keyboard sensors, semantic handles, Arabic instructions/live announcements, Escape cancellation, and focus restoration in `apps/web/src/features/tickets/components/ticket-kanban-board.tsx`
- [X] T033 [P] [US1] Implement the always-available permission-aware “move to status” menu used by keyboard, touch, and mobile in `apps/web/src/features/tickets/components/ticket-status-menu.tsx`
- [ ] T034 [P] [US1] Implement the responsive mobile selected-status list and tablet/desktop horizontal RTL board shell in `apps/web/src/features/tickets/components/responsive-ticket-board.tsx`
- [X] T035 [US1] Compose header actions, dashboard, create dialog, board states, and board queries in `apps/web/src/features/tickets/screens/ticket-board-screen.tsx`
- [X] T036 [US1] Connect `/tickets` loading, error, and page files to the feature screen in `apps/web/src/app/(workspace)/tickets/loading.tsx`, `apps/web/src/app/(workspace)/tickets/error.tsx`, and `apps/web/src/app/(workspace)/tickets/page.tsx`

**Checkpoint**: User Story 1 is a demonstrable MVP with no dependency on the later workspace, collaboration, discovery, or governance stories.

---

## Phase 4: User Story 2 — Work from a Complete Ticket Workspace (Priority: P2)

**Goal**: Deliver a full-page ticket workspace with editable information, contextual relationships, four assignment states, priority changes, attachments, and immutable change history.

**Independent Test**: Open one ticket directly, verify every required and optional section, exercise team-only/employee-only/both/unassigned states, reject an invalid team-member pairing, change priority, upload each supported file category, and observe immutable history.

### Validation for User Story 2

- [ ] T037 [P] [US2] Add service contract tests for detail projection, edits, priority, assignment membership/history, attachment rules, direct-route scope, and version conflicts in `apps/web/tests/contract/tickets/ticket-workspace-service.test.ts`
- [ ] T038 [P] [US2] Add integration tests for complete workspace information, absent relationships, assignment form, priority action, attachment preview, and immutable timeline in `apps/web/tests/integration/tickets/ticket-workspace.test.tsx`

### Implementation for User Story 2

- [X] T039 [US2] Implement detail, update, priority, assignment, attachment, and activity service operations with atomic events in `apps/web/src/features/tickets/services/mock-ticket-service.ts`
- [ ] T040 [P] [US2] Create RHF/Zod ticket edit and assignment forms with dependent team/employee validation and remove-assignment behavior in `apps/web/src/features/tickets/forms/ticket-edit-form.tsx` and `apps/web/src/features/tickets/forms/ticket-assignment-form.tsx`
- [X] T041 [P] [US2] Implement detail, activity, assignment, priority, edit, and attachment hooks with targeted cache reconciliation in `apps/web/src/features/tickets/hooks/use-ticket-detail.ts` and `apps/web/src/features/tickets/hooks/use-ticket-workspace-mutations.ts`
- [X] T042 [P] [US2] Build the workspace header, status/priority/department controls, description, due date, tags, and creator metadata in `apps/web/src/features/tickets/components/ticket-workspace-header.tsx` and `apps/web/src/features/tickets/components/ticket-information-panel.tsx`
- [X] T043 [P] [US2] Build related customer, student, branch, and conversation summaries with unavailable-reference states in `apps/web/src/features/tickets/components/ticket-related-context.tsx`
- [X] T044 [P] [US2] Build current assignment, assignee controls, and chronological assignment history in `apps/web/src/features/tickets/components/ticket-assignment-panel.tsx`
- [X] T045 [P] [US2] Build image/PDF/document dropzone, metadata, preview, progress, and supported-file error states in `apps/web/src/features/tickets/components/ticket-attachments-panel.tsx`
- [X] T046 [P] [US2] Build the semantic immutable activity timeline with typed Arabic event narratives and bidi-safe values in `apps/web/src/features/tickets/components/ticket-activity-timeline.tsx`
- [X] T047 [US2] Compose all workspace queries, capabilities, forms, states, and responsive layout in `apps/web/src/features/tickets/screens/ticket-detail-screen.tsx`
- [X] T048 [US2] Connect ticket detail loading/error/direct-access route handling in `apps/web/src/app/(workspace)/tickets/[ticketId]/loading.tsx`, `apps/web/src/app/(workspace)/tickets/[ticketId]/error.tsx`, and `apps/web/src/app/(workspace)/tickets/[ticketId]/page.tsx`

**Checkpoint**: User Story 2 independently supports end-to-end ticket context and ownership management through a direct ticket URL.

---

## Phase 5: User Story 3 — Collaborate on Ticket Resolution (Priority: P3)

**Goal**: Add internal comments and collaboration activity while enforcing author ownership and preserving immutable history.

**Independent Test**: Add a comment, edit/delete the current user's comment, fail to modify another user's comment, and verify card counts plus chronological activity update only after successful operations.

### Validation for User Story 3

- [X] T049 [P] [US3] Add comment service contract tests for add/edit/delete ownership, permissions, counts, versions, events, and refused-operation immutability in `apps/web/tests/contract/tickets/ticket-comments-service.test.ts`
- [ ] T050 [P] [US3] Add integration tests for internal labeling, author/date/message display, RHF validation, own-comment actions, feedback, counts, and timeline events in `apps/web/tests/integration/tickets/ticket-comments.test.tsx`

### Implementation for User Story 3

- [X] T051 [US3] Implement scoped comment reads plus atomic add/edit/delete commands, count derivation, and typed activity events in `apps/web/src/features/tickets/services/mock-ticket-service.ts`
- [X] T052 [P] [US3] Create RHF/Zod internal comment composer and edit form with pending and field-error states in `apps/web/src/features/tickets/forms/ticket-comment-form.tsx`
- [X] T053 [P] [US3] Implement comment query and add/edit/delete hooks with author capability checks and precise card/detail/activity invalidation in `apps/web/src/features/tickets/hooks/use-ticket-comments.ts`
- [X] T054 [P] [US3] Build semantic comment list/items with internal badge, own-comment menus, confirmations, tombstone behavior, and empty/error states in `apps/web/src/features/tickets/components/ticket-comments-panel.tsx`
- [X] T055 [US3] Integrate comments, counts, activity refresh, and responsive focus behavior into `apps/web/src/features/tickets/screens/ticket-detail-screen.tsx`

**Checkpoint**: User Story 3 independently demonstrates permission-safe team collaboration on any visible ticket.

---

## Phase 6: User Story 4 — Find and Prioritize Work (Priority: P4)

**Goal**: Provide normalized search, combined filters, sorting, saved views, and consistent dashboard/board discovery over the permission-scoped ticket set.

**Independent Test**: Search every specified field, combine and clear filters, sort newest/oldest/priority/recently updated, save and restore a view, use browser back/forward, and verify dashboard and board result consistency with 500 tickets.

### Validation for User Story 4

- [ ] T056 [P] [US4] Add unit and scale tests for Arabic/case/whitespace normalization, AND/OR filters, four sort modes, cursor resets, saved-view sanitation, and sub-1-second p95 queries over 500 fixtures in `apps/web/tests/unit/tickets/ticket-list-query.test.ts` and `apps/web/tests/unit/tickets/ticket-list-scale.test.ts`
- [ ] T057 [P] [US4] Add integration tests for URL search/filter/sort state, active chips, clear-all, saved views, back/forward navigation, and dashboard consistency in `apps/web/tests/integration/tickets/ticket-discovery.test.tsx`

### Implementation for User Story 4

- [X] T058 [P] [US4] Implement canonical query normalization, search matching, filter grouping, four stable sort modes, and cursor serialization in `apps/web/src/features/tickets/utils/ticket-list-query.ts`
- [X] T059 [P] [US4] Implement versioned saved-view definitions and board presentation preferences without persisting results or scope in `apps/web/src/features/tickets/store/ticket-view-store.ts`
- [X] T060 [US4] Extend list and dashboard service reads to share normalized scoped query semantics and searchable relationship indexes in `apps/web/src/features/tickets/services/mock-ticket-service.ts`
- [ ] T061 [P] [US4] Implement debounced search input, URL-backed committed query hook, local filter draft, sort, saved-view selection, and cursor reset behavior in `apps/web/src/features/tickets/hooks/use-ticket-discovery.ts`
- [X] T062 [P] [US4] Build the header search, sort selector, saved-view menu, and permission-aware create/archive actions in `apps/web/src/features/tickets/components/ticket-board-header.tsx`
- [ ] T063 [P] [US4] Build the responsive filter sheet with all dimensions, active chips, counts, apply/reset, and clear-all behavior in `apps/web/src/features/tickets/components/ticket-filter-sheet.tsx`
- [X] T064 [US4] Integrate discovery controls with column query identities, dashboard counts, selected mobile status, and no-results states in `apps/web/src/features/tickets/screens/ticket-board-screen.tsx`

**Checkpoint**: User Story 4 provides independently verifiable discovery and organization at realistic mock scale.

---

## Phase 7: User Story 5 — Govern Ticket Access and Lifecycle (Priority: P5)

**Goal**: Complete production-like RBAC visibility, archive/restore/delete governance, direct-access protection, and disabled future-AI affordances.

**Independent Test**: Compare assigned/team/global/no-view personas against the same dataset, directly navigate to protected tickets, archive/restore/delete with authorized actors, deny each action without permission, and confirm all AI areas remain descriptive and non-actionable.

### Validation for User Story 5

- [ ] T065 [P] [US5] Add a complete visibility/action permission matrix contract suite covering direct reads, lists, filters, counts, every command, permission changes, archive/restore/delete, and zero-event denials in `apps/web/tests/contract/tickets/ticket-rbac-governance.test.ts`
- [ ] T066 [P] [US5] Add integration tests for hidden versus reason-disabled controls, forbidden/unavailable states, archived list, confirmations, restore destination, delete removal, and AI placeholders in `apps/web/tests/integration/tickets/ticket-governance.test.tsx`
- [ ] T067 [P] [US5] Add a Playwright persona-switching journey for scoped board data, inaccessible direct routes, archive/restore, and denied actions in `apps/web/playwright/journeys/ticket-permissions.spec.ts`

### Implementation for User Story 5

- [X] T068 [US5] Complete service enforcement for dynamic permission changes, archived queries, restore-to-last-active status, confirmed deletion, and non-disclosing direct access in `apps/web/src/features/tickets/services/mock-ticket-service.ts`
- [X] T069 [P] [US5] Build archive, restore, delete confirmation, and capability-reason controls in `apps/web/src/features/tickets/components/ticket-governance-actions.tsx`
- [X] T070 [P] [US5] Build the archived ticket list with search/filter reuse and loading/empty/error/forbidden states in `apps/web/src/features/tickets/screens/archived-tickets-screen.tsx`
- [X] T071 [P] [US5] Build disabled, localized AI Summary, Suggested Assignee, Suggested Priority, Similar Tickets, and Resolution Suggestions sections in `apps/web/src/features/tickets/components/ticket-ai-placeholders.tsx`
- [X] T072 [US5] Integrate governance actions and AI placeholders into the board/detail screens in `apps/web/src/features/tickets/screens/ticket-board-screen.tsx` and `apps/web/src/features/tickets/screens/ticket-detail-screen.tsx`
- [X] T073 [US5] Connect archived route loading/error/page files to the feature screen in `apps/web/src/app/(workspace)/tickets/archived/loading.tsx`, `apps/web/src/app/(workspace)/tickets/archived/error.tsx`, and `apps/web/src/app/(workspace)/tickets/archived/page.tsx`

**Checkpoint**: All five user stories and the user's assignment/permissions/mock-data/AI delivery area are independently complete.

---

## Phase 8: Polish & Cross-Cutting Integration

**Purpose**: Prove the full module meets responsive, Arabic/RTL, accessibility, performance, consistency, and backend-readiness requirements.

- [ ] T074 [P] Add board/detail/archive skeletons and consistent surface states using shared primitives in `apps/web/src/features/tickets/components/ticket-skeletons.tsx` and `apps/web/src/features/tickets/components/ticket-query-state.tsx`
- [ ] T075 [P] Add desktop/laptop/tablet/mobile RTL, horizontal-overflow, touch, focus, live-region, priority-cue, and axe validation in `apps/web/playwright/accessibility/ticket-management-accessibility.spec.ts`
- [ ] T076 [P] Add a keyboard-only Playwright journey covering search, filters, create, status move, workspace, assignment, comments, attachments, dialogs, and archive in `apps/web/playwright/accessibility/ticket-management-keyboard.spec.ts`
- [ ] T077 Audit ticket-only UI for reusable generic patterns and promote only proven cross-feature primitives with regression tests in `packages/ui/src/components/` and `apps/web/tests/unit/shared/ticket-promoted-primitives.test.tsx`
- [ ] T078 Verify memoization, status-only infinite queries, indexed fixtures, targeted invalidation, and client-boundary/bundle behavior in `apps/web/src/features/tickets/components/ticket-kanban-board.tsx` and `apps/web/src/features/tickets/services/mock-ticket-repository.ts`
- [ ] T079 Verify all user-facing Arabic copy, RTL logical order, bidi isolation, configurable status/priority/lookup usage, and absence of hardcoded business labels in `apps/web/src/features/tickets/`
- [ ] T080 Verify the HTTP adapter compiles against the complete service contract and no screen/component imports fixtures, storage, or another feature's internals in `apps/web/src/features/tickets/services/http-ticket-service.ts` and `apps/web/tests/contract/tickets/ticket-service-surface.test.ts`
- [ ] T081 Run and record TypeScript, ESLint, Vitest, Playwright, production build, and every scenario from `specs/011-ticket-management/quickstart.md` in `specs/011-ticket-management/validation/quickstart-results.md`
- [ ] T082 Record constitution compliance, permission matrix, 500-ticket timings, four viewport results, axe/keyboard evidence, and any approved exceptions in `specs/011-ticket-management/validation/constitution.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 (Phase 3)**: Starts after Foundational and is the MVP.
- **US2 (Phase 4)**: Starts after Foundational; direct ticket routes and service operations are independently testable, then integrate with US1 card navigation.
- **US3 (Phase 5)**: Starts after Foundational but integrates into the US2 workspace; its service and component tests can proceed independently while the workspace shell is completed.
- **US4 (Phase 6)**: Starts after Foundational; it integrates with US1's board but its query/store logic and tests can proceed independently.
- **US5 (Phase 7)**: Starts after Foundational; governance UI integrates with US1/US2, while RBAC/archive service work and tests can proceed independently.
- **Polish (Phase 8)**: Starts after all user stories selected for release are complete.

### User Story Completion Order

```text
Setup → Foundation → US1 (MVP)
                   ├── US2 → US3
                   ├── US4
                   └── US5
US1 + US2 + US3 + US4 + US5 → Polish
```

- **US1** has no story dependency and delivers the core operational board.
- **US2** can be validated from a direct URL but normally follows US1 for board-to-detail navigation.
- **US3** depends on the US2 workspace integration point, though its service and component implementation is separable.
- **US4** depends on the US1 board integration point, though query normalization and saved views are separable.
- **US5** depends on US1/US2 only for final placement of controls; service-level governance is separable.

### Within Each User Story

1. Write the story's contract/integration/browser validation tasks and confirm the new assertions fail for the intended reason.
2. Complete service operations and domain policies before wiring hooks.
3. Complete hooks/forms before dependent composed screens.
4. Connect routes and run the story's independent test criteria.
5. Do not advance the story checkpoint with failing permission, RTL, responsive, accessibility, or UI-state evidence.

## Parallel Opportunities

- T003–T004 can run after T002 without file overlap.
- T006–T016 and T020 can be distributed by types, schemas, policy, copy, service contract, adapters, and unit validation before T017–T019 integrate them.
- Story validation files marked [P] can be written in parallel with story-specific fixtures/components.
- After Foundation, US2 service work, US4 query/store work, and US5 RBAC/archive service work can proceed alongside US1, provided shared `mock-ticket-service.ts` changes are coordinated.
- Within US1, T027–T030 and T033–T034 target separate files; T031–T032 then compose them.
- Within US2, T040–T046 target independent form/hook/panel files before T047 composition.
- Within US3, T052–T054 proceed in parallel after the comment contract is fixed.
- Within US4, T058–T063 proceed in parallel except T060/T064 integration.
- Within US5, T069–T071 proceed in parallel before T072–T073 integration.
- T074–T076 can run in parallel; T077–T082 follow once implementation stabilizes.

## Parallel Execution Examples

### User Story 1

```text
T022 Contract-test board service and lifecycle
T023 Integration-test dashboard, columns, and states
T025 Generate base and scale fixtures
T027 Build create form
T029 Build dashboard cards
T030 Build ticket card
```

### User Story 2

```text
T037 Contract-test workspace operations
T038 Integration-test workspace behavior
T040 Build edit and assignment forms
T042 Build workspace header/information
T043 Build related context
T044 Build assignment panel
T045 Build attachments
T046 Build activity timeline
```

### User Story 3

```text
T049 Contract-test comment ownership and history
T050 Integration-test collaboration UX
T052 Build comment form
T053 Build comment hooks
T054 Build comments panel
```

### User Story 4

```text
T056 Unit/scale-test discovery
T057 Integration-test URL and saved views
T058 Implement query grammar
T059 Implement saved-view store
T061 Implement discovery hook
T062 Build board header
T063 Build filter sheet
```

### User Story 5

```text
T065 Contract-test RBAC/governance matrix
T066 Integration-test governance UI
T067 E2E-test persona boundaries
T069 Build governance actions
T070 Build archived screen
T071 Build AI placeholders
```

## Implementation Strategy

### MVP First

1. Complete T001–T005 (Setup).
2. Complete T006–T021 (Foundation).
3. Complete T022–T036 (US1 board MVP).
4. Stop and run the US1 independent test plus relevant quickstart scenarios.
5. Demo the scoped dashboard, cards, create flow, six-column board, infinite columns, drag, keyboard/touch move action, and rollback behavior.

### Incremental Delivery

1. **US1**: Operational board and dashboard.
2. **US2**: Complete ticket workspace, assignment, attachments, and activity.
3. **US3**: Internal collaboration and comment ownership.
4. **US4**: Search, filters, sorting, saved views, and scale behavior.
5. **US5**: Full RBAC governance, archive/restore/delete, and AI placeholders.
6. **Polish**: Cross-story accessibility, responsive, RTL, performance, shared-component, and backend-boundary proof.

## Notes

- Treat dnd-kit as an interaction adapter; `changeStatus` remains the canonical business command.
- Never persist ticket entities in Zustand or the TanStack Query cache; persist the mock repository to session storage and saved-view preferences separately.
- Apply visibility before search, filters, pagination, lookup projection, and dashboard aggregation.
- Keep tests deterministic with mock clocks, seeded IDs, reset helpers, and explicit personas.
- Coordinate tasks that edit `mock-ticket-service.ts` or composed screens even when their surrounding story work runs in parallel.
- Commit after each task or coherent task group and rerun the affected story checkpoint.

