---
description: "Task list for Accounting implementation"
---

# Tasks: Accounting

**Input**: Design documents from `/specs/008-accounting/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/accounting-contracts.md),
[quickstart.md](./quickstart.md)

**Validation**: Every phase ends with typecheck, lint, and its own tests green. Business-rule, RTL,
responsive, and accessibility validation are explicit tasks, not assumed. Automated tests are
included because fourteen success criteria (SC-003, SC-004, SC-006, SC-007, SC-008, SC-010 in
particular) are assertions that cannot be demonstrated any other way.

**Organization**: Grouped by user story, in the spec's priority order, so each story is
independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1–US7 from [spec.md](./spec.md)
- Every task names its exact file path

## Path Conventions

Academy ERP web application. Feature module at `apps/web/src/features/accounting/`, routes at
`apps/web/src/app/(workspace)/accounting/`, tests at `apps/web/tests/{unit,contract,integration}/accounting/`
and `apps/web/playwright/`.

> **Two shared-layer changes are required** and appear as explicit tasks: T024–T026 promote the
> date-range and paging helpers to `shared/utils/list-query.ts` with Student Finance re-exporting,
> and T027–T029 extend the shared `DataTable` with named bulk actions. Both are additive, both are
> justified in [plan.md](./plan.md#complexity-tracking), and neither changes existing behaviour.
> Review those six tasks before starting Phase 2.

> **Ordering note**: the user's Task 1 (categories) maps to US4, which the spec prioritises P2 —
> below the P1 request and approval loop. Requests still need categories to exist, so Phase 2
> seeds them as fixtures and lookups (T038), while the category **management UI** is built in
> Phase 6. This keeps the spec's priorities honest without blocking Phase 3.

---

## Phase 1: Setup (Module Skeleton)

**Purpose**: Establish the module boundary, route skeleton, copy, permissions, and navigation.

- [X] T001 Create the Accounting feature directories (`components/`, `config/`, `data/`, `forms/`, `hooks/`, `schemas/`, `screens/`, `services/`, `types/`, `utils/`) and the public barrel in `apps/web/src/features/accounting/index.ts`
- [X] T002 [P] Create the route segment skeleton and Server Component notes in `apps/web/src/app/(workspace)/accounting/README.md`
- [X] T003 [P] Define centralized Arabic interface copy with stable status, action, and area keys in `apps/web/src/features/accounting/config/accounting-copy.ts`
- [X] T004 [P] Define Arabic copy for every `AccountingErrorCode` with **no generic fallback**, including `invalid-transition` naming the from/to statuses, in `apps/web/src/features/accounting/config/accounting-error-copy.ts`
- [X] T005 [P] Define the sixteen Accounting permission keys and their area/action mappings from the contracts in `apps/web/src/features/accounting/config/accounting-permissions.ts`
- [X] T006 [P] Define the permission-aware Accounting navigation contribution in `apps/web/src/features/accounting/config/navigation.ts`
- [X] T007 Register the navigation entry and an `accounting` icon in `apps/web/src/shared/config/foundation-navigation.ts` and `apps/web/src/shared/config/icon-registry.ts`
- [X] T008 [P] Add the sixteen Accounting permission keys to the mock roles in `apps/web/src/features/auth/data/auth-fixtures.ts`, with Executive Manager holding read keys only and no decision key
- [X] T009 [P] Create the dashboard route segment with `page.tsx`, `loading.tsx`, and `error.tsx` in `apps/web/src/app/(workspace)/accounting/`
- [X] T010 [P] Create the requests queue route segment with `page.tsx`, `loading.tsx`, and `error.tsx` in `apps/web/src/app/(workspace)/accounting/expense-requests/`
- [X] T011 [P] Create the create, detail, categories, and sub-categories route segments each with `page.tsx`, `loading.tsx`, and `error.tsx` under `apps/web/src/app/(workspace)/accounting/`
- [X] T012 Verify `npm run typecheck` and `npm run build` from the repository root `package.json` pass with the empty route skeleton in `apps/web/src/app/(workspace)/accounting/` before any feature code is written

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, policy, scope, service boundary, and mock store that every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Types and identifiers

- [X] T013 [P] Define branded identifiers, `ExpenseStatus`, `HistoryAction`, `AttachmentKind`, `CategoryStatus`, `Paginated`, and `LookupOption` in `apps/web/src/features/accounting/types/common.ts`
- [X] T014 [P] Define the domain entities — `ExpenseRequest`, `ExpenseCategory`, `ExpenseSubCategory`, `ExpenseAttachment`, `ApprovalDecision`, `HistoryEntry`, `ExpenseComment`, `AccountingConfiguration` — per [data-model.md](./data-model.md) in `apps/web/src/features/accounting/types/domain.ts`
- [X] T015 [P] Define the read projections — `ExpenseRequestSummary`, `ExpenseRequestDetail`, `AccountingAreaPermissions`, `AccountingDashboard`, `AccountingExportContext` — in `apps/web/src/features/accounting/types/projections.ts`
- [X] T016 [P] Define every command payload and list query from the contracts in `apps/web/src/features/accounting/types/commands.ts`
- [X] T017 Verify `ExpenseRequest` carries **no** `approvedAmount` field, so all-or-nothing approval is structural rather than validated, in `apps/web/src/features/accounting/types/domain.ts`

### Lifecycle policy

- [X] T018 [P] Unit test the transition policy — every legal transition, every illegal one, the note requirement on reject and return, and that no approval step is satisfiable by a non-decision permission — in `apps/web/tests/unit/accounting/expense-lifecycle.test.ts`
- [X] T019 Implement `expenseTransitionPolicy`, `transitionRule`, `allowedTransitions`, `isEditable`, and `isTerminal` in `apps/web/src/features/accounting/utils/expense-lifecycle.ts`
- [X] T020 Verify the four terminal statuses have no outgoing rows, so "paid cannot be edited" and "cancel only before approval" need no separate guard, in `apps/web/tests/unit/accounting/expense-lifecycle.test.ts`

### Scope, numbering, and money

- [X] T021 [P] Unit test scope evaluation — organization checked before branch, empty scope, and fingerprint stability across list order — in `apps/web/tests/unit/accounting/accounting-scope.test.ts`
- [X] T022 [P] Implement `AccountingServiceContext`, `isInScope`, `hasPermission`, and `buildScopeFingerprint` in `apps/web/src/features/accounting/utils/accounting-scope.ts`
- [X] T023 [P] Implement configurable request numbering in `apps/web/src/features/accounting/utils/accounting-numbering.ts` with unit tests in `apps/web/tests/unit/accounting/accounting-numbering.test.ts`

### Shared-layer change 1: list-query helpers

- [X] T024 Create `apps/web/src/shared/utils/list-query.ts` holding `isWithinRange`, `isInvertedRange`, `clampPage`, `normalizeSearchTerm`, and `serializeQuery`, moved verbatim from `apps/web/src/features/student-finance/utils/finance-list-query.ts`
- [X] T025 Re-export the moved helpers from `apps/web/src/features/student-finance/utils/finance-list-query.ts` so Student Finance's public surface is unchanged
- [X] T026 Confirm the entire Student Finance suite still passes unchanged after the promotion, and move the date-boundary unit cases to `apps/web/tests/unit/shared/list-query.test.ts`

### Shared-layer change 2: named bulk actions

- [X] T027 Integration test that the shared table renders one button per named bulk action, passes the selected rows to the right handler, and keeps the existing single-`onBulkAction` caller working, in `apps/web/tests/integration/shell/data-table-bulk-actions.test.tsx`
- [X] T028 Add the additive `bulkActions?: { id, label, run, disabled? }[]` prop alongside the existing `onBulkAction` in `apps/web/src/shared/components/data-table/data-table.tsx`
- [X] T029 Confirm every existing `DataTable` caller still compiles and passes untouched across `apps/web/src/features/{admissions,students,student-finance}/` and their suites in `apps/web/tests/`

### Service boundary and mock store

- [X] T030 [P] Define the `AccountingService` interface — ten reads and sixteen commands, each read taking an `AbortSignal` — in `apps/web/src/features/accounting/services/accounting-service.ts`
- [X] T031 [P] Define `AccountingError` with its closed code union and structured details in `apps/web/src/features/accounting/services/accounting-error.ts`
- [X] T032 [P] Define the reader ports for branches and the actor directory in `apps/web/src/features/accounting/services/accounting-dependency-readers.ts`
- [X] T033 Implement the adapters over Organization & Settings' **public** exports only in `apps/web/src/features/accounting/services/accounting-dependency-adapters.ts`
- [X] T034 [P] Define query keys with the scope fingerprint as the first variable segment, plus `invalidationTargets`, in `apps/web/src/features/accounting/services/accounting-query-keys.ts`
- [X] T035 Verify every request-mutating kind in `invalidationTargets` invalidates the dashboard key, so a figure can never disagree with the list beneath it, in `apps/web/tests/unit/accounting/accounting-query-keys.test.ts`
- [X] T036 [P] Implement the deterministic scenario controller — latency, per-area failure, forced conflict, fixed clock, permission set, branch scope, scale mode — in `apps/web/src/features/accounting/services/mock-scenario-controller.ts`
- [X] T037 Implement the mock store skeleton with per-entity lazy `Map` indexes including `requestById` and `categoryById`, invalidated on every write, in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T038 [P] Seed deterministic fixtures — six categories with sub-categories, three branches, and requests in every one of the eight statuses — in `apps/web/src/features/accounting/data/accounting-fixtures.ts`
- [X] T039 [P] Define service-supplied configuration — numbering pattern, accepted MIME types, maximum attachment bytes, currency, precision — in `apps/web/src/features/accounting/data/accounting-lookups.ts`
- [X] T040 [P] Implement the 20,000-request scale fixture generator in `apps/web/src/features/accounting/data/accounting-scale-fixtures.ts`

### History primitive

- [X] T041 [P] Unit test history ordering, the sequence tiebreak on identical timestamps, and chronological display order in `apps/web/tests/unit/accounting/accounting-history.test.ts`
- [X] T042 Implement `appendHistory` as the single private writer plus `sortHistory` and `nextSequence` in `apps/web/src/features/accounting/utils/accounting-history.ts`
- [X] T043 Verify the service exposes no update or delete for history and that no command accepts a `HistoryEntryId`, in `apps/web/src/features/accounting/services/accounting-service.ts`

### Shared UI states

- [X] T044 [P] Implement the permission gate, area state, and bidi-isolation wrappers in `apps/web/src/features/accounting/components/accounting-area-states.tsx`
- [X] T045 Run typecheck, lint, and the Phase 2 unit tests in `apps/web/tests/unit/accounting/` from the repository root `package.json`; confirm all green before starting Phase 3

**Checkpoint**: Types, policy, scope, service boundary, and mock store are in place. User stories can now proceed.

---

## Phase 3: User Story 1 — Raise and Submit an Expense Request (Priority: P1)

**Goal**: A branch can record, document, and submit a request for spending.

**Independent Test**: Create a draft, edit it, attach a document, submit it, and confirm the
figures, category, and attachments survive intact and the request becomes uneditable.

### Tests for User Story 1

- [X] T046 [P] [US1] Unit test the request schema — required fields, positive amount, decimal precision, and sub-category-belongs-to-category — in `apps/web/tests/unit/accounting/expense-request-schema.test.ts`
- [X] T047 [P] [US1] Unit test attachment validation against the configured accepted types and maximum size in `apps/web/tests/unit/accounting/attachment-rules.test.ts`
- [X] T048 [P] [US1] Contract test that a created request carries a unique number, names its requester, and starts as Draft, in `apps/web/tests/contract/accounting/request-creation.test.ts`
- [X] T049 [P] [US1] Contract test that a Draft is editable and a Submitted request is not, for every non-editable status, in `apps/web/tests/contract/accounting/request-editability.test.ts`
- [X] T050 [P] [US1] Contract test that submission is refused for a missing field, a zero amount, a negative amount, and an inactive category — each leaving the request untouched — in `apps/web/tests/contract/accounting/request-submission.test.ts`
- [X] T051 [P] [US1] Contract test that an attachment retry with the same `uploadAttempt` produces one attachment, not two, in `apps/web/tests/contract/accounting/attachment-idempotency.test.ts`
- [X] T052 [P] [US1] Integration test for the create form — live validation, refusal messages, and first-invalid-field focus — in `apps/web/tests/integration/accounting/request-form.test.tsx`

### Implementation for User Story 1

- [X] T053 [P] [US1] Implement the Zod request schema, authored once and used by both the form and the service, in `apps/web/src/features/accounting/schemas/expense-request-schemas.ts`
- [X] T054 [P] [US1] Implement attachment type and size validation reading the configured policy in `apps/web/src/features/accounting/utils/attachment-rules.ts`
- [X] T055 [US1] Implement `createRequest` with numbering, requester denormalization, and the initial `created` history entry in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T056 [US1] Implement `updateRequest` guarded by `isEditable`, with permission checked before version, in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T057 [US1] Implement `submitRequest` validating the whole request before the transition, in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T058 [US1] Implement `cancelRequest` requiring a reason and refused once approved, in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T059 [US1] Implement `uploadAttachment` checking the idempotency key **before** the version assert (research R6) in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T060 [US1] Implement `removeAttachment`, legal only while the request is editable, in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T061 [US1] Implement `getRequest` returning the detail projection with `derived` and `permissions` in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T062 [P] [US1] Implement the `useRequest`, `useCreateRequest`, `useUpdateRequest`, and `useSubmitRequest` hooks with invalidation in `apps/web/src/features/accounting/hooks/use-expense-requests.ts`
- [X] T063 [P] [US1] Implement the `useUploadAttachment` and `useRemoveAttachment` hooks in `apps/web/src/features/accounting/hooks/use-attachments.ts`
- [X] T064 [P] [US1] Implement the request form — date, branch, category, sub-category, description, amount — using the shared field components and the shared currency field in `apps/web/src/features/accounting/forms/expense-request-form.tsx`
- [X] T065 [US1] Implement clearing an inconsistent sub-category when the main category changes, in `apps/web/src/features/accounting/forms/expense-request-form.tsx`
- [X] T066 [P] [US1] Implement the attachment panel using the shared dropzone and file preview, with per-file refusal messages naming the accepted types and the size limit, in `apps/web/src/features/accounting/components/attachment-panel.tsx`
- [X] T067 [P] [US1] Implement the expense status badge with text labels and decorative tone only, in `apps/web/src/features/accounting/components/expense-status-badge.tsx`
- [X] T068 [US1] Implement the create screen in `apps/web/src/features/accounting/screens/create-expense-request-screen.tsx` and wire the route in `apps/web/src/app/(workspace)/accounting/expense-requests/create/page.tsx`
- [X] T069 [US1] Implement the request detail screen with its information, expense, and attachment sections in `apps/web/src/features/accounting/screens/expense-request-detail-screen.tsx`
- [X] T070 [US1] Implement the submit and cancel dialogs, the cancel dialog requiring a real reason and never substituting a placeholder, in `apps/web/src/features/accounting/components/request-action-dialogs.tsx`
- [X] T071 [US1] Wire the detail route in `apps/web/src/app/(workspace)/accounting/expense-requests/[requestId]/page.tsx`
- [X] T072 [US1] Record US1 evidence — numbering, editability, refusals, attachment idempotency — in `specs/008-accounting/validation/us1-requests.md`

**Checkpoint**: A branch can raise, document, and submit a request end to end.

---

## Phase 4: User Story 2 — Review, Approve, Reject, or Return (Priority: P1)

**Goal**: Finance can work the queue and decide each request.

**Independent Test**: Submit three requests; approve one, reject one, return one — confirming each
decision records its actor, time, and note, and that only the returned one becomes editable again.

### Tests for User Story 2

- [X] T073 [P] [US2] Contract test that opening a request's detail does **not** change its status, and that only `startReview` does (research R2), in `apps/web/tests/contract/accounting/review-start.test.ts`
- [X] T074 [P] [US2] Contract test each decision — approve, reject, return — recording decision, note, time, and actor, in `apps/web/tests/contract/accounting/request-decisions.test.ts`
- [X] T075 [P] [US2] Contract test that reject and return each refuse an empty or whitespace-only note while approve does not require one, in `apps/web/tests/contract/accounting/decision-notes.test.ts`
- [X] T076 [P] [US2] Contract test that a returned request becomes editable and resubmittable, and that both transitions appear in the history, in `apps/web/tests/contract/accounting/return-resubmit.test.ts`
- [X] T077 [P] [US2] Contract test that decision authority is distinct — granting each neighbouring permission in turn and asserting the decision is still refused — in `apps/web/tests/contract/accounting/decision-permissions.test.ts`
- [X] T078 [P] [US2] Contract test that an Executive Manager holding every read key can decide nothing, in `apps/web/tests/contract/accounting/oversight-without-authority.test.ts`
- [X] T079 [P] [US2] Contract test that two simultaneous decisions produce exactly one winner and one `version-conflict`, with no history entry for the loser (SC-008), in `apps/web/tests/contract/accounting/decision-concurrency.test.ts`
- [X] T080 [P] [US2] Integration test that the decision panel offers exactly the transitions the policy allows for the current status and the acting user, in `apps/web/tests/integration/accounting/decision-panel.test.tsx`

### Implementation for User Story 2

- [X] T081 [US2] Implement `startReview` as its own command recording the reviewer, in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T082 [US2] Implement `decideRequest` evaluating the policy table, with permission checked before version (research R5), in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T083 [US2] Implement the note requirement driven by the policy table rather than by a per-decision conditional, in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T084 [US2] Implement the returned-request editability path so a Returned request re-enters the US1 edit flow unchanged, in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T085 [US2] Implement `invalid-transition` carrying `{ from, to }` so the message says why an action is unavailable rather than only refusing, in `apps/web/src/features/accounting/services/accounting-error.ts`
- [X] T086 [P] [US2] Implement the `useStartReview` and `useDecideRequest` hooks with invalidation in `apps/web/src/features/accounting/hooks/use-request-decisions.ts`
- [X] T087 [P] [US2] Implement the decision form — decision, note, live note requirement — in `apps/web/src/features/accounting/forms/decision-form.tsx`
- [X] T088 [US2] Implement the decision panel deriving its actions from `derived.availableTransitions` rather than hardcoding per status, in `apps/web/src/features/accounting/components/decision-panel.tsx`
- [X] T089 [US2] Implement the decision dialog with focus management and first-invalid-field focus in `apps/web/src/features/accounting/components/decision-dialog.tsx`
- [X] T090 [US2] Mount the decision panel in the request detail screen, gated by permission, in `apps/web/src/features/accounting/screens/expense-request-detail-screen.tsx`
- [X] T091 [US2] Record US2 evidence — the review-start read/write separation, note requirements, separated authority, concurrency — in `specs/008-accounting/validation/us2-approvals.md`

**Checkpoint**: The full review loop works. Combined with US1 this is the module's MVP.

---

## Phase 5: User Story 3 — Read a Request's Full History (Priority: P1)

**Goal**: Every request carries a complete, immutable, chronological record of what happened to it.

**Independent Test**: Drive one request through create → submit → review → return → resubmit →
approve → paid and confirm one immutable entry per transition, in order, and none for refusals.

### Tests for User Story 3

- [X] T092 [P] [US3] Contract test that **exactly one** history entry is written per successful command, covering create, submit, start-review, approve, reject, return, resubmit, cancel, and mark-paid, in `apps/web/tests/contract/accounting/history-per-command.test.ts`
- [X] T093 [P] [US3] Contract test that **no** history entry is written for a refused command — stale version, missing permission, out of scope, illegal transition, missing note, invalid field — in `apps/web/tests/contract/accounting/history-on-refusal.test.ts`
- [X] T094 [P] [US3] Contract test that every entry carries action, previous status, new status, actor, time, and note, and that `fromStatus` is null only for `created`, in `apps/web/tests/contract/accounting/history-shape.test.ts`
- [X] T095 [P] [US3] Contract test that the service surface exposes no history mutation and that a caller mutating a returned projection cannot reach the store (SC-004), in `apps/web/tests/contract/accounting/history-immutability.test.ts`
- [X] T096 [P] [US3] Integration test that the timeline renders chronologically with Arabic action labels, actors, and notes, in `apps/web/tests/integration/accounting/request-timeline.test.tsx`

### Implementation for User Story 3

- [X] T097 [US3] Implement `listHistory` returning deep-cloned entries in chronological order in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T098 [US3] Verify every command writes its history entry inside the same operation as its transition, never as a separate step, across `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T099 [P] [US3] Implement the history action-to-copy, icon, and tone mapping, drawing labels from the single copy module, in `apps/web/src/features/accounting/components/history-mapping.ts`
- [X] T100 [P] [US3] Implement the `useRequestHistory` hook in `apps/web/src/features/accounting/hooks/use-request-history.ts`
- [X] T101 [US3] Implement the approval timeline using the shared timeline component, showing previous → new status per entry, in `apps/web/src/features/accounting/components/approval-timeline.tsx`
- [X] T102 [P] [US3] Implement the comments panel, visually and structurally distinct from the history, in `apps/web/src/features/accounting/components/comments-panel.tsx`
- [X] T103 [P] [US3] Implement `addComment` and `listComments` plus the `useComments` hook in `apps/web/src/features/accounting/services/mock-accounting-service.ts` and `apps/web/src/features/accounting/hooks/use-comments.ts`
- [X] T104 [US3] Mount the timeline and comments in the request detail screen in `apps/web/src/features/accounting/screens/expense-request-detail-screen.tsx`
- [X] T105 [US3] Record US3 evidence — one entry per success, none per refusal, immutability, ordering — in `specs/008-accounting/validation/us3-history.md`

