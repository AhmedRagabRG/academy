# Implementation Plan: Student Management

**Branch**: `008-student-management` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-student-management/spec.md`

## Summary

Build the Students module: the student record produced by admission intake, owning profile, enrollment projection, documents, notes, lifecycle status, timeline, and the read-only surfaces other modules consume.

Students are created **only** through `POST /api/v1/students/intake`, idempotent on `approvalSnapshotId`. Intake reads the approved admission through the existing `ADMISSIONS_ENROLLMENT_PORT` and — new for this feature — copies the admission's current documents through an additional read-only port method, producing student-owned document records that are independent from that moment on. `POST /students` and `DELETE /students/:id` are deliberately absent; a contract test asserts their absence.

The module follows the shape already proven by Admissions: one NestJS module owning controllers, services, repositories, DTOs, policies, mappers, ports and events, with Prisma access confined to repositories and every cross-module read going through an injected port symbol.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22, NestJS 11, `strict` mode enabled

**Primary Dependencies**: `@nestjs/common` 11, `@nestjs/swagger` 11, `@prisma/client` 7.9 with `@prisma/adapter-pg`, `class-validator` 0.15, `class-transformer` 0.5, `nestjs-pino`

**Storage**: PostgreSQL via Prisma; local filesystem for uploads behind `STORAGE_SERVICE` (`src/storage/storage.service.interface.ts`), which already declares the `student-photo` and `student-document` upload purposes

**Testing**: Jest for unit tests, Jest + supertest (`test/jest-e2e.json`) for end-to-end contract tests

**Target Platform**: Linux server, containerized (`docker-compose.yml`)

**Project Type**: Modular monolith REST API served under `/api/v1`

**Performance Goals**: 20,000-student dataset; 95% of list, search, sort and page operations under 2 s (SC-012). The list projection deliberately excludes documents, notes, timeline and finance to stay cheap.

**Constraints**: Offset pagination with `pageSize` default 20 / max 100; cursor pagination permitted only for the timeline read; `expectedVersion` required on every mutating call except note commands; Arabic UTF-8 messages with client-identical search folding; money always a decimal string

**Scale/Scope**: 22 documented HTTP endpoints, 8 Prisma models, 15 `students.*` permission keys — all already seeded in `prisma/seeds/permission-catalog.ts`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Source: `.specify/memory/constitution.md` v1.0.0.

| # | Gate | Principle | Status |
|---|------|-----------|--------|
| 1 | Feature is scoped to one business domain module; no cross-module DB access | I, II | **PASS** — one `StudentsModule`; Admissions, Catalog, Batches, Organization, IAM and Finance all reached through injected port symbols, never their repositories |
| 2 | Every endpoint matches `docs/api-data-requirements.html` (path, payloads, errors) | III | **CONDITIONAL** — all 22 endpoints match §4.6 exactly; two owner-authorized deviations require the doc amendment listed in Complexity Tracking before implementation |
| 3 | Controllers hold no business logic; layering is Controller → Service → Repository → Prisma | IV, V | **PASS** — controllers bind, authorize, call one service entry point, return a bare payload; Prisma imported only by repositories |
| 4 | Every request has a DTO with `class-validator` rules; business rules live in services | VI | **PASS** — one DTO per request; identity rules, transition table and readiness live in policies and services |
| 5 | Every protected endpoint has a permission guard; no duplicated authz logic | VII | **PASS** — `@RequirePermissions` with the existing `PermissionsGuard`; per-record flags via `RecordPermissionsHelper` |
| 6 | Responses use the single success/error envelope; no ad-hoc JSON | VIII, XIII | **PASS** — global interceptor and exception filter; new codes extend `DomainException` in `students.exceptions.ts` |
| 7 | Uploads go through the storage service; no filesystem paths in business code | IX | **PASS** — `STORAGE_SERVICE` only; services persist a `FileDescriptor`, never a path |
| 8 | Multi-entity writes are transactional; domain events emitted for audit | X, XI | **PASS** — intake, status change and document writes run inside one `$transaction`; `DomainEventBus.emit` fires after commit |
| 9 | `strict` mode holds; no new `any` | XII | **PASS** — ports and mappers fully typed; `unknown` plus a narrowing guard wherever a JSON column is read |
| 10 | Every list endpoint is paginated per the documented format | XIV | **PASS** — `PageQueryDto` for the student list; the timeline uses the documented cursor form; sub-resource reads are bounded closed sets |
| 11 | Deletion is archival where the domain allows it | XV | **PASS** — no delete endpoint exists; archive is a status transition; archived students are excluded from default lists |
| 12 | No dependency on mock data; mocks sit behind interfaces | XVI | **PASS** — the finance reader is a port whose `unavailable` variant makes the absent Finance module a first-class state rather than a mock |
| 13 | Swagger documents real success and error shapes | XVII | **PASS** — response DTOs plus the documented error codes per endpoint |
| 14 | No speculative abstraction; unclear requirements were clarified, not assumed | XIX, XX | **PASS** — both spec clarifications were resolved by the owner; the proposed eligibility field was rejected as speculative (see Complexity Tracking) |

**Contract bindings re-check**: envelope `{success,data}` with `meta` on lists ✔ · `pageSize` 20/100 with an over-range page returning an empty 200 ✔ · `Money` as `{amount,currency,precision}` decimal string with arithmetic in minor units ✔ · UUID string IDs ✔ · ISO 8601 UTC millisecond timestamps and date-only calendar dates ✔ · `expectedVersion` on every write with `currentVersion` first-class on 409 ✔ · idempotency on `approvalSnapshotId` (intake) and `uploadAttemptId` (documents) ✔ · per-record permissions object always populated ✔ · branch scoping with a distinct `out-of-scope` ✔ · Arabic UTF-8 messages and search folding ✔

**Post-Phase-1 re-check**: re-evaluated after `data-model.md` and `contracts/` were written. No gate changed status. The document-copy port added in Phase 1 strengthens Gate 1 rather than weakening it — Students never touches `AdmissionDocument` tables, it consumes a typed DTO from `ADMISSIONS_DOCUMENT_READ_PORT`.

## Project Structure

### Documentation (this feature)

```text
specs/008-student-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── students-http.contract.md
│   └── students-public-ports.contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/modules/students/
├── students.module.ts
├── students/
│   ├── student.controller.ts             # list, detail, export, PATCH profile
│   ├── student.service.ts
│   ├── student.repository.ts
│   ├── student.policy.ts                 # branch scope, archived-read-only, protected fields
│   ├── student-identity.policy.ts        # configurable identity rules
│   ├── student-code.service.ts           # collision-safe code allocation
│   ├── student-export.service.ts
│   └── dto/
│       ├── list-students.dto.ts
│       ├── update-student-profile.dto.ts
│       └── student-response.dto.ts
├── intake/
│   ├── student-intake.controller.ts      # POST /students/intake
│   ├── student-intake.service.ts         # readiness → student + enrollment + documents
│   ├── student-intake.repository.ts      # idempotency keyed on approvalSnapshotId
│   └── dto/student-intake.dto.ts
├── lifecycle/
│   ├── student-status.controller.ts      # PATCH status, POST bulk-status
│   ├── student-status.service.ts
│   ├── student-lifecycle.policy.ts       # the authoritative transition table
│   └── dto/student-status.dto.ts
├── documents/
│   ├── student-document.controller.ts
│   ├── student-document.service.ts
│   ├── student-document.repository.ts
│   ├── student-document.policy.ts        # published types, sizes, ordering, completion
│   └── dto/student-document.dto.ts
├── notes/
│   ├── student-note.controller.ts
│   ├── student-note.service.ts
│   ├── student-note.repository.ts
│   └── dto/student-note.dto.ts
├── timeline/
│   ├── student-timeline.controller.ts    # cursor-paginated timeline + status-history
│   ├── student-timeline.service.ts
│   └── student-timeline.repository.ts
├── summaries/
│   ├── student-summary.controller.ts     # financial-summary, context-summary
│   ├── student-finance-reader.adapter.ts # three-state union while Finance is absent
│   └── student-context.service.ts
├── lookups/
│   ├── students-lookups.controller.ts
│   └── students-lookups.service.ts
├── mappers/
│   └── student.mapper.ts
├── types/
│   ├── students.types.ts
│   ├── students-context.port.ts          # consumed by Finance and future modules
│   └── student-finance-reader.port.ts    # consumed from Finance
└── events/
    └── students.events.ts

