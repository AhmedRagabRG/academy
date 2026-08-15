# Implementation Plan: Ticket Management

**Branch**: `011-ticket-management` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-ticket-management/spec.md` plus the user-provided implementation direction.

## Summary

Build a mock-driven Ticket Management module with a permission-scoped dashboard, independently paged Kanban columns, complete ticket workspace, assignment, internal comments, attachments, immutable activity, combined discovery controls, and archive/restore administration.

The feature follows the repository's established service-first frontend architecture. Thin App Router pages import feature screens; TanStack Query owns all service-backed ticket data and optimistic mutations; Zustand holds only cross-screen board preferences and saved views; React Hook Form and authoritative Zod schemas validate commands. A typed `TicketService` fronts deterministic session-persisted fixtures and is replaceable by a future HTTP adapter. Official dnd-kit packages provide pointer, touch, and keyboard movement, while an always-available “move to status” action guarantees equivalent access without dragging.

## Technical Context

**Language/Version**: TypeScript 5 strict, React 19.2.4, Next.js 16.2.6 App Router, Node.js 20+

**Primary Dependencies**: TanStack Query 5, Zustand 5, React Hook Form 7, Zod 4, Tailwind CSS 4, shadcn/ui through `@workspace/ui`, Lucide, Sonner, react-dropzone 19, existing shared shell/components, plus `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` for accessible Kanban movement

**Storage**: Deterministic, service-backed mock repository persisted for the browser session. No page or component reads fixtures or browser storage directly. `TicketService` is the only read/command boundary and a future HTTP implementation must satisfy the same contract.

**Testing**: Vitest 4 + Testing Library + jsdom for unit, service-contract, and screen integration tests; Playwright 1.62 + `@axe-core/playwright` for journeys, responsive layouts, keyboard, RTL, and accessibility

**Target Platform**: Modern evergreen browsers; Arabic-first RTL; desktop, laptop, tablet, and mobile

**Project Type**: Feature module in the existing `apps/web` Next.js monorepo application

**Performance Goals**: Filter/search feedback under 1 second for at least 500 fixtures; visible optimistic board changes within 300 ms; column pages of 20 tickets; no duplicate cards during paging or moves; smooth pointer interaction without layout-wide rerenders

**Constraints**: Fully mock-driven; no live backend, outbound notifications, or functional AI; immutable activity; service-enforced visibility and actions; Archived excluded from active board; mobile cannot depend on cross-column dragging; Server Components remain the default with client boundaries limited to interactive screens

**Scale/Scope**: 3 primary routes (dashboard/board, ticket detail, archive), approximately 8 domain entities, 6 active columns with independent cursors, at least 500 scale fixtures, 30 functional requirements, and 5 prioritized user stories

## Constitution Check

*GATE: Passed before Phase 0 and re-checked after Phase 1 design.*

- **Business workflow**: PASS — create, status, priority, four assignment states, comments, attachments, immutable activity, archive/restore/delete, and granular permissions are expressed as service commands and policies. Successful commands append activity atomically; denied commands append nothing.
- **Module boundary**: PASS — `features/tickets` owns routes under `/tickets`, screens, UI composition, hooks, schemas, services, domain policy, and fixtures. Inbox, Students, Customers, and Organization Settings are consumed only through narrow reader ports and shared IDs.
- **Dynamic configuration**: PASS — statuses, priorities, departments, branches, teams, employees, tags, permissions, and saved-view definitions are service-provided configuration. Brief values are seeded defaults, never UI conditionals or duplicated constants.
- **Frontend separation**: PASS — route files orchestrate routing only; screens compose feature behavior; components render typed projections; permission, visibility, query, lifecycle, assignment, and activity rules live behind utilities and `TicketService`.
- **State and validation**: PASS — TanStack Query owns tickets, columns, counts, details, comments, activity, and commands. URL search parameters own committed search, filters, archive mode, and selected saved view; Zustand stores saved-view definitions and board presentation preferences only. Local state owns dialogs, drag state, and filter drafts. RHF uses the same Zod schemas the mock service validates.
- **Design system/reuse**: PASS — shared page header, cards, badges, avatars, dialogs, sheets, forms, empty/error/loading states, file dropzone, timeline, and feedback patterns are reused. Ticket-specific board primitives remain feature-owned because no shared cross-feature Kanban exists.
- **Arabic/RTL and responsive**: PASS — Arabic copy is centralized; RTL DOM order follows logical workflow order; logical CSS properties are used; IDs use bidi isolation. Desktop/tablet use horizontal columns, while mobile uses a selected-status vertical list and full-screen details.
- **Accessibility**: PASS — semantic headings/lists, keyboard sensor, localized instructions and live announcements, visible drag handle, Escape cancellation, focus restoration, non-drag status menu, non-color priority/status cues, and automated axe/keyboard validation are planned.
- **Feedback/error handling**: PASS — every query surface defines loading, empty/no-results, error, forbidden, and retry states. Commands use Sonner success/failure feedback; optimistic mutations snapshot and roll back on refusal or mock failure.
- **AI/future readiness**: PASS — typed projections expose tenant, actor, permission, workflow, relationships, assignments, comments, attachments, and append-only audit context. AI placeholders are disabled and consume no suggestion data.
- **Performance/type safety**: PASS — strict types and branded IDs; normalized query keys; one infinite query per visible status; indexed mock repository; memoized cards/columns; no `any`; localized client boundaries; no initial virtualization until measurements justify its drag/accessibility complexity.

## Project Structure

### Documentation (this feature)

```text
specs/011-ticket-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ticket-management-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/app/(workspace)/tickets/
├── page.tsx
├── loading.tsx
├── error.tsx
├── archived/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
└── [ticketId]/
    ├── page.tsx
    ├── loading.tsx
    └── error.tsx

