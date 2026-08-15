# Implementation Plan: Admissions

**Branch**: `[005-admissions]` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-admissions/spec.md`

## Summary

Build Admissions as an independent feature module that owns applicant registration, admission assignments, academic selection, document collection and verification, financial preparation, lifecycle decisions, governed discovery, and an enrollment-readiness projection. Route pages remain thin Server Components; interactive screens use shared forms, uploads, dialogs, feedback, and the controlled table. A transport-neutral service facade owns asynchronous mock access, permission and branch-scope simulation, validation, version conflicts, immutable history, and cross-feature lookups. Future adapters can replace mock services without changing pages or consumers.

## Technical Context

**Language/Version**: TypeScript 5 in strict mode, React 19.2.4, Next.js 16.2.6 App Router, Node.js 20+

**Primary Dependencies**: Tailwind CSS 4 and shared shadcn/Base UI primitives, TanStack Query 5, TanStack Table 8, Zustand 5, React Hook Form 7, Zod 4, react-dropzone 19, Lucide React, Sonner, next-themes

**Storage**: Promise-based deterministic in-memory mock services and private fixtures; browser file metadata/object previews only during this frontend phase; no page-level fixture or external API access

**Testing**: Vitest 4 with Testing Library and jsdom for unit/integration/contract coverage; Playwright 1.62 with axe for desktop, laptop, tablet, RTL, keyboard, responsive, permission, and end-to-end journeys

**Target Platform**: Modern evergreen browsers on desktop, laptop, and tablet; Arabic RTL and Alexandria typography by default; light, dark, and system themes

**Project Type**: Frontend web application in an npm/Turborepo workspace

**Performance Goals**: Search/filter/sort/page interactions expose results within 2 seconds at the 95th percentile for 10,000 deterministic admission summaries; common form interactions remain responsive; list screens never load full details, documents, or histories

**Constraints**: Frontend-only mock phase; no Student, Enrollment, Payment, CRM, or real file-storage execution; no permanent delete; exact permission and organization/branch scope simulation; immutable approval/document/lifecycle history; sensitive fields minimized in list projections; Next.js 16 promise-based route params; shared components and no native alerts

**Scale/Scope**: Four primary routes plus segment loading/error boundaries; one sectioned create/edit workflow; list/detail/review projections; 10,000 deterministic summaries; versioned documents and immutable decisions; six user journeys; thirteen primary domain entities/projections

## Constitution Check

_GATE: Passed before Phase 0 and re-checked after Phase 1 design._

- **Business workflow**: PASS — applicant identity, admission case, eligibility, documents, finances, submission, review, decision, archival, and future enrollment remain distinct domain-owned steps. Approval gates and no-delete rules are explicit.
- **Module boundary**: PASS — `admissions` owns its behavior and route segment, consumes public Organization, Catalog, and Batch contracts, and exposes narrow enrollment/finance-ready projections without importing feature internals.
- **Dynamic configuration**: PASS — branches, departments, employees, sources, grades, identity rules, offerings, batches, document requirements, file policies, currency, precision, and lifecycle policy arrive through service lookups.
- **Frontend separation**: PASS — pages unwrap params and render screens; screens orchestrate hooks; schemas and pure policies own rules; services own mock data, scope, eligibility, and transitions; components only render state and interactions.
- **State and validation**: PASS — TanStack Query owns asynchronous admissions state, existing Zustand employee context supplies client scope, local state is interaction-only, and one composed RHF/Zod form owns authoritative draft validation.
- **Design system/reuse**: PASS — shared page/form/upload/dropdown/dialog/feedback/status/table primitives are reused. Admissions-specific components do not duplicate shared infrastructure.
- **Arabic/RTL and responsive**: PASS — RTL is native, mixed-direction identity/phone/date/money values are isolated, and list/editor/detail/review workflows target desktop, laptop, and tablet.
- **Accessibility**: PASS — semantic sections and tables, keyboard file and document actions, first-error focus, error summaries, live feedback, focus-managed confirmations, non-color statuses, and automated/manual checks are planned.
- **Feedback/error handling**: PASS — reads and commands define loading, empty, retryable, unavailable, forbidden, validation, duplicate, conflict, eligibility, and success states; user feedback uses Sonner.
- **AI/future readiness**: PASS — permission-scoped summaries, readiness findings, ownership, decisions, versions, snapshots, and reason codes support future automation and AI without granting writes or exposing unrestricted documents.
- **Performance/type safety**: PASS — branded opaque identifiers, discriminated states/errors, narrow projections, normalized query keys, service pagination, cancellation, memoized columns, and minimal client boundaries are specified.

**Post-design re-check**: PASS. Research, model, contracts, and quickstart preserve every gate. No constitutional exception or complexity waiver is required.

## Project Structure

### Documentation (this feature)

```text
specs/005-admissions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── admissions-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md                       # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/
├── app/(workspace)/admissions/
│   ├── page.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   ├── create/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   └── [admissionId]/
│       ├── page.tsx
│       ├── loading.tsx
│       ├── error.tsx
│       └── edit/page.tsx
├── features/admissions/
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
└── shared/                        # Existing cross-feature UI, stores, types, and utilities

