# Tasks: Unified Inbox

**Input**: Design documents from `/specs/010-unified-inbox/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Validation**: Automated tests are included because the constitution and acceptance criteria require proof of permission isolation, business rules, RTL, responsive behavior, keyboard access, accessibility, and state consistency. Within each story, write the listed tests first and confirm they fail for the intended reason before implementation.

**Organization**: Tasks are grouped by the six user stories from `spec.md`. The user's six delivery groups are mapped across setup/foundation, the relevant story phase, and final polish so each story remains independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on another incomplete task in the same group.
- **[Story]**: Maps the task to a specification user story.
- Every task includes an exact repository-relative file path.

## Phase 1: Setup (Module and shell registration)

**Purpose**: Establish the Inbox feature boundary, route, and explicit shared-shell extension points.

- [X] T001 Create the planned Inbox feature directories and deliberate public export surface in `apps/web/src/features/inbox/index.ts`
- [X] T002 [P] Add the Arabic Inbox navigation definition and `/inbox` route metadata in `apps/web/src/features/inbox/config/navigation.ts`
- [X] T003 Compose the feature navigation into the application shell in `apps/web/src/shared/config/foundation-navigation.ts`
- [X] T004 [P] Register Inbox Lucide icon keys in `apps/web/src/shared/config/icon-registry.ts`
- [X] T005 Add the thin App Router entry plus route loading and unexpected-error boundaries in `apps/web/src/app/(workspace)/inbox/page.tsx`, `apps/web/src/app/(workspace)/inbox/loading.tsx`, and `apps/web/src/app/(workspace)/inbox/error.tsx`

---

## Phase 2: Foundational (Blocking prerequisites)

**Purpose**: Create the typed, permission-safe mock domain and state/query boundaries required by every user story.

**⚠️ CRITICAL**: No user-story implementation begins until this phase is complete.

- [X] T006 [P] Define branded IDs, cursor/page types, status and attachment unions, and shared Inbox primitives in `apps/web/src/features/inbox/types/common.ts`
- [X] T007 [P] Define customer, platform, employee, team, branch, tag, conversation, message, attachment, note, system-event, and assignment-history entities in `apps/web/src/features/inbox/types/domain.ts`
- [X] T008 [P] Define list/detail/dashboard/customer/timeline/permission/AI projections in `apps/web/src/features/inbox/types/projections.ts`
- [X] T009 [P] Define list-query and mutation command types, expected-version fields, and retry tokens in `apps/web/src/features/inbox/types/commands.ts`
- [X] T010 Implement authoritative Zod schemas for list queries, replies, attachments, assignments, status, tags, and notes in `apps/web/src/features/inbox/schemas/inbox-schemas.ts`
- [X] T011 [P] Centralize Arabic copy, status/tag/platform presentation maps, saved views, dashboard definitions, attachment policy, and date/number labels in `apps/web/src/features/inbox/config/inbox-copy.ts` and `apps/web/src/features/inbox/config/inbox-config.ts`
- [X] T012 [P] Define exact Inbox permission constants and UI capability helpers in `apps/web/src/features/inbox/config/inbox-permissions.ts`
- [X] T013 Compose the Inbox permission group into the shared permission catalog in `apps/web/src/shared/config/permission-catalog.ts`
- [X] T014 Define the transport-neutral read/command interface and typed safe error taxonomy in `apps/web/src/features/inbox/services/inbox-service.ts` and `apps/web/src/features/inbox/services/inbox-error.ts`
- [X] T015 [P] Implement stable tenant/employee/team/grant scope fingerprints and visibility predicates in `apps/web/src/features/inbox/utils/inbox-scope.ts`
- [X] T016 [P] Implement normalized Arabic/Latin search, phone matching, combined filtering, saved-view predicates, stable sorting, and cursor helpers in `apps/web/src/features/inbox/utils/conversation-query.ts`
- [X] T017 Create relational base fixtures, configurable lookup fixtures, five permission personas, and a deterministic 500+ conversation scale generator in `apps/web/src/features/inbox/data/inbox-fixtures.ts`, `apps/web/src/features/inbox/data/inbox-lookups.ts`, and `apps/web/src/features/inbox/data/inbox-scale-fixtures.ts`
- [X] T018 Implement per-session fixture cloning, reset/failure scenarios, authorization-first reads, and atomic command primitives in `apps/web/src/features/inbox/services/mock-inbox-service.ts` and `apps/web/src/features/inbox/services/mock-scenario-controller.ts`
- [X] T019 Define scope-aware query-key families and bind the mock implementation as the active Inbox service without adding a backend adapter in `apps/web/src/features/inbox/services/inbox-query-keys.ts` and `apps/web/src/features/inbox/services/active-inbox-service.ts`
- [X] T020 Implement the non-persisted Zustand workspace store for selection, query/view state, responsive panes, detail panel, recent searches, and per-conversation drafts—without domain entities—in `apps/web/src/features/inbox/stores/inbox-workspace-store.ts`

**Checkpoint**: Typed service, fixtures, scope enforcement, schemas, query keys, and UI-state ownership are ready; user stories may now be implemented.

---

## Phase 3: User Story 1 — Triage permitted conversations (Priority: P1) 🎯 MVP

**Goal**: Employees see only permitted conversations and can find work through saved views, dashboards, search, sorting, combined filters, and progressive loading.

**Independent Test**: Load the Inbox as assigned-only, team, global, and no-access personas; verify scoped counts and results, then locate known open/closed/archived conversations using every discovery control without duplicate cursor records.

### Tests for User Story 1

- [X] T021 [P] [US1] Write failing contract tests for scope-first list/detail/dashboard reads, not-found masking, stable cursors, and persona-separated query results in `apps/web/tests/contract/inbox/inbox-read-contract.test.ts`
- [X] T022 [P] [US1] Write failing unit tests for Arabic/Latin search, partial phone and tag matching, combined filters, date validation, saved views, and stable sorting in `apps/web/tests/unit/inbox/conversation-query.test.ts`
- [X] T023 [P] [US1] Write failing integration tests for saved views, widgets, no-access state, recent searches, and query-store coordination in `apps/web/tests/integration/inbox/inbox-triage.test.tsx`

### Implementation for User Story 1

- [X] T024 [US1] Implement cursor-based conversation and dashboard reads with visibility applied before search/count derivation in `apps/web/src/features/inbox/services/mock-inbox-service.ts`
- [X] T025 [P] [US1] Implement scoped `useInfiniteQuery` conversation loading, dashboard/lookups queries, and recent-search actions in `apps/web/src/features/inbox/hooks/use-inbox-list.ts`
- [X] T026 [P] [US1] Build the semantic Arabic RTL conversation card and accessible selectable list with unread, platform, status, assignments, tags, empty/loading/error states, and load-more sentinel in `apps/web/src/features/inbox/components/conversation-card.tsx` and `apps/web/src/features/inbox/components/conversation-list.tsx`
- [X] T027 [P] [US1] Build saved-view navigation and permission-scoped dashboard stat widgets in `apps/web/src/features/inbox/components/inbox-sidebar.tsx` and `apps/web/src/features/inbox/components/inbox-dashboard.tsx`
- [X] T028 [P] [US1] Build global search with recent mock searches and accessible result/loading status in `apps/web/src/features/inbox/components/inbox-search.tsx`
- [X] T029 [P] [US1] Build the React Hook Form/Zod filter and sort controls with active chips, clear-one/clear-all, and date-range errors in `apps/web/src/features/inbox/forms/inbox-filter-form.tsx` and `apps/web/src/features/inbox/components/inbox-toolbar.tsx`
- [X] T030 [US1] Compose the desktop triage sidebar and conversation browser, wire selection/query state, and show the mock-data notice in `apps/web/src/features/inbox/screens/inbox-screen.tsx`
- [X] T031 [US1] Add selection reconciliation for filter, reassignment, deletion, and permission-scope changes without exposing stale content in `apps/web/src/features/inbox/hooks/use-inbox-selection.ts`
- [X] T032 [US1] Verify the complete scoped discovery journey and cursor loading in `apps/web/playwright/journeys/inbox-permissions.spec.ts` and `apps/web/playwright/journeys/inbox-management.spec.ts`

**Checkpoint**: User Story 1 independently delivers a permission-safe, searchable, filterable Inbox browser and operational dashboard.

---

## Phase 4: User Story 2 — Read and reply in context (Priority: P1)

**Goal**: Employees read day-grouped messages and customer context and send mocked text/emoji/attachment replies when permitted.

**Independent Test**: Select a long seeded conversation containing all message/attachment types, load older messages, inspect customer context, send text and supported attachments, reject invalid attachments, and confirm read-only users cannot reply.

### Tests for User Story 2

- [X] T033 [P] [US2] Write failing contract tests for message cursors, reply authorization, validation, idempotent retry tokens, attachment policy, and atomic list/detail updates in `apps/web/tests/contract/inbox/inbox-messaging-contract.test.ts`
- [X] T034 [P] [US2] Write failing unit tests for day grouping, delivery presentation, mixed-direction content, attachment validation, and draft-store isolation in `apps/web/tests/unit/inbox/inbox-messages.test.ts`
- [X] T035 [P] [US2] Write failing integration tests for conversation selection, independent surface failures, reply permissions, draft preservation, mock send feedback, and preview updates in `apps/web/tests/integration/inbox/inbox-messaging.test.tsx`

### Implementation for User Story 2

- [X] T036 [US2] Implement conversation detail, cursor message reads, mark-read, and idempotent send-reply commands in `apps/web/src/features/inbox/services/mock-inbox-service.ts`
- [X] T037 [P] [US2] Implement detail/message infinite queries and reply/mark-read mutations with scoped cache reconciliation and Sonner feedback in `apps/web/src/features/inbox/hooks/use-inbox-conversation.ts` and `apps/web/src/features/inbox/hooks/use-inbox-messaging.ts`
- [X] T038 [P] [US2] Build the conversation header with customer, platform, status, assignments, tags, and capability-aware quick-action slots in `apps/web/src/features/inbox/components/conversation-header.tsx`
- [X] T039 [P] [US2] Build semantic incoming/outgoing bubbles, image/document/PDF renderers, voice/video placeholders, timestamps, delivery states, and `dir="auto"` content in `apps/web/src/features/inbox/components/message-bubble.tsx` and `apps/web/src/features/inbox/components/message-attachment.tsx`
- [X] T040 [US2] Build the chronological day-grouped message history with older-page prepending, scroll-anchor preservation, polite announcements, and isolated states in `apps/web/src/features/inbox/components/message-list.tsx`
- [X] T041 [P] [US2] Build the composer schema adapter and accessible emoji, text, attachment staging/removal, multiline, send, pending, and error interactions in `apps/web/src/features/inbox/forms/message-composer-form.tsx` and `apps/web/src/features/inbox/components/message-composer.tsx`
- [X] T042 [P] [US2] Reuse shared dropzone/file-preview primitives for supported mock attachments and safe object-URL cleanup in `apps/web/src/features/inbox/components/composer-attachments.tsx`
- [X] T043 [US2] Compose header, messages, composer, and independently loaded customer context into the workspace in `apps/web/src/features/inbox/screens/conversation-workspace.tsx`
- [X] T044 [US2] Verify the read/reply/attachment journey, failure recovery, and reply-denied persona in `apps/web/playwright/journeys/inbox-messaging.spec.ts`

**Checkpoint**: User Story 2 independently provides a modern readable messaging workspace with production-like mock reply behavior.

---

## Phase 5: User Story 3 — Manage conversation workflow (Priority: P2)

**Goal**: Authorized employees assign/reassign/remove owners, change lifecycle state, manage tags, archive/restore/delete, and inspect immutable history.

**Independent Test**: Exercise every management command under allowed and denied personas, verify one immutable history event per assignment, and confirm list/detail/dashboard/saved-view consistency after each change.

### Tests for User Story 3

- [X] T045 [P] [US3] Write failing contract tests for assignment permission combinations, reassign rules, immutable history, lifecycle transitions, tag rules, archive/restore/delete, conflicts, and rollback-on-failure in `apps/web/tests/contract/inbox/inbox-management-contract.test.ts`
- [X] T046 [P] [US3] Write failing integration tests for permission-aware management controls, confirmations, history rendering, and cross-query reconciliation in `apps/web/tests/integration/inbox/inbox-management.test.tsx`

### Implementation for User Story 3

- [X] T047 [US3] Implement assignment, status, tags, archive, restore, soft-delete, version conflict, system-event, and immutable history commands in `apps/web/src/features/inbox/services/mock-inbox-service.ts`
- [X] T048 [P] [US3] Implement assignment/history queries and management mutations with exact query-family reconciliation and Sonner outcomes in `apps/web/src/features/inbox/hooks/use-inbox-management.ts`
- [X] T049 [P] [US3] Build React Hook Form/Zod employee/team assignment and reassign/remove dialog flows in `apps/web/src/features/inbox/forms/assignment-form.tsx` and `apps/web/src/features/inbox/components/assignment-dialog.tsx`
- [X] T050 [P] [US3] Build status selection and archive/restore/delete confirmation controls that distinguish independent permissions in `apps/web/src/features/inbox/components/conversation-status-actions.tsx`
- [X] T051 [P] [US3] Build accessible multi-tag add/remove controls with text plus color badges and inactive-tag history behavior in `apps/web/src/features/inbox/forms/tag-form.tsx` and `apps/web/src/features/inbox/components/conversation-tags.tsx`
- [X] T052 [P] [US3] Render assignment and system event timelines using the shared timeline primitive with no edit/delete affordance in `apps/web/src/features/inbox/components/conversation-timeline.tsx`
- [X] T053 [US3] Integrate capability-aware management actions and customer/assignment details into `apps/web/src/features/inbox/screens/conversation-workspace.tsx`
- [X] T054 [US3] Verify assignment, status, tags, archive/restore/delete, history, and denied actions in `apps/web/playwright/journeys/inbox-management.spec.ts`

**Checkpoint**: User Story 3 independently provides permission-safe conversation ownership and lifecycle management.

---

## Phase 6: User Story 4 — Collaborate with private notes (Priority: P2)

**Goal**: Employees add clearly private notes and edit/delete only their own notes.

**Independent Test**: Create notes as two employees, confirm both permitted employees can read them, confirm only the author can edit/delete, and prove note content never enters customer-visible message projections.

### Tests for User Story 4

- [X] T055 [P] [US4] Write failing contract tests for note visibility, author-only edit/delete, permission denial, conflicts, and message-projection privacy in `apps/web/tests/contract/inbox/inbox-notes-contract.test.ts`
- [X] T056 [P] [US4] Write failing integration tests for add/edit/delete flows, ownership controls, confirmations, preserved input, and employee-only semantics in `apps/web/tests/integration/inbox/inbox-notes.test.tsx`

### Implementation for User Story 4

- [X] T057 [US4] Implement note reads and atomic add/edit/delete-own-note commands in `apps/web/src/features/inbox/services/mock-inbox-service.ts`
- [X] T058 [P] [US4] Implement scoped note queries and mutations with ownership capabilities, conflict recovery, cache reconciliation, and Sonner feedback in `apps/web/src/features/inbox/hooks/use-inbox-notes.ts`
- [X] T059 [P] [US4] Build React Hook Form/Zod note create/edit forms with author-safe command mapping in `apps/web/src/features/inbox/forms/internal-note-form.tsx`
- [X] T060 [US4] Build the employee-only notes panel with unmistakable privacy labels and author-only edit/delete actions in `apps/web/src/features/inbox/components/internal-notes-panel.tsx`
- [X] T061 [US4] Verify two-employee note collaboration, privacy, and keyboard operation in `apps/web/playwright/journeys/inbox-notes.spec.ts`

**Checkpoint**: User Story 4 independently enables internal collaboration without customer-data leakage.

---

## Phase 7: User Story 5 — Work across supported viewports (Priority: P3)

**Goal**: Primary Inbox workflows work in Arabic RTL with keyboard and assistive technology on desktop, laptop, and tablet, plus essential mobile discovery/read/reply.

**Independent Test**: Complete discovery, selection, reading, reply, and permitted management at every viewport with keyboard-only navigation; verify focus restoration, mixed-direction content, 200% zoom, touch targets, and no critical accessibility violations.

### Tests for User Story 5

- [X] T062 [P] [US5] Write failing unit tests for responsive pane-store transitions, selected-item focus restoration, and scope-loss pane reset in `apps/web/tests/unit/inbox/inbox-workspace-store.test.ts`
- [X] T063 [P] [US5] Write failing Playwright layout journeys for desktop, laptop, tablet, mobile, 200% zoom, no horizontal page overflow, and 44-pixel touch targets in `apps/web/playwright/journeys/inbox-responsive.spec.ts`
- [X] T064 [P] [US5] Write failing Playwright keyboard and axe journeys for landmarks, names, focus, dialogs, list navigation, live regions, contrast, and disabled states in `apps/web/playwright/accessibility/inbox-keyboard.spec.ts` and `apps/web/playwright/accessibility/inbox-a11y.spec.ts`

### Implementation for User Story 5

- [X] T065 [P] [US5] Implement responsive pane measurement/mode coordination and focus-return helpers in `apps/web/src/features/inbox/hooks/use-inbox-responsive.ts` and `apps/web/src/features/inbox/hooks/use-inbox-focus.ts`
- [X] T066 [US5] Implement desktop three-pane, laptop collapsible-detail, tablet two-pane, and mobile single-pane composition with logical RTL utilities in `apps/web/src/features/inbox/components/inbox-layout.tsx`
- [X] T067 [P] [US5] Implement accessible Back, detail-sheet, panel heading, focus trap/restoration, and reduced-motion interactions in `apps/web/src/features/inbox/components/inbox-responsive-navigation.tsx`
- [X] T068 [P] [US5] Apply bidi isolation, semantic landmarks, non-color cues, accessible icon labels, live status, and minimum touch targets across `apps/web/src/features/inbox/components/conversation-card.tsx`, `apps/web/src/features/inbox/components/message-bubble.tsx`, and `apps/web/src/features/inbox/components/message-composer.tsx`
- [X] T069 [US5] Make the desktop/list/workspace state survive supported pane transitions and re-run the responsive/keyboard/a11y journeys in `apps/web/src/features/inbox/screens/inbox-screen.tsx`

**Checkpoint**: User Story 5 independently proves the Inbox experience is RTL-native, responsive, and accessible.

---

## Phase 8: User Story 6 — Preview future AI affordances (Priority: P3)

**Goal**: Employees understand where future AI assistance belongs while no placeholder can execute, simulate output, or mutate data.

**Independent Test**: Inspect all six AI areas with pointer, keyboard, and assistive technology and prove each is explanatory, unavailable, non-trapping, network-silent, and mutation-free.

### Tests for User Story 6

- [X] T070 [P] [US6] Write failing unit/integration tests for scope-safe read-only AI context and six non-interactive placeholder states in `apps/web/tests/integration/inbox/inbox-ai-placeholders.test.tsx`

### Implementation for User Story 6

- [X] T071 [P] [US6] Implement the scope-safe read-only AI context projection without model calls or commands in `apps/web/src/features/inbox/services/mock-inbox-service.ts`
- [X] T072 [US6] Build disabled AI summary, suggested reply, assignment, tags, sentiment, and knowledge-search placeholders in `apps/web/src/features/inbox/components/ai-placeholder-panel.tsx`
- [X] T073 [US6] Integrate AI placeholders into visible conversation details and verify zero enabled actions, network work, or data mutations in `apps/web/playwright/journeys/inbox-ai-placeholders.spec.ts`

**Checkpoint**: User Story 6 independently demonstrates accurate, authorization-safe AI readiness without implementing AI.

---

## Phase 9: Polish and cross-cutting integration

**Purpose**: Final consistency, failure-state, performance, documentation, and repository-wide validation after all selected stories are complete.

- [X] T074 [P] Add deterministic empty, partial-failure, conflict, missing-avatar, long-content, invalid-date, invalid-attachment, and deleted-selection scenarios in `apps/web/src/features/inbox/services/mock-scenario-controller.ts`
- [X] T075 [P] Add consistent Inbox skeleton, empty, forbidden, unavailable, and isolated error-state compositions using shared primitives in `apps/web/src/features/inbox/components/inbox-states.tsx`
- [X] T076 Audit all Inbox forms, dialogs, badges, cards, uploads, timelines, and feedback for shared-component reuse and document any justified feature-local pattern in `apps/web/src/features/inbox/README.md`
- [X] T077 Profile the 500+ conversation and long-message fixtures, narrow selectors/query invalidation, memoize derived projections, and add a regression assertion for duplicate-free responsive loading in `apps/web/tests/integration/inbox/inbox-scale.test.tsx`
- [X] T078 Verify the App Router server/client boundary and lazy-load infrequent management/detail panels without changing workflow behavior in `apps/web/src/app/(workspace)/inbox/page.tsx` and `apps/web/src/features/inbox/screens/inbox-screen.tsx`
- [X] T079 Run focused Inbox typecheck, lint, unit, contract, integration, desktop/laptop/tablet/mobile, keyboard, axe, and build validations from `specs/010-unified-inbox/quickstart.md` and record results in `specs/010-unified-inbox/validation.md`
- [X] T080 Reconcile every specification requirement, success criterion, edge case, service contract, permission rule, and workspace contract against implementation evidence in `specs/010-unified-inbox/validation.md`
- [X] T081 Perform the post-implementation constitution check for dynamic configuration, module boundaries, service-only data access, Arabic RTL, responsive/accessibility, feedback, strict typing, and future backend/AI boundaries in `specs/010-unified-inbox/validation.md`

---

## Dependencies and execution order

### Phase dependencies

- **Phase 1 — Setup**: Starts immediately.
- **Phase 2 — Foundational**: Depends on Phase 1 and blocks every user story.
- **Phase 3 — US1**: Starts after Phase 2 and forms the suggested MVP.
- **Phase 4 — US2**: Starts after Phase 2; integrates naturally with US1 selection but can be tested by opening a seeded conversation directly through the feature screen fixture.
- **Phase 5 — US3**: Starts after Phase 2; its screens integrate with US2's workspace, while its service and component slice remains independently testable.
- **Phase 6 — US4**: Starts after Phase 2; its notes panel integrates with the workspace but has an independent service and test harness.
- **Phase 7 — US5**: Requires the selected primary workflows from US1–US4 to exist before full viewport/accessibility validation.
- **Phase 8 — US6**: Starts after Phase 2 and only requires a visible seeded conversation; it may run alongside US3/US4.
- **Phase 9 — Polish**: Depends on all stories chosen for release.

### User-story dependency graph

```text
Setup → Foundation → US1 (MVP triage)
                   ├→ US2 (read/reply) ─┬→ US5 (responsive/a11y across workflows)
                   ├→ US3 (management) ─┤
                   ├→ US4 (notes) ──────┤
                   └→ US6 (AI placeholders)

