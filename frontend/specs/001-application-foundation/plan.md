# Implementation Plan: Frontend Foundation

**Branch**: `001-application-foundation` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-application-foundation/spec.md`

**Note**: This plan ends after Phase 1 design. Task decomposition belongs to `/speckit-tasks`.

## Summary

Build an Arabic-first application foundation with a mock login journey, persistent shell,
configuration-driven navigation, theme and employee context, accessible responsive behavior,
and one reusable component vocabulary for future modules. The implementation establishes an
`apps/web/src` feature-based boundary, keeps generic primitives in `packages/ui`, routes all
asynchronous mock information through typed services and TanStack Query, and confines persistent
cross-feature UI state to focused Zustand stores. No live backend or educational business module
is introduced.

## Technical Context

**Language/Version**: TypeScript 5.9 in strict mode, React 19.2.4, Node.js 20 or later

**Primary Dependencies**: Next.js 16.2.6 App Router, Tailwind CSS 4.3, shadcn 4.16 with Base UI,
TanStack Query, Zustand, React Hook Form, Zod 4.4, TanStack Table, Lucide React, Sonner,
react-dropzone, next-themes; Recharts and Tiptap are approved but only added when their shared
chart or rich-text patterns are delivered in this feature

**Storage**: Versioned browser persistence for the mock session, appearance, and sidebar
preferences; Promise-based mock records behind typed service adapters; no database or live API

**Testing**: ESLint and TypeScript gates; Vitest with Testing Library for schemas, services,
stores, permission filtering, and components; Playwright with axe integration for end-to-end,
RTL, responsive, theme, persistence, and accessibility validation; targeted manual screen-reader
and 200-percent zoom review

**Target Platform**: Modern desktop and tablet browsers at representative desktop, laptop, and
tablet widths; Chromium is the primary automated target with WebKit and Firefox smoke coverage

**Project Type**: npm/Turborepo monorepo web application with `apps/web` and `packages/ui`

**Performance Goals**: Shell navigation provides immediate visual response; initial shell keeps
client JavaScript limited to provider and interactive-leaf boundaries; table operations remain
responsive for the foundation mock data set; no required action causes horizontal page overflow

**Constraints**: RTL and Arabic at the document root; no live backend, database, business module,
or real authorization; pages never import mock fixtures; no duplicated UI or validation; persisted
state must tolerate corrupt or obsolete values; all user actions expose progress and outcome

**Scale/Scope**: One mock employee journey, configurable mock roles/branches/permissions,
configuration-driven nested navigation, two route groups, one component showcase, and the shared
shell/form/table/state infrastructure needed by future modules

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

- **Business workflow**: PASS — scope is limited to employee entry and workspace orientation;
  inactive search/notification controls never imply live operational behavior.
- **Module boundary**: PASS — auth owns mock entry, foundation owns the showcase, shared owns the
  shell/contracts, and future features register routes and navigation through public interfaces.
- **Dynamic configuration**: PASS — navigation, roles, branches, and permission keys are records,
  not page conditionals or closed lists of future business roles.
- **Frontend separation**: PASS — pages orchestrate public feature APIs; query hooks call service
  contracts; only adapters import fixtures; presentational components contain no business rules.
- **State and validation**: PASS — TanStack Query owns asynchronous service state, Zustand owns
  cross-feature persisted UI/session context, local state owns transient interaction, and React
  Hook Form consumes feature-owned Zod schemas.
- **Design system/reuse**: PASS — atomic primitives and tokens live in `packages/ui`; application
  composites live once in `apps/web/src/shared`; every table uses the generic TanStack wrapper.
- **Arabic/RTL and responsive**: PASS — the root document uses Arabic and RTL, logical layout
  properties are required, and desktop/laptop/tablet behaviors have validation scenarios.
- **Accessibility**: PASS — keyboard, focus, semantics, route titles, screen-reader announcements,
  contrast, zoom, dialog focus return, and mixed-direction content are covered.
- **Feedback/error handling**: PASS — route boundaries and shared states cover loading/errors,
  services provide deterministic mock outcomes, and Sonner carries action outcomes.
- **AI/future readiness**: PASS — typed employee, role, branch, permission, route, and service
  context supports later auth, tenant, audit, workflow, automation, and AI adapters without
  implementing them now.
- **Performance/type safety**: PASS — layouts/pages remain Server Components by default, client
  boundaries stay narrow, stores use selectors, tables expose controlled state, and strict types
  prohibit uncontained `any`.

### Post-Design Gate

Phase 1 contracts preserve all checks above. No constitutional exception is required. The design
explicitly excludes speculative Product, Batch, Student, Enrollment, and Payment models because
their business rules belong to later feature specifications.

## Project Structure

### Documentation (this feature)

```text
specs/001-application-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── foundation-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md                    # Generated later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (workspace)/
│   │   │   ├── dashboard/
│   │   │   ├── foundation/
│   │   │   └── layout.tsx
│   │   ├── error.tsx
│   │   ├── layout.tsx
│   │   └── not-found.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── data/
│   │   │   ├── hooks/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   └── types/
│   │   └── foundation/
│   │       └── components/
│   └── shared/
│       ├── components/
│       │   ├── data-table/
│       │   ├── feedback/
│       │   ├── file-upload/
│       │   ├── forms/
│       │   ├── layout/
│       │   └── states/
│       ├── config/
│       ├── constants/
│       ├── hooks/
│       ├── providers/
│       ├── services/
│       ├── store/
│       ├── types/
│       └── utils/
├── tests/
│   ├── integration/
│   └── unit/
└── playwright/
    ├── accessibility/
    └── journeys/

packages/ui/src/
├── components/                # App-agnostic shadcn/Base UI primitives
├── hooks/
├── lib/
└── styles/
```

**Structure Decision**: Adopt `apps/web/src` now because the repository contains only starter
application files and the foundation must prevent later restructuring. Route groups separate
mock entry from the workspace without changing URLs. Feature folders own behavior and schemas;
the web shared layer owns platform composites; `packages/ui` remains application-agnostic.

## Phase 0: Research Outcome

All technical unknowns are resolved in [research.md](./research.md). The key outcomes are narrow
Client Component boundaries, nested route-group layouts, typed service adapters, distinct state
ownership, serializable navigation configuration, controlled shared tables/forms, layered
automated and manual accessibility validation, and versioned safe browser persistence.

## Phase 1: Design Outcome

- [data-model.md](./data-model.md) defines foundation entities, validation, relationships, and
  session/preference state transitions.
- [foundation-contracts.md](./contracts/foundation-contracts.md) defines feature, service,
  navigation, state, form, table, feedback, and file-selection interfaces.
- [quickstart.md](./quickstart.md) provides runnable validation scenarios and quality gates.

## Complexity Tracking

No Constitution Check violations or approved exceptions are present.
