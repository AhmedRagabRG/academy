# Implementation Plan: Student Finance

**Branch**: `[007-student-finance]` | **Date**: 2026-07-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-student-finance/spec.md`

## Summary

Build Student Finance as an independent feature module that owns invoices, installment plans, payments and receipts, discounts, scholarships, refunds, the financial timeline, and balance derivation. All monetary arithmetic runs in integer minor units behind a shared money module, so totals reconcile exactly at the configured precision. Balances are **derived** from records by a pure function and never stored, so they cannot drift. Invoices freeze their figures at issuance; later reductions become adjustments against the unpaid balance rather than rewrites, which is how the spec's immutability rule and its "reductions affect future balances" rule are reconciled. The module satisfies the `StudentFinanceReader` port Student Management already declares — wired through a registration point rather than a direct import, so the two modules never form a cycle. Cross-student finance queues live at `/student-finance`; the per-student financial workspace is contributed as a tab inside the existing student workspace instead of duplicating it.

## Technical Context

**Language/Version**: TypeScript 5 in strict mode, React 19.2.4, Next.js 16.2.6 App Router, Node.js 20+

**Primary Dependencies**: Tailwind CSS 4 and shared shadcn/Base UI primitives, TanStack Query 5, TanStack Table 8, Zustand 5, React Hook Form 7, Zod 4, Lucide React, Sonner, next-themes. No new dependency is required.

**Storage**: Promise-based deterministic in-memory mock services and private fixtures; no page-level fixture or external API access

**Testing**: Vitest 4 with Testing Library and jsdom for unit/integration/contract coverage; Playwright 1.62 with axe for desktop, laptop, tablet, RTL, keyboard, responsive, permission, and end-to-end journeys

**Target Platform**: Modern evergreen browsers on desktop, laptop, and tablet; Arabic RTL and Alexandria typography by default; light, dark, and system themes

**Project Type**: Frontend web application in an npm/Turborepo workspace

**Performance Goals**: Search/filter/sort/page interactions expose results within 2 seconds at the 95th percentile across 50,000 deterministic invoices; balance derivation for one student stays constant-time in the number of unrelated records

**Constraints**: Frontend-only mock phase; no permanent delete of any financial record; issued figures immutable; payments immutable and corrected only by refund; balances never negative and never below collected; no payment-gateway execution and no money movement; exact permission and organization/branch scope simulation; Next.js 16 promise-based route params; shared components and no native alerts

**Scale/Scope**: Nine routes plus segment boundaries; one contributed workspace tab; 50,000 deterministic invoices; ten user journeys; twelve primary domain entities; one shared module promoted (money), one shared field added (currency input), one shared registry added (workspace tabs)

## Constitution Check

_GATE: Passed before Phase 0 and re-checked after Phase 1 design._

- **Business workflow**: PASS — invoicing, issuance, installment planning, collection, reduction approval, refund approval, and cancellation are distinct, separately permissioned steps enforced in the service facade. Issued-figure immutability, payment immutability, cancel-blocked-by-payments, and no-delete are service invariants, not UI conventions.
- **Module boundary**: PASS — `student-finance` owns its behavior and route area, consumes Student Management, Admissions, Organization, Catalog, and Batch facts through its own narrow reader ports, and satisfies Student Management's declared finance port through a registration point rather than a reverse import. Two additive extensions to Student Management's explicit contracts are recorded in Complexity Tracking.
- **Dynamic configuration**: PASS — payment methods, currency and precision, discount limits, scholarship rules, installment eligibility per product type, numbering patterns, due-date policy, and overdue thresholds all arrive through service lookups.
- **Frontend separation**: PASS — pages await params and render screens; screens orchestrate hooks; pure policies own money, allocation, reduction ordering, and status derivation; services own mock data, scope, numbering, and concurrency; components render state only.
- **State and validation**: PASS — TanStack Query owns asynchronous state with per-area keys and scope fingerprints; the existing shared employee-context store supplies scope; no new Zustand store; one authoritative Zod schema per command, all deriving their monetary limits from the same pure policy the service enforces.
- **Design system/reuse**: PASS — reuses page header, card, stat card, section, data table, filter/search bar, status badge, confirm dialog, toast, tab navigation, timeline, and all state components. Adds a shared currency input field and a shared money module because both now recur across three modules.
- **Arabic/RTL and responsive**: PASS — RTL-native across tables, schedules, forms, dialogs, and timelines; monetary values, invoice and receipt numbers, dates, and identifiers isolated with the existing bidi helpers; all workflows target desktop, laptop, and tablet.
- **Accessibility**: PASS — semantic tables and description lists, keyboard-reachable actions, first-error focus, error summaries, live announcement of balance and status changes, focus-managed dialogs, non-color status encoding, and money announced with its currency.
- **Feedback/error handling**: PASS — every read defines loading, empty, retryable, unavailable, and forbidden states; every command defines progress, success, validation, conflict, permission, and refusal feedback with input preservation.
- **AI/future readiness**: PASS — permission-scoped balances, ageing, collection history, and settled-fact projections are exposed as typed reads. No automation can approve a reduction or refund; approval remains a permissioned human action.
- **Performance/type safety**: PASS — branded identifiers, discriminated result and error unions, narrow list projections, per-entity indexes built from the start, service-side pagination, cursor-paginated timeline, cancellation, memoized columns, and route-segment code splitting.

**Post-design re-check**: PASS. Research, data model, contracts, and quickstart preserve every gate. Two cross-module extensions require justification and are recorded in Complexity Tracking; no other exception is needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-student-finance/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── student-finance-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md                       # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
apps/web/src/
├── app/(workspace)/
│   ├── student-finance/
│   │   ├── {page,loading,error}.tsx          # Finance dashboard and queues
│   │   ├── invoices/
│   │   │   ├── {page,loading,error}.tsx
│   │   │   ├── create/page.tsx
│   │   │   └── [invoiceId]/{page,loading,error}.tsx
│   │   ├── payments/{page,loading,error}.tsx
│   │   ├── installments/{page,loading,error}.tsx
│   │   └── refunds/{page,loading,error}.tsx
│   └── students/[studentId]/finance/{page,loading,error}.tsx   # Contributed tab
├── features/student-finance/
│   ├── components/
│   ├── config/                    # navigation, permissions, Arabic copy, workspace-tab contribution
│   ├── data/                      # fixtures, lookups, 50k scale generation
│   ├── forms/
│   ├── hooks/
│   ├── schemas/
│   ├── screens/
│   ├── services/                  # facade, mock adapter, reader ports, finance-reader adapter, keys, errors
│   ├── types/
│   ├── utils/                     # money policy, allocation, reductions, balance, status, numbering
│   └── index.ts
└── shared/
    ├── utils/money.ts                          # New shared: minor-unit conversion + formatting
    ├── components/forms/currency-field.tsx     # New shared: currency-aware numeric input
    └── config/student-workspace-tabs.ts        # New shared: workspace tab registry

apps/web/tests/{unit,integration,contract}/student-finance/
apps/web/playwright/journeys/student-finance-*.spec.ts
apps/web/playwright/accessibility/student-finance-{a11y,keyboard}.spec.ts
apps/web/playwright/helpers/student-finance.ts
```