All selected stories → Polish and final validation
```

### Within each user story

1. Write tests and confirm they fail for the intended missing behavior.
2. Implement service rules and hooks before dependent UI orchestration.
3. Build independent components/forms in parallel where marked `[P]`.
4. Integrate the story into its screen.
5. Run the story's focused contract/integration/browser validation before proceeding.

## Parallel opportunities

- Setup tasks T002 and T004 can run together after T001.
- Foundational type files T006–T009, presentation/permission configuration T011–T012, and pure scope/query utilities T015–T016 can run concurrently before service assembly.
- All test tasks at the start of a story are parallel because they occupy distinct test layers/files.
- US1 list, sidebar/dashboard, search, and filter UI tasks T026–T029 can run together after the query hook contract is settled.
- US2 header, message renderer, composer, and attachment tasks T038–T042 have separate files and can run concurrently before workspace composition.
- US3 assignment, status, tags, and timeline tasks T049–T052 can run concurrently after management commands/hooks exist.
- US4 hook and form tasks T058–T059 can run concurrently after the service command contract exists.
- US5 responsive helpers, navigation, and cross-component accessibility passes T065, T067, and T068 can run concurrently after the failing tests define behavior.
- US6 read-only projection T071 and placeholder component T072 may start concurrently after T070 establishes the contract.
- Cross-cutting scenario and state work T074–T075 can run concurrently before final validation.

## Parallel execution examples

### User Story 1

```text
Task T021: Contract-test scoped reads and stable cursors.
Task T022: Unit-test search/filter/sort utilities.
Task T023: Integration-test triage UI and state coordination.
```

After T024–T025 establish reads/hooks:

```text
Task T026: Conversation cards and list.
Task T027: Saved views and dashboard.
Task T028: Search and recent searches.
Task T029: Filters and sorting.
```

### User Story 2

```text
Task T038: Conversation header.
Task T039: Message and attachment renderers.
Task T041: Composer.
Task T042: Attachment staging.
```

### User Story 3

```text
Task T049: Assignment form/dialog.
Task T050: Status and destructive actions.
Task T051: Tag management.
Task T052: Immutable timelines.
```

### User Stories 4–6

```text
Task T058 + T059: Notes query/mutation hooks and note form.
Task T065 + T067 + T068: Responsive coordination, navigation, and accessibility pass.
Task T071 + T072: Read-only AI projection and disabled AI UI.
```

## Implementation strategy

### MVP first

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 User Story 1.
4. Stop and validate assigned/team/global/no-access discovery independently.
5. Demo a permission-safe unified conversation browser with saved views, dashboard, search, filters, sorting, and progressive loading.

### Incremental delivery

1. **MVP**: US1 triage and browsing.
2. Add US2 messaging and customer context.
3. Add US3 assignment/lifecycle/tag management.
4. Add US4 private collaboration notes.
5. Complete US5 responsive and accessibility validation across delivered workflows.
6. Add US6 disabled AI affordances.
7. Complete cross-cutting polish and final constitution/quickstart validation.

### Parallel team strategy

After Foundation is complete, separate owners may implement US1, US2, US3, US4, and US6 concurrently using their service/component test harnesses. US5 follows the primary workflows because it validates their integrated responsive and accessibility behavior. Coordinate shared edits to `mock-inbox-service.ts`, `conversation-workspace.tsx`, and shared navigation/permission catalogs serially to avoid conflicts.

## Notes

- `[P]` tasks are safe only when their stated prerequisites are complete.
- Story labels provide traceability to `spec.md`; setup, foundation, and polish deliberately have no story label.
- Mock domain state remains in the service and TanStack Query; Zustand contains UI coordination only.
- UI permission hiding is an affordance; the service remains the authoritative scope/action boundary.
- No backend adapter, messaging integration, ticketing, knowledge base, or active AI behavior belongs in these tasks.
- Commit after each task or coherent task group and re-run the closest focused tests.