**Checkpoint**: All three P1 stories complete. The module is auditable.

---

## Phase 6: User Story 4 — Configure Categories and Sub-Categories (Priority: P2)

**Goal**: Administrators maintain the categories requests are recorded under.

**Independent Test**: Create, edit, archive, and reactivate a category and a sub-category, and
confirm an archived category leaves the pickers while staying visible on existing requests.

### Tests for User Story 4

- [X] T106 [P] [US4] Unit test the category and sub-category schemas including name uniqueness scope in `apps/web/tests/unit/accounting/category-schema.test.ts`
- [X] T107 [P] [US4] Contract test the full category lifecycle — create, edit, archive, reactivate — with duplicate names refused, in `apps/web/tests/contract/accounting/category-lifecycle.test.ts`
- [X] T108 [P] [US4] Contract test that an archived category leaves the pickers **and remains resolvable for display** on requests that reference it (research R7), in `apps/web/tests/contract/accounting/category-archival.test.ts`
- [X] T109 [P] [US4] Contract test that archiving a parent removes its sub-categories from the choices without changing their own status, in `apps/web/tests/contract/accounting/subcategory-parent-archival.test.ts`
- [X] T110 [P] [US4] Contract test that a sub-category not belonging to the submitted category is refused, in `apps/web/tests/contract/accounting/subcategory-consistency.test.ts`
- [X] T111 [P] [US4] Integration test the category and sub-category management screens including the parent selector in `apps/web/tests/integration/accounting/category-management.test.tsx`

