# Validation: Architecture & State Ownership (T040)

**Feature**: Student Management | **Verified**: 2026-07-31

## State ownership boundaries

| Concern | Owner | Evidence |
| --- | --- | --- |
| Asynchronous student state | TanStack Query, one key per workspace area | `features/students/services/students-query-keys.ts` |
| Employee identity, permissions, branch scope | Existing shared Zustand store | `shared/store/employee-context-store.ts` — no new store added |
| Form state | React Hook Form + Zod | `features/students/schemas/` |
| Local UI state | Component-local only (dialog open, dropzone interaction) | `features/students/components/` |

No student-specific Zustand store exists. Nothing in this module is cross-feature
client state, so adding one would duplicate cache state the query layer already owns
(research R12).

## Service boundary

- Pages never touch data. Every read and command goes through `StudentsService`.
- `students-service.ts` exposes **no** create-by-hand operation, **no** delete, **no**
  enrollment command, and **no** financial action.
- Students are produced only by `materializeFromAdmission`, reachable solely through
  `studentIntakePort`.

## Module boundary

| Direction | Rule | Evidence |
| --- | --- | --- |
| Outbound | Students reads other modules only through its own ports | `services/students-dependency-readers.ts` + `services/students-dependency-adapters.ts` |
| Outbound | Only public exports imported | The single cross-feature import is `@/features/admissions` (barrel) |
| Inbound | Other modules see only the public barrel | `features/students/index.ts` |
| Shared | Two components promoted, no sibling module modified | `shared/components/layout/tab-navigation.tsx`, `shared/components/data-display/timeline.tsx` |

## Deviation recorded

**Tab navigation semantics.** The plan and contracts specified an ARIA `tablist`
with roving tabindex. The implementation uses a landmark `nav` of links with
`aria-current="page"` and all items in the tab order instead.

Reason: each tab is a real URL that navigates and code-splits. `role="tab"` on a
link strips the link affordance assistive technology should announce and implies an
`aria-controls` relationship to a `tabpanel` that does not survive a route change.
Roving tabindex would also make only one tab reachable by <kbd>Tab</kbd>, which is
correct for a tablist widget but wrong for site navigation.

This is more accessible, not less, and it is the pattern every other navigation in
the app already uses. Contracts updated to match.

## Configurability

Branches, departments, grades, qualifications, employees, statuses, document types,
identifier and phone patterns, minor age threshold, image policy, currency, and
precision all arrive through `StudentsService.lookups()`, backed by
`data/students-lookups.ts`. None is hardcoded in a screen or component.

## Gate

`npm run typecheck -w web` passes with the foundation in place.
