# Tasks: Expense Management Module

**Input**: Design documents from `/specs/010-expense-management/`

**Prerequisites**: [plan.md](plan.md) (tech stack: NestJS, Prisma, PostgreSQL), [spec.md](spec.md) (6 user stories), [data-model.md](data-model.md) (3 entities), [contracts/expenses-api.md](contracts/expenses-api.md) (11 endpoints)

**Tests**: Integration tests for each user story are included to enable independent testing of each feature increment

**Organization**: Tasks organized by user story (P1 → P2 → P3) to enable independent implementation, testing, and delivery of each increment

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no inter-task dependencies)
- **[Story]**: User story label (US1-US6) for story phase tasks; omitted for Setup/Foundational phases
- **File Paths**: Exact paths for all deliverables

---

> **Rebuild reconciliation — 2026-08-06.** Every task below was re-verified
> against the code that now exists rather than trusted from its checkbox.
> Tasks whose deliverable landed at a different path than predicted keep `[X]`
> with the real path. Tasks left open are genuine gaps — integration/E2E
> suites, performance and scale runs, lint, and the manual quickstart
> scenarios — plus a few files the architecture deliberately does not need
> (hand-written entity classes, a base repository, and a module-local guard,
> since Prisma types, per-repository transactions and the global `APP_GUARD`
> already cover them). All 11 contract endpoints are implemented, mounted at
> the correct paths, permission-guarded, and covered by the surface contract
> test.

## Phase 1: Setup (Project Initialization)

**Purpose**: Create project structure and initialize NestJS accounting module

- [x] T001 Create accounting module directory structure in `src/modules/accounting/`
- [x] T002 Create module files: `accounting.module.ts`, `index.ts`
- [x] T003 [P] Create subdirectories: `controllers/`, `services/`, `repositories/`, `dtos/`, `entities/`, `types/`, `policies/`, `mappers/`, `events/`, `__tests__/`
- [x] T004 Register accounting module in `src/app.module.ts`

**Checkpoint**: Module scaffolding complete; ready for foundational layer implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement core infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: Must complete before ANY user story implementation begins

### Prisma Schema & Database

- [x] T005 Create Prisma migration for Expense tables in `prisma/migrations/[timestamp]_add_accounting_tables/`
- [x] T006 Define `ExpenseRequest` model in `prisma/schema.prisma` with all fields and indexes
- [x] T007 [P] Define `ExpenseAttachment` model in `prisma/schema.prisma` with file metadata
- [x] T008 [P] Define `ExpenseApprovalHistory` model in `prisma/schema.prisma` (immutable)
- [X] T009 Run `npm run prisma:generate` and `npm run prisma:migrate` to apply schema

### Entity & DTO Definitions

- [ ] T010 [P] Create `ExpenseRequest` entity in `src/modules/accounting/entities/expense-request.entity.ts`
- [ ] T011 [P] Create `ExpenseAttachment` entity in `src/modules/accounting/entities/expense-attachment.entity.ts`
- [ ] T012 [P] Create `ExpenseApprovalHistory` entity in `src/modules/accounting/entities/expense-approval-history.entity.ts`
- [x] T013 Create base DTOs for responses in `src/modules/accounting/dtos/` (shared response shapes)

### Type Definitions & Constants

- [x] T014 Create expense status enums in `src/modules/accounting/types/expense.types.ts` (Draft, Submitted, UnderReview, Approved, Rejected, Returned, Archived)
- [X] T015 [P] Create approval action enums in `src/modules/accounting/types/approval-workflow.types.ts` (Create, Submit, Review, Approve, Reject, Return, Archive)
- [ ] T016 [P] Create service port interfaces in `src/modules/accounting/types/expense.port.ts`

### Repositories (Data Access Layer)

- [ ] T017 Create base repository in `src/modules/accounting/repositories/base.repository.ts` (transaction support per constitution XI)
- [x] T018 Create `ExpenseRequest` repository in `src/modules/accounting/repositories/expenses.repository.ts` (CRUD, search, filter, soft delete)
- [x] T019 [P] Create `ExpenseAttachment` repository in `src/modules/accounting/repositories/attachments.repository.ts` (upload metadata, idempotency)
- [x] T020 [P] Create `ExpenseApprovalHistory` repository in `src/modules/accounting/repositories/approval-history.repository.ts` (immutable insert-only)

### Services (Business Logic Layer)

