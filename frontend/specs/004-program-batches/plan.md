# Implementation Plan: Program Batches

**Branch**: `004-program-batches` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-program-batches/spec.md`

**Note**: This plan ends after Phase 1 design. Task decomposition belongs to `/speckit-tasks`.

## Summary

Build Program Batches as a feature-owned, Arabic-first extension point beside Academic Catalog. Nested App Router pages retain Professional Program context while route-facing screens consume a typed batch service facade. TanStack Query owns asynchronous projections and mutations; one React Hook Form with authoritative Zod schemas owns the sectioned editor; pure domain utilities own schedule, capacity, finance, lifecycle, readiness, and enrollment-eligibility rules. Deterministic mock services isolate temporary records and can later be replaced without changing pages or presentational components.

## Technical Context

**Language/Version**: TypeScript 5 in strict mode, React 19.2.4, Next.js 16.2.6 App Router, Node.js 20+

**Primary Dependencies**: TanStack Query 5.101, TanStack Table 8.21, Zustand 5.0, React Hook Form 7.83, Zod 4.4, Tailwind CSS 4, shadcn/ui workspace components, Lucide React, Sonner

**Storage**: Promise-based in-memory mock `ProgramBatchService` behind a transport-neutral interface; no route or screen imports fixtures. Future adapters may provide REST, GraphQL, or server functions without UI changes.

**Testing**: Vitest 4.1 with Testing Library for domain/schema/component/integration tests; Playwright 1.62 with axe for route journeys, RTL, responsive, permission, and accessibility validation

**Target Platform**: Modern evergreen desktop, laptop, and tablet browsers; Arabic RTL is default; light and dark themes

**Project Type**: Next.js monorepo web application with shared UI package and feature-based frontend modules

**Performance Goals**: A known batch remains discoverable within 30 seconds among 10,000 records; list interactions use paginated service projections and stable queries; editor interactions remain responsive without loading sibling batches or full histories

**Constraints**: Frontend-only mock phase; no enrollment or payment execution; no permanent delete; branch and permission scope must be simulated consistently; historical financial terms must remain snapshot-safe; dynamic route params follow Next.js 16 promise semantics

**Scale/Scope**: Nested list/create/detail/edit routes; one sectioned editor; 10 primary domain entities/projections; 12 action permissions; at least 10,000 deterministic mock summaries; unlimited batches per Professional Program at the domain boundary

## Constitution Check

_GATE: Passed before Phase 0 and re-checked after Phase 1 design._

- **Business workflow**: PASS — readiness, schedule order, capacity, branch eligibility, explicit lifecycle transitions, correction reasons, and historical finance rules are domain-owned and testable.
- **Module boundary**: PASS — `program-batches` owns batch behavior and consumes only public Academic Catalog and Organization & Settings contracts. Nested route pages import its public feature boundary.
- **Dynamic configuration**: PASS — programs, years, intakes, branches, currencies, precision, offers, milestones, roles, and permissions arrive through service lookups; display labels never control business rules.
- **Frontend separation**: PASS — pages unwrap route params and render screens; screens orchestrate hooks; schemas/domain utilities own rules; services own mock access and scope enforcement.
- **State and validation**: PASS — TanStack Query owns asynchronous data, Zustand supplies existing employee context, local state is UI-only, and RHF uses composed authoritative Zod schemas.
- **Design system/reuse**: PASS — shared layout, form controls, branded Dropdown, dialogs, feedback, badges, action patterns, and controlled TanStack Table are reused.
- **Arabic/RTL and responsive**: PASS — RTL is native; codes, ISO-like dates, and money use isolated LTR presentation; editor/list/detail layouts target desktop, laptop, and tablet.
- **Accessibility**: PASS — keyboard operations, first-error focus, field grouping, live status, dialog focus return, semantic tables, non-color capacity states, and automated/manual checks are planned.
- **Feedback/error handling**: PASS — all reads and commands define loading, empty, retry, validation, conflict, forbidden, unavailable, and success feedback; mutations use Sonner.
- **AI/future readiness**: PASS — stable summaries, detail, readiness, eligibility, lifecycle, pricing revision, branch, actor, version, and timestamp context support future consumers without write access.
- **Performance/type safety**: PASS — strict branded identifiers, discriminated statuses/errors, narrow DTOs, stable query keys, service pagination, memoized columns, cancellation, and small client boundaries are specified.

**Post-design re-check**: PASS. Research, model, contracts, and validation guidance preserve every gate. No constitutional exception or complexity waiver is required.

## Project Structure

### Documentation (this feature)

```text
specs/004-program-batches/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── program-batches-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md                       # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/
├── app/(workspace)/academic-catalog/programs/[programId]/batches/
│   ├── page.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   ├── create/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   └── [batchId]/
│       ├── page.tsx
│       ├── loading.tsx
│       ├── error.tsx
│       └── edit/page.tsx
├── features/program-batches/
│   ├── components/
│   ├── config/
│   ├── data/
│   ├── forms/
│   ├── hooks/
│   ├── schemas/
│   ├── screens/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── index.ts
└── shared/                        # Existing cross-feature UI, types, stores, and utilities