### Implementation for User Story 4

- [X] T112 [P] [US4] Implement the category and sub-category Zod schemas in `apps/web/src/features/accounting/schemas/category-schemas.ts`
- [X] T113 [US4] Implement `createCategory`, `updateCategory`, and `setCategoryStatus` with uniqueness enforcement in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T114 [US4] Implement `createSubCategory`, `updateSubCategory`, and `setSubCategoryStatus` with parent validation in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T115 [US4] Implement `listCategories` with `activeOnly` for pickers and `resolveCategory` for display — the two distinct reads — in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T116 [US4] Implement `listSubCategories` filtered by parent and status in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T117 [P] [US4] Implement the `useCategories`, `useSubCategories`, and their mutation hooks in `apps/web/src/features/accounting/hooks/use-categories.ts`
- [X] T118 [P] [US4] Implement the category form and the sub-category form with its parent selector in `apps/web/src/features/accounting/forms/category-form.tsx` and `apps/web/src/features/accounting/forms/sub-category-form.tsx`
- [X] T119 [P] [US4] Implement the category and sub-category table columns with status badges in `apps/web/src/features/accounting/components/category-columns.tsx`
- [X] T120 [US4] Implement the categories screen with search, status filter, and pagination in `apps/web/src/features/accounting/screens/expense-categories-screen.tsx`
- [X] T121 [US4] Implement the sub-categories screen with parent filter, search, and pagination in `apps/web/src/features/accounting/screens/expense-sub-categories-screen.tsx`
- [X] T122 [US4] Wire both routes in `apps/web/src/app/(workspace)/accounting/expense-categories/page.tsx` and `apps/web/src/app/(workspace)/accounting/expense-sub-categories/page.tsx`
- [X] T123 [US4] Record US4 evidence — archival semantics, parent cascade, uniqueness, consistency — in `specs/008-accounting/validation/us4-categories.md`

