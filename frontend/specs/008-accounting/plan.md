# Implementation Plan: Accounting

**Branch**: `008-accounting` | **Date**: 2026-08-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-accounting/spec.md`

## Summary

Build the Accounting module: branches raise expense requests with supporting documents, Finance
reviews and decides them, approved requests are marked paid, and every transition is recorded in
an immutable history. The module owns expense categories and sub-categories as configurable data,
presents a dashboard whose figures are derived from the same filtered reads the lists use, and
reads branches and the acting user's scope from existing modules through narrow ports.

The technical approach is the one proven across features 005–007: a typed service interface with a
deterministic mock behind it, a **transition policy table** rather than per-status code paths,
optimistic concurrency on every command, append-only history written inside the same operation as
the transition it records, and exact decimal money from the shared money module.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19.2.4, Next.js 16.2.6 App Router, Node 20+

**Primary Dependencies**: TanStack Query 5 (server state), TanStack Table 8 (the single shared
table), Zustand 5 (client state only), React Hook Form 7 + Zod 4, Tailwind CSS 4, shadcn/ui,
Lucide, Sonner, react-dropzone 19, Recharts (dashboard breakdowns)

**Storage**: Service-backed deterministic mock data. No page reads data directly; every read and
command goes through `AccountingService`.

**Testing**: Vitest 4 + Testing Library + jsdom for unit/contract/integration; Playwright 1.62 +
`@axe-core/playwright` for journeys, accessibility, and keyboard.

**Target Platform**: Modern evergreen browsers, RTL Arabic, desktop / laptop / tablet.

**Project Type**: Feature module inside the existing `apps/web` Next.js App Router workspace.

**Performance Goals**: Search, filter, sort, and paging p95 under 2 s across 20,000 requests
(SC-009). Dashboard figures computed on the same path as the lists, within the same budget.

**Constraints**: No floating-point arithmetic on money anywhere. History append-only. Nothing
deleted. Branch scope enforced on every read, command, dashboard figure, and export. Server
Components by default; the client boundary begins at the screen.

**Scale/Scope**: 4 route groups (8 route segments), ~7 screens, ~12 entities, 52 functional
requirements, 7 user stories.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Business workflow**: PASS — the eight-state lifecycle, the authority each transition requires,
  the editable-only-when-Draft-or-Returned rule, approved-only-can-be-paid, and the separation of
  approving from marking paid are modelled as a policy table in `utils/expense-lifecycle.ts` and
  enforced in the service, not in screens. Review authority is a permission key, so Finance
  Manager and Super Admin holding it (and Executive Manager not) is configuration (FR-022a).
- **Module boundary**: PASS — new `features/accounting` owning its screens, components, forms,
  hooks, services, types, schemas, utils, and fixtures, under `/accounting`. It reads branches and
  the actor's scope through its own narrow reader ports over other modules' public exports. It has
  no dependency on Student Finance in either direction.
- **Dynamic configuration**: PASS — categories, sub-categories, request-numbering pattern, accepted
  attachment types, maximum attachment size, currency, and precision are all service-supplied
  configuration. Seeded examples (Marketing, Office, Utilities) are data.
- **Frontend separation**: PASS — route segments are Server Components importing one screen from
  the feature barrel. Screens orchestrate; lifecycle, permission, validation, and arithmetic live
  in utils and the service. Replacing the mock changes no screen.
- **State and validation**: PASS — TanStack Query for all server state with a scope fingerprint in
  every key; Zustand only for the existing shared employee context; React local state for dialog
  open/closed and form drafts. RHF + Zod, with each rule authored once and used by both the form
  and the service.
- **Design system/reuse**: PASS with one planned extension — shared page header, cards, section,
  data table, status badge, timeline, search bar, filter bar, file dropzone, file preview, confirm
  dialog, and empty/loading/error states. The shared `DataTable` currently exposes exactly one
  unnamed bulk action; Accounting needs several named ones, so the shared component gains an
  additive `bulkActions` prop (see Complexity Tracking).
- **Arabic/RTL and responsive**: PASS — all copy in `config/accounting-copy.ts` and
  `config/accounting-error-copy.ts` with no generic fallback. RTL-native layout. Amounts, request
  numbers, dates, and file sizes direction-isolated in `<bdi dir="ltr">`. Desktop, laptop, tablet,
  with no horizontal page scroll asserted at each.
- **Accessibility**: PASS — semantic tables for lists, an ordered list for history, dialogs that
  take focus on open and return it on close, first-invalid-field focus on refused submit,
  `role="alert"` errors wired by `aria-describedby`, and status conveyed by text with tone as
  decoration only.
- **Feedback/error handling**: PASS — Sonner for every command outcome, per-code Arabic error copy,
  retryable error states, and empty states that distinguish "nothing matched" from "nothing
  exists". No native alerts. No silent failures.
- **AI/future readiness**: PASS — every status, action, actor, amount, and history entry is typed
  and structured rather than prose. Permission keys, tenant/branch scope, and audit-shaped history
  exist from the first commit. `getAccountingExportContext` provides a settled-facts projection for
  a future Reporting or Audit module.
- **Performance/type safety**: PASS — strict TypeScript, no `any`. Per-entity lazy indexes
  invalidated on write (never `.find()` inside a `filter`), sort keys computed once per row rather
  than inside comparators, and the client boundary starting at the screen so each route segment
  code-splits.

## Project Structure

### Documentation (this feature)

```text
specs/008-accounting/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── accounting-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/src/app/(workspace)/accounting/
├── page.tsx                                  # Dashboard
├── loading.tsx  error.tsx
├── expense-requests/
│   ├── page.tsx  loading.tsx  error.tsx      # Requests queue
│   ├── create/page.tsx  loading.tsx  error.tsx
│   └── [requestId]/page.tsx  loading.tsx  error.tsx
├── expense-categories/page.tsx  loading.tsx  error.tsx
└── expense-sub-categories/page.tsx  loading.tsx  error.tsx