apps/web/src/features/tickets/
├── components/          # Board, columns, cards, timeline, comments, attachments, states
├── config/              # Arabic copy, error copy, permissions, navigation
├── data/                # Deterministic fixtures and scale fixtures
├── forms/               # Ticket, assignment, comment, and attachment forms
├── hooks/               # TanStack Query reads/mutations and board orchestration
├── schemas/             # Authoritative Zod command/query schemas
├── screens/             # Dashboard/board, detail, archived orchestration
├── services/            # Interface, mock, future HTTP adapter, query keys, dependency readers
├── store/               # Saved view and board presentation preferences only
├── types/               # Common, domain, projections, commands
├── utils/               # Scope, capabilities, workflow, queries, activity, paging
└── index.ts             # Public feature barrel

apps/web/tests/unit/tickets/
apps/web/tests/contract/tickets/
apps/web/tests/integration/tickets/
apps/web/playwright/journeys/tickets.spec.ts
apps/web/playwright/accessibility/tickets-accessibility.spec.ts
```

**Structure Decision**: Ticket Management is a peer feature beside Accounting, Admissions, and Student Finance. Route segments remain thin Server Components and import only the feature barrel. The module owns board-specific UI and domain rules; it reuses shared generic primitives and accesses related modules through reader ports rather than importing their internals.

## Phase Delivery Strategy

1. **Foundation**: domain types, schemas, configuration, service contract, deterministic fixtures, session repository, permission/scope policies, and contract tests.
2. **P1 board slice**: scoped dashboard/board reads, create form, independently paged columns, accessible movement, optimistic rollback, query states, and mobile selected-status view.
3. **P2 workspace slice**: detail route, editing, assignment validation/history, related-record summaries, priority changes, and immutable activity.
4. **P3 collaboration slice**: comments with author rules, attachments with mock upload outcomes, counts, and activity integration.
5. **P4 discovery slice**: normalized search, combined filters, saved views, counts from the same scoped query semantics, and scale validation.
6. **P5 governance and hardening**: archive/restore/delete, forbidden states, disabled AI placeholders, responsive/RTL/accessibility journeys, performance checks, and HTTP adapter shape verification.

## Post-Design Constitution Re-Check

*Re-evaluated after completing `research.md`, `data-model.md`, contracts, and quickstart. All gates pass.*

- The data model makes activity immutable structurally: no update/delete activity command exists, and every successful mutation appends its event within the same repository operation.
- Visibility is applied before pagination, dashboard aggregation, search, filters, and entity projection, preventing count or option leakage as well as card leakage.
- The contract keeps UI capabilities derived but non-authoritative; every command repeats permission, scope, assignment, transition, and version checks in the service.
- Independent status cursors satisfy the requested infinite columns without starving quieter stages, while mobile fetches only the selected stage.
- The direct status command is the canonical operation shared by drag, keyboard, touch, and menu interactions, so accessibility does not create a parallel business workflow.
- Related conversation, customer, student, employee, team, department, and branch data is represented by snapshots/readers; Ticket Management does not depend on another feature's storage internals.

No constitutional exception or complexity waiver is required.

## Complexity Tracking

No violations require justification.
