# Implementation Plan: Admissions

**Branch**: `[007-admissions]` | **Date**: 2026-08-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-admissions/spec.md`

## Summary

Implement Admissions as a dedicated, versioned business module that owns applicants, admission assignments, immutable academic and financial revisions, document-policy snapshots and file-version metadata, approval snapshots, lifecycle history, and a comprehensive immutable timeline. Controllers remain transport-only; services and policies orchestrate public Catalog, Program Batches, Organization, IAM, and Storage ports; repositories alone access Prisma. Multi-record writes use serializable transactions and optimistic compare-and-swap. The module exposes the exact §4.5 HTTP surface plus a bounded enrollment-readiness port for future Student Management.

The clarified feature decisions are binding: cancellation is reason-required archival with no `cancelled` status; all seven assignment fields are required at draft creation; private notes are one field with material changes recorded in the timeline; and file-opening fees are included in `registrationFees`, not exposed as a separate wire field.

## Technical Context

**Language/Version**: TypeScript 5.7 strict mode, Node.js 22

**Primary Dependencies**: NestJS 11, Prisma ORM 7.9, PostgreSQL adapter, class-validator/class-transformer, Swagger 11, RxJS, existing storage and domain-event infrastructure

**Storage**: PostgreSQL for aggregates, exact money, immutable revisions, metadata, and durable idempotency; local file storage accessed exclusively through `STORAGE_SERVICE`

**Testing**: Jest 30 with ts-jest; unit, live PostgreSQL integration/migration, E2E contract/security/upload, concurrency, architecture, and 10,000-record query validation

**Target Platform**: Linux-compatible HTTP server; Node.js 22 local and deployment runtime

**Project Type**: Modular REST web service

**Performance Goals**: At 10,000 admissions, 95% of normal list search/filter/page interactions complete visibly within two seconds; bounded lookups and histories avoid unbounded reads; document streaming does not buffer beyond configured limits

**Constraints**: Exact canonical paths and envelopes; pageSize 20/default and 100/max; Arabic/digit-folded search; branch-scoped PII; no cross-module repository access; exact Money without floats; expectedVersion on writes; durable idempotency on create/upload; append-only histories; storage abstraction; no permanent deletion; no direct Student creation

**Scale/Scope**: One organization, at least 10,000 admissions, reusable applicants, seven admission states, 18 permission keys, 23 canonical HTTP operations across administration/documents/lookups, and one future Students intake boundary

## Constitution Check

*GATE: PASS before Phase 0 and PASS after Phase 1 design.*

Source: `.specify/memory/constitution.md` v1.0.0.

| # | Gate | Principle | Status |
|---|------|-----------|--------|
| 1 | Feature is scoped to one business domain module; no cross-module DB access | I, II | **PASS** — `AdmissionsModule` owns only Admissions tables and consumes Organization, Catalog, Batches, IAM, and Storage through public ports. |
| 2 | Every endpoint matches `docs/api-data-requirements.html` | III | **PASS WITH APPROVED DELTA** — paths, payloads, errors, and lifecycle match §4.5; the clarified spec tightens admission archival from optional to required reason. The canonical requirements table must be amended with implementation so the stricter rule is no longer a textual mismatch. |
| 3 | Controllers hold no business logic; Controller → Service → Repository → Prisma | IV, V | **PASS** — controllers bind DTOs/guards and invoke one service; repositories alone receive Prisma. |
| 4 | Every request has validated DTOs; business rules live in services | VI | **PASS** — DTOs validate structure while identity, eligibility, pricing, readiness, transition, duplicate, and document rules live in policies/services. |
| 5 | Every protected endpoint has a permission guard | VII | **PASS** — route permissions are declared and field/action-sensitive permissions are evaluated in one policy. |
| 6 | Responses use the single success/error envelope | VIII, XIII | **PASS** — controllers return bare payloads; global interceptors/filters own envelopes. CSV export is the documented exception. |
| 7 | Uploads go through the storage service | IX | **PASS** — no filesystem/path access exists in Admissions business code; only stable descriptors are persisted. |
| 8 | Multi-entity writes are transactional; domain events emitted for audit | X, XI | **PASS** — aggregate writes are serializable and events emit only after commit; storage failure compensation is explicit. |
| 9 | `strict` mode holds; no new `any` | XII | **PASS** — closed unions, typed ports, DTOs, Prisma payloads, and unknown narrowing are planned. |
| 10 | Every list endpoint is paginated | XIV | **PASS** — the admission list is canonically paginated; lifecycle, revisions, document versions, and bounded lookups are documented closed child feeds. |
| 11 | Deletion is archival | XV | **PASS** — admissions/applicants archive; document withdrawal/version retention replaces deletion. |
| 12 | No dependency on mock data | XVI | **PASS** — integrations are typed ports; test substitutes remain behind those interfaces. |
| 13 | Swagger documents real success and error shapes | XVII | **PASS** — concrete list/detail/action/upload/history/readiness envelopes and closed errors are required. |
| 14 | No speculative abstraction; unclear requirements were clarified | XIX, XX | **PASS** — all specification questions are resolved; structured notes, separate file-opening fees, payments, and Student creation are excluded. |

**Contract bindings re-check**: PASS. The design uses `{success,data,meta}`; `page`/`pageSize` and `meta.limit`; decimal-string Money backed by integer minor units; UUIDs; UTC timestamps/date-only fields; expected/current versions; durable idempotency; record permissions; branch `OUT_OF_SCOPE`; Arabic UTF-8/search folding; PII redaction; CSV BOM; and partial-success HTTP 200 for bulk transitions.

## Architecture and Ownership

```text
HTTP controllers
  → Admission / Document / Lookup services
    → identity, lifecycle, readiness, selection, finance, document policies
    → typed Catalog / Batch / Organization / IAM / Storage ports
    → Admissions repositories
      → Prisma / PostgreSQL Admissions tables
