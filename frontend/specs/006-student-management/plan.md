# Implementation Plan: Student Management

**Branch**: `[006-student-management]` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-student-management/spec.md`

## Summary

Build Student Management as an independent feature module that owns the student record, the sectioned student workspace, document management, internal notes, the activity timeline, lifecycle status governance, and governed list discovery. Students are never created by hand: the module owns a narrow intake port that consumes the Admissions `EnrollmentReadinessSummary` projection and idempotently materializes one Student plus its enrollment from an approved admission's snapshot. Enrollments are displayed as read-only projections; no enrollment command exists here. The financial summary is a read-only projection served through a Student Finance reader port that degrades to an explicit unavailable state until that module exists. Route pages stay thin Server Components; workspace areas become route segments so each owns its own loading, error, and forbidden boundary. A transport-neutral service facade owns asynchronous mock access, permission and branch-scope simulation, validation, optimistic version conflicts, immutable history, and cross-feature reader ports, so future adapters replace mock data without changing pages or consumers.

## Technical Context

**Language/Version**: TypeScript 5 in strict mode, React 19.2.4, Next.js 16.2.6 App Router, Node.js 20+

**Primary Dependencies**: Tailwind CSS 4 and shared shadcn/Base UI primitives, TanStack Query 5, TanStack Table 8, Zustand 5, React Hook Form 7, Zod 4, react-dropzone 19, Lucide React, Sonner, next-themes

**Storage**: Promise-based deterministic in-memory mock services and private fixtures; browser file metadata and object previews only during this frontend phase; no page-level fixture or external API access

**Testing**: Vitest 4 with Testing Library and jsdom for unit/integration/contract coverage; Playwright 1.62 with axe for desktop, laptop, tablet, RTL, keyboard, responsive, permission, and end-to-end journeys

**Target Platform**: Modern evergreen browsers on desktop, laptop, and tablet; Arabic RTL and Alexandria typography by default; light, dark, and system themes

**Project Type**: Frontend web application in an npm/Turborepo workspace

**Performance Goals**: Search/filter/sort/page interactions expose results within 2 seconds at the 95th percentile across 20,000 deterministic student summaries; workspace areas load independently and never block one another; list screens never load documents, notes, timeline, or financial context

**Constraints**: Frontend-only mock phase; no manual student creation and no permanent delete anywhere; no enrollment, payment, attendance, exam, certificate, CRM, or ticket execution; exact permission and organization/branch scope simulation; immutable status, document, and timeline history; archived students are read-only until activated; Next.js 16 promise-based route params; shared components and no native alerts

**Scale/Scope**: Six routes plus segment loading/error boundaries; one sectioned edit workflow; five independent workspace areas; 20,000 deterministic summaries; versioned documents and archived-not-deleted retention; nine user journeys; eleven primary domain entities/projections; two shared components promoted (tab navigation, timeline)

## Constitution Check

_GATE: Passed before Phase 0 and re-checked after Phase 1 design._

- **Business workflow**: PASS — intake from an approved admission, profile maintenance, document handling, note taking, timeline recording, and each lifecycle transition remain distinct, separately permissioned domain steps. No-manual-create, no-delete, display-only-enrollments, and read-only-finance rules are enforced in the service facade, not only in the UI.
- **Module boundary**: PASS — `students` owns its behavior and the `/students` route segment, consumes public Admissions, Organization, Academic Catalog, and Program Batch projections through Student-owned narrow reader ports, and exposes only a permission-scoped `StudentContextSummary` plus the intake port to future Finance, CRM, AI, and Reporting consumers. No feature internals are imported in either direction.
- **Dynamic configuration**: PASS — branches, departments, academic grades, qualifications, employees, statuses, document types, accepted formats and size limits, minor age threshold, identifier and phone formats, currency, precision, and the transition policy all arrive through service lookups. Seeded fixtures are data, not rules.
- **Frontend separation**: PASS — pages await params and render screens; screens orchestrate hooks; schemas and pure policies own rules; services own mock data, scope, transitions, and intake idempotency; components render state and interactions only.
- **State and validation**: PASS — TanStack Query owns asynchronous student state with normalized keys and cancellation, the existing shared employee-context Zustand store supplies client scope, local state stays interaction-only, and one composed RHF/Zod schema owns authoritative profile validation.
- **Design system/reuse**: PASS — shared page header, card, section, data table, filter bar, search bar, status badge, dropzone, file preview, confirm dialog, toast, and loading/empty/error states are reused. Two genuinely recurring patterns (route-segment tab navigation, chronological timeline) are promoted into `shared/components` rather than duplicated per feature.
- **Arabic/RTL and responsive**: PASS — RTL is native across workspace tabs, tables, filters, forms, timeline, document cards, and dialogs; mixed-direction identifiers, phones, dates, codes, and money are isolated through the existing bidi utilities; all workflows target desktop, laptop, and tablet.
- **Accessibility**: PASS — tab navigation follows WAI-ARIA tabs-with-links semantics including roving focus and RTL-correct arrow keys; semantic sections and tables, keyboard document actions, first-error focus, error summaries, live status announcements, focus-managed dialogs, non-color status encoding, and automated plus manual checks are planned.
- **Feedback/error handling**: PASS — every read defines loading, empty, retryable error, unavailable, and forbidden states independently per workspace area; every command defines progress, success, validation, conflict, permission, and failure feedback through Sonner with input preservation.
- **AI/future readiness**: PASS — permission-scoped student summaries, enrollment targets, document completeness, timeline history, status history, and financial summary identity are exposed as typed read projections without granting writes or unrestricted document access. Auth, tenancy, audit persistence, and human oversight remain future-backend responsibilities.
- **Performance/type safety**: PASS — branded opaque identifiers, discriminated event and error unions, narrow list projections, per-area query keys, service-side pagination, cursor-paginated timeline, AbortSignal cancellation, memoized columns, and route-segment code splitting keep client boundaries minimal.

**Post-design re-check**: PASS. Research, data model, contracts, and quickstart preserve every gate. No constitutional exception or complexity waiver is required.

## Project Structure

### Documentation (this feature)

```text
specs/006-student-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── student-management-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md                       # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/
├── app/(workspace)/students/
│   ├── page.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   └── [studentId]/
│       ├── layout.tsx             # Workspace shell: header, status, tab navigation
│       ├── page.tsx               # Overview: personal, academic, enrollments, finance summary
│       ├── loading.tsx
│       ├── error.tsx
│       ├── edit/page.tsx
│       ├── documents/{page,loading,error}.tsx
│       ├── notes/{page,loading,error}.tsx
│       └── timeline/{page,loading,error}.tsx
├── features/students/
│   ├── components/
│   ├── config/                    # navigation, permissions, Arabic copy
│   ├── data/                      # fixtures, lookups, 20k scale generation
│   ├── forms/
│   ├── hooks/
│   ├── schemas/
│   ├── screens/
│   ├── services/                  # facade, mock adapter, reader ports, query keys, errors
│   ├── types/
│   ├── utils/
│   └── index.ts
└── shared/
    ├── components/layout/tab-navigation.tsx      # New shared, route-segment tabs
    └── components/data-display/timeline.tsx      # New shared, chronological timeline