apps/web/src/features/accounting/
├── components/          # Presentational + composed UI
├── config/              # Copy, error copy, permissions, navigation
├── data/                # Deterministic fixtures, lookups, scale fixtures
├── forms/               # RHF-bound field groups
├── hooks/               # TanStack Query hooks
├── schemas/             # Zod schemas
├── screens/             # Route-level orchestration
├── services/            # Service interface, mock, ports, errors, query keys
├── types/               # common / domain / projections / commands
├── utils/               # Lifecycle, list query, scope, numbering, history
└── index.ts             # Public barrel

apps/web/src/shared/
├── components/data-table/data-table.tsx      # Extended: named bulk actions
└── utils/list-query.ts                       # Promoted: shared date-range + paging helpers

apps/web/tests/{unit,contract,integration}/accounting/
apps/web/playwright/{journeys,accessibility,helpers}/
```

**Structure Decision**: The Academy ERP web application layout. Accounting is a peer of
`students`, `student-finance`, and `organization-settings` under `apps/web/src/features/`, owning
its route segment under `app/(workspace)/accounting/`. Two shared-layer files change, both
additively, and both are listed in Complexity Tracking.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1. All gates still pass.*

The design added three things worth re-checking, and each strengthened rather than weakened a gate:

- **Business workflow** — the transition table in [data-model.md](./data-model.md) makes the
  terminal statuses terminal *by construction*: `approved`, `rejected`, `paid`, and `cancelled`
  have no outgoing rows, so "a paid request cannot be edited" needs no separate guard. Editability
  and cancellation-before-approval-only both fall out of the same table rather than being enforced
  in a second place.
- **Dynamic configuration** — designing the contracts surfaced that pickers and display need
  *different* category reads (R7). Serving both from one filtered list would have silently blanked
  the category on historical requests. Two reads keep archived categories resolvable, which is what
  FR-006 actually requires.
- **Frontend separation** — `ExpenseRequestDetail` carries a `permissions` record and
  `derived.availableTransitions`, so a screen never re-derives authority or legality. That keeps
  the lifecycle in one place and makes the UI's action set provably the same as the service's.

No new violation was introduced. The two entries in Complexity Tracking are unchanged from the
pre-research check, and both remain additive.

## Complexity Tracking

> Two cross-cutting changes are required. Both are additive, both leave existing callers working
> unchanged, and both are justified by the Decision Rule's ordering (maintainable, then reusable).

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Extending the shared `DataTable` with a `bulkActions` prop (`{ id, label, run }[]`) alongside the existing single `onBulkAction` | The queue needs several distinct bulk actions — submit selected drafts, approve selected, return selected — each with its own Arabic label and its own permission. The current component renders exactly one button labelled "إجراء جماعي (n)", which cannot express which action is about to run. | Rendering a bespoke selection toolbar inside Accounting would duplicate row-selection state that the shared table already owns, and would put a second bulk-action pattern into the codebase — the exact duplication the constitution's reuse principle prohibits. The existing `onBulkAction` prop stays and keeps working, so no current caller changes. |
| Promoting `isWithinRange`, `clampPage`, and `normalizeSearchTerm` from `features/student-finance/utils/finance-list-query.ts` to `shared/utils/list-query.ts`, with Student Finance re-exporting from the shared module | Two features now need identical date-range and paging semantics. The inclusive-day rule in `isWithinRange` was written to fix a real off-by-one that dropped rows from the last day of every range; a second, independent copy in Accounting would be a second place for that bug to reappear. | Duplicating the helpers is what the constitution's "genuinely cross-feature" test exists to prevent, and the duplicated rule is a proven source of defect. Student Finance keeps its existing export surface by re-exporting, so its 150+ tests continue to pass unchanged and no finance screen is touched. |