**Checkpoint**: Categories are administrable without touching code.

---

## Phase 7: User Story 5 — Mark an Approved Request as Paid (Priority: P2)

**Goal**: Payment is recorded as its own fact, distinct from approval.

**Independent Test**: Approve a request and mark it paid; confirm no other status can be marked
paid and that a paid request accepts no further change.

### Tests for User Story 5

- [X] T124 [P] [US5] Contract test that marking paid succeeds only from Approved and is refused from all seven other statuses (SC-006) in `apps/web/tests/contract/accounting/mark-paid.test.ts`
- [X] T125 [P] [US5] Contract test that `markPaid` requires its own permission, refused for a user holding `decide` but not `markPaid` (FR-027), in `apps/web/tests/contract/accounting/mark-paid-permission.test.ts`
- [X] T126 [P] [US5] Contract test that a Paid request refuses every modification — edit, decide, cancel, attachment change (SC-007) — in `apps/web/tests/contract/accounting/paid-immutability.test.ts`
- [X] T127 [P] [US5] Integration test that the mark-paid action appears only on an Approved request for a permitted user in `apps/web/tests/integration/accounting/mark-paid-action.test.tsx`

### Implementation for User Story 5

- [X] T128 [US5] Implement `markPaid` recording `paidAt` and its history entry in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T129 [P] [US5] Implement the `useMarkPaid` hook in `apps/web/src/features/accounting/hooks/use-request-decisions.ts`
- [X] T130 [US5] Implement the mark-paid confirmation dialog stating that this records a payment made elsewhere, in `apps/web/src/features/accounting/components/mark-paid-dialog.tsx`
- [X] T131 [US5] Record US5 evidence — approved-only, separate authority, terminal immutability — in `specs/008-accounting/validation/us5-payment.md`

