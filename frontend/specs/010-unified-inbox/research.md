# Research: Unified Inbox

## Decision 1: App Router and client boundary

**Decision**: Add a thin `/inbox` page under the existing `(workspace)` route group. Keep the route entry and non-interactive framing as Server Components, then introduce a focused client boundary at the interactive Inbox screen and its hook-driven descendants.

**Rationale**: Repository-local Next.js 16 guidance makes pages Server Components by default and recommends placing `use client` at the narrowest boundary that needs state, event handlers, browser APIs, or custom hooks. The Inbox is interaction-heavy, but the route itself has no reason to own that interactivity.

**Alternatives considered**: Mark the route page as a Client Component (larger client graph and business orchestration in the page); split every small control into a separate client root (excessive boundary complexity with little benefit).

## Decision 2: Server state versus UI state

**Decision**: Store conversations, messages, notes, tags, assignments, histories, lookups, summaries, and mutations in an in-memory `InboxService` surfaced through TanStack Query. Use Zustand only for workspace UI coordination: selected conversation, saved view and filters, pane mode/visibility, active side panel, and per-conversation draft metadata. Keep dialog targets and hover/open state local.

**Rationale**: The constitution requires service-backed data and TanStack Query for server state. Mock data should preserve the same ownership semantics as a future backend. One authoritative service plus query-cache invalidation prevents diverging conversation copies in service, query cache, and a global store.

**Alternatives considered**: Put the entire relational dataset in Zustand (duplicates future server-state behavior and bypasses query contracts); React Context for all state (broad rerenders and mixed ownership); component-local state only (cannot coordinate responsive panes and preserved drafts).

## Decision 3: Service boundary and future adapter

**Decision**: Define an `InboxService` interface with read models, cursor reads, and explicit command objects. Implement only the deterministic mock adapter now. Keep command and projection types transport-neutral so a future HTTP adapter can implement the same interface without changing screens.

**Rationale**: Existing features use interface/active-service/mock-service/query-key boundaries. A transport-neutral contract fulfills the no-backend scope while preserving replacement readiness.

**Alternatives considered**: Add placeholder route handlers or HTTP calls (out of scope and falsely implies integration); import fixtures directly into screens (violates frontend separation and makes replacement invasive).

## Decision 4: Pagination and large-list behavior

**Decision**: Use cursor-based progressive loading for conversations and older messages. Order conversations by selected sort with ID as a stable tie-breaker; order messages chronologically and prepend older pages while preserving scroll anchor. Seed at least 500 conversations and enough long histories to validate behavior.

**Rationale**: Infinite scrolling matches inbox expectations, avoids page jumps, and is already supported by TanStack Query. Stable cursors prevent duplicates when mock mutations alter activity order. Bounded rendering and memoized selectors protect responsiveness.

**Alternatives considered**: Numbered pages (valid but less natural for active inbox triage); load the whole dataset (simple but weak scale behavior); window virtualization immediately (use only if measured DOM/rendering performance requires it, since it increases focus and screen-reader complexity).

## Decision 5: Permission enforcement

**Decision**: Resolve the effective visibility scope as all, then team, then assigned, and enforce it in every mock read. Validate action permissions and ownership again in every mock command. Return UI permission projections to hide unavailable controls, but never rely on hiding alone.

**Rationale**: Mock behavior must simulate a production authorization boundary and ensure summaries, searches, histories, and direct conversation reads cannot leak out-of-scope data.

**Alternatives considered**: Filter only in components (leaks data to client state and is easy to bypass); disable rather than hide every action (conflicts with the approved specification, though disabled affordances remain appropriate when explanation is operationally useful).

## Decision 6: Forms and validation

**Decision**: Define authoritative Zod schemas for list queries and all commands. Use React Hook Form for notes, assignment/tag dialogs, and filter forms where validation and submit lifecycle matter. Keep the message composer controlled around its draft because it requires per-conversation draft preservation, attachment staging, and immediate send ergonomics; validate its submit command through the same Zod schema.

**Rationale**: This preserves one validation authority without forcing a conversational text box into an unnatural form lifecycle.

**Alternatives considered**: React Hook Form for every keystroke (unnecessary draft synchronization complexity); hand-written validation in components (duplicated rules and weaker type guarantees).

## Decision 7: Messaging list versus shared data table

**Decision**: Reuse shared search, filter, badges, cards, loading, and feedback patterns, but create an Inbox-owned semantic conversation list and message timeline. Do not force these navigation/message streams into the shared tabular `DataTable`.