**Structure Decision**: `student-finance` is a top-level sibling feature, matching `students`, `admissions`, `academic-catalog`, `program-batches`, and `organization-settings`. It owns the `/student-finance` route segment for cross-student finance queues and contributes one segment into the existing student workspace for the per-student view. The requested `/student-finance/students/[studentId]` route is **not** created: Student Management already owns a permission-filtered student workspace, and a second student page would split the record in two. Instead the per-student financial workspace is `/students/[studentId]/finance`, contributed through a shared tab registry so future modules (attendance, certificates, tickets) can add tabs the same way.

## Delivery Phases

### Phase A — Money, Domain, Policy, and Service Foundation

- Promote `shared/utils/money.ts`: decimal-string values, integer minor-unit arithmetic, allocation with exact-sum guarantee, comparison, and Arabic currency formatting.
- Define branded identifiers, domain entities, commands, list/detail/summary projections, permission keys, typed errors, and the accounting-facing contract.
- Implement pure policies: reduction ordering with non-negative and non-below-collected floors, installment allocation, balance derivation, invoice and installment status derivation, overdue detection against an injectable clock, numbering allocation, list-query normalization, and branch-scope intersection.
- Build the reader ports over Student Management, Admissions, Organization, Catalog, and Batches, plus the outbound `StudentFinanceReader` adapter that satisfies Student Management's declared port.
- Create deterministic fixtures, 50,000-invoice scale generation, scenario controls, and the asynchronous `StudentFinanceService` mock adapter with per-entity indexes, scope, permission, version-conflict, and failure simulation.
- Add scope-fingerprinted query keys and TanStack Query hooks with cancellation and targeted invalidation.

### Phase B — Invoices, Installments, and the Financial Workspace

- Add the invoice list, create, and detail routes with the shared table, combined filters, sorting, pagination, and export.
- Build the invoice editor with reduction entry, live final-amount derivation, issuance, and cancellation guarded by the payment rule.
- Build installment plan generation, regeneration guards, per-installment status, and the installments queue.
- Register the shared workspace-tab registry, contribute the finance tab, and build the per-student financial workspace with summary cards, per-enrollment balances, and section navigation.

