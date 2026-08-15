# Implementation Plan: Organization & Settings

**Branch**: `002-organization-settings` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-organization-settings/spec.md`

**Note**: This plan ends after Phase 1 design. Task decomposition belongs to `/speckit-tasks`.

## Summary

Build one Arabic-first administrative module that owns the organization profile, branches,
departments, academic calendar, users, roles, permissions, and defaults required by future
business modules. Thin App Router pages compose feature screens; TanStack Query hooks call a
typed service facade; a deterministic mock adapter alone imports fixtures. React Hook Form and
feature Zod schemas own validation, while shared controlled tables and form primitives provide a
consistent UI. Business invariants—including branch archival, reference integrity, permission
inheritance, administrator lockout protection, term containment, and atomic single-year
activation—are enforced at schema and service boundaries rather than in components.
Academic terms use a standalone paginated screen with academic-year context, and permissions use
a standalone role-selected matrix; year and role detail routes may deep-link into filtered views.

## Technical Context

**Language/Version**: TypeScript 5.9 strict mode, React 19.2.4, Node.js 20+

**Primary Dependencies**: Next.js 16.2.6 App Router, Tailwind CSS 4.3, shadcn/Base UI primitives,
TanStack Query 5, TanStack Table 8, Zustand 5, React Hook Form 7, Zod 4, Lucide React, Sonner,
react-dropzone, next-themes

**Storage**: Promise-based mutable mock adapter and fixtures behind typed feature services; no
database or live API. Concurrent edit detection uses an `expectedVersion` contract.

**Testing**: ESLint, strict TypeScript, production build; Vitest and Testing Library for schemas,
service invariants, queries, forms, tables, and permissions; Playwright plus axe for full admin
journeys, RTL, tablet, keyboard, zoom, loading, empty, error, and retry states

**Target Platform**: Modern desktop, laptop, and tablet browsers; Arabic/RTL document default

**Project Type**: npm/Turborepo monorepo web application (`apps/web`, `packages/ui`)

**Performance Goals**: Interactive response within 100 ms after local input; paginated lists do
not require loading all records; mutations invalidate only affected query keys; narrow client
boundaries avoid hydrating route layouts and static framing

**Constraints**: Mock data only; no real authorization boundary; no permanent branch deletion;
zero or one active academic year; all configurable entities come from services; no page imports
fixtures; no duplicated table/form implementations; no silent failures

**Scale/Scope**: Nine independently routed settings surfaces plus the `/settings` landing page;
six list aggregates, two singleton configuration aggregates, one permission catalog/matrix,
configurable lookups/statuses, representative mock pagination, and audit-ready contracts for
future multi-tenant/API use

## Constitution Check

*GATE: Passed before Phase 0 and re-checked after Phase 1.*

- **Business workflow**: PASS — lifecycle, dependency, calendar, default, role inheritance, and
  administrator safety rules are explicit and enforced in service operations.
- **Module boundary**: PASS — `organization-settings` owns its related administrative aggregates,
  public facade, route contribution, types, schemas, hooks, adapter, and fixtures.
- **Dynamic configuration**: PASS — statuses, branches, departments, roles, permission catalog,
  locales, currencies, time zones, and settings are service records; pages contain no business options.
- **Frontend separation**: PASS — route pages orchestrate exported screens; hooks own queries and
  mutations; schemas/services own behavior; components render and emit interactions.
- **State and validation**: PASS — TanStack Query owns async records, existing Zustand stores retain
  global employee context only, RHF consumes feature Zod schemas, and local state is transient UI state.
- **Design system/reuse**: PASS — existing shared layout, form, feedback, upload, and TanStack Table
  systems are reused and extended generically only where controlled data contracts are missing.
- **Arabic/RTL and responsive**: PASS — logical layout, Alexandria typography, bidi isolation,
  table-container scrolling, and desktop/laptop/tablet scenarios are required.
- **Accessibility**: PASS — semantic tables and fieldsets, labeled controls, error focus, dialog
  focus return, live status, keyboard paths, 200% zoom, and contrast are validation gates.
- **Feedback/error handling**: PASS — query state surfaces and typed mutation failures map to shared
  states, RHF field errors, conflict recovery, and Sonner outcomes.
- **AI/future readiness**: PASS — opaque IDs, organization scope, audit actors, permission context,
  typed lifecycle behavior, and service contracts expose safe future automation context.
- **Performance/type safety**: PASS — paginated services, controlled tables, granular keys, narrow
  Client Components, branded IDs, strict DTOs, and no `any` are planned.

### Post-Design Gate

The data model and contracts preserve all checks. No constitutional exception is required.
Configurable display statuses use a small service-owned behavior classification solely to enforce
lifecycle invariants; labels, ordering, and presentation remain configurable data.

## Project Structure

### Documentation

```text
specs/002-organization-settings/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── organization-settings-contracts.md
└── tasks.md                         # Created later by /speckit-tasks
```

### Source Code

```text
apps/web/src/
├── app/(workspace)/settings/
│   ├── page.tsx
│   ├── organization/page.tsx
│   ├── branches/page.tsx
│   ├── departments/page.tsx
│   ├── academic-years/
│   │   ├── page.tsx
│   │   └── [yearId]/page.tsx
│   ├── academic-terms/page.tsx
│   ├── users/page.tsx
│   ├── roles/
│   │   ├── page.tsx
│   │   └── [roleId]/page.tsx
│   ├── permissions/page.tsx
│   └── general/page.tsx
├── features/organization-settings/
│   ├── components/
│   ├── config/
│   ├── constants/
│   ├── data/
│   ├── forms/
│   ├── hooks/
│   ├── screens/
│   ├── schemas/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── index.ts
└── shared/
    ├── components/data-table/       # Generic controlled/manual mode extension
    ├── components/forms/            # Only genuinely reusable missing fields
    ├── services/
    └── types/

apps/web/tests/
├── unit/organization-settings/
├── integration/organization-settings/
└── contract/organization-settings/

apps/web/playwright/
├── accessibility/organization-settings-a11y.spec.ts
└── journeys/organization-settings.spec.ts
```

**Structure Decision**: Keep all mutually dependent administrative aggregates in one feature to
enforce defaults, calendar, assignments, and permission invariants without cross-feature internal
imports. Each route remains deep-linkable and permission-addressable. Shared code changes are
limited to generic controlled table/form capabilities useful to later modules. Framework-owned
App Router `page.tsx` files are thin adapters; route-facing screen implementations, forms,
constants, services, and mock data remain feature-owned.

## Phase 0: Research Outcome

[research.md](./research.md) records resolved decisions for boundaries, queries, configurable
statuses, business transitions, validation, permissions, tables, accessibility, and testing.
There are no remaining `NEEDS CLARIFICATION` items.

## Phase 1: Design Outcome

- [data-model.md](./data-model.md) defines entities, relations, validation, and state transitions.
- [organization-settings-contracts.md](./contracts/organization-settings-contracts.md) defines
  the public feature, service, query, mutation, permission, form, table, and error interfaces.
- [quickstart.md](./quickstart.md) defines runnable end-to-end proof scenarios and quality gates.

## Complexity Tracking

No Constitution Check violations or approved exceptions are present.