```

- `AdmissionsModule` owns all applicant and admission persistence, DTOs, policies, mapping, events, and projections.
- `CATALOG_PUBLIC_PORT` resolves offering identity/version/type/status, pricing revision, and document policy.
- `PROGRAM_BATCHES_PUBLIC_PORT` resolves batch eligibility, versions, branches, seats, dates, and immutable financial revisions.
- `ORGANIZATION_MASTER_DATA_PORT` resolves branches, departments, qualifications, lead sources, grades, currency, precision, and published identity rules.
- A narrow IAM employee-reference port resolves active employees/managers without importing Identity repositories.
- `STORAGE_SERVICE` owns file bytes and signature validation. Admissions persists only descriptors and version state.
- `ADMISSIONS_ENROLLMENT_PORT` exposes readiness/approval snapshots and an idempotent enrollment-result acknowledgement to future Students; no public Admissions repository leaks.

## Data and Transaction Strategy

- Persist an `Applicant` identity root and `Admission` workflow root. Duplicate matching uses normalized national ID and phone indexes, not an unconditional national-ID uniqueness constraint, because explicit `use-existing` and `create-exception` outcomes are supported.
- Store required assignment identifiers and current resolved labels on the Admission snapshot. External IDs are validated through ports and are not queried through foreign repositories.
- Append complete `AdmissionSelectionRevision` and `AdmissionFinancialRevision` rows and atomically switch current pointers. History tables, document policy snapshots/requirements, file versions/decisions, approval snapshots, lifecycle, and timeline receive database update/delete rejection triggers.
- Store money as scaled integer minor units plus currency/precision. `registrationFees` includes any file-opening component. Derive discount amount and required amount using integer arithmetic.
- Allocate human references through an organization-scoped counter inside the creation transaction, never `count + 1`.
- Persist durable request/upload idempotency keys. Process-local storage deduplication is insufficient.
- Run create/update/selection/financial/status/policy-refresh/document-metadata mutations through `TransactionManager.runSerializable()`. Compare `(id, expectedVersion, allowedStatus)` and increment the Admission exactly once per aggregate mutation.
- Upload bytes before the metadata transaction; if metadata persistence fails, compensate through Storage removal. Replacement/withdrawal never deletes historical bytes needed by retained versions.
- Bulk status executes one bounded serializable operation per item and returns all outcomes; successes are not rolled back by unrelated failures.
- Emit audit-ready events after commit with IDs/action/version only; never log national ID, phones, addresses, note content, document contents, or detailed finances.

## API, Validation, and Authorization Strategy

The exact surface is defined in [contracts/admissions-http.contract.md](contracts/admissions-http.contract.md). No generic DELETE or separate cancellation endpoint/status exists.

- Base view/create/update/archive/export/assign permissions are complemented by academic, finance, document, verification, submit/review/approve/reject/return, and enrollment-readiness keys.
- List projections mask phone and omit national identity, address, documents, and financials. Detail sections and actions are permission-filtered.
- DTOs reject unknown/server-owned fields and validate nested applicant/assignment/selection/discount shapes, date-only values, UUIDs, decimal strings, closed enums, expected versions, and upload metadata.
- Policies enforce configured applicant rules, duplicate resolution, product/batch pairing, branch/staff eligibility, document requirements, exact finance, consequence acknowledgement, lifecycle, reviewer ownership, and readiness.
- Eligibility is re-evaluated at selection, submission, and approval. Approval atomically writes its one-time immutable snapshot.
- Admission cancellation maps to `archived` with a mandatory reason. Applicant archival also requires a reason. Enrolled is terminal in Admissions.
- Selection changes after draft use the dedicated consequence-confirmed route. Financial updates append revisions. Notes remain one private field; material changes create safe timeline entries without copying note content into event metadata.

## Test Strategy

- **Unit**: DTO strictness/transforms, Arabic/digit normalization, age/guardian/graduation rules, duplicate policy, pairing/eligibility, exact finance, consequence acknowledgement, readiness aggregation, transition matrix, redaction, document state and MIME/size rules.
- **Integration**: schema/migration constraints and triggers, reference allocation, duplicate races, atomic creation/update/revision/policy refresh, version races, reviewer races, immutable history, document idempotency/current pointers/compensation, branch scope, query indexes, ports, and event-after-commit behavior.
- **E2E**: exact methods/paths/envelopes/errors/Swagger, cookies/CSRF, permission matrix, PII redaction, CRUD-like management without delete, CSV export, lifecycle/bulk partial success, readiness/histories, multipart upload/replace/withdraw/verify, lookups, and enrollment readiness.
- **Scale/security**: 10,000-record query evidence, bounded file memory, log/Swagger/response disclosure scans, architecture scans, and full Foundation/IAM/Organization/Catalog/Batches regression.

## Project Structure

### Documentation (this feature)

```text
specs/007-admissions/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── admissions-http.contract.md
│   └── admissions-public-ports.contract.md
└── tasks.md
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma
├── migrations/*_admissions/migration.sql
└── seeds/admissions.ts

src/modules/admissions/
├── admissions.module.ts
├── admissions/
│   ├── admission.controller.ts
│   ├── admission.service.ts
│   ├── admission.repository.ts
│   ├── admission.policy.ts
│   └── dto/
├── applicants/
│   ├── applicant.repository.ts
│   └── applicant.policy.ts
├── documents/
│   ├── admission-document.controller.ts
│   ├── admission-document.service.ts
│   ├── admission-document.repository.ts
│   └── dto/
├── readiness/admission-readiness.service.ts
├── lookups/admissions-lookups.service.ts
├── events/admissions.events.ts
├── mappers/admission.mapper.ts
└── types/
    ├── admissions.types.ts
    ├── admissions-reference.port.ts
    └── admissions-enrollment.port.ts

src/modules/identity/types/employee-reference.port.ts
src/core/exceptions/admissions.exceptions.ts
src/database/prisma-error.mapper.ts
src/app.module.ts

test/unit/admissions/
test/integration/admissions/
test/e2e/admissions/
```

**Structure Decision**: Use one dedicated Admissions module with cohesive applicant, document, readiness, and lookup subcapabilities. Cross-domain facts flow through typed public ports; repositories never cross module ownership.

## Post-Design Constitution Re-check

All fourteen gates remain PASS after Phase 1. The design has exact endpoint coverage, transport/business/data separation, no cross-module repository reads, explicit transactions and append-only enforcement, storage abstraction, durable idempotency, permission and scope rules, and no speculative Student/Finance functionality. The only approved contract delta is stricter admission archival: the implementation work must update §4.5 from optional to required archive reason before the endpoint is accepted.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Canonical §4.5 currently marks an admission archive reason optional; approved spec requires it | The user explicitly resolved cancellation as reason-required archival for historical auditability | Keeping it optional would violate the approved feature decision. Implementation must amend the canonical table and its frontend schema/test in the same change, eliminating the deviation. |
