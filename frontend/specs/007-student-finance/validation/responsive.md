# Validation: Responsive Behaviour

**Feature**: Student Finance | **Verified**: 2026-08-01 | **Status**: PASS

## Targets (T187)

Desktop 1440, laptop 1280, and tablet 834 — the platform's three supported widths.
Phone layouts are explicitly out of scope for this operations module.

## How each surface adapts

- **Queues** — the shared toolbar is a `flex-wrap` row: filters reflow onto
  additional lines rather than compressing. Tables scroll inside their own
  container, so a wide table never makes the page scroll sideways.
- **Invoice detail** — figure grids step `1 → 2 → 4` columns across the three
  widths; the payments and reductions lists are flex rows that wrap.
- **Refunds queue** — cards rather than a table, precisely because each row
  carries decision controls that would be unusable in a narrow cell.
- **Dialogs** — `max-w-lg` with `sm:max-h-[90vh]` and internal scrolling, so a
  long form (the scholarship dialog) stays usable at tablet height without the
  action buttons falling off screen.
- **Timeline** — a single column at every width; the icon rail is fixed and the
  content column takes the remainder.

## Horizontal overflow

`student-finance-integration.spec.ts` asserts at all three widths that
`documentElement.scrollWidth <= clientWidth` on the invoices queue — the page body
must never scroll sideways, whatever a table does inside its own container.

## 200% zoom

Every layout uses relative units and flex/grid reflow rather than fixed pixel
widths, so a 200% zoom at 1280 behaves as the 640-wide reflow of the same content.
No `min-width` is set on any container that would force overflow.

## Execution

The viewport assertions live in the Playwright journey suite and run under
`npm run test:e2e` (T198).
