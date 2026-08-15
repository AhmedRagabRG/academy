# Quickstart: Validate the Frontend Foundation

This guide describes the runnable checks expected after implementation. It does not require a
live backend, database, or external service.

## Prerequisites

- Node.js 20 or later
- npm 10.9.x
- Dependencies installed from the repository root
- Foundation tasks completed for `specs/001-application-foundation`

## Start the Application

From the repository root:

```bash
npm install
npm run dev
```

Open the web application URL printed by the development command. Use the documented mock
credentials from the auth fixture documentation created during implementation. Never reuse real
credentials.

## Static Quality Gates

```bash
npm run lint
npm run typecheck
npm run build
```

Expected outcome: all three commands exit successfully with no strict TypeScript error, lint
failure, or production build failure.

## Automated Validation

After the planned test scripts are added:

```bash
npm run test
npm run test:e2e
```

Expected outcome: unit/integration checks and browser journeys pass. The critical browser set
must include mock entry, navigation, appearance persistence, RTL, tablet navigation, dialogs,
forms, table states, file rejection, and accessibility checks.

## Scenario 1: Mock Entry

1. Open `/login` using only the keyboard.
2. Submit empty and invalid values; verify Arabic field errors and focus placement.
3. Submit the valid mock credentials; verify pending feedback and arrival in the workspace.
4. Reload; verify the mock session context restores.
5. Sign out or corrupt the stored version; verify a safe return to anonymous state.

Expected outcome: no credential is persisted, invalid attempts remain on login, and mock entry is
never presented as real security.

## Scenario 2: Shell and Navigation

1. Verify the sidebar, header, breadcrumb, title, user menu, search placeholder, notification
   placeholder, and content region.
2. Select every visible leaf; compare active item, title, breadcrumb, and URL.
3. Use a mock permission set that removes a child and then an entire group.
4. Open an unregistered route and a route that triggers a render failure.

Expected outcome: configuration drives navigation, empty groups disappear, route boundaries are
recoverable, and placeholders never imply live functionality.

## Scenario 3: Appearance and Persistence

1. Switch among light, dark, and system appearances.
2. Change the device color preference while system is selected.
3. Collapse the desktop sidebar and reload.
4. Inject an invalid persisted appearance/sidebar value and reload.

Expected outcome: valid preferences persist, system changes are followed, and invalid values use
safe defaults without hydration failure or unreadable content.

## Scenario 4: RTL, Responsive, and Accessibility

Validate representative widths near 1440 px, 1024 px, and 768 px, including a resize resembling
tablet orientation change.

1. Confirm the document is Arabic and RTL and that navigation, forms, tables, dialogs, spacing,
   and directional icons behave correctly.
2. Inspect an Arabic label containing an email address and number.
3. Open and dismiss tablet navigation by trigger, Escape, and outside interaction.
4. Complete primary journeys by keyboard and with a screen reader.
5. Zoom to 200 percent in light and dark appearances.

Expected outcome: there is no keyboard trap, hidden required action, critical automated
accessibility violation, incorrect focus return, or horizontal page overflow.

## Scenario 5: Shared Pattern Showcase

Open `/foundation` and exercise the shared contracts documented in
[foundation-contracts.md](./contracts/foundation-contracts.md).

- Render loading, empty, error, success, disabled, and retry states.
- Exercise confirmation and deletion dialogs, including pending state and focus return.
- Submit valid and invalid example forms; verify the feature schema is authoritative.
- Combine table search, filters, sorting, pagination, selection, bulk action, and visibility.
- Test accepted, rejected, removed, and retried file selections without network activity.

Expected outcome: the showcase proves one reusable interaction vocabulary without importing a
business module or performing a live operation.

## Architecture Review

Use [data-model.md](./data-model.md) and the contracts to verify:

- Pages import feature public APIs rather than mock fixtures.
- Only mock adapters import feature `data` files.
- TanStack Query, Zustand, next-themes, route state, and local state each have one authority.
- App-aware components do not leak into `packages/ui`.
- Adding a sample feature route/navigation contribution does not modify another feature's internals.
- Product, Batch, Student, Enrollment, and Payment models have not been invented in this phase.

## Completion Evidence

Capture successful command output, automated test results, the viewport/browser matrix, and the
manual screen-reader/zoom review. Any exception must be recorded in the plan before the feature
can be considered complete.

### Recorded Validation — 2026-07-31

- `npm run test`: PASS — 9 files, 13 unit/component tests.
- `npm run lint`: PASS — zero errors and zero warnings.
- `npm run typecheck`: PASS — strict TypeScript across `web` and `@workspace/ui`.
- `npx turbo build --force`: PASS — App Router routes `/`, `/login`, `/dashboard`, and
  `/foundation` generated successfully.
- Playwright desktop/laptop/tablet matrix: PASS — 18 browser journeys, including axe scans of
  login, workspace, foundation showcase, and dark theme.
- Architecture review: PASS — route pages use feature/shared public boundaries; mock fixtures are
  isolated to mock adapters; async, global, appearance, route, and local state have distinct owners.
- Dependency audit note: installation reports 9 high-severity transitive findings. No force upgrade
  was applied because it may introduce breaking changes; dependency remediation requires a focused
  audit outside this feature's acceptance result.