- [x] T021 Create `ExpenseService` base in `src/modules/accounting/services/expenses.service.ts` (CRUD operations, transaction wrapper)
- [x] T022 Create `ExpenseApprovalService` in `src/modules/accounting/services/expense-approvals.service.ts` (workflow transitions, state machine)
- [x] T023 [P] Create `ExpenseSearchService` in `src/modules/accounting/services/expense-search.service.ts` (search, filter, sort, pagination)
- [x] T024 [P] Create `ExpenseEventEmitter` in `src/modules/accounting/events/expense.events.ts` (domain event emission for audit)

### DTOs & Validation

- [x] T025 [P] Create request DTOs in `src/modules/accounting/dtos/create-expense.dto.ts`, `update-expense.dto.ts`, `approve-expense.dto.ts` with class-validator decorators
- [X] T026 [P] Create query DTOs in `src/modules/accounting/dtos/expense-query.dto.ts` (pagination, filters, search)
- [x] T027 [P] Create response DTOs in `src/modules/accounting/dtos/expense.response.dto.ts` (includes permissions per constitution)

### Authorization & Policies

- [X] T028 Create permission policy in `src/modules/accounting/policies/expenses.policy.ts` (expenses.create, expenses.approve, etc.)
- [ ] T029 Create expense authorization guard in `src/modules/accounting/guards/expense.guard.ts` (permission checks, branch scoping)

### Mappers & Utilities

- [x] T030 Create entity-to-DTO mapper in `src/modules/accounting/mappers/expense.mapper.ts` (entity → response DTO with permissions)
- [X] T031 [P] Create expense number generator in `src/modules/accounting/services/expenses.service.ts (allocateExpenseNumber)` (auto-generate EXP-XXX-YYYY-MM-DD)

### Integration with Shared Services

- [x] T032 Integrate with Organization reference service for category validation in `src/modules/accounting/services/expenses.service.ts`
- [X] T033 [P] Integrate with storage service for attachment handling in `src/modules/accounting/services/expense-attachments.service.ts`
- [x] T034 Integrate with permission guard for authorization in controllers

**Checkpoint**: Foundation complete - Expense Service, Repositories, and base DTOs ready. User story implementation can now proceed in parallel or sequentially

---

## Phase 3: User Story 1 - Employee Submits Expense Request (Priority: P1) 🎯 MVP

**Goal**: Employees can create expense requests in Draft status, manage them, and submit to Finance

**Independent Test**: Create expense → update draft → add attachment → submit → verify status transitions

### DTOs for User Story 1

- [X] T035 [US1] Create/export request DTOs in `src/modules/accounting/dtos/create-expense.dto.ts` (required fields: branchId, categoryId, subcategoryId, expenseDate, description, amount, currency)
- [X] T036 [US1] Create update DTO in `src/modules/accounting/dtos/update-expense.dto.ts` (with expectedVersion for optimistic concurrency)

### Services for User Story 1

- [X] T037 [US1] Implement `createExpense()` method in `src/modules/accounting/services/expenses.service.ts` (generate expenseNumber, save to DB, emit event)
- [X] T038 [US1] Implement `updateExpenseRequest()` method (allow updates only in Draft/Returned status, version increment, transaction)
- [X] T039 [US1] Implement `getExpenseRequest()` method with permissions object
- [X] T040 [US1] Implement `submitExpenseRequest()` method (transition Draft → Submitted, validate attachments, emit event, transaction)

### Repositories for User Story 1

- [X] T041 [US1] Implement `findById()`, `findByExpenseNumber()`, `create()`, `update()` in `ExpenseRequest` repository
- [ ] T042 [US1] Add index queries for listing by branch/status in `ExpenseRequest` repository

### Controllers for User Story 1

- [X] T043 [US1] Create `ExpenseController` in `src/modules/accounting/controllers/expenses.controller.ts`
- [X] T044 [US1] Implement `POST /api/v1/expenses` (createExpense) with validation guard and permission check
- [X] T045 [US1] Implement `GET /api/v1/expenses/:id` (getExpenseRequest) with branch scoping
- [X] T046 [US1] Implement `PATCH /api/v1/expenses/:id` (updateExpenseRequest) with version concurrency control
- [X] T047 [US1] Implement `POST /api/v1/expenses/:id/submit` (submitExpenseRequest) with status validation

### Swagger Documentation for User Story 1

- [X] T048 [US1] Add Swagger decorators to create/get/update/submit endpoints with real DTO shapes and error codes