apps/web/tests/
├── unit/program-batches/
├── integration/program-batches/
└── contract/program-batches/

apps/web/playwright/
├── journeys/program-batches.spec.ts
└── helpers/program-batches.ts

packages/ui/src/components/        # Existing shadcn/ui primitives only
```

**Structure Decision**: Program Batches is a sibling feature module, not an internal Academic Catalog folder. The route hierarchy provides program context, while the feature consumes a consumer-safe catalog lookup contract. This preserves independent ownership and allows Enrollment to depend on the batch public boundary instead of catalog internals. Shared code changes are limited to genuinely reusable primitives or explicit navigation/permission contributions.

## Delivery Phases

### Phase A — Domain and Service Foundation

- Add branded IDs, commands, queries, summaries, details, errors, readiness, eligibility, history, and configurable lookup contracts.
- Implement authoritative schemas and pure schedule, capacity, installment reconciliation, lifecycle, and permission/scope rules.
- Create deterministic fixtures and mock scenarios behind the `ProgramBatchService` facade.
- Add query-key factories and TanStack Query hooks with targeted invalidation and cancellation.

### Phase B — Batch Management and Editor

- Add program-context list, create, detail, and edit routes with loading/error boundaries.
- Build the controlled shared-table list with URL-compatible query state and permission-aware actions.
- Build one RHF editor with basic, schedule, capacity, financial, installment/offer, and branch sections.
- Preserve dirty values on errors, focus the first invalid field, and guard editor-owned exits.

### Phase C — Lifecycle, Eligibility, and Integration

- Add readiness findings, lifecycle actions, confirmations/reasons, immutable events, and capacity/registration eligibility projections.
- Contribute program batch links from eligible Professional Program detail and permission-aware navigation/breadcrumbs.
- Expose a narrow feature index for routes and future Enrollment consumers.
- Validate deterministic error scenarios, 10,000-row service pagination, RTL, accessibility, responsive layouts, and production gates.

## Testing Strategy

- **Unit**: code normalization, schedule ordering, capacity derivation, installment reconciliation, offer validation, readiness, eligibility, transition table, schemas, list-query serialization.
- **Contract**: service CRUD-without-delete behavior, parent-program enforcement, scope/permission enforcement, optimistic version conflicts, lifecycle events, financial revisions, deterministic errors, consumer DTO stability.
- **Integration**: sectioned editor, distinct branch roles, read-only current students, dirty-state preservation, status actions, permission affordances, list controls, loading/empty/error/forbidden states.
- **End-to-end**: five user journeys across desktop/laptop/tablet; direct nested URLs; refresh/deep links; keyboard-only flows; dialog focus; Arabic RTL; light/dark; axe; representative branch and permission projections.

## Risks and Mitigations

- **Historical pricing ambiguity**: Model immutable financial revisions and require future Enrollment to capture a revision snapshot; never treat mutable current values as historical truth.
- **Lifecycle drift between UI and service**: Define one pure transition/readiness policy used by the mock adapter and exposed through typed results; UI renders available actions rather than recreating rules.
- **Cross-feature coupling**: Consume stable catalog/organization lookup interfaces only; never import their fixtures or internal components.
- **Large nested lists**: Filter, sort, paginate, and scope in the service; keep summaries narrow and deterministic; never pass all records to the table.
- **Date and currency errors**: Keep date-only values canonical, compare them without locale formatting, represent money as decimal strings plus currency, and centralize precision rules.
- **Authorization misconception**: Label mock permissions as UI simulation; enforce the same contract in services for tests while documenting future backend authorization as authoritative.

## Complexity Tracking

No constitutional violations require justification.
