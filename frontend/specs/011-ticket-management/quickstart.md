# Quickstart Validation: Ticket Management

**Feature**: 011-ticket-management | **Date**: 2026-08-09

## Prerequisites

- Node.js 20+ and npm 10.9.3
- Dependencies installed from the repository root
- Mock services enabled (`NEXT_PUBLIC_API_MOCKS=true`, already configured for Vitest)
- Implementation follows [data-model.md](./data-model.md) and [ticket-management-contracts.md](./contracts/ticket-management-contracts.md)

## Run the Application

```bash
npm install
npm run dev -w web
```

Open `http://localhost:3000/tickets`. Use the supplied mock persona switcher/context to exercise assigned, team, global, and restricted actors.

## Automated Validation

```bash
npm run typecheck -w web
npm run lint -w web
npm run test -w web
npm run test:e2e -w web
npm run build -w web
```

Focused suites may be run while developing:

```bash
npm run test -w web -- tests/unit/tickets
npm run test -w web -- tests/contract/tickets
npm run test -w web -- tests/integration/tickets
npx playwright test --config apps/web/playwright.config.ts apps/web/playwright/journeys/tickets.spec.ts
```

## Scenario 1 — Scoped Board and Dashboard

1. Open the board as assigned-only, team, and global personas against the same fixture set.
2. Verify cards, filter options, search results, column totals, and dashboard counts never exceed each persona's scope.
3. Verify broader scope wins for a persona with multiple grants and no card appears twice.
4. Search each supported field and combine filters; clear them and confirm the original board returns.

**Expected**: Scope is enforced consistently before every query/aggregation; counts match visible data; no-results differs from empty dataset.

## Scenario 2 — Create and Move a Ticket

1. Create a ticket with required fields and optional team/employee relationships.
2. Move it using pointer drag on desktop.
3. Move it again using keyboard pickup/arrows/drop and listen for localized announcements.
4. Move it with the direct status menu; repeat on mobile selected-status view.
5. Trigger a mock permission failure/version conflict.

**Expected**: All interaction methods call the same rule, update within 300 ms, append one event on success, and restore the exact prior column/count/version with clear feedback on failure.

## Scenario 3 — Independent Infinite Columns

1. Load scale fixtures with more than 20 tickets in at least two statuses.
2. Scroll one column to its sentinel while leaving the other untouched.
3. Use the visible load-more fallback.
4. Change search/filter/saved view while a later page is loaded.
5. Move a card between partially loaded columns.

**Expected**: Only the intended column advances; cursors reset when query identity changes; no card duplicates/disappears unexpectedly; source/destination totals remain accurate.

## Scenario 4 — Ticket Workspace and Assignment

1. Open a ticket and verify all header, context, related records, comments, attachments, and chronological activity.
2. Exercise unassigned, team-only, employee-only, and both assignment states.
3. Attempt an employee/team mismatch, then a valid combination.
4. Change priority and edit ticket content.

**Expected**: Invalid membership is blocked with field guidance; successful changes increment version and append immutable typed activity; optional absent relations render safely.

## Scenario 5 — Collaboration and Governance

1. Add, edit, and delete the current user's comment; try another author's comment.
2. Upload supported image/PDF/document fixtures and reject an unsupported/oversized file.
3. Archive, restore, and confirm-delete using authorized personas; repeat without permission.

**Expected**: Own-comment and attachment rules hold, counts stay consistent, archived tickets leave active columns and restore to last active status, denied commands change nothing, and activity cannot be edited/deleted.

## Scenario 6 — Responsive, RTL, and Accessibility

1. Run desktop, 1024×768 laptop, 768×1024 touch tablet, and representative mobile viewport journeys.
2. Complete create, search/filter, status change, comment, assignment, and archive using keyboard only.
3. Verify RTL logical order, sticky headers, horizontal board scroll, mobile single-status list, focus return, unique page title/H1, bidi-isolated IDs, and non-color priority cues.
4. Run axe checks on board, create form, detail, archive, dialogs, sheets, and error/empty states.

**Expected**: No primary workflow is lost by viewport or input mode; no serious axe violations; focus and announcements remain meaningful; no unintended page-level horizontal overflow outside the board container.

## Scenario 7 — Backend/AI Boundaries

1. Verify screens import only the feature barrel/hooks, never fixtures or browser persistence.
2. Run the same service-contract suite against the mock and adapter test double.
3. Inspect all five AI sections.

**Expected**: Swapping service implementations requires no page/component change; AI placeholders are visible, disabled, localized, and issue no network/service request.

## Completion Evidence

Record command outputs, persona/scope matrix results, screenshots for four viewport classes, keyboard/axe outcomes, 500-ticket timing, and any approved exception. All constitution gates must remain passing before implementation is accepted.
