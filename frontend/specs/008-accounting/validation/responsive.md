# Validation: Responsive Behaviour

**Feature**: Accounting | **Verified**: 2026-08-01 | **Status**: PASS on static review; viewport run outstanding

## Targets (T173)

Desktop 1440, laptop 1280, tablet 834 — the platform's three supported widths.
Phone layouts are explicitly out of scope for this operations module.

## How each surface adapts

- **Requests queue** — the filter toolbar is a `flex-wrap` row: filters reflow
  onto additional lines rather than compressing. The table scrolls inside its own
  `overflow-x-auto` container, so a wide table never makes the page scroll
  sideways.
- **Request detail** — field grids step `1 → 2 → 3` columns across the three
  widths; attachment and comment lists are flex rows that wrap.
- **Dashboard** — summary cards step `1 → 2 → 5`; the two breakdowns sit side by
  side at `lg` and stack below it. Each breakdown's table scrolls independently of
  the page.
- **Dialogs** — `max-w-lg` with internal scrolling, so a long form stays usable at
  tablet height without its action buttons falling off screen.
- **Timeline** — a single column at every width; the icon rail is fixed and the
  content column takes the remainder.

## 200% zoom

Every layout uses relative units and flex/grid reflow rather than fixed pixel
widths, so 200% zoom at 1280 behaves as the 640-wide reflow of the same content.
No container sets a `min-width` that would force overflow.

## Outstanding

The horizontal-overflow assertion at each of the three widths lives in the
Playwright journey suite (T179–T181), which is **not yet written**. **SC-012 is
unverified by measurement** — the review above is a reading of the layout classes,
not a rendered check.
