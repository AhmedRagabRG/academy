# Implementation Plan: Academic Catalog

**Branch**: `003-academic-catalog` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-academic-catalog/spec.md`

**Note**: This plan ends after Phase 1 design. Task decomposition belongs to `/speckit-tasks`.

## Summary

Build an Arabic-first Academic Catalog feature that owns configurable product types and categories,
academic products, type-driven academic profiles, reference pricing, branch eligibility, sales
content, marketing assets, and controlled lifecycle transitions. Thin App Router pages import
feature screens through a public boundary. TanStack Query hooks call a typed service facade whose
mock adapter alone imports fixtures. React Hook Form and authoritative Zod schemas manage a
sectioned product editor; shared form, dropdown, upload, feedback, dialog, and controlled TanStack
Table primitives provide consistent interaction. Services enforce unique immutable product codes,
active-reference integrity, activation readiness, lifecycle and branch-enrollment eligibility,
version conflicts, and historical retention outside presentational components.

## Technical Context

**Language/Version**: TypeScript 5.9 strict mode, React 19.2.4, Node.js 20+

**Primary Dependencies**: Next.js 16.2.6 App Router, Tailwind CSS 4, shadcn/ui workspace primitives,
TanStack Query 5, TanStack Table 8, Zustand 5, React Hook Form 7, Zod 4, Tiptap 3, react-dropzone,
Lucide React, Sonner, next-themes

**Storage**: Promise-based mutable mock adapter and deterministic fixtures behind typed catalog
services; no database or live API. Mutation commands carry `expectedVersion` for edit conflicts.

**Testing**: ESLint, strict TypeScript, Next production build; Vitest and Testing Library for
schemas, services, queries, forms, editor sections, tables, permissions, and lifecycle invariants;
Playwright plus axe for catalog journeys, Arabic RTL, keyboard/focus, media, responsive/zoom, and
query states across Chromium with Firefox/WebKit smoke coverage

**Target Platform**: Modern desktop, laptop, and tablet browsers; Arabic/RTL document default

**Project Type**: npm/Turborepo monorepo web application (`apps/web`, `packages/ui`)

**Performance Goals**: Local input feedback within 100 ms; product list operations remain
responsive with 10,000 representative records through service pagination; editor loads sections
on one product query without duplicated fetching; narrow invalidation and client boundaries avoid
unrelated rerenders and route-layout hydration

**Constraints**: Mock data only; mock permissions are UX affordances rather than security; no
permanent deletion; no transactional final-price or installment calculation; all business options
come through services; pages never import fixtures; no custom table/dropdown/form interaction
language; unsaved multi-section data survives recoverable failures

**Scale/Scope**: One catalog overview, two configuration lists, one paginated product list, create,
detail, and edit routes; nine modeled entities plus configurable lookup/status/permission data;
representative media and 10,000-record list behavior; future multi-tenant/API consumers

## Constitution Check

*GATE: Passed before Phase 0 and re-checked after Phase 1.*

- **Business workflow**: PASS — classification, activation readiness, code immutability, lifecycle,
  reference integrity, branch eligibility, historical retention, and permission outcomes are explicit.
- **Module boundary**: PASS — `academic-catalog` owns taxonomy, products, profiles, reference pricing,
  availability, content, media metadata, lifecycle, public facade, and route contribution.
- **Dynamic configuration**: PASS — product types and field applicability, categories, statuses,
  duration units, study modes, fee definitions, branches, departments, and permissions are records.
- **Frontend separation**: PASS — pages adapt routes; screens orchestrate; hooks query/mutate;
  schemas and services enforce behavior; components render and emit interactions.
- **State and validation**: PASS — TanStack Query owns catalog records, Zustand is reserved for
  global session plus transient editor navigation if cross-route persistence is later required,
  RHF consumes feature Zod schemas, and local state stays presentational.
- **Design system/reuse**: PASS — existing page, card, shared Dropdown, forms, Tiptap, upload,
  dialogs, Sonner, status, empty/error, and controlled TanStack Table systems are reused.
- **Arabic/RTL and responsive**: PASS — logical properties, Alexandria typography, bidi isolation,
  section navigation, table-viewport scrolling, and desktop/laptop/tablet behaviors are designed.
- **Accessibility**: PASS — semantic section headings/fieldsets/tables, keyboard paths, first-error
  focus, dialog focus return, upload alternatives, announcements, zoom, and contrast are gates.
- **Feedback/error handling**: PASS — typed failures map to field errors, conflict/dependency
  guidance, retry states, and Sonner outcomes; every surface defines loading and empty behavior.
- **AI/future readiness**: PASS — stable product identity, classification, delivery, pricing
  references, eligibility, content, assets, provenance, tenant, and version context are exposed.
- **Performance/type safety**: PASS — paginated contracts, stable IDs, granular keys, sectioned
  forms, narrow client boundaries, strict DTOs, and no `any` are planned.

### Post-Design Gate

The data model and contracts preserve every check. The product lifecycle uses stable behavior keys
for invariant enforcement while labels, ordering, visual presentation, and available definitions
remain service-managed configuration. No constitutional exception is required.

## Project Structure

### Documentation

```text
specs/003-academic-catalog/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── academic-catalog-contracts.md
└── tasks.md                         # Created later by /speckit-tasks
```

### Source Code

```text
apps/web/src/
├── app/(workspace)/academic-catalog/
│   ├── page.tsx
│   ├── product-types/page.tsx
│   ├── categories/page.tsx
│   └── products/
│       ├── page.tsx
│       ├── create/page.tsx
│       └── [productId]/
│           ├── page.tsx
│           └── edit/page.tsx
├── features/academic-catalog/
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
    ├── components/data-table/       # Reuse controlled/manual table contract
    ├── components/file-upload/      # Reuse dropzone and preview contracts
    ├── components/forms/            # Reuse Dropdown, fields, Tiptap wrappers
    ├── components/layout/
    └── types/                       # Only cross-feature opaque reference types

apps/web/tests/
├── unit/academic-catalog/
├── integration/academic-catalog/
└── contract/academic-catalog/

apps/web/playwright/
├── accessibility/academic-catalog-a11y.spec.ts
└── journeys/academic-catalog.spec.ts
```

**Structure Decision**: Use one feature because taxonomy, activation, academic applicability,
pricing references, availability, commercial content, and lifecycle form one product aggregate.
Routes remain independently deep-linkable and permission-addressable. The detail route is
read-oriented; create and edit use the same feature-owned editor composition. Shared changes are
limited to genuinely generic capabilities. Route `page.tsx` files remain thin adapters and never
import fixtures or business schemas directly.

## Phase 0: Research Outcome

[research.md](./research.md) resolves taxonomy configuration, lifecycle, product-editor structure,
validation/concurrency, service/query boundaries, pricing/eligibility semantics, accessibility,
media, and testing decisions. No unresolved technical questions remain.

## Phase 1: Design Outcome

- [data-model.md](./data-model.md) defines entities, relationships, validations, derived eligibility,
  lifecycle transitions, and audit/version fields.
- [academic-catalog-contracts.md](./contracts/academic-catalog-contracts.md) defines public feature,
  service, query, mutation, editor, table, media, permission, navigation, and error contracts.
- [quickstart.md](./quickstart.md) defines runnable end-to-end proof scenarios and quality gates.

## Complexity Tracking

No Constitution Check violations or approved exceptions are present.