**Rationale**: A conversation list is a selectable navigation feed with unread and presence-like semantics, not a row/column business table. Feature-local components avoid corrupting the shared table abstraction while retaining shared visual language.

**Alternatives considered**: Use `DataTable` for constitutional compliance (wrong semantics and awkward responsive behavior); introduce a second generic list framework before another consumer exists (premature shared abstraction).

## Decision 8: Responsive information architecture

**Decision**: Desktop uses saved-view/sidebar, conversation list, workspace, and a collapsible customer drawer/rail within available width. Laptop retains triage plus workspace with the customer panel overlaid or collapsible. Tablet uses list/workspace navigation with side panels as dialogs/sheets. Mobile uses a single-pane stack with explicit back navigation and essential discovery, reading, and reply.

**Rationale**: The complete desktop experience remains dense without making narrower viewports unusable. Explicit pane transitions support focus restoration and avoid horizontally compressed chat.

**Alternatives considered**: Always render three columns (clipped controls and poor tablet usability); create separate mobile routes (duplicated state and workflow); declare mobile unsupported (contradicts the feature specification).

## Decision 9: Accessibility and bidi content

**Decision**: Use named landmarks and list semantics, roving or managed list focus with Enter to open, focus restoration after pane/dialog closure, polite live regions for new messages and mutations, non-color status/tag labels, `dir="auto"` on user-generated content, `<bdi>` or the existing bidi utility for phone/ID/time/file values, Arabic UI RTL at the shell, logical start/end spacing utilities, reduced-motion-safe transitions, at least 44-pixel touch targets, 200% zoom usability, and native media/file semantics where available.

**Rationale**: Inbox density and live updates create predictable accessibility risks. Explicit navigation and bidirectional isolation are required for Arabic customer conversations containing phone numbers and Latin text.

**Alternatives considered**: Rely only on browser defaults (insufficient for pane changes and live updates); force all message content RTL (damages Latin and mixed-direction content).

## Decision 10: Mock mutation consistency

**Decision**: The mock service owns a mutable cloned fixture graph per browser session. Commands validate expected entity/version where stale edits are possible, apply atomically, append immutable events, and return updated projections. Mutation hooks update or invalidate all affected detail, list, summary, lookup, and history query keys and provide Sonner feedback.

**Rationale**: Production-like consistency makes the mock valuable for testing future adapter contracts and prevents one pane from showing stale ownership or status.

**Alternatives considered**: Optimistic UI without authoritative command result (harder to test permission/conflict failures); mutate fixture imports directly (cross-test contamination and no reset boundary).

## Decision 11: Testing strategy

**Decision**: Test pure schema/search/filter/sort/permission functions and Zustand selectors with Vitest; test mock service commands and query reconciliation as integration/contract suites; test primary Arabic RTL journeys, personas, viewport transitions, keyboard flow, axe checks, and scale behavior with Playwright. Use the existing `NEXT_PUBLIC_API_MOCKS=true` test environment and scenario-controller pattern.

**Rationale**: Business rules need fast deterministic coverage while focus, responsive layout, and full interaction need browser validation.

**Alternatives considered**: Browser tests only (slow and poor failure isolation); unit tests only (cannot verify layout, focus, scrolling, or integrated cache behavior).

## Decision 12: AI placeholders

**Decision**: Define read-only AI context projections and render disabled slots for summary, suggested reply/assignment/tags, sentiment, and knowledge search. No placeholder issues commands, calls a model, or generates simulated AI output.

**Rationale**: The domain stays AI-ready without misleading users or weakening authorization and audit boundaries.

**Alternatives considered**: Fake generated suggestions (violates scope); omit AI areas entirely (loses planned layout and context extension points).

## Decision 13: Shell registration and permission affordances

**Decision**: Register Inbox through feature-owned navigation and permission constants, then compose them into the shared navigation, icon registry, and permission catalog. Use the existing permission hook for UI affordances while keeping service enforcement authoritative. Scope every query key with a stable fingerprint derived from tenant, employee, team membership, and grants.

**Rationale**: These are the repository's explicit module extension points; using them preserves shell consistency and prevents cached global/team data from surviving a persona or scope change.

**Alternatives considered**: Add Inbox items directly inside shell components (crosses the module boundary); use UI-only permission checks (does not protect direct reads or cached projections); use unscoped query keys (risks cross-persona data exposure).
