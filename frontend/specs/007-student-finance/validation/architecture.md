# Validation: Architecture & State Ownership (T052)

**Feature**: Student Finance | **Verified**: 2026-08-01

## State ownership boundaries

| Concern | Owner | Evidence |
| --- | --- | --- |
| Asynchronous finance state | TanStack Query, one key per area | `services/finance-query-keys.ts` |
| User identity, permissions, branch scope | Existing shared Zustand store | `shared/store/employee-context-store.ts` — no new store added |
| Form state | React Hook Form + Zod | `schemas/finance-schemas.ts` |
| Local UI state | Component-local only | `components/` |

No finance-specific Zustand store exists. Nothing in this module is cross-feature
client state.

## Money ownership

| Concern | Where | Why |
| --- | --- | --- |
| Value mechanics — conversion, arithmetic, allocation, formatting | `shared/utils/money.ts` | Recurs across Admissions, Student Management, and Student Finance (constitution IV) |
| Business policy — reduction ordering, balance derivation, status derivation | `features/student-finance/utils/` | Finance-specific; does not belong in shared |

All arithmetic runs in integer minor units. No floating-point operator touches a
money value anywhere in the module.

## Dependency direction

```
student-finance ──> students        (one-way, via the public barrel)
students        ──X student-finance (never — would be a cycle)
```

The single cross-feature import is `@/features/students` in
`services/finance-dependency-adapters.ts`. Student Management receives this
module's finance reader through a registration point instead of importing it
(research R6) — that task (T173–T176) is still outstanding.

## Cross-module changes made so far

**Shared workspace-tab registry** (`shared/config/student-workspace-tabs.ts`,
T047–T048). Student Management now builds its tab list from its own tabs plus the
registry, so a feature contributes a tab without Student Management importing it.

- Additive: the registry starts empty, so an unregistered feature changes nothing.
- Student Management's existing permission filtering is preserved.
- Verified by `tests/unit/shell/student-workspace-tabs-registry.test.ts` (5 cases)
  and by the unchanged `student-tab-navigation.test.tsx` (7 cases).

A first implementation resolved contributed permissions by calling `usePermission`
inside a loop, which required an eslint escape hatch for the rules of hooks. That
was replaced with a single `useEmployeeContextStore` subscription and a set
membership test — no escape hatch, no conditional hook call.

## Configurability

Payment methods, currency, precision, discount and scholarship policy, installment
eligibility per product type, numbering patterns, and due policy all arrive from
`data/finance-lookups.ts` through the organization reader port. Nothing is
hardcoded in a screen or policy.

Notably, `installmentEligibility` makes "courses are paid in full" configuration
rather than a rule — the spec asked for exactly that (FR-013).

## Gates at this checkpoint

`npm run typecheck`, `npm run lint` (0 errors), and `npm run test` (113 files,
593 tests) all pass.
