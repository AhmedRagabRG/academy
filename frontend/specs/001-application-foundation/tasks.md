---

description: "Dependency-ordered implementation tasks for the Frontend Foundation"
---

# Tasks: Frontend Foundation

**Input**: Design documents from `/specs/001-application-foundation/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/foundation-contracts.md`, `quickstart.md`

**Validation**: Tests are included because the specification and quickstart require verifiable
mock services, persistence, RTL, responsive, accessibility, form, table, and browser journeys.

**Organization**: Setup and foundational infrastructure precede five independently testable user
story phases. The final phase validates the complete foundation against the constitution.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets different files and has no incomplete dependency
- **[Story]**: Maps the task to US1, US2, US3, US4, or US5 from `spec.md`
- Every task includes the exact file or directory it changes

## Phase 1: Setup (Project Foundation)

**Purpose**: Establish the permanent source boundary, dependencies, tooling, and quality commands.

- [x] T001 Add TanStack Query, Zustand, React Hook Form, TanStack Table, Sonner, react-dropzone, Recharts, Tiptap, Vitest, Testing Library, Playwright, and axe dependencies and workspace scripts in `apps/web/package.json`, `packages/ui/package.json`, `package.json`, `package-lock.json`, and `turbo.json`
- [x] T002 Move the starter application from `apps/web/app/` and `apps/web/components/` into `apps/web/src/app/` and `apps/web/src/shared/providers/` while preserving the single root layout
- [x] T003 Configure `@/*` for `apps/web/src/*`, strict test types, and package aliases in `apps/web/tsconfig.json` and `apps/web/next.config.ts`
- [x] T004 [P] Configure shared Prettier, ESLint, and Tailwind source discovery for the new source boundary in `.prettierrc.json`, `apps/web/eslint.config.js`, and `packages/ui/src/styles/globals.css`
- [x] T005 [P] Configure Vitest, Testing Library, and browser-independent test setup in `apps/web/vitest.config.ts` and `apps/web/tests/setup.ts`
- [x] T006 [P] Configure Playwright desktop, laptop, tablet, Firefox, WebKit, and axe projects in `apps/web/playwright.config.ts`
- [x] T007 Create feature and shared directory public boundaries documented in `apps/web/src/features/`, `apps/web/src/shared/`, and `packages/ui/src/`
- [x] T008 Configure Arabic document metadata, Arabic-capable fonts, `lang="ar"`, and `dir="rtl"` in `apps/web/src/app/layout.tsx` and `packages/ui/src/styles/globals.css`
- [x] T009 Run and record the baseline install, lint, typecheck, and build results in `specs/001-application-foundation/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build contracts and providers required by every user story.

**⚠️ CRITICAL**: No user story implementation begins until this phase is complete.

- [x] T010 Define opaque identifiers, `Employee`, `Role`, `Branch`, `EmployeeContext`, `PermissionKey`, `ServiceError`, and persistence version types in `apps/web/src/shared/types/foundation.ts`
- [x] T011 [P] Define typed storage parsing, version validation, bidi isolation, and safe error utilities in `apps/web/src/shared/utils/persistence.ts`, `apps/web/src/shared/utils/bidi.ts`, and `apps/web/src/shared/utils/errors.ts`
- [x] T012 [P] Define service adapter contracts and a single adapter composition point in `apps/web/src/shared/services/contracts.ts` and `apps/web/src/shared/services/index.ts`
- [x] T013 Define focused employee-context and sidebar Zustand stores with versioned persistence and selectors in `apps/web/src/shared/store/employee-context-store.ts` and `apps/web/src/shared/store/sidebar-store.ts`
- [x] T014 [P] Define query keys and a stable Query Client factory with retry defaults appropriate to deterministic mock services in `apps/web/src/shared/services/query-keys.ts` and `apps/web/src/shared/providers/query-client.ts`
- [x] T015 Compose Query, theme, notification, and persisted-state hydration providers in `apps/web/src/shared/providers/app-providers.tsx`
- [x] T016 [P] Create application-agnostic shadcn/Base UI primitives required by the feature in `packages/ui/src/components/`
- [x] T017 Create shared Arabic loading, empty, error, and status patterns in `apps/web/src/shared/components/states/` and `apps/web/src/shared/components/feedback/status-badge.tsx`
- [x] T018 [P] Create the Sonner feedback adapter and application toaster host in `apps/web/src/shared/components/feedback/toast.ts` and `apps/web/src/shared/components/feedback/toaster.tsx`
- [x] T019 Define serializable navigation records, Lucide icon keys, registry validation, recursive permission filtering, and breadcrumb derivation in `apps/web/src/shared/config/navigation.ts`, `apps/web/src/shared/config/icon-registry.ts`, and `apps/web/src/shared/utils/navigation.ts`
- [x] T020 [P] Add unit tests for persisted-state fallback, service errors, navigation filtering, empty-group removal, active-item derivation, and unique registry constraints in `apps/web/tests/unit/shared/`
- [x] T021 Create shared route-level error and not-found boundaries using the state patterns in `apps/web/src/app/error.tsx` and `apps/web/src/app/not-found.tsx`
- [x] T022 Run foundational unit tests, lint, and typecheck and record any approved contract adjustment in `specs/001-application-foundation/research.md`

**Checkpoint**: Shared contracts, providers, navigation logic, and state primitives are ready.

---

## Phase 3: User Story 1 — Enter the Operations Workspace (Priority: P1) 🎯 MVP

**Goal**: An internal employee can complete accessible mock login, restore a valid local session,
and sign out without any live identity integration.

**Independent Test**: Open `/login`, exercise empty, invalid, valid, reload, corrupt-session, and
sign-out flows using keyboard input only.

### Tests for User Story 1

- [x] T023 [P] [US1] Add auth schema and mock service contract tests for valid, invalid, pending, rejected, and deterministic failure outcomes in `apps/web/tests/unit/auth/auth-service.test.ts`
- [x] T024 [P] [US1] Add Login Form keyboard, focus, Arabic validation, pending, and feedback component tests in `apps/web/tests/unit/auth/login-form.test.tsx`
- [x] T025 [P] [US1] Add Playwright login, session restoration, corrupt persistence, protected-route, and sign-out journeys in `apps/web/playwright/journeys/auth.spec.ts`

### Implementation for User Story 1

- [x] T026 [P] [US1] Define `LoginCredentials`, mock session state, and authoritative Zod login schema in `apps/web/src/features/auth/types/auth.ts` and `apps/web/src/features/auth/schemas/login-schema.ts`
- [x] T027 [P] [US1] Create isolated employee, configurable role, configurable branch, permission, and mock credential fixtures in `apps/web/src/features/auth/data/auth-fixtures.ts`
- [x] T028 [US1] Implement Promise-based sign-in, get-session, and sign-out mock adapters with safe typed errors in `apps/web/src/features/auth/services/auth-service.ts` and `apps/web/src/features/auth/services/mock-auth-service.ts`
- [x] T029 [US1] Implement TanStack Query session and mutation hooks that synchronize validated employee context in `apps/web/src/features/auth/hooks/use-session.ts` and `apps/web/src/features/auth/hooks/use-auth-mutations.ts`
- [x] T030 [US1] Implement the React Hook Form login experience with Arabic errors and accessible pending/success/failure feedback in `apps/web/src/features/auth/components/login-form.tsx`
- [x] T031 [US1] Create the `(auth)` layout and `/login` page as server-first route compositions in `apps/web/src/app/(auth)/layout.tsx` and `apps/web/src/app/(auth)/login/page.tsx`
- [x] T032 [US1] Implement mock session gating and redirect composition without presenting it as authorization in `apps/web/src/features/auth/components/mock-session-gate.tsx` and `apps/web/src/features/auth/index.ts`

**Checkpoint**: US1 is demonstrable without the application shell or any backend.

---

## Phase 4: User Story 2 — Navigate the Application Shell (Priority: P2)

**Goal**: An employee can use the shared shell and configuration-driven navigation with aligned
active item, page title, and breadcrumb.

**Independent Test**: Render the workspace with a mock session, visit every configured leaf,
filter permissions, and verify shell regions and route context.

### Tests for User Story 2

- [x] T033 [P] [US2] Add shell landmark, active-navigation, breadcrumb, long-title, and mock-permission component tests in `apps/web/tests/unit/shell/application-shell.test.tsx`
- [x] T034 [P] [US2] Add Playwright configured navigation, child group, placeholder, unregistered route, and recovery journeys in `apps/web/playwright/journeys/shell-navigation.spec.ts`

### Implementation for User Story 2

- [x] T035 [P] [US2] Implement `PageContainer`, `PageHeader`, `Section`, and breadcrumb layout composites in `apps/web/src/shared/components/layout/`
- [x] T036 [P] [US2] Implement controlled sidebar navigation groups, active states, and user-visible collapse affordance in `apps/web/src/shared/components/layout/sidebar.tsx` and `apps/web/src/shared/components/layout/sidebar-navigation.tsx`
- [x] T037 [P] [US2] Implement the header, user menu, explicitly inactive search placeholder, and notification placeholder in `apps/web/src/shared/components/layout/header.tsx`, `apps/web/src/shared/components/layout/user-menu.tsx`, and `apps/web/src/shared/components/layout/header-placeholders.tsx`
- [x] T038 [US2] Compose `AppShell` from layout slots without data fetching or permission decisions in `apps/web/src/shared/components/layout/app-shell.tsx`
- [x] T039 [US2] Register foundation destinations and mock permission keys through the navigation contract in `apps/web/src/shared/config/foundation-navigation.ts`
- [x] T040 [US2] Create the `(workspace)` protected layout and dashboard composition route in `apps/web/src/app/(workspace)/layout.tsx` and `apps/web/src/app/(workspace)/dashboard/page.tsx`
- [x] T041 [US2] Add workspace loading and local error boundaries backed by shared states in `apps/web/src/app/(workspace)/loading.tsx` and `apps/web/src/app/(workspace)/error.tsx`

**Checkpoint**: US2 works with injected mock employee context and configuration only.

---

## Phase 5: User Story 3 — Personalize the Workspace (Priority: P3)

**Goal**: Appearance and desktop sidebar preferences persist safely, including system preference
changes and invalid storage fallback.

**Independent Test**: Switch all appearances, collapse the sidebar, reload, change device color
preference, and inject invalid persisted values.

### Tests for User Story 3

- [x] T042 [P] [US3] Add theme selection, system-change, hydration, and invalid-value component tests in `apps/web/tests/unit/preferences/theme-switcher.test.tsx`
- [x] T043 [P] [US3] Add sidebar selector, persistence migration, and invalid-value fallback tests in `apps/web/tests/unit/preferences/sidebar-store.test.ts`
- [x] T044 [P] [US3] Add Playwright light, dark, system, reload, and sidebar persistence journeys in `apps/web/playwright/journeys/preferences.spec.ts`

### Implementation for User Story 3

- [x] T045 [P] [US3] Finalize the single next-themes authority and hydration-safe system defaults in `apps/web/src/shared/providers/theme-provider.tsx`
- [x] T046 [P] [US3] Implement the accessible light, dark, and system theme switcher in `apps/web/src/shared/components/layout/theme-switcher.tsx`
- [x] T047 [US3] Connect desktop sidebar controls to focused selectors and preserve tablet overlay as transient state in `apps/web/src/shared/components/layout/sidebar-controller.tsx`
- [x] T048 [US3] Integrate theme and sidebar preference controls into the shell header and sidebar in `apps/web/src/shared/components/layout/app-shell.tsx`

**Checkpoint**: US3 preferences restore reliably without duplicating theme or route state.

---

## Phase 6: User Story 4 — Work in Arabic Across Supported Screens (Priority: P4)

**Goal**: Login and shell workflows are natively RTL, responsive on desktop/laptop/tablet, and
usable by keyboard and assistive technologies.

**Independent Test**: Complete the primary journeys at representative widths with keyboard,
screen reader, mixed-direction text, 200-percent zoom, and both themes.

### Tests for User Story 4

- [x] T049 [P] [US4] Add axe checks for login, workspace, navigation, dialogs, forms, and both themes in `apps/web/playwright/accessibility/foundation-a11y.spec.ts`
- [x] T050 [P] [US4] Add desktop, laptop, tablet, orientation-resize, long-header, Escape, focus-return, mixed-bidi, and overflow browser tests in `apps/web/playwright/journeys/rtl-responsive.spec.ts`
- [x] T051 [P] [US4] Create the manual screen-reader, contrast, reduced-motion, and 200-percent zoom checklist in `specs/001-application-foundation/checklists/accessibility.md`

### Implementation for User Story 4

- [x] T052 [P] [US4] Add logical RTL layout utilities, bidi isolation helpers, focus-ring tokens, contrast-safe theme tokens, and reduced-motion behavior in `packages/ui/src/styles/globals.css`
- [x] T053 [P] [US4] Audit and correct semantic landmarks, Arabic accessible names, heading order, and route titles in `apps/web/src/app/` and `apps/web/src/shared/components/layout/`
- [x] T054 [US4] Implement the tablet navigation drawer with focus containment, Escape/outside dismissal, orientation resize handling, and focus return in `apps/web/src/shared/components/layout/tablet-navigation.tsx`
- [x] T055 [US4] Apply desktop, laptop, tablet, long-title, and 200-percent zoom constraints to shell layouts in `apps/web/src/shared/components/layout/app-shell.tsx` and `apps/web/src/shared/components/layout/page-header.tsx`
- [x] T056 [US4] Document directional icon rules and verify the centralized icon registry in `apps/web/src/shared/config/icon-registry.ts` and `specs/001-application-foundation/quickstart.md`

**Checkpoint**: US4 passes automated checks and the manual accessibility checklist.

---

## Phase 7: User Story 5 — Experience Consistent Shared States (Priority: P5)

**Goal**: Future modules can reuse one consistent set of layout, feedback, form, table, and file
selection patterns demonstrated independently of business functionality.

**Independent Test**: Open `/foundation` and exercise every shared pattern in applicable default,
loading, empty, error, success, disabled, destructive, filtered, and rejected states.

### Tests for User Story 5

- [x] T057 [P] [US5] Add shared state, card, action bar, status, dialog focus-return, and feedback component tests in `apps/web/tests/unit/shared/design-system.test.tsx`
- [x] T058 [P] [US5] Add form adapter, Arabic schema error, first-invalid-focus, pending, rich-text, and file rejection tests in `apps/web/tests/unit/shared/forms.test.tsx`
- [x] T059 [P] [US5] Add controlled table search, filter, sort, pagination, stable selection, bulk action, visibility, loading, empty, and error tests in `apps/web/tests/unit/shared/data-table.test.tsx`
- [x] T060 [P] [US5] Add Playwright foundation showcase journeys covering all shared patterns without network activity in `apps/web/playwright/journeys/foundation-showcase.spec.ts`

### Implementation for User Story 5

- [x] T061 [P] [US5] Implement reusable `Card`, `StatCard`, `ActionBar`, and shared layout helpers in `apps/web/src/shared/components/layout/card.tsx`, `apps/web/src/shared/components/layout/stat-card.tsx`, and `apps/web/src/shared/components/layout/action-bar.tsx`
- [x] T062 [P] [US5] Implement confirmation and deletion dialogs with explicit consequences, pending state, cancellation, and focus return in `apps/web/src/shared/components/feedback/confirm-dialog.tsx` and `apps/web/src/shared/components/feedback/delete-dialog.tsx`
- [x] T063 [P] [US5] Implement controlled Search Bar and composable Filter Bar without data-fetch behavior in `apps/web/src/shared/components/data-table/search-bar.tsx` and `apps/web/src/shared/components/data-table/filter-bar.tsx`
- [x] T064 [P] [US5] Implement React Hook Form provider/wrapper and text, textarea, select, combobox, date, phone, currency, and switch adapters in `apps/web/src/shared/components/forms/`
- [x] T065 [P] [US5] Implement the controlled Tiptap rich-text form adapter with no business validation in `apps/web/src/shared/components/forms/rich-text-field.tsx`
- [x] T066 [P] [US5] Implement react-dropzone file selection and file preview/rejection patterns with no upload transport in `apps/web/src/shared/components/file-upload/file-dropzone.tsx` and `apps/web/src/shared/components/file-upload/file-preview.tsx`
- [x] T067 [US5] Implement the generic typed TanStack Table wrapper, toolbar, pagination, selection, bulk action, visibility, and state presentations in `apps/web/src/shared/components/data-table/`
- [x] T068 [P] [US5] Define non-business showcase records, statuses, deterministic delay/error/empty fixtures, and Promise service in `apps/web/src/features/foundation/data/showcase-fixtures.ts` and `apps/web/src/features/foundation/services/showcase-service.ts`
- [x] T069 [US5] Add TanStack Query hooks, feature-owned example form schema, columns, filters, and actions in `apps/web/src/features/foundation/hooks/use-showcase.ts`, `apps/web/src/features/foundation/schemas/showcase-schema.ts`, and `apps/web/src/features/foundation/config/showcase-table.tsx`
- [x] T070 [US5] Compose the internal shared-pattern showcase without real business entities in `apps/web/src/features/foundation/components/foundation-showcase.tsx` and `apps/web/src/app/(workspace)/foundation/page.tsx`
- [x] T071 [US5] Export stable shared and feature public APIs without exposing fixtures or adapter internals in `apps/web/src/shared/index.ts`, `apps/web/src/features/auth/index.ts`, and `apps/web/src/features/foundation/index.ts`

**Checkpoint**: US5 proves reusable form/table/design-system contracts independently.

---

## Phase 8: Polish & Cross-Cutting Validation

**Purpose**: Prove the complete foundation is stable, consistent, and ready for future modules.

- [x] T072 [P] Audit direct imports and enforce that pages use feature public APIs and only mock adapters import `data` files in `apps/web/eslint.config.js` and `apps/web/src/`
- [x] T073 [P] Review Server/Client Component boundaries, provider depth, store selectors, rerenders, and table processing and document findings in `specs/001-application-foundation/quickstart.md`
- [x] T074 [P] Verify Arabic copy, RTL direction, mixed bidi content, light/dark contrast, desktop/laptop/tablet behavior, and all UI states using `specs/001-application-foundation/checklists/accessibility.md`
- [x] T075 [P] Validate folder ownership, public contracts, navigation registration, and sample future-module extension without inventing business models in `specs/001-application-foundation/contracts/foundation-contracts.md`
- [x] T076 Remove unused starter files, duplicate components, commented code, unsafe `any`, and obsolete imports throughout `apps/web/src/` and `packages/ui/src/`
- [x] T077 Run all unit, browser, axe, lint, typecheck, and production build commands and record completion evidence in `specs/001-application-foundation/quickstart.md`
- [x] T078 Update developer setup, mock credential safety, architecture boundaries, and validation commands in `README.md`
- [x] T079 Re-run every scenario in `specs/001-application-foundation/quickstart.md` and reconcile results with `specs/001-application-foundation/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: No dependency; establishes packages, source paths, and test tooling.
- **Phase 2 — Foundational**: Depends on Phase 1 and blocks every user story.
- **US1 — Mock Entry**: Depends on Phase 2 and delivers the suggested MVP.
- **US2 — Shell Navigation**: Depends on Phase 2; may develop with injected mock context, then
  integrate with US1 through the public auth API.
