# Validation: Responsive Behaviour (T155)

**Feature**: Student Management | **Verified**: 2026-07-31

## Supported viewports

| Class | Width | Coverage |
| --- | --- | --- |
| Desktop | 1440 | All routes |
| Laptop | 1280 | All routes |
| Tablet | 834 | All routes |

## Layout strategy

- **List**: filters wrap via `FilterBar`'s flex-wrap; the table scrolls inside its own `overflow-x-auto` container so the page body never scrolls horizontally.
- **Workspace header**: actions wrap below the title; the metadata strip is a wrapping flex row.
- **Tabs**: wrap to a second line rather than overflowing.
- **Detail lists**: `grid` at 1 / 2 / 3 columns by breakpoint.
- **Documents**: single column below `lg`, two columns above.
- **Forms**: single column below `sm`, two above; textareas span both.
- **Dialogs**: `max-w-md` with page padding, so they fit tablet portrait.

## Assertions

`playwright/journeys/student-management.spec.ts` and `student-workspace.spec.ts` each
run a parameterised test per viewport asserting the primary controls stay visible and
that `document.documentElement.scrollWidth` does not exceed the viewport — i.e. no
horizontal page scroll at any supported width.

200% zoom is covered by the same no-horizontal-overflow assertion combined with
relative units throughout (no fixed pixel widths outside the table's `min-w`).

**Not yet executed** — see `constitution.md` gates.