### Integration Tests for User Story 1

- [ ] T049 [US1] Create integration test in `src/modules/accounting/__tests__/integration/expense-creation.e2e.spec.ts`
  - Test 1: Create expense → verify Draft status and auto-generated expenseNumber
  - Test 2: Create expense → update → verify version incremented
  - Test 3: Create → update → submit → verify Submitted status
  - Test 4: Submit without attachments → verify validation error
  - Test 5: Submit with invalid category → verify INVALID_CATEGORY error
  - Test 6: Create as non-employee → verify FORBIDDEN

**Checkpoint**: User Story 1 (MVP) complete and independently testable. Employees can create and submit expenses.

---

## Phase 4: User Story 2 - Finance Manager Reviews and Approves Expenses (Priority: P1)

**Goal**: Finance Managers can transition expenses from Submitted → Under Review → Approved/Rejected/Returned

**Independent Test**: Submit expense → approve/reject/return → verify status, approvalHistory, and permissions updated

### DTOs for User Story 2

- [X] T050 [US2] Create approval action DTOs in `src/modules/accounting/dtos/expense-query.dto.ts (ExpenseActionDto)`, `reject-expense.dto.ts`, `return-expense.dto.ts` (expectedVersion, comment)

### Services for User Story 2

- [X] T051 [US2] Implement `approveExpenseRequest()` method in `ExpenseApprovalService` (status: Submitted → Approved, create history entry, set read-only, emit event, transactional)
- [X] T052 [US2] Implement `rejectExpenseRequest()` method (status: Submitted → Rejected, create history entry, terminal state, emit event, transactional)
- [X] T053 [US2] Implement `returnExpenseRequest()` method (status: Submitted → Returned, create history entry with comment, allow re-edit, emit event, transactional)
- [X] T054 [US2] Implement `getApprovalHistory()` method (return immutable history entries in chronological order)

### Repositories for User Story 2

- [X] T055 [US2] Implement transaction-wrapped approval methods in `ExpenseRequest` repository (atomic status + history update)
- [X] T056 [US2] Implement append-only insert in `ExpenseApprovalHistory` repository (prevent UPDATE/DELETE via DB constraint)

### Controllers for User Story 2

- [X] T057 [US2] Implement `POST /api/v1/expenses/:id/approve` in controller (call approveExpenseRequest, check permission `expenses.approve`)
- [X] T058 [US2] Implement `POST /api/v1/expenses/:id/reject` in controller (call rejectExpenseRequest, check permission)
- [X] T059 [US2] Implement `POST /api/v1/expenses/:id/return` in controller (call returnExpenseRequest, check permission)

### Swagger Documentation for User Story 2

- [X] T060 [US2] Add Swagger decorators for approve/reject/return endpoints with approval history in response

### Integration Tests for User Story 2

- [ ] T061 [US2] Create integration test in `src/modules/accounting/__tests__/integration/approval-workflow.e2e.spec.ts`
  - Test 1: Submit → Approve → verify status Approved and permissions.canEdit = false
  - Test 2: Submit → Reject → verify status Rejected and cannot resubmit
  - Test 3: Submit → Return with comment → verify Returned status and employee sees comment
  - Test 4: Approve with version conflict → verify 409 VERSION_CONFLICT with currentVersion
  - Test 5: Non-manager tries to approve → verify 403 FORBIDDEN
  - Test 6: Finance manager views expense → verify permissions object includes approval actions

**Checkpoint**: User Story 2 complete. Approval workflow functions correctly with immutable history and transactional safety.

---

## Phase 5: User Story 3 - Employee Resubmits Returned Expense Request (Priority: P2)

**Goal**: Employees can edit returned expenses and resubmit them

**Independent Test**: Return expense → edit → resubmit → verify back to Submitted status

### Services for User Story 3

- [X] T062 [US3] Enhance `updateExpenseRequest()` to allow editing only in Draft or Returned status (permissions check)
- [X] T063 [US3] Create `resubmitExpenseRequest()` method (transition Returned → Submitted, emit event, transactional)

### Controllers for User Story 3

- [X] T064 [US3] Verify `PATCH /api/v1/expenses/:id` allows updates only in Draft/Returned, returns 409 INVALID_STATUS otherwise
- [X] T065 [US3] Verify `POST /api/v1/expenses/:id/submit` handles both Draft and Returned source states

### Integration Tests for User Story 3