**Checkpoint**: The lifecycle is complete from draft to paid.

---

## Phase 8: User Story 6 — Find Requests Across Branches (Priority: P2)

**Goal**: The queue is usable across many branches with composing filters and enforced scope.

**Independent Test**: Apply each filter alone and combined, confirm the result narrows correctly,
and confirm an empty result distinguishes "nothing matched" from "nothing exists".

### Tests for User Story 6

- [X] T132 [P] [US6] Unit test list-query normalization, clamping, and search normalization for the request queue in `apps/web/tests/unit/accounting/accounting-list-query.test.ts`
- [X] T133 [P] [US6] Contract test that every filter composes and that each narrows the result correctly in `apps/web/tests/contract/accounting/request-filters.test.ts`
- [X] T134 [P] [US6] Contract test that a date range includes both its first and last day, including a single-day range matching a request recorded at any time that day, in `apps/web/tests/contract/accounting/date-range-filters.test.ts`
- [X] T135 [P] [US6] Contract test that an inverted range is refused rather than silently returning nothing, in `apps/web/tests/contract/accounting/date-range-filters.test.ts`
- [X] T136 [P] [US6] Contract test branch scope on the list, the detail, the export, and every command — with an out-of-scope direct read refused as forbidden, not empty (SC-010, FR-048) — in `apps/web/tests/contract/accounting/accounting-scope.test.ts`
- [X] T137 [P] [US6] Contract test that `exportRequests` requires its own permission and applies the same scope and filters as the list it mirrors, in `apps/web/tests/contract/accounting/export.test.ts`
- [X] T138 [P] [US6] Integration test the queue toolbar, empty states, and paging clamping in `apps/web/tests/integration/accounting/request-queue.test.tsx`
- [X] T139 [P] [US6] Integration test the bulk actions — named buttons, per-permission availability, and per-row outcome reporting rather than a silent partial failure — in `apps/web/tests/integration/accounting/request-bulk-actions.test.tsx`