src/core/exceptions/students.exceptions.ts    # closed union of documented codes
prisma/schema.prisma                          # + 8 models, 5 enums
prisma/migrations/<timestamp>_students/       # additive migration

test/students/
├── students-intake.e2e-spec.ts
├── students-list.e2e-spec.ts
├── students-lifecycle.e2e-spec.ts
├── students-documents.e2e-spec.ts
└── students-forbidden-surface.e2e-spec.ts    # asserts POST/DELETE absence
```

**Structure Decision**: Mirrors the proven `src/modules/admissions/` layout — a sub-folder per bounded concern, each with its own controller, service, repository, policy and DTOs, plus shared `types/`, `mappers/` and `events/`. `AdmissionsModule` already exports `ADMISSIONS_ENROLLMENT_PORT`, so `StudentsModule` imports `AdmissionsModule` and consumes it by symbol. `StudentsModule` is registered in `src/app.module.ts` after `AdmissionsModule`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Guardian name added to `StudentIdentity` (Gate 2) | Owner-authorized in spec clarification Q2 Option C; staff need a contactable guardian name, not only a number | Leaving guardian phone-only was offered and explicitly declined. Requires amending `docs/api-data-requirements.html` §4.6 — profile field-rules table, detail example and profile update payload — **before** implementation |
| Student code format `AcademicYear-BranchCode-Sequence` (Gate 2) | Explicitly specified in the plan input (`2027-CAI-00001`); encodes intake year and branch for operational readability | The contract's example value is `STD-2026-00001`. `studentCode` remains an opaque unique string on the wire so no client type changes, but the §4.6 example values must be updated so the document stops contradicting the implementation |
| Second Admissions port method for the document copy | Spec FR-009, owner-chose Option A; the existing `EnrollmentHandoff` carries only `verifiedDocumentVersionIds`, not file metadata | Reading `AdmissionDocument` tables directly would violate Principle II. Re-uploading every document by hand was offered as Option B and declined |
| **Rejected: stored `eligibilityStatus` field** | — | The plan input proposed a stored eligibility enum plus an `Eligibility Changed` timeline event. Rejected under Principles III and XX: it appears nowhere in the contract, and its stated purpose — "academic modules consume this status when determining operational eligibility" — is already served by the contract-backed, server-computed `documentCompletion` exposed on both the detail and `context-summary`. Storing a second, derivable truth invites drift between the counter and the flag. See `research.md` R-006 |
