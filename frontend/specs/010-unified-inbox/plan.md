# Implementation Plan: Unified Inbox

**Branch**: `010-unified-inbox` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-unified-inbox/spec.md`

## Summary

Build an Arabic-first, RTL-native Inbox at `/inbox` as a feature-owned, highly interactive workspace. A typed `InboxService` exposes deterministic in-memory fixtures and commands through TanStack Query; query cache is the sole source of conversation data, while a small Zustand store coordinates cross-pane UI state (selected conversation, list query, responsive pane, panel visibility, and composer drafts). The route remains a thin App Router entry point, with interactive client boundaries contained inside Inbox screens. Shared feedback, upload, timeline, layout, and design-system primitives are reused; Inbox-specific virtualized conversation and message surfaces remain inside `features/inbox`. Mock permission profiles enforce visibility in the service as well as action availability in the UI. Contracts preserve a future HTTP adapter and AI context boundary without implementing either.

## Technical Context

**Language/Version**: TypeScript 5 in strict mode; React 19.2.4; Node.js 20+

**Primary Dependencies**: Next.js 16.2.6 App Router, Tailwind CSS 4, shared shadcn-style UI package, TanStack Query 5, Zustand 5, React Hook Form 7, Zod 4, Lucide React, Sonner, react-dropzone

**Storage**: Deterministic in-memory Inbox fixtures behind a typed feature service; TanStack Query cache owns read/mutation state for the active browser session; no backend or durable persistence

**Testing**: Vitest 4 with Testing Library and jsdom for domain/service/hook/component tests; Playwright 1.62 with axe for desktop, laptop, tablet, keyboard, RTL, accessibility, and end-to-end journeys

**Target Platform**: Modern web browsers; desktop-first, with mandatory desktop/laptop/tablet support and an essential single-pane mobile experience

**Project Type**: npm/Turborepo monorepo web application (`apps/web` plus shared `packages/ui`)

**Performance Goals**: Search/filter feedback and conversation selection feel immediate; seeded scale of at least 500 conversations; list and message scrolling remain responsive; affected surfaces reconcile within one second after a mock mutation

**Constraints**: Fully mock-driven; no external messaging, backend, ticketing, CRM, knowledge-base, or active AI integration; Arabic and RTL default; permission scope enforced before data reaches UI; strict types and no duplicated business state; no silent failures

**Scale/Scope**: One `/inbox` route, three-pane desktop workspace, six saved views, five operational widgets, five conversation statuses, ten permissions, realistic relational fixtures, paged/infinite list, and full primary workflows across three mandatory viewport classes

## Constitution Check

*GATE: Passed before Phase 0 research; passed again after Phase 1 design.*

- **Business workflow — PASS**: Service commands preserve visibility, granular action permissions, author-only note edits/deletes, status rules, assignment combinations, archive/delete/restore behavior, and immutable assignment history.
- **Module boundary — PASS**: `features/inbox` owns domain, commands, fixtures, services, hooks, store, screens, and Inbox-only components. `/inbox/page.tsx` only renders the feature screen. Employee, team, branch, session, navigation, feedback, and shared primitives cross explicit shared contracts.
- **Dynamic configuration — PASS**: Platforms, branches, teams, employees, statuses, tags, saved views, and mock permission profiles enter through lookup/config projections. Seeded examples are data, not control-flow constants.
- **Frontend separation — PASS**: Pages orchestrate no business logic. Components render projections and emit commands. Visibility, validation, mutation rules, derived counts, search/filter/sort, and fixture mutation live behind feature services and utilities.
- **State and validation — PASS**: TanStack Query owns service data and mutations; Zustand owns only cross-pane UI state; ephemeral dialog state remains local. Composer, notes, filters requiring validation, and assignment commands use authoritative Zod schemas with React Hook Form where form orchestration is useful.
- **Design system/reuse — PASS**: Reuse shared buttons, badges, inputs, cards, confirmation dialogs, state surfaces, fixture notice, file preview/dropzone, timeline, and layout primitives. Inbox's dense conversational list is a distinct streaming navigation surface rather than a duplicated shared data table.
- **Arabic/RTL and responsive — PASS**: Arabic copy is centralized, root RTL behavior is preserved, bidirectional message content is isolated, and the three-pane workspace adapts to two-pane tablet and single-pane mobile navigation.
- **Accessibility — PASS**: Landmark structure, labeled list/workspace/sidebar regions, keyboard list navigation, visible focus, focus restoration, live mutation feedback, accessible dialogs, non-color tag/status cues, and reduced-motion behavior are contract requirements and test targets.
- **Feedback/error handling — PASS**: Query surfaces isolate loading/empty/error/forbidden states; mutations expose pending state and use Sonner for success/failure; destructive actions require confirmation; mock-data status is explicit.
- **AI/future readiness — PASS**: Typed conversation context includes tenant/branch/customer/message/assignment/tag/permission/audit data. Disabled AI slots consume read-only projections and cannot issue commands. Future adapters remain subject to the same authorization boundary.
- **Performance/type safety — PASS**: Client boundaries are limited to Inbox interaction screens; selectors and query keys narrow rerenders; cursor pages avoid loading the full list into the DOM; types avoid `any`; scale fixtures and performance-oriented tests cover 500+ conversations.

No constitutional exceptions are required.

## Project Structure

### Documentation (this feature)

```text
specs/010-unified-inbox/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── inbox-service.md
│   ├── permissions.md
│   └── workspace-ui.md
└── tasks.md                 # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/app/(workspace)/inbox/
│   ├── page.tsx             # Thin server route entry
│   ├── loading.tsx          # Route-level loading fallback
│   └── error.tsx            # Route-level unexpected-error boundary
├── src/features/inbox/
│   ├── components/          # Inbox list, chat, composer, panels, dialogs, states
│   ├── config/              # Arabic copy, presentation maps, permissions, saved views
│   ├── data/                # Relational fixtures, lookups, 500+ scale generator
│   ├── forms/               # Composer, note, assignment, tag and filter forms
│   ├── hooks/               # Queries, infinite list, mutations, scope, responsive focus
│   ├── schemas/             # Zod list-query and command schemas
│   ├── screens/             # Inbox screen and workspace orchestration
│   ├── services/            # Interface, mock implementation, query keys, scenario controller
│   ├── stores/              # Zustand workspace UI state only
│   ├── types/               # IDs, domain entities, commands, projections, ports
│   ├── utils/               # Pure search/filter/sort, grouping, permissions, formatting
│   └── index.ts             # Deliberate public exports
├── src/shared/
│   ├── config/foundation-navigation.ts
│   ├── config/permission-catalog.ts
│   ├── config/icon-registry.ts
│   └── providers/module-registry.ts
├── tests/
│   ├── unit/inbox/          # Schemas, stores, selectors, components and utilities
│   ├── integration/inbox/   # Service commands, scope, cache reconciliation
│   └── contract/inbox/      # Service/permission projection contract tests
└── playwright/
    ├── journeys/inbox-management.spec.ts
    ├── journeys/inbox-permissions.spec.ts
    ├── journeys/inbox-responsive.spec.ts
    ├── accessibility/inbox-a11y.spec.ts
    └── accessibility/inbox-keyboard.spec.ts