### Implementation for User Story 6

- [X] T140 [P] [US6] Implement request list-query normalization and defaults on top of the shared helpers in `apps/web/src/features/accounting/utils/accounting-list-query.ts`
- [X] T141 [US6] Implement `listRequests` with filtering, sorting, and paging — using the by-id indexes and computing sort keys once per row (research R11) — in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T142 [US6] Implement `exportRequests` sharing the list's scope and filter path in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T143 [P] [US6] Implement the `useRequests` and `useExportRequests` hooks in `apps/web/src/features/accounting/hooks/use-expense-requests.ts`
- [X] T144 [P] [US6] Implement the request table columns with status badges, amounts, and attachment counts in `apps/web/src/features/accounting/components/request-columns.tsx`
- [X] T145 [P] [US6] Implement the filter toolbar sourcing every option from lookups, with an active-filter count and a clear-all control, in `apps/web/src/features/accounting/components/request-filter-toolbar.tsx`
- [X] T146 [US6] Implement the requests queue screen with the shared table, named bulk actions, and empty states distinguishing filtered from empty, in `apps/web/src/features/accounting/screens/expense-requests-screen.tsx`
- [X] T147 [US6] Wire the queue route in `apps/web/src/app/(workspace)/accounting/expense-requests/page.tsx`
- [X] T148 [US6] Record US6 evidence — filter composition, inclusive ranges, scope enforcement, bulk-action behaviour — in `specs/008-accounting/validation/us6-discovery.md`

