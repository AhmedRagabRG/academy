# Phase 0 Research: Frontend Foundation

## Repository Baseline

The project is an npm 10.9 workspace managed by Turborepo. `apps/web` currently uses Next.js
16.2.6, React 19.2.4, next-themes 0.4.6, and Lucide React. `packages/ui` provides Tailwind CSS 4,
shadcn/Base UI primitives, and Zod 4.4. Strict TypeScript is already enabled. TanStack Query,
Zustand, React Hook Form, TanStack Table, Sonner, react-dropzone, Recharts, Tiptap, Vitest,
Playwright, Testing Library, and axe integration are not direct dependencies and must be added
only where the planned deliverables use them.

## Decision 1: Source and Route Organization

**Decision**: Establish `apps/web/src`, with a single root layout and `(auth)` and `(workspace)`
route groups. The workspace receives a nested shell layout.

**Rationale**: This is the least costly time to establish the requested permanent boundary.
Route groups separate concerns without altering URLs, while a nested layout preserves shell state
across workspace navigation. The repository-local Next.js 16 documentation supports `src` and
route groups.

**Alternatives considered**: Keep the current top-level `app` directory, which avoids a small
initial move but conflicts with the requested foundation structure and creates later churn.
Multiple root layouts were rejected because navigation between them triggers full page loads.

## Decision 2: Server and Client Component Boundaries

**Decision**: Keep pages and layouts as Server Components by default. Add `use client` only to
provider composition and interactive leaves such as toggles, menus, dialogs, forms, tables,
uploads, and editors.

**Rationale**: Next.js 16 treats a Client Component boundary and its imported subtree as client
code. Narrow boundaries minimize shipped JavaScript and preserve static optimization.

**Alternatives considered**: A client-marked root or workspace layout is simpler to wire but
unnecessarily moves the shell and descendants into the client graph.

## Decision 3: Provider Composition

**Decision**: Render a small client provider composer as deep as practical. It combines the theme,
query client, notifications, and persisted-state hydration without making the root document a
Client Component.

**Rationale**: Provider isolation limits rerenders and follows the local Next.js recommendation
to render providers deep in the tree.

**Alternatives considered**: A root Client Component and a single universal context were rejected
because they broaden hydration and create one high-churn source of truth.

## Decision 4: State Ownership

**Decision**: TanStack Query owns all asynchronous service reads/mutations; Zustand owns only
cross-feature synchronous session context and sidebar preference; next-themes solely owns
appearance; component state owns transient dialog, filter draft, selection, and menu expansion.

**Rationale**: Each state has one authority, avoiding duplicated sources of truth. Query lifecycle
already models asynchronous loading/error/success and must not be recreated in Zustand.

**Alternatives considered**: A single Zustand store, async data in Zustand, duplicated theme
state, and persisted route state were rejected for coupling and synchronization risk.

## Decision 5: Service and Mock Adapter Boundary

**Decision**: Define feature-owned typed service contracts. Mock adapters alone import fixtures;
one composition point selects the adapter. Services return domain values or throw typed safe
errors, while TanStack Query owns request lifecycle state.

**Rationale**: Replacing a mock adapter with a live adapter changes composition, not pages,
components, schemas, or query hooks. Deterministic delay/error/empty modes make required states
testable.

**Alternatives considered**: Direct fixture imports violate the specification. A generic result
wrapper duplicating Query status was rejected. REST/OpenAPI contracts are premature because no
external API exists in scope.

## Decision 6: Navigation Configuration

**Decision**: Use serializable navigation records with stable IDs, Arabic title and future
translation key, centralized Lucide icon keys, routes, permission keys, and optional children.
A pure recursive filter removes forbidden leaves and empty groups. Current item and breadcrumbs
derive from the pathname and filtered tree.

**Rationale**: Serializable records are configurable and testable. Pure filtering separates
visibility from real authorization and lets future features contribute entries through a
registry.

**Alternatives considered**: JSX/component-bearing configuration, inline permission functions,
hardcoded page checks, route state in a store, and Parallel Routes for a fixed shell were rejected
as coupled or unnecessarily complex.

## Decision 7: Shared UI Ownership

