# Implementation Plan: Expense Management Module

**Branch**: `010-expense-management` | **Date**: 2026-08-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-expense-management/spec.md`

**Note**: This plan is filled in by the `/speckit-plan` command; it defines the design phase and contract details for the Expense Management module.

## Summary

Build the Accounting module to manage organization expense requests and approval workflows across all branches. The module enables branch employees to submit expense requests, allows Finance Managers to review and approve requests, maintains an immutable approval history, and prepares accounting data for future ERP and financial reporting integrations. The implementation follows NestJS feature-based architecture with independent module ownership of controllers, services, repositories, DTOs, validators, policies, and mappers.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: NestJS 11.x, Prisma ORM, @nestjs/swagger, class-validator, class-transformer

**Storage**: PostgreSQL via Prisma ORM (shared database)

**Testing**: Jest with unit and integration tests

**Target Platform**: Backend HTTP API server (Linux/Cloud deployment)

**Project Type**: REST API backend service (NestJS modular application)

**Performance Goals**: Sub-1-second search/filter on 10,000+ expense records; sub-100ms approval actions

**Constraints**: <200ms p95 for list endpoints; strict type safety (TypeScript strict mode); immutable audit trail for compliance

**Scale/Scope**: Multi-branch organization with hundreds of expense requests per month; support for 10,000+ historical records

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Source: `.specify/memory/constitution.md` v1.0.0. Mark each gate PASS / FAIL / N/A with a
one-line justification. Any FAIL must either be fixed or recorded in Complexity Tracking.

| # | Gate | Principle | Status |
|---|------|-----------|--------|
| 1 | Feature is scoped to one business domain module; no cross-module DB access | I, II | PASS — Accounting is an independent module; relationships to Branch, Category, and User are read-only lookups, not DB cross-access |
| 2 | Every endpoint matches `docs/api-data-requirements.html` (path, payloads, errors) | III | PASS — Spec references §2.1-2.5 (General API Standards, Response Format, Pagination, Validation, Authorization); all endpoints follow documented patterns |
| 3 | Controllers hold no business logic; layering is Controller → Service → Repository → Prisma | IV, V | PASS — Workflow transitions, validation, and approval logic will live in services; controllers bind requests and call service entry points only |
| 4 | Every request has a DTO with `class-validator` rules; business rules live in services | VI | PASS — All endpoints will have DTOs with field validation; business rules (workflow transitions, immutability checks) will live in services |
| 5 | Every protected endpoint has a permission guard; no duplicated authz logic | VII | PASS — Accounting module will use shared permission guard; endpoints controlled by `expenses.create`, `expenses.approve`, etc. keys |
| 6 | Responses use the single success/error envelope; no ad-hoc JSON | VIII, XIII | PASS — All responses will use `{success, data, meta}` envelope via global response interceptor |
| 7 | Uploads go through the storage service; no filesystem paths in business code | IX | PASS — Attachment uploads will use shared storage service; business code handles metadata and file references only |
| 8 | Multi-entity writes are transactional; domain events emitted for audit | X, XI | PASS — Approval transitions will be transactional (approval history + status update); domain events emitted for create/approve/reject/return/archive |
| 9 | `strict` mode holds; no new `any` | XII | PASS — Implementation will use TypeScript strict mode; no `any` types in new code |
| 10 | Every list endpoint is paginated per the documented format | XIV | PASS — List endpoints (expenses, approval history) will use `page` and `pageSize` query params with default 20 and max 100 |
| 11 | Deletion is archival where the domain allows it | XV | PASS — Expense requests are never permanently deleted; soft-deleted via Archived status; archived records remain queryable |
| 12 | No dependency on mock data; mocks sit behind interfaces | XVI | PASS — Business logic uses repository interfaces; test mocks are created per-test, not baked into services |
| 13 | Swagger documents real success and error shapes | XVII | PASS — All endpoints will include Swagger documentation with real DTO shapes, response envelopes, and error codes |
| 14 | No speculative abstraction; unclear requirements were clarified, not assumed | XIX, XX | PASS — Spec has no [NEEDS CLARIFICATION] markers; all workflow rules and data requirements are explicit |

**Contract bindings re-check** (see constitution "API Contract Bindings"): 
- ✓ Envelope: `{success: true, data, meta}` with pagination meta (total, page, limit, totalPages)
- ✓ Pagination: offset pagination with `page` (1-based) and `pageSize` (default 20, max 100)
- ✓ Money: amounts stored as decimal strings with currency (e.g., `{amount: "15000.00", currency: "SAR", precision: 2}`)
- ✓ IDs: UUID strings for all entities
- ✓ Timestamps: ISO 8601 UTC with milliseconds for approval history records
- ✓ Dates: date-only format (YYYY-MM-DD) for expense date
- ✓ Optimistic Concurrency: `version` field on ExpenseRequest; `expectedVersion` on mutating requests; 409 response with `currentVersion`
- ✓ Idempotency: `uploadAttempt` key for attachment uploads (idempotency check before version assert per constitution)
- ✓ Permissions: per-record permissions object computed and included in detail responses
- ✓ Branch Scoping: list endpoints filter to caller's `authorizedBranchIds` unless `organizationWide`
- ✓ Error Envelope: `{success: false, error: {code, message, details}}` with field-level validation errors
- ✓ Arabic UTF-8: All user-facing messages in Arabic; search normalization applies

## Project Structure

### Documentation (this feature)

```text
specs/010-expense-management/
├── spec.md              # Feature specification (requirements & acceptance criteria)
├── plan.md              # This file (implementation plan & design)
├── research.md          # Phase 0 output (research findings & decisions)
├── data-model.md        # Phase 1 output (entity definitions & relationships)
├── quickstart.md        # Phase 1 output (validation & end-to-end test guide)
├── contracts/           # Phase 1 output (API contract specifications)
│   └── expenses-api.md  # Expense endpoints contract
├── checklists/          # Quality validation
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Following the existing NestJS modular architecture, the Accounting (Expenses) module will be created in `src/modules/`:

```text
src/
├── modules/
│   └── accounting/                          # NEW: Accounting module
│       ├── accounting.module.ts             # Module definition
│       ├── controllers/
│       │   └── expenses.controller.ts       # REST endpoints
│       ├── services/
│       │   ├── expenses.service.ts          # Core expense logic
│       │   ├── expense-approvals.service.ts # Approval workflow
│       │   └── expense-search.service.ts    # Search & filter
│       ├── repositories/
│       │   ├── expenses.repository.ts       # Expense data access
│       │   └── approval-history.repository.ts # Approval history access
│       ├── dtos/
│       │   ├── create-expense.dto.ts        # Create request DTO
│       │   ├── update-expense.dto.ts        # Update request DTO
│       │   ├── approve-expense.dto.ts       # Approval action DTO
│       │   ├── expense-query.dto.ts         # Search/filter query DTO
│       │   └── expense.response.dto.ts      # Response DTOs
│       ├── entities/
│       │   ├── expense-request.entity.ts    # Prisma entity definition
│       │   ├── expense-attachment.entity.ts # Attachment entity
│       │   └── expense-approval-history.entity.ts # History entity
│       ├── types/
│       │   ├── expense.types.ts             # Business type definitions
│       │   ├── approval-workflow.types.ts   # Workflow state types
│       │   └── expense.port.ts              # Service port interfaces
│       ├── policies/
│       │   └── expenses.policy.ts           # Authorization policies
│       ├── mappers/
│       │   └── expense.mapper.ts            # Entity to DTO mapping
│       ├── events/
│       │   └── expense.events.ts            # Domain events for audit
│       └── __tests__/
│           ├── unit/
│           │   ├── expenses.service.spec.ts
│           │   └── expense-approvals.service.spec.ts
│           └── integration/
│               └── expenses.e2e.spec.ts
│
├── core/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
│
├── shared/
│   ├── decorators/
│   ├── exceptions/
│   ├── helpers/
│   └── validators/
│
└── database/
    ├── migrations/
    │   └── [DATE]_add_accounting_tables.sql  # NEW: Expense tables migration
    └── prisma/
        └── schema.prisma                     # Updated with Expense models
```

**Structure Decision**: Single NestJS backend application with modular feature-based architecture. The Accounting module is an independent feature module owning its controllers, services, repositories, and DTOs. Shared infrastructure (guards, filters, storage service) remains in Core and Shared directories. Database schema managed via Prisma migrations.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

All Constitution Check gates passed (14/14 PASS). No complexity justifications required. Feature design aligns with backend constitution principles and architecture standards.

---

## Phase 0 & Phase 1 Completion Status

### Phase 0: Research ✅ COMPLETE

**Output**: `research.md`

Completed research on:
- Approval workflow state machine (three-action model)
- Immutable approval history (audit compliance)
- Attachment storage strategy (storage service)
- Expense category management (organization lookups)
- Currency and money handling (decimal strings)
- Optimistic concurrency control (version field)
- Attachment idempotency (uploadAttempt key)
- Search and filtering (database-level)
- Audit events emission (domain events)
- Soft deletes via Archived status

**Key Findings**: All architectural decisions are firm and ratified by constitution principles. No conflicting alternatives remain.

### Phase 1: Design ✅ COMPLETE

**Outputs**:
1. `data-model.md` — Entity definitions (ExpenseRequest, ExpenseAttachment, ExpenseApprovalHistory)
2. `contracts/expenses-api.md` — 11 API endpoints with request/response contracts
3. `quickstart.md` — 9 end-to-end validation scenarios

**Design Artifacts**:
- Complete Prisma schema with indexes and relationships
- 30+ functional requirements mapped to data model fields
- Full API contract for all CRUD and workflow operations
- Manual testing scenarios covering all user stories and edge cases
- Performance validation scenarios (10K+ records, sub-1-second queries)

**Constitution Re-check**: All 14 gates remain PASS after design. No architectural conflicts identified.

---

## Ready for Next Phase

Feature is ready for `/speckit-tasks` (Phase 2: Implementation).

All design decisions are documented and ratified. Implementation can proceed with:
- Prisma schema migration
- NestJS module scaffolding
- Controller and service implementation
- Unit and integration test development