apps/web/tests/
├── unit/admissions/
├── integration/admissions/
└── contract/admissions/

apps/web/playwright/
├── journeys/admissions-management.spec.ts
├── journeys/admissions-review.spec.ts
├── journeys/admissions-accessibility.spec.ts
└── helpers/admissions.ts

packages/ui/src/components/        # Existing shared UI primitives only
```

**Structure Decision**: Admissions is a top-level sibling feature because it owns an operational case and lifecycle shared by several teams. It consumes consumer-safe Organization, Academic Catalog, and Program Batch projections through public boundaries and exposes only stable enrollment-readiness and financial snapshot contracts. Shared changes are limited to genuinely reusable controls or navigation/permission contributions.

## Delivery Phases

### Phase A — Domain, Policy, and Service Foundation

- Define branded IDs, configurable lookups, commands, list/detail/readiness projections, permission keys, errors, snapshots, histories, and consumer contracts.
- Implement authoritative applicant, selection, document, finance, and draft schemas plus pure duplicate, eligibility, readiness, lifecycle, money, branch-scope, and query-normalization policies.
- Create deterministic fixtures, 10,000-record scale generation, scenario controls, and an asynchronous `AdmissionsService` mock adapter.
- Add normalized query-key factories and TanStack Query hooks with cancellation and targeted invalidation.

### Phase B — Applicant Registration and Case Management

- Add list, create, detail, and edit routes with route-level loading/error boundaries and permission-aware navigation.
- Build one RHF editor with personal, operational assignment, academic selection, financial, document, notes, and status-readiness sections.
- Add duplicate warnings, dependent-selection confirmation, dirty-state protection, first-error focus, and recoverable failure preservation.
- Build the controlled shared-table list with URL-compatible query state, stable row selection, filters, sorting, pagination, export, and safe bulk actions.

### Phase C — Documents, Decisions, and Consumer Readiness

- Add versioned upload/preview/replace/remove behavior, requirement status, verification/rejection actions, and immutable decision history.
- Add readiness findings, lifecycle transitions, confirmation/reason dialogs, reviewer context, immutable events, and approval snapshot presentation.
- Expose narrow enrollment-readiness and Finance context through the feature index while keeping document access separately permissioned.
- Validate deterministic error modes, 10,000-record service behavior, exact permissions, branch scope, RTL, accessibility, responsive layouts, and production gates.

## Testing Strategy

- **Unit**: identity/phone normalization, duplicate candidates, minor/guardian rules, academic-selection discrimination, batch eligibility, document applicability/versioning, financial precision, readiness, lifecycle transition table, list-query serialization, branch intersection.
- **Contract**: service registration/update/archive without delete, exact permissions, branch/organization scope, optimistic versions, immutable document/lifecycle/approval history, dependency changes, eligibility rechecks, snapshots, deterministic failures, Enrollment/Finance consumer DTO stability.
- **Integration**: sectioned editor, dependent field resets, duplicate warning, draft-safe validation, document states, verification replacement, finance derivation, approval gates, dirty preservation, direct-route permissions, list controls, loading/empty/error/forbidden states.
- **End-to-end**: six primary journeys across desktop/laptop/tablet; create/edit/detail refresh; program with batch and diploma/course without batch; upload/verify/reject; approve/reject/archive; search/filter/page; keyboard-only flow; dialog focus; Arabic RTL; light/dark; axe; scoped employee contexts.

## Risks and Mitigations

- **Applicant duplication and identity sensitivity**: Normalize identity/contact values in one policy, return explainable duplicate candidates, require deliberate authorized override, and minimize sensitive values in list/error projections.
- **Eligibility drift before approval**: Re-evaluate offering, batch, seat, dates, and branch eligibility at selection, submission, and approval; never trust a stale UI-only result.
- **Document replacement ambiguity**: Version attachments, bind every verification to one version, reset current verification on replacement, and retain immutable prior decisions.
- **Historical financial mutation**: Use decimal strings plus configured precision and create an immutable approval snapshot; future Finance/Enrollment never reinterpret mutable current catalog terms.
- **Lifecycle and permission divergence**: Define one pure transition/readiness policy consumed by mock services and rendered through available-action projections; direct commands enforce exact keys and versions.
- **Cross-feature coupling**: Consume stable public lookup/readiness interfaces only; never import fixtures, schemas, hooks, or presentational internals from Organization, Catalog, or Batches.
- **Large operational queues**: Keep list summaries narrow; normalize, scope, filter, sort, paginate, and export through the service; cancel superseded queries and avoid full-history/document loading.
- **Mock security misconception**: Enforce scope in the mock facade for UX/testing while documenting future backend authorization, tenant isolation, file security, malware scanning, and audit persistence as authoritative.

## Complexity Tracking

No constitutional violations require justification.
