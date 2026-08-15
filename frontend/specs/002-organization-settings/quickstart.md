# Quickstart: Validate Organization & Settings

## Final Validation (2026-07-31)

- Lint and strict TypeScript passed.
- Vitest passed 26 files and 38 tests.
- The Next.js production build generated every required settings route.
- Playwright covers Chromium, Firefox, and WebKit plus desktop, laptop, and tablet projects, RTL, accessibility, keyboard, sidebar, shared dropdown, and branded 404 behavior.
- Manual semantic review confirmed headings, labels, table structure, focus visibility, and live feedback; automated axe checks cover serious and critical findings in both themes.

Mock scenarios cover empty, validation, conflict, dependency, permission, and unexpected failures. Mock authorization is UX-only, not a security boundary. A future backend can replace the service and authorization providers without changing screens or route adapters.

## Prerequisites

- Node.js 20+, npm 10.9+
- Frontend foundation implemented
- Dependencies installed at repository root
- Feature tasks implemented from `specs/002-organization-settings`

## Run and Quality Gates

```bash
npm install
npm run dev
```

Then run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Expected: every command succeeds; serious/critical axe findings are zero.

## Scenario 1: Organization Profile and Defaults

1. Open `/settings/organization` as an authorized mock administrator.
2. Submit missing and malformed contacts/locale values and verify field errors and first-error focus.
3. Select valid logo and cover files; reject invalid MIME/size; save valid profile changes.
4. Open `/settings/general`, set active branch/year and locale defaults, save, and reload.
5. Trigger a version conflict and verify retained form input plus recovery feedback.

Expected: service-backed values persist, fixtures are never imported by pages, and every action has
pending/success/failure feedback.

## Scenario 2: Branches and Departments

1. Create a branch with normalized unique code and valid working hours.
2. Search, filter, sort, paginate, edit, archive, and reactivate it.
3. Attempt to archive the default branch and verify dependency guidance.
4. Create and deactivate a department; verify it is excluded from new assignments but retained on
   existing records.

Expected: no delete action exists for branches; controlled shared tables preserve semantic RTL behavior.

## Scenario 3: Academic Calendar

1. Open `/settings/academic-years`, create two non-overlapping academic years, and activate the first.
2. Activate the second and verify the first becomes inactive in the same completed operation and
   the second becomes default.
3. Open `/settings/academic-terms`; search, filter, sort, and paginate terms across parent years.
4. Attempt overlapping years, an inverted date range, a term outside its parent, and overlapping terms.
5. Create valid terms and verify each has one immutable parent; deep-link and reload the route.

Expected: tests and UI prove the zero-or-one active-year invariant and contained term ranges.

## Scenario 4: Users, Roles, and Permissions

1. Open `/settings/roles` and create a role.
2. Open `/settings/permissions`, select that role, and assign permissions through labeled module fieldsets.
3. Deep-link and reload the permissions route; verify the same selected-role state can be restored from URL context.
4. Create a user with active branch/department and multiple active roles.
5. Verify the inherited-permission summary is the deduplicated union.
6. Deactivate a role and user; verify assignments remain but inactive entities contribute no permissions.
7. Attempt to remove the final critical administrator and verify a specific state conflict.

Expected: password fields never appear; mock UI permission filtering is visible but not presented as security.

## Scenario 5: States, RTL, Responsive, and Accessibility

For every settings list and form, reproduce success, loading, empty, validation, duplicate,
dependency, permission, conflict, unexpected error, and retry states. Validate at approximately
1440, 1024, and 768 px and at 200% zoom.

- Complete all critical workflows by keyboard.
- Verify dialog focus trap/cancel/return and first-invalid-field focus.
- Confirm semantic tables, fieldsets, names, descriptions, live feedback, and sort state.
- Inspect mixed Arabic plus email/phone/code/date content.
- Confirm no page-level horizontal overflow; table viewport scrolling is allowed.
- Review light/dark contrast and conduct targeted screen-reader checks.

## Architecture Review

Use [data-model.md](./data-model.md) and
[organization-settings-contracts.md](./contracts/organization-settings-contracts.md) to verify:

- Pages import only the feature public boundary.
- All ten required route entries exist, own navigation/view-permission metadata, and import feature
  screens; optional year/role detail routes follow the same adapter rule.
- Standalone academic-term and permission screens use shared table/form primitives and service calls only.
- Only the mock adapter imports fixtures.
- TanStack Query owns administrative records; Zustand does not duplicate them.
- Zod/service layers, not components, own invariants.
- All tables use the shared controlled table implementation.
- Status labels/options and permission groups come from services.
- No out-of-scope product, student, finance, report, AI, live API, or identity behavior was added.

Record command output, browser matrix, axe results, keyboard/screen-reader/zoom review, and any
approved exception as completion evidence.