**Decision**: Keep app-agnostic tokens and atomic primitives in `packages/ui`. Keep shell,
page-level composites, shared states, form adapters, data-table composition, feedback, and file
selection in `apps/web/src/shared`. Features supply schemas, columns, filters, row actions, and
business behavior.

**Rationale**: This prevents reverse dependencies from the UI package into platform routing or
domain concepts while still prohibiting duplicate UI.

**Alternatives considered**: One broad application components folder weakens ownership. Putting
all composites in `packages/ui` makes the reusable package application-aware.

## Decision 8: Forms, Tables, and File Selection

**Decision**: Form controls adapt to React Hook Form while Zod schemas remain feature-owned. The
generic TanStack table accepts controlled search/filter/sort/pagination/selection/visibility state
and never owns data fetching. File selection validates and emits files/rejections but performs no
transport.

**Rationale**: Controlled contracts work with mock client data now and later server-driven query
parameters. Validation and transport remain outside presentational components.

**Alternatives considered**: Component-owned schemas, table-owned fetching, and upload transport
inside the drop area were rejected for duplication and backend coupling.

## Decision 9: RTL and Localization Boundary

**Decision**: Set `lang="ar"` and `dir="rtl"` at the document root, use logical spacing/alignment,
centralize locale/direction, isolate mixed-direction email and numeric content, and mirror only
icons whose meaning is directional.

**Rationale**: Root direction produces a native RTL baseline while content isolation avoids bidi
ambiguity and centralized direction permits future languages.

**Alternatives considered**: Per-component direction flags and physical left/right overrides are
brittle and make future multilingual support expensive.

## Decision 10: Persistence and Mock Session Safety

**Decision**: Persist versioned mock session identifiers/context and sidebar preference with
runtime validation and safe fallback. Let next-themes persist appearance. Never describe mock
authentication as a security boundary.

**Rationale**: Versioning and validation prevent corrupt or obsolete browser values from breaking
the shell. Keeping appearance in one library avoids competing storage.

**Alternatives considered**: Persisting entire stores, plaintext credential storage, and trusting
unvalidated browser data were rejected.

## Decision 11: Error and Loading Boundaries

**Decision**: Use route-segment loading, error, and not-found conventions backed by shared state
components, plus Query states for data-bearing surfaces and inline form errors for expected input
failures.

**Rationale**: Next.js route boundaries cover navigation/render failures while Query and form
states provide precise recoverable feedback. Unique page titles and headings support route
announcements.

**Alternatives considered**: Query flags alone do not cover route rendering failures; global-only
fallbacks lose local recovery context.

## Decision 12: Validation Strategy

**Decision**: Use four layers: lint/typecheck/build; Vitest and Testing Library; Playwright with
axe for real-browser journeys; and targeted manual screen-reader plus 200-percent zoom review.

**Rationale**: Unit tests efficiently cover pure contracts, while browser tests prove persistence,
media preference, focus, responsive navigation, and direction. Automated accessibility tools
cannot judge reading quality or every focus interaction, so manual coverage remains required.

**Alternatives considered**: Jest was rejected in favor of the lighter TypeScript-aligned Vitest
setup. Cypress was rejected in favor of Playwright's browser, media, and viewport controls.
Axe-only accessibility validation is insufficient.

## Decision 13: Supported Validation Matrix

**Decision**: Exercise desktop, laptop, and tablet projects in Chromium; run critical entry and
navigation smoke journeys in Firefox and WebKit when CI capacity permits. Test Arabic plus mixed
email/number content, both color schemes, system preference changes, reload persistence, invalid
storage fallback, 200-percent zoom, and no horizontal overflow.

**Rationale**: Behavioral viewport coverage directly proves the specification. Cross-engine smoke
tests catch major browser differences without multiplying the entire suite.

**Alternatives considered**: Static screenshots alone cannot prove behavior. An exhaustive browser
matrix would add disproportionate cost during the mock foundation phase.

## Resolved Clarifications

No unresolved `NEEDS CLARIFICATION` items remain. Chromium-first automation with cross-browser
smoke coverage, versioned browser persistence, deterministic mock outcomes, and an internal
foundation showcase are reasonable defaults consistent with the specification and constitution.