- [ ] T066 [US3] Create integration test in `src/modules/accounting/__tests__/integration/expense-resubmit.e2e.spec.ts`
  - Test 1: Return → Edit description → Resubmit → verify Submitted status
  - Test 2: Try to edit Rejected (not Returned) → verify 409 INVALID_STATUS
  - Test 3: Return with comment → Edit → Resubmit → Approve → Verify approval history includes Return and Resubmit

**Checkpoint**: User Story 3 complete. Return-and-resubmit correction workflow works.

---

## Phase 6: User Story 4 - Search and Filter Expense Requests (Priority: P2)

**Goal**: Users can search, filter, sort, and paginate expense requests

**Independent Test**: Create 10+ expenses → filter by status/category/branch → verify correct results and pagination

### DTOs for User Story 4

- [X] T067 [US4] Create expense query/filter DTO in `src/modules/accounting/dtos/expense-query.dto.ts` (page, pageSize, status, categoryId, branchId, dateFrom, dateTo, search, sortBy, sortOrder, includeArchived)

### Services for User Story 4

- [X] T068 [US4] Implement `listExpenses()` method in `ExpenseSearchService` (apply filters, build Prisma query, return paginated results)
- [X] T069 [US4] Implement search normalization in `listExpenses()` (fold Arabic characters per API contract)
- [X] T070 [US4] Implement branch scoping in `listExpenses()` (filter by caller's authorizedBranchIds unless organizationWide)

### Repositories for User Story 4

- [X] T071 [US4] Implement `findMany()` with filters in `ExpenseRequest` repository (use Prisma cursor pagination)
- [ ] T072 [US4] Ensure database indexes on (branchId, status), (categoryId), (createdAt) for query performance

### Controllers for User Story 4

- [X] T073 [US4] Implement `GET /api/v1/expenses` in controller (call listExpenses with query filters, pagination)
- [X] T074 [US4] Add validation for pagination limits (pageSize max 100)

### Swagger Documentation for User Story 4

- [X] T075 [US4] Add Swagger decorators for list endpoint with all query parameters documented

### Integration Tests for User Story 4

- [ ] T076 [US4] Create integration test in `src/modules/accounting/__tests__/integration/expense-search.e2e.spec.ts`
  - Test 1: Create 5 expenses with different statuses → Filter by status → verify correct results
  - Test 2: Filter by category → verify all results match category
  - Test 3: Search by expenseNumber → verify exact match
  - Test 4: Pagination: pageSize=2 → verify 2 items, meta.totalPages correct
  - Test 5: Out-of-range page → verify 200 with empty data array
  - Test 6: Branch scoping: User from Branch A filters Branch B → verify 403 out-of-scope or empty results

**Checkpoint**: User Story 4 complete. Search and pagination working with proper performance.

---

## Phase 7: User Story 5 - View Approval History and Audit Trail (Priority: P3)

**Goal**: Users can view complete immutable approval history for each expense

**Independent Test**: Create → Submit → Approve → Get expense → Verify approval history entries

### Services for User Story 5

- [X] T077 [US5] Implement `getApprovalHistory()` method in `ExpenseApprovalService` (query immutable history, return chronologically ordered)

### Repositories for User Story 5

- [X] T078 [US5] Implement `findByExpenseId()` in `ExpenseApprovalHistory` repository (ordered by performedAt DESC)

### DTOs for User Story 5

- [X] T079 [US5] Create approval history response DTO in `src/modules/accounting/dtos/expense.response.dto.ts (ApprovalHistoryDto)`

### Controllers for User Story 5

- [X] T080 [US5] Include `approvalHistory` array in `GET /api/v1/expenses/:id` response (already in phase 3, verify here)

### Swagger Documentation for User Story 5

- [X] T081 [US5] Verify Swagger documents ApprovalHistory structure in get-expense response

### Integration Tests for User Story 5

- [ ] T082 [US5] Create integration test in `src/modules/accounting/__tests__/integration/approval-history.e2e.spec.ts`
  - Test 1: Create → Submit → Approve → Get expense → Verify 3 history entries (Create, Submit, Approve)
  - Test 2: Verify each entry has action, previousStatus, newStatus, performedBy, performedAt, comment
  - Test 3: Return → Resubmit → Approve → Verify 5+ entries in order
  - Test 4: Try to modify history entry (no endpoint exists) → verify immutability enforced

**Checkpoint**: User Story 5 complete. Immutable audit trail working correctly.

---

## Phase 8: User Story 6 - Archive Approved and Rejected Expenses (Priority: P3)

**Goal**: Finance Managers can archive expenses; archived records remain queryable for reporting

**Independent Test**: Approve expense → Archive → Verify not in default list but queryable with includeArchived filter

### Services for User Story 6

- [X] T083 [US6] Implement `archiveExpenseRequest()` method (set isArchived=true, status=Archived, emit event, transactional)

### Repositories for User Story 6

- [X] T084 [US6] Implement soft-delete logic: `findMany()` excludes isArchived=true by default unless `includeArchived=true` param
- [X] T085 [US6] Verify `findById()` still returns archived expenses (needed for reporting)

### Controllers for User Story 6

- [X] T086 [US6] Implement `POST /api/v1/expenses/:id/archive` in controller (call archiveExpenseRequest, check permission `expenses.approve`)
- [X] T087 [US6] Verify `GET /api/v1/expenses` respects includeArchived query param

### Swagger Documentation for User Story 6

- [X] T088 [US6] Add Swagger decorators for archive endpoint and document includeArchived filter in list

### Integration Tests for User Story 6

- [ ] T089 [US6] Create integration test in `src/modules/accounting/__tests__/integration/expense-archive.e2e.spec.ts`
  - Test 1: Approve → Archive → List → Verify not in results
  - Test 2: Archive → List with includeArchived=true → Verify in results
  - Test 3: Get archived expense directly → Verify readable and isArchived=true
  - Test 4: Try to archive Draft (not Approved/Rejected) → verify 409 INVALID_STATUS
  - Test 5: Archive with version conflict → verify 409 VERSION_CONFLICT

**Checkpoint**: User Story 6 complete. Soft-delete archival working correctly.

---

## Phase 9: Attachments & Lookup Integration (Cross-Story)

**Purpose**: Complete attachment and category lookup functionality used by multiple stories

### Attachment Upload & Management

- [X] T090 [P] Create attachment service in `src/modules/accounting/services/expense-attachments.service.ts` (upload, validate, idempotent upload via uploadAttempt)
- [X] T091 Implement `POST /api/v1/expenses/:id/attachments` in controller (file upload, MIME validation, idempotency check before version assert)
- [X] T092 Implement `DELETE /api/v1/expenses/:id/attachments/:attachmentId` in controller (remove attachment, call storage service delete)
- [ ] T093 Add attachment upload DTOs in `src/modules/accounting/dtos/attachment-upload.dto.ts`
- [X] T094 [P] Add Swagger decorators for upload/delete endpoints (file parameter, supported MIME types)

### Category/Subcategory Lookup Validation

- [X] T095 Enhance category validation in `ExpenseService` (call organization reference service to validate category/subcategory)
- [ ] T096 Create category reference service wrapper in `src/modules/accounting/services/category-reference.service.ts`

### Integration Tests for Attachments

- [ ] T097 Create integration test in `src/modules/accounting/__tests__/integration/expense-attachments.e2e.spec.ts`
  - Test 1: Upload PDF → Verify metadata stored, fileReference returned
  - Test 2: Upload same uploadAttempt key → Verify idempotent (no duplicate)
  - Test 3: Upload unsupported format → Verify 422 UNSUPPORTED_FILE_TYPE
  - Test 4: Upload oversized file → Verify 413 FILE_TOO_LARGE
  - Test 5: Delete attachment → Verify removed and storage service called
  - Test 6: Create with invalid category → Verify 422 INVALID_CATEGORY

**Checkpoint**: Attachment and category integration complete. All data requirements satisfied.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final quality assurance and integration verification

### Swagger Documentation

- [ ] T098 [P] Run Swagger generation and verify all 11 endpoints documented in `/swagger` endpoint
- [X] T099 [P] Verify every endpoint includes real success/error shapes and status codes
- [X] T100 [P] Verify error envelope matches API contract (code, message, details, currentVersion)
- [X] T101 Verify every permission-required endpoint documents authorization requirement

### API Contract Verification

- [X] T102 Compare every endpoint implementation against `contracts/expenses-api.md`
- [X] T103 Verify pagination format: `{success, data, meta: {total, page, limit, totalPages}}`
- [ ] T104 Verify money format: `{amount: string, currency: string, precision: number}`
- [X] T105 Verify error status codes: 422 validation, 409 conflicts, 403 forbidden, 404 not found, 401 unauthorized
- [ ] T106 Verify out-of-range pagination returns 200 with empty data (not 404)

### Authorization & Security

- [X] T107 Verify every protected endpoint has permission guard
- [X] T108 Verify branch scoping applied to list/get endpoints (caller's authorizedBranchIds)
- [X] T109 Verify `out-of-scope` error code used for branch access denial (distinct from generic forbidden)
- [X] T110 Verify read-only enforcement for Approved/Rejected expenses
- [X] T111 Verify immutable history (no UPDATE/DELETE endpoints for ApprovalHistory)

### Domain Events & Audit

- [X] T112 [P] Verify domain events emitted for: Create, Submit, Review, Approve, Reject, Return, Archive
- [X] T113 [P] Verify each event carries actor, target, operation, resulting state for audit subscriber
- [X] T114 Verify approval history entry created with each workflow action
- [X] T115 Verify version field incremented on every update

### Optimistic Concurrency

- [X] T116 Verify every PATCH/POST mutation request includes `expectedVersion`
- [X] T117 Verify version mismatch returns 409 with `currentVersion` in error
- [ ] T118 Test concurrent updates and verify only one succeeds, other conflicts

### Type Safety & Code Quality

- [X] T119 Run `npm run build` — verify no TypeScript errors under strict mode
- [ ] T120 Run `npm run lint` — verify no linting errors
- [X] T121 [P] Verify no `any` types introduced; use `unknown` with narrowing guards if needed
- [X] T122 [P] Code review for adherence to constitution principles (IV, V, VI, VII, VIII, etc.)

### Transactional Safety

- [X] T123 Verify all multi-entity writes (approval actions) wrapped in database transaction
- [X] T124 Verify rollback on any operation failure
- [ ] T125 Test concurrent approvals and verify isolation

### Performance Validation

- [ ] T126 Create 10,000 test expense records
- [ ] T127 Verify list query with filters responds < 1 second
- [ ] T128 Verify search query responds < 1 second
- [ ] T129 Verify single expense get responds < 100ms

### Integration with Other Modules

- [X] T130 [P] Verify organization identity service integration for user context
- [X] T131 [P] Verify organization settings service for lookup categories
- [X] T132 [P] Verify storage service integration for attachment storage
- [X] T133 [P] Verify global response interceptor applies expense envelope
- [X] T134 [P] Verify global exception filter catches expense exceptions

### Unit Tests

- [X] T135 Create unit tests for `ExpenseService` in `test/unit/accounting/expenses.service.spec.ts`
- [X] T136 Create unit tests for `ExpenseApprovalService` in `test/unit/accounting/approval.service.spec.ts`
- [X] T137 Create unit tests for `ExpenseSearchService` in `test/unit/accounting/search.service.spec.ts`
- [ ] T138 Create unit tests for DTOs and validators in `src/modules/accounting/__tests__/unit/dtos.spec.ts`

### Documentation & Cleanup

- [X] T139 Add module README in `src/modules/accounting/README.md` (feature overview, entities, endpoints)
- [X] T140 Remove all TODO comments and incomplete code
- [X] T141 Run final code cleanup — remove duplication, improve readability
- [X] T142 Verify no console.log or debug statements in production code

### Quickstart Validation

- [ ] T143 Run all 9 validation scenarios from `quickstart.md` manually
- [ ] T144 Test Scenario 1: Create & Submit (verify Draft → Submitted)
- [ ] T145 Test Scenario 2: Approve (verify Submitted → Approved, read-only)
- [ ] T146 Test Scenario 3: Return & Resubmit (verify Returned → edit → Submitted)
- [ ] T147 Test Scenario 4: Search & Filter (verify all filter combinations)
- [ ] T148 Test Scenario 5: Concurrency (verify 409 VERSION_CONFLICT)
- [ ] T149 Test Scenario 6: Idempotency (verify duplicate uploads return 200)
- [ ] T150 Test Scenario 7: History Immutability (verify no modifications)
- [ ] T151 Test Scenario 8: Archive (verify soft-delete)
- [ ] T152 Test Scenario 9: Permissions (verify authorization blocks)

### Final Readiness Check

- [X] T153 Verify all 11 API endpoints functional and contractually compliant
- [X] T154 Verify all 3 entities persisted correctly with Prisma
- [X] T155 Verify all 6 user stories independently testable and functional
- [ ] T156 Verify module ready for production deployment

**Checkpoint**: Accounting module complete, tested, documented, and production-ready.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies → Start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 → BLOCKS all user stories
- **Phase 3-8 (User Stories)**: All depend on Phase 2 → Can execute in parallel or sequentially
  - US1 & US2 (P1): Should complete together (both required for core workflow)
  - US3-4 (P2): Can run in parallel after US1+US2
  - US5-6 (P3): Can run in parallel after US1+US2, but benefit from US3-4 complete
- **Phase 9 (Attachments)**: Integrates with all stories → Can run in parallel with user stories
- **Phase 10 (Polish)**: Depends on all user stories complete → Final phase

### Parallel Opportunities

**Phase 1 Setup**:
- T002, T003 can run in parallel (both create structure)

**Phase 2 Foundational** (All can run in parallel after T005 migration):
- T006-T008: Schema definitions (parallel)
- T010-T012: Entity definitions (parallel)
- T014-T016: Type definitions (parallel)
- T017-T020: Repositories (parallel after schema)
- T025-T027: DTOs (parallel)
- T031-T034: Utilities and integration (parallel)

**Phase 3-8 User Stories**:
- All user stories can START in parallel after Phase 2
- Within each story:
  - T035/T036: DTOs can be parallel
  - T050/T062/T067/T077/T083: Service methods can be parallel (different methods)
  - T043/T057/T064/T073/T080/T086: Controllers can be parallel (different endpoints)

**Phase 9 Attachments**:
- T090/T095: Attachment service and category service (parallel)
- T091/T092: Upload/delete endpoints (parallel after T090)
- T097: Tests can run in parallel with implementation

**Phase 10 Polish**:
- T098-T101: Swagger (parallel)
- T102-T106: API contract verification (parallel)
- T107-T111: Authorization & security (parallel)
- T112-T115: Events & audit (parallel)
- T116-T125: Concurrency & transactions (parallel)
- T126-T129: Performance (can run in parallel if separate DB)
- T135-T138: Unit tests (parallel)

### Suggested Execution Plan

**Option 1: Sequential (Lower Risk, Longer Timeline)**
1. Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10
2. ~8-12 weeks with 1-2 developers

**Option 2: MVP + Enhancements (Recommended)**
1. Phase 1 + Phase 2: Foundation (Week 1-2)
2. Phase 3 + Phase 4: P1 Stories (Week 3-4) → Deploy MVP
3. Phase 5 + Phase 6: P2 Stories (Week 5-6, parallel team members)
4. Phase 7 + Phase 8: P3 Stories (Week 7, parallel team members)
5. Phase 9: Attachments (Week 7-8, parallel)
6. Phase 10: Polish (Week 8-9)
7. ~8-9 weeks with 2-3 developers, MVP in Week 4

**Option 3: Full Parallel (Higher Risk, Fastest)**
1. Phase 1 → Phase 2 (Week 1-2)
2. All User Story phases (Phase 3-8) in parallel by different team members (Week 3-5)
3. Phase 9 Attachments (Week 5-6)
4. Phase 10 Polish (Week 6-7)
5. ~6-7 weeks with 6-8 developers

---

## Task Counts & Story Breakdown

| Phase | User Story | Task Count | Critical Tasks | Status |
|-------|-----------|-----------|-----------------|--------|
| 1 | Setup | 4 | T001-T002 | Foundation |
| 2 | Foundational | 30 | T005-T034 | Blocking |
| 3 | US1 (P1) | 15 | T037-T049 | MVP Core |
| 4 | US2 (P1) | 10 | T051-T061 | MVP Core |
| 5 | US3 (P2) | 5 | T062-T066 | Enhancement |
| 6 | US4 (P2) | 10 | T068-T076 | Enhancement |
| 7 | US5 (P3) | 6 | T077-T082 | Enhancement |
| 8 | US6 (P3) | 7 | T083-T089 | Enhancement |
| 9 | Attachments | 8 | T090-T097 | Cross-Story |
| 10 | Polish | 60 | T098-T156 | Quality Assurance |
| | **TOTAL** | **155** | — | — |

---

## Independent Test Criteria by User Story

### User Story 1: Create & Submit (MVP Gating)
✅ **PASS** if:
- [ ] Employee creates expense in Draft status with all required fields
- [ ] Expense number auto-generated and unique
- [ ] Employee can update draft multiple times
- [ ] Employee can add attachment
- [ ] Employee can submit Draft → Submitted transition
- [ ] Cannot submit without attachments (if required)
- [ ] Cannot submit with invalid category
- [ ] Submitted expenses cannot be edited
- [ ] Version field increments correctly

### User Story 2: Approval Workflow (MVP Gating)
✅ **PASS** if:
- [ ] Finance Manager can view submitted expenses
- [ ] Finance Manager can approve → status Approved, read-only
- [ ] Finance Manager can reject → status Rejected, terminal
- [ ] Finance Manager can return → status Returned, allows re-edit
- [ ] Approval history created with each action
- [ ] Version conflict returns 409 with currentVersion
- [ ] Comments saved with approval actions
- [ ] Only users with expenses.approve permission can take actions

### User Story 3: Return & Resubmit
✅ **PASS** if:
- [ ] Returned expense can be edited (unlike Submitted)
- [ ] Returned expense can be resubmitted → Submitted
- [ ] Edit generates new approval history "Update" entry
- [ ] Resubmit generates "Resubmit" entry
- [ ] Rejected expenses cannot be edited or resubmitted

### User Story 4: Search & Filter
✅ **PASS** if:
- [ ] List endpoint returns paginated results (default 20, max 100)
- [ ] Filter by status returns only matching expenses
- [ ] Filter by category returns only matching expenses
- [ ] Filter by branch respects caller's scope
- [ ] Search by expenseNumber finds exact match
- [ ] Search by description finds partial matches
- [ ] Sort by date works (asc/desc)
- [ ] Out-of-range page returns 200 with empty data

### User Story 5: Approval History
✅ **PASS** if:
- [ ] Each approval action creates immutable history entry
- [ ] History entries in chronological order (performedAt)
- [ ] Each entry has action, previousStatus, newStatus, actor, timestamp
- [ ] Comments included when provided
- [ ] No way to modify/delete history entries
- [ ] History queryable for reporting

### User Story 6: Archive
✅ **PASS** if:
- [ ] Approved/Rejected expenses can be archived
- [ ] Archived expense has isArchived=true, status=Archived
- [ ] Archived expenses excluded from default list
- [ ] includeArchived=true filter shows archived
- [ ] Archived expense still readable (for reporting)
- [ ] Cannot archive Draft/Submitted/Returned expenses

---

## Suggested MVP Scope

**Minimum Viable Product** = User Stories 1 + 2 (P1 Stories)

Deploy after Phase 4 completion:
- Employees can create, update, and submit expenses
- Finance Managers can approve, reject, or return expenses
- Basic approval workflow with history
- **Time to MVP: ~4 weeks (Phases 1-4)**

**Subsequent Enhancements** (after MVP):
- Phase 5: Return/Resubmit correction workflow
- Phase 6: Search and filtering capabilities
- Phase 7: Audit history visualization
- Phase 8: Archival and record keeping
- Phase 9: Attachment management

---

## Format Validation Checklist

✅ **All tasks follow strict format**:
- [x] Every task has checkbox: `- [ ]`
- [x] Every task has sequential ID: T001, T002, T003...
- [x] Setup/Foundational/Polish phases have NO story labels
- [x] User Story phases (3-8) include `[US1]`, `[US2]`, etc. labels
- [x] Parallelizable tasks marked with `[P]`
- [x] Every task includes exact file path
- [x] No placeholder or generic descriptions
- [x] All 11 API endpoints mapped to tasks
- [x] All 3 entities (ExpenseRequest, ExpenseAttachment, ApprovalHistory) mapped to tasks
- [x] All 6 user stories (P1, P1, P2, P2, P3, P3) have independent test criteria

---

## Next Steps

1. **Start Phase 1 & 2**: Initialize module and foundational layer (weeks 1-2)
2. **Parallel Phases 3-4**: Implement P1 stories (weeks 3-4)
3. **Deploy MVP**: After US1+US2 complete
4. **Continue Phases 5-8**: Implement P2 and P3 enhancements (weeks 5-8)
5. **Phase 9-10**: Complete attachments and polish (weeks 8-9)

---

## References

- **Specification**: [spec.md](spec.md) — 6 user stories, 30 functional requirements
- **Data Model**: [data-model.md](data-model.md) — 3 entities, Prisma schema, indexes
- **API Contracts**: [contracts/expenses-api.md](contracts/expenses-api.md) — 11 endpoints, request/response details
- **Quickstart**: [quickstart.md](quickstart.md) — 9 validation scenarios for manual testing
- **Constitution**: [constitution.md](.specify/memory/constitution.md) — 20 principles, API contract bindings