packages/ui/src/components/ # Extend only if a genuinely cross-feature primitive is missing
```

**Structure Decision**: Use the existing Academy ERP web application pattern. The App Router route is intentionally thin; the complete Inbox module lives under `apps/web/src/features/inbox`. Shared navigation and permission catalogs receive explicit Inbox registrations. Existing shared components are reused, while conversation-specific behavior stays feature-local until demonstrated reusable elsewhere.

## Phase 0: Research Outcomes

Research decisions and rejected alternatives are recorded in [research.md](./research.md). All technical-context unknowns are resolved. The decisive choices are:

1. Keep route and static shell server-rendered by default, with an explicit client boundary at the interactive Inbox screen.
2. Treat the in-memory service as server-state semantics and expose it only through TanStack Query; do not place conversation entities in Zustand. Include the current tenant, employee, team, and permission context in a stable scope fingerprint for every query family.
3. Use cursor-based progressive loading for the conversation list and message history, with deterministic stable ordering.
4. Enforce visibility and command permissions inside the mock service, then mirror permissions in UI projections for discoverability.
5. Keep selection and list state session-local in Zustand for this release, with a typed state contract that can later map stable state to URL parameters.
6. Use feature-specific list semantics instead of forcing a messaging navigation surface into the shared tabular data component.

## Phase 1: Design Outcomes

- [data-model.md](./data-model.md) defines entities, relationships, validation, derived projections, and lifecycle transitions.
- [contracts/inbox-service.md](./contracts/inbox-service.md) defines reads, commands, errors, consistency, pagination, and future adapter boundaries.
- [contracts/permissions.md](./contracts/permissions.md) defines visibility precedence and action enforcement.
- [contracts/workspace-ui.md](./contracts/workspace-ui.md) defines pane behavior, responsive transitions, focus, and state ownership.
- [quickstart.md](./quickstart.md) provides setup, validation commands, seeded personas, and end-to-end acceptance scenarios.

### Post-Design Constitution Re-check

The Phase 1 artifacts preserve every pre-design gate. In particular, the data model treats business lookups as configurable entities; service contracts prevent page-level data access and enforce authorization; UI contracts require Arabic/RTL, accessibility, and responsive behavior; and the validation guide exercises permissions, error states, scale, and AI-disabled behavior. No new complexity exception or unresolved clarification was introduced.

## Complexity Tracking

No violations require justification.