- **US3 — Preferences**: Depends on the Phase 2 stores/providers and US2 shell controls.
- **US4 — RTL/Responsive/Accessibility**: Depends on the completed US1 and US2 primary surfaces;
  its utilities and tests may begin earlier where files do not overlap.
- **US5 — Shared Patterns**: Depends on Phase 2 and may proceed alongside US2–US4; the integrated
  showcase route depends on the US2 shell.
- **Phase 8 — Polish**: Depends on all selected user stories.

### User Story Dependency Graph

```text
Setup -> Foundational -> US1 (MVP)
                       -> US2 -> US3
                          |      |
                          +----> US4
                          |
                          +----> US5
All completed stories ----------> Polish & Validation
```

### User Story Independence

- **US1** can run and be tested entirely at `/login` with the auth mock adapter.
- **US2** can mount the shell with injected Employee Context and navigation configuration.
- **US3** can mount preference controls against isolated theme/sidebar providers.
- **US4** can validate prepared login and shell fixtures at each viewport and input mode.
- **US5** can mount the showcase and deterministic service without any business module.

### Within Each User Story

1. Write contract/component/browser tests so the required behavior is executable and initially fails.
2. Define feature types, schemas, fixtures, and service contracts before dependent UI.
3. Implement hooks and interactive components before route composition.
4. Integrate only through public feature/shared boundaries.
5. Run the independent test before starting a dependent story.