**Checkpoint**: The queue scales across branches with enforced scope.

---

## Phase 9: User Story 7 — See the Organization's Expense Picture (Priority: P3)

**Goal**: A dashboard whose every figure equals what the equivalent filtered list reports.

**Independent Test**: With requests across statuses, branches, and categories, confirm each
dashboard figure equals the total the corresponding filtered list returns.

### Tests for User Story 7

- [X] T149 [P] [US7] Contract test that every dashboard count equals the total the equivalent filtered list returns, across statuses, branches, and categories (SC-005), in `apps/web/tests/contract/accounting/dashboard-parity.test.ts`
- [X] T150 [P] [US7] Contract test that the monthly total and the by-branch and by-category breakdowns each sum to the same figure the filtered list sums, in `apps/web/tests/contract/accounting/dashboard-totals.test.ts`
- [X] T151 [P] [US7] Contract test that the dashboard narrows with branch scope exactly as the lists do, in `apps/web/tests/contract/accounting/dashboard-scope.test.ts`
- [X] T152 [P] [US7] Contract test that an organization with no records reports `hasNoRecords` rather than zeroes (FR-045) in `apps/web/tests/contract/accounting/dashboard-empty.test.ts`
- [X] T153 [P] [US7] Integration test the dashboard cards, breakdowns, recent requests, and quick actions in `apps/web/tests/integration/accounting/dashboard.test.tsx`

### Implementation for User Story 7

- [X] T154 [US7] Implement `getDashboard` deriving every figure from the same filter-and-count path the lists use, with no separate aggregation code (research R9), in `apps/web/src/features/accounting/services/mock-accounting-service.ts`
- [X] T155 [P] [US7] Implement the `useDashboard` hook in `apps/web/src/features/accounting/hooks/use-dashboard.ts`
- [X] T156 [P] [US7] Implement the summary cards for pending, approved, rejected, and paid using the shared stat card in `apps/web/src/features/accounting/components/dashboard-summary-cards.tsx`
- [X] T157 [P] [US7] Implement the by-branch and by-category breakdowns with Recharts, each figure also readable as text in `apps/web/src/features/accounting/components/expense-breakdowns.tsx`
- [X] T158 [P] [US7] Implement the recent-requests panel linking into the detail screen in `apps/web/src/features/accounting/components/recent-requests.tsx`
- [X] T159 [P] [US7] Implement permission-aware quick actions in `apps/web/src/features/accounting/components/dashboard-quick-actions.tsx`
- [X] T160 [US7] Implement the dashboard screen and wire `apps/web/src/app/(workspace)/accounting/page.tsx`
- [X] T161 [US7] Record US7 evidence — figure/list parity, scope narrowing, empty-versus-zero — in `specs/008-accounting/validation/us7-dashboard.md`

**Checkpoint**: All seven user stories complete.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Integration, boundaries, review, and final verification.

### Module boundaries and integration

- [X] T162 Verify the public barrel exports only the documented surface and that no other feature imports Accounting internals, in `apps/web/src/features/accounting/index.ts`
- [X] T163 Verify Accounting reads sibling modules only through its own ports, with no fixture, schema, hook, or component import across a boundary, in `apps/web/src/features/accounting/services/accounting-dependency-adapters.ts`
- [X] T164 Verify no import of `@/features/student-finance` exists anywhere under `apps/web/src/features/accounting/`, and none of `@/features/accounting` under `student-finance`
- [X] T165 [P] Implement `getAccountingExportContext` returning settled facts and identities only, with a contract test asserting the exact field set so an added field fails, in `apps/web/tests/contract/accounting/export-context.test.ts`
- [X] T166 [P] Verify no floating-point operator touches a money value anywhere under `apps/web/src/features/accounting/`

### Configuration and permissions

- [X] T167 [P] Verify numbering, accepted attachment types, maximum size, currency, precision, categories, and sub-categories remain service-supplied and are hardcoded nowhere under `apps/web/src/features/accounting/`
- [X] T168 [P] Verify segregation of duties — submit, review, decide, mark-paid, cancel, and manage-categories each require a distinct key — in `apps/web/src/features/accounting/config/accounting-permissions.ts`
- [X] T169 [P] Verify every permission-denied and out-of-scope state renders forbidden rather than empty across all eight routes under `apps/web/src/app/(workspace)/accounting/`

### Review and evidence

- [X] T170 [P] Verify Server Component defaults, client-boundary minimality, and per-route `loading.tsx`/`error.tsx` coverage; record findings in `specs/008-accounting/validation/performance.md`
- [X] T171 [P] Verify Arabic copy completeness and RTL-native behaviour across the queue, detail, forms, dialogs, categories, and dashboard; record findings in `specs/008-accounting/validation/rtl-accessibility.md`
- [X] T172 [P] Verify bidi isolation for every amount, request number, date, and file size under `apps/web/src/features/accounting/`
- [X] T173 [P] Verify desktop, laptop, and tablet behaviour plus 200% zoom with no horizontal page scroll; record findings in `specs/008-accounting/validation/responsive.md`
- [X] T174 [P] Verify keyboard traversal, dialog focus trapping and return, first-error focus in every form, and non-colour status encoding; record findings in `specs/008-accounting/validation/rtl-accessibility.md`
- [X] T175 [P] Verify AI, tenant, audit, workflow, and backend extension boundaries; record findings in `specs/008-accounting/validation/future-readiness.md`

