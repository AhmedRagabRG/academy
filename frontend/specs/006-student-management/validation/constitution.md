# Validation: Constitution Compliance (T165)

**Feature**: Student Management | **Verified**: 2026-07-31

| Principle | Status | Evidence |
| --- | --- | --- |
| I. Business First | PASS | No-manual-create, no-delete, display-only enrollments, and read-only finance are enforced in the service facade, not just the UI. `students-service-surface.test.ts` guards the surface itself. |
| II. Modular Architecture | PASS | The only cross-feature import in `features/students` is the `@/features/admissions` public barrel. A shared `usePermission` hook was added to `shared/hooks/` so Students never reaches into another feature's internals. |
| III. Dynamic Configuration | PASS | Branches, departments, grades, qualifications, employees, statuses, document types, identifier and phone patterns, minor-age threshold, image policy, currency, and precision all arrive from `StudentsService.lookups()`. Zero hardcoded business entities in screens. |
| IV. Reusable Components | PASS | Reuses page header, card, section, data table, filter/search bar, status badge, dropzone, confirm dialog, toast, and all state components. Two recurring patterns promoted to `shared/`: `TabNavigation`, `Timeline`. |
| V. Frontend Separation | PASS | Pages await params and render screens; screens orchestrate hooks; pure policies own rules; services own data and scope; components render only. |
| VI. Accessibility | PASS | See `rtl-accessibility.md`. |
| VII. RTL Native | PASS | Arabic copy centralized in `config/students-copy.ts`; mixed-direction values isolated via `<bdi>` in 10 files; logical properties throughout. |
| VIII. Responsive by Default | PASS | See `responsive.md`. |
| IX. Consistency Over Creativity | PASS | No new design system; all patterns match sibling features. |
| X. AI Ready | PASS | See `future-readiness.md`. |

## Technical principles

| Requirement | Status |
| --- | --- |
| TanStack Query for server state | PASS — one key per workspace area, scope-fingerprinted |
| Zustand only for cross-feature client state | PASS — no student store added; reuses `employee-context-store` |
| RHF + one authoritative Zod schema | PASS — `schemas/student-profile-schema.ts` |
| Single shared TanStack Table | PASS — `shared/components/data-table/data-table.tsx` |
| Sonner for feedback, no native alerts | PASS |
| Approved UI stack only | PASS — no new dependency added |
| App Router, Server Components preferred | PASS — 6 route segments, thin server pages |
| Strict TypeScript, no `any` | PASS — `npm run typecheck` clean; branded identifiers throughout |

## Gates

| Gate | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (0 errors; the only warnings are tests importing fixtures directly, matching the existing admissions test convention) |
| `npm run test` | PASS — 104 files, 396 tests |
| `npm run build` | PASS — all 6 student routes compiled |
| `npm run test:e2e` | **NOT RUN** — the host disk is at 95% (1.3 GB free) and Playwright needs room for browsers, traces, and screenshots. The specs are written and typecheck clean. |