apps/web/tests/
├── unit/students/
├── integration/students/
└── contract/students/

apps/web/playwright/
├── journeys/student-management.spec.ts
├── journeys/student-workspace.spec.ts
├── journeys/student-lifecycle.spec.ts
├── accessibility/student-management-a11y.spec.ts
├── accessibility/student-management-keyboard.spec.ts
└── helpers/students.ts

packages/ui/src/components/        # Existing shared UI primitives only
```

**Structure Decision**: `students` is a top-level sibling feature under `apps/web/src/features/`, matching `admissions`, `academic-catalog`, `program-batches`, and `organization-settings`. It owns the `/students` route segment inside the existing `(workspace)` route group and contributes one navigation entry plus its permission keys through the existing `foundation-navigation` and `icon-registry` contracts. The student workspace uses nested route segments rather than in-page tabs so each area gets independent code splitting and its own `loading.tsx`/`error.tsx` boundary, which makes spec scenarios US3-5 and US3-6 (one area failing or being forbidden while the rest stay usable) structural rather than hand-rolled. Shared changes are limited to the two promoted components plus navigation and icon registration.

## Delivery Phases

### Phase A — Domain, Policy, and Service Foundation

- Define branded IDs, configurable lookups, commands, list/detail/summary projections, permission keys, typed errors, and the consumer `StudentContextSummary` contract.
- Implement the authoritative profile schema plus pure policies: identifier and phone normalization, minor/guardian rules, graduation-year plausibility, the transition table, document applicability and versioning, timeline merge and ordering, list-query normalization, branch-scope intersection, and money formatting.
- Build the Admissions intake port with idempotent materialization keyed on the approval snapshot, the Organization/Catalog/Batch reader ports, and the Student Finance reader port with its unavailable default.
- Create deterministic fixtures, 20,000-record scale generation, scenario controls, and the asynchronous `StudentsService` mock adapter with scope, permission, version-conflict, and failure simulation.
- Add normalized per-area query-key factories and TanStack Query hooks with cancellation and targeted invalidation.

### Phase B — Discovery, Workspace Shell, and Profile Maintenance

- Add the `/students` list route with the controlled shared table: search, combined filters, sorting, pagination, row selection, permission-safe bulk status actions, export, and loading/empty/error/forbidden states.
- Promote the shared tab-navigation and timeline components, then build the `[studentId]` workspace layout with header, status badge, protected system information, and RTL-correct keyboard-navigable tabs.
- Build the overview area: personal information, academic information, read-only enrollment list enforcing the program/batch rule, and the financial summary with its unavailable and forbidden states.
- Build the sectioned RHF/Zod edit screen with protected-field rendering, first-error focus, dirty-state protection, optimistic-version conflict handling, and input preservation on recoverable failure.

### Phase C — Documents, Notes, Timeline, and Lifecycle Governance

- Build the documents area: type-grouped requirements, dropzone upload, replace-with-versioning, preview, download, archive-not-delete, retry-without-duplicate, and per-action permissions.
- Build the notes area with permission-gated read, authored ordering, empty-content refusal, and preserved authorship for inactive authors.
- Build the timeline area over the shared timeline component with merged admission-derived and student-owned events, cursor-paginated incremental loading, and stable chronological ordering.
- Build lifecycle transitions with the pure policy, reason-capturing confirm dialogs, archived read-only enforcement, activate restoration, immutable history, and bulk-action outcome reporting.
- Validate deterministic error modes, 20,000-record service behavior, exact permissions, branch scope, RTL, accessibility, responsive layouts, and production gates.

## Testing Strategy

- **Unit**: identifier and phone normalization, minor/guardian rules, graduation-year and birth-date plausibility, transition table completeness and refusals, document applicability/versioning/archival, timeline merge ordering and cursor stability, list-query serialization, branch intersection, money precision, intake idempotency key derivation.
- **Contract**: service exposes no create-by-hand and no delete operation; exact permission keys per operation; organization and branch scope on list, detail, documents, notes, timeline, finance, and export; optimistic version conflicts; immutable status/document/timeline history; archived read-only enforcement; intake refusal for non-approved admissions; intake idempotency on repeated and concurrent submission; student-code uniqueness; finance reader unavailable degradation; `StudentContextSummary` stability.
- **Integration**: workspace tab navigation and per-area independence including one area failing while others succeed; sectioned editor with protected fields; validation and first-error focus; dirty preservation; conflict recovery; document upload/replace/archive states; note permission gating; timeline incremental loading; status dialogs and refusals; list controls with loading/empty/error/forbidden states; direct-route permission behavior.
- **End-to-end**: nine primary journeys across desktop/laptop/tablet; intake-produced student appears in list and workspace; program enrollment shows a batch and diploma/course enrollments show none; document upload/replace/archive; note authoring; timeline ordering; suspend/graduate/withdraw/archive/activate; search and combined filters; keyboard-only workspace and tab traversal; dialog focus; Arabic RTL; light/dark; axe on every route; branch-scoped and permission-reduced employee contexts.

## Risks and Mitigations

- **Ownership ambiguity at the Admissions boundary**: The spec says students come from admission while Admissions explicitly does not create them. Resolved by a Student-owned intake port that pulls the `EnrollmentReadinessSummary` projection and materializes the record here, so neither module writes into the other. Admissions only records the returned reference.
- **Duplicate students from repeated or concurrent enrollment confirmation**: Intake is idempotent on the approval snapshot identity, guarded by a service-level reservation so concurrent submissions resolve to the same student, and student-code allocation is a service invariant with a typed duplicate error.
- **Student code uniqueness has no form to validate it**: The code is protected from editing, so uniqueness cannot be a form rule. It is enforced as an intake-time service invariant and covered by contract tests instead of a schema validator.
- **Financial summary depends on a module that does not exist**: A reader port with an explicit unavailable default keeps the UI honest; zero values are never rendered as facts, and a deterministic mock adapter exercises the populated path.
- **Stale academic references**: Enrollment rows render historically recorded product, batch, branch, and status values from the intake snapshot, so later archival or rescheduling in the catalog never blanks or rewrites a student's history.
- **Workspace fan-out and perceived slowness**: Each area is its own route segment with its own query key and boundary; the list projection stays narrow; the timeline is cursor-paginated; superseded queries are cancelled.
- **Concurrent edits and status races**: Every command carries `expectedVersion` and returns a typed conflict requiring deliberate refresh; failed operations produce no status or timeline entry.
- **New shared components diverging**: Tab navigation and timeline are added to `shared/components` as the canonical implementations. Migrating the existing admissions lifecycle timeline onto the shared component is a tracked follow-up outside this feature's scope, so this feature does not modify another module.
- **Mock security misconception**: Scope and permissions are enforced in the mock facade for UX and test fidelity while a future backend remains authoritative for authorization, tenant isolation, file security, and audit persistence.

## Complexity Tracking

No constitutional violations require justification.