## Parallel Opportunities

- T004–T006 can run together after dependency installation decisions are fixed.
- T011, T012, T014, T016, and T018 target separate foundational boundaries.
- US1 test tasks T023–T025 can run together; T026 and T027 can run together.
- US2 tests T033–T034 and layout components T035–T037 are parallel file groups.
- US3 tests T042–T044 and provider/control work T045–T046 are parallel file groups.
- US4 tests/checklist T049–T051 and CSS/semantic work T052–T053 can run in parallel.
- US5 tests T057–T060 and component groups T061–T066 can run in parallel before integration.
- T072–T075 are independent review streams before the final cleanup and command run.

## Parallel Example: User Story 5

```text
Task T057: Test shared design-system states and dialogs.
Task T058: Test form adapters, validation, rich text, and file selection.
Task T059: Test the controlled data table.
Task T060: Define the browser showcase journey.

Task T061: Build cards and action layout.
Task T062: Build confirmation/deletion dialogs.
Task T063: Build controlled search/filter bars.
Task T064: Build standard form adapters.
Task T065: Build the rich-text adapter.
Task T066: Build file selection and preview patterns.
```

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 mock entry.
3. Stop and validate `/login` independently, including session restore and corrupt storage.
4. Demonstrate the MVP before integrating the workspace shell.

### Incremental Delivery

1. **Foundation contracts**: source boundary, providers, services, state, navigation, shared states.
2. **US1**: accessible mock employee entry.
3. **US2**: reusable configuration-driven shell.
4. **US3**: persistent appearance and sidebar preferences.
5. **US4**: full RTL/responsive/accessibility acceptance.
6. **US5**: reusable design, form, table, and file-selection showcase.
7. **Polish**: architecture, performance, documentation, and full quality gates.

## Notes

- Mock permission filtering controls visibility only; it is not authorization.
- `packages/ui` remains app-agnostic; platform composites belong in `apps/web/src/shared`.
- Product, Batch, Student, Enrollment, and Payment models remain excluded until their business
  feature specifications define configurable rules and workflows.
- Recharts is installed as an approved stack dependency but no speculative business chart is
  required by this feature; a chart task must be added only if the specification is amended.
- Every task that changes Next.js routes or boundaries must consult the relevant repository-local
  guide in `node_modules/next/dist/docs/` before implementation.
