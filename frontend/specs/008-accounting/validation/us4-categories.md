# Validation: US4 — Configure Expense Categories and Sub-Categories

**Feature**: Accounting | **Verified**: 2026-08-01 | **Status**: PASS

## Acceptance scenarios

| Scenario | Evidence |
| --- | --- |
| US4-1 a created category becomes available for selection | `category-lifecycle.test.ts` — "creates a category as active and offers it immediately" |
| US4-2 an archived category leaves the choices but stays on existing requests | `category-archival.test.ts` — both halves, below |
| US4-3 an archived category can be reactivated | "archives and reactivates" |
| US4-4 a sub-category belongs to one parent and is offered only under it | `subcategory-consistency.test.ts` — "is offered only under that parent" |
| US4-5 archiving a parent removes its sub-categories from the choices | "takes its sub-categories out of the choices with it" |

> **File note**: T109's cases live in `category-archival.test.ts` rather than a
> separate `subcategory-parent-archival.test.ts`. The parent-archival behaviour is
> one half of FR-006 and reads better beside the other half than split across two
> files; all five of its cases are present and passing.

## FR-006's two halves, which pull against each other

An archived category must **disappear from the choices** and **stay visible on
every request that already uses it**. One read cannot serve both, which is why
there are two (research R7):

- `listCategories({ activeOnly })` and `lookups()` feed pickers — an archived
  category is absent from both, and so are its sub-categories
- `resolveCategory(id)` feeds display — it returns archived rows, so a request
  raised months ago still shows the category it was filed under

Serving display from the filtered list would blank the category on historical
requests, silently rewriting the past. Asserted by archiving the category a seeded
draft uses and confirming its label is unchanged, with `categoryStatus` reported
as `archived` so the UI can mark it.

## Archiving a parent does not archive its children

Sub-categories vanish from the choices because their **parent** is archived, not
because they were. Their own status is untouched, so reactivating the parent
restores them — asserted in both directions.

## The edge case moved here from US1

A category archived *after* a draft was written. This needs the category commands,
so it was moved out of US1's suite to keep that story independent. Four cases:
submission is refused with `category-inactive`, the request stays a Draft with its
history untouched, it submits successfully once the category is reactivated, and
an already-archived category cannot be chosen on a new request at all.

## Name uniqueness is scoped deliberately

**Categories** are unique across the organization. **Sub-categories** are unique
only within their parent — "المطبوعات" under Marketing and under Office are
different things, and forbidding that would push users into inventing awkward
names. Both are asserted, including the positive case that the same sub-category
name is accepted under a different parent.

Comparison normalizes whitespace and case, so "Marketing" and "  marketing  "
collide: two rows a user cannot tell apart is worse than a refusal. An archived
name still collides, because reactivating it would otherwise produce a duplicate.

Renaming a row to its own current name is allowed — otherwise editing only the
description would be impossible.

## Managing is a distinct authority from viewing

`categories.manage` gates create, update, and archive; `categories.view` alone
still reads. A refused create leaves the total unchanged. Every mutation is
version-guarded, and an operation on a category that does not exist reports
`not-found` rather than a conflict.

## UI

`category-management.test.tsx` (15 cases). One dialog serves both categories and
sub-categories — they differ only by the parent selector, and two near-identical
dialogs is the duplication the reuse principle exists to prevent. It takes focus
on open, moves focus to the first invalid field on a refused submit, and is
mounted only while open so each opening starts fresh.

Row actions are **hidden** from a user who may only view, rather than disabled:
an action they can never take is not an affordance, it is noise. Status reads as
text — "نشط" / "مؤرشف" — with tone as decoration only.

## Success criteria

- **SC-014** an archived category remains visible on requests that reference it,
  in 100% of cases — PASS

## Gates

`npm run typecheck`, `npm run lint` (0 errors), `npm run build`, and the
Accounting suites (30 files, 401 tests) all pass.