### Performance

- [ ] T176 [P] Implement the 20,000-request scale suite measuring p95 for paging, search, combined filters, sorting by amount and date, the dashboard, and export, printing each figure, in `apps/web/tests/unit/accounting/accounting-list-scale.test.ts`
- [ ] T177 Measure and record the 20,000-request timings against SC-009 in `specs/008-accounting/validation/performance.md`

### End-to-end

- [ ] T178 [P] Add shared Playwright helpers for accounting fixtures, scenarios, and scoped contexts in `apps/web/playwright/helpers/accounting.ts`
- [ ] T179 [P] Add the request lifecycle journey in `apps/web/playwright/journeys/accounting-expense-requests.spec.ts`
- [ ] T180 [P] Add the approval workflow journey including return, resubmit, and mark-paid in `apps/web/playwright/journeys/accounting-approval.spec.ts`
- [ ] T181 [P] Add the categories, dashboard, and integration journey in `apps/web/playwright/journeys/accounting-integration.spec.ts`
- [ ] T182 [P] Add axe and keyboard suites in `apps/web/playwright/accessibility/accounting-a11y.spec.ts` and `apps/web/playwright/accessibility/accounting-keyboard.spec.ts`

### Cleanup and final gates

- [X] T183 Remove dead code, unify component naming with sibling features, and confirm no duplicated UI implementation under `apps/web/src/features/accounting/`
- [X] T184 Run `npm run typecheck && npm run lint && npm run test && npm run build` from the repository root `package.json`, resolving every failure
- [ ] T185 Run `npm run test:e2e` from the repository root `package.json` against the suites in `apps/web/playwright/`, resolving every failure
- [ ] T186 Execute every scenario in [quickstart.md](./quickstart.md) and record the results in `specs/008-accounting/validation/constitution.md`
- [X] T187 Confirm the Student Finance and shared-component suites still pass after the two cross-cutting changes, in `apps/web/tests/` and `apps/web/src/shared/components/data-table/`

---

## Dependencies

```text
Phase 1 Setup
   ↓
Phase 2 Foundational  ← blocks everything
   ↓
Phase 3 US1 (P1)  Raise & Submit           ← MVP starts here
   ↓
Phase 4 US2 (P1)  Review & Decide          ← needs US1 to have something to review
   ↓
Phase 5 US3 (P1)  History                  ← records US1 + US2 transitions
   ↓
Phase 6 US4 (P2)  Categories        ─┐
Phase 7 US5 (P2)  Mark Paid          ├─ independent of one another
Phase 8 US6 (P2)  Discovery         ─┘
   ↓
Phase 9 US7 (P3)  Dashboard                ← needs real data from all of the above
   ↓
Phase 10 Polish
```

**Story dependencies**

- **US1** depends only on Phase 2.
- **US2** depends on US1 — there is nothing to review otherwise.
- **US3** depends on US1 and US2 for transitions to record, though the history primitive itself
  lands in Phase 2 (T041–T043) so every command writes history from its first commit rather than
  having it retrofitted.
- **US4**, **US5**, and **US6** are independent of each other and can proceed in any order once
  US1–US3 are done. US4's *fixtures* are already seeded in Phase 2, so US1 is never blocked on it.
- **US7** depends on all of the above having produced real data — building it earlier means
  building it against nothing.

## Parallel Execution Examples

**Phase 2** — T013–T016 (four type files), T018/T021/T023/T041 (four unit test files), and
T030–T032/T034/T036/T038–T040 (independent service and data files) each run together.

**Phase 3 (US1)** — all seven test tasks T046–T052 run in parallel; then T053/T054 together,
then T062–T064/T066/T067 together once the service commands land.

**Phase 4 (US2)** — all eight test tasks T073–T080 in parallel; T086/T087 together afterwards.

**Phase 8 (US6)** — all eight test tasks T132–T139 in parallel; T140/T143–T145 together.

**Phase 10** — the entire review block T166–T175 and the whole e2e block T178–T182 are parallel.

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + Phase 3 (US1)**. A branch can raise, document, and submit an expense
request, and every transition is already being recorded. That is genuinely useful on its own even
before Finance can act.

**First complete loop = + Phase 4 (US2)**. Requests can be decided. This is the smallest thing
worth demonstrating to a finance department.

**Auditable = + Phase 5 (US3)**. History is P1 and lands early on purpose: a trustworthy record
cannot be added after the workflow has already run without it.

**Then** US4, US5, US6 in whatever order suits, US7 last, polish throughout.

Every phase ends green — typecheck, lint, and that phase's tests — so the module is always in a
shippable state rather than accumulating a debt to be settled at the end.