### Phase C — Collection, Reductions, Refunds, Timeline, and Integration

- Build payment recording with method selection, installment attribution, over-limit refusal, receipt numbering, and the payments queue.
- Build discount and scholarship entry with their own approval permissions, configured limits, and pre/post-issuance behavior.
- Build refunds against payments with limit enforcement, status flow, and balance restoration.
- Build the financial timeline over the shared timeline component with cursor paging.
- Wire the `StudentFinanceReader` registration so Student Management's summary shows real figures, and expose the accounting-facing projection.
- Validate 50,000-record behavior, exact permissions, branch scope, RTL, accessibility, responsive layouts, and production gates.

## Testing Strategy

- **Unit**: minor-unit conversion and rounding, allocation exact-sum across many counts and amounts, reduction ordering and floors, balance derivation across every record combination, invoice and installment status derivation, overdue boundary against a fixed clock, numbering allocation and collision, list-query normalization, date-range inclusivity and inversion, branch intersection.
- **Contract**: no delete on any entity and no payment edit; exact permission keys per operation including separate discount, scholarship, and refund approval; organization and branch scope on every read and export; issued-figure immutability under later reductions, payments, and refunds; invoicing idempotency on repeated and concurrent enrollment processing; payment over-limit refusal; concurrent payments never driving a balance negative; refund limit against prior refunds; cancel blocked by payments; timeline one-event-per-success and none-per-failure; `StudentFinanceReader` returning figures that match the records and an explicit zero-balance result for students with no records.
- **Integration**: invoice editor with live derivation and issuance lock; installment generation and regeneration guard; payment form limits and method gating; reduction forms with limit feedback; refund form; workspace summary and per-enrollment breakdown; queue filters with loading/empty/error/forbidden states; conflict recovery with input preservation.
- **End-to-end**: ten journeys across desktop/laptop/tablet; raise, issue, and cancel an invoice; generate an installment plan on an uneven amount; record partial then final payment; attempt an over-limit payment; apply a discount before and after issuance; award a scholarship; refund a payment and watch the invoice status return; search and combine filters; keyboard-only payment recording; dialog focus; Arabic RTL; light/dark; axe on every route; branch-scoped and permission-reduced users.

## Risks and Mitigations

- **Monetary drift**: all arithmetic in integer minor units behind one shared module; decimal strings at every boundary; allocation asserts an exact sum; no floating-point operator touches a money value.
- **Balance disagreeing with records**: the balance is a pure derivation over records, never stored, so there is no second source to fall out of sync. Property-style tests compare the derivation against independently summed records.
- **Immutability versus later reductions**: issued invoices carry a frozen snapshot; post-issuance reductions are separate adjustment records. The issued figures are never rewritten, and every derivation reads snapshot plus adjustments.
- **Concurrent collection overdrawing a balance**: payment commands serialize per invoice and re-check the remaining balance inside the operation, not from the client's view; `expectedVersion` catches stale edits.
- **Duplicate invoices or numbers**: invoicing is idempotent on the enrollment plus invoice-purpose key; numbering allocates through a reservation so concurrent requests cannot collide.
- **Scale regression**: per-entity indexes are built from the start rather than retrofitted — the equivalent list path in Student Management was O(n²) until indexes were added, and this module carries roughly five times the record volume.
- **Cross-module cycle**: Student Finance imports Student Management; Student Management never imports Student Finance. The finance reader is injected at a composition root, so the dependency stays one-directional.
- **Two competing student pages**: avoided by contributing a tab into the existing workspace rather than building a parallel student route.
- **Mock security misconception**: scope and permissions are enforced in the mock facade for UX and test fidelity while a future backend remains authoritative for authorization, tenant isolation, financial controls, and audit persistence.

## Complexity Tracking

> Two additive changes to `features/students` are required. Both extend contracts that module already declares; neither changes its behavior when unused.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Adding `setStudentFinanceReader()` registration to `features/students` | Student Management declares `StudentFinanceReader` and wires a default that returns `finance-module-absent`. Student Finance must supply the real implementation, but Student Finance already depends on Student Management for students and enrollments. | Having Student Management import Student Finance directly creates a dependency cycle. Duplicating the balance calculation inside Student Management would create a second source of truth for money — the exact drift risk this plan exists to prevent. Registration keeps the dependency one-directional and leaves the existing default untouched when unregistered. |
| Adding a shared workspace-tab registry that `features/students` reads | The per-student financial workspace belongs inside the existing student workspace. Hardcoding a finance tab into Student Management would couple it to a module it must not know about. | Hardcoding the tab couples the modules and repeats for every future tab (attendance, certificates, tickets). A separate `/student-finance/students/[studentId]` page avoids the edit but splits the student record across two competing pages, which is worse for both users and maintenance. |
