# Phase 0 Research: Expense Management Module

**Date**: 2026-08-05  
**Status**: Research Complete  
**Next Phase**: Phase 1 Design (data-model.md, contracts/, quickstart.md)

## Overview

This document consolidates research findings and architectural decisions for the Expense Management module. The specification had no [NEEDS CLARIFICATION] markers, so research validates known decisions and documents alternatives considered.

---

## Research Topics

### 1. Approval Workflow State Machine

**Decision**: Three-action approval model (approve, reject, return)

**Rationale**:
- The specification explicitly requires: Draft → Submitted → Under Review → {Approved, Rejected, Returned}
- Simple enough for v1; supports the core business rule: employees submit, Finance reviews, Finance makes three decisions
- Matches the domain's complexity without over-engineering

**Alternatives Considered**:
- *Extended workflow with intermediate states* (Escalated, Suspended, Conditional Approval): Rejected because specification does not require these; Principle XX prohibits speculative abstraction
- *Conditional logic based on amount thresholds*: Not in specification; deferred to future versions

**Implementation**: State machine pattern in approval service with explicit transition guards

---

### 2. Immutable Approval History

**Decision**: Create immutable approval history entries; prevent modification or deletion

**Rationale**:
- Constitution Principle X (Audit Ready): "Every business operation that creates, transitions, or archives a record MUST emit a domain event"
- Financial compliance and audit requirements demand tamper-proof trails
- Immutability ensures data integrity without requiring external audit system

**Alternatives Considered**:
- *Soft-delete with restore capability*: Rejected; immutable is stronger and simpler
- *Event sourcing for full history*: Rejected; approval history entries themselves serve this purpose

**Implementation**: Repository prevents UPDATE/DELETE on ApprovalHistory; only INSERT allowed. Domain events emitted for each transition.

---

### 3. Attachment Storage Strategy

**Decision**: Use shared storage service for uploads; business module manages metadata only

**Rationale**:
- Constitution Principle IX: "Uploaded files MUST be stored on the local server and managed through a dedicated storage service"
- Existing storage service handles file I/O and path management
- Business module remains agnostic to storage implementation
- Supports future migration to object storage (e.g., S3) without code changes

**Alternatives Considered**:
- *Direct filesystem access in accounting module*: Rejected; violates Principle IX
- *External cloud storage (S3, etc.)*: Deferred; storage service currently uses local filesystem

**Implementation**: 
- Attachment DTOs contain file reference (returned from storage service) and metadata
- Repository stores reference and metadata; storage service handles actual files
- Deletion removes metadata and calls storage service to delete physical file

---

### 4. Expense Category Management

**Decision**: Categories and subcategories are Organization Lookups; accounting module reads, does not manage

**Rationale**:
- Specification states: "Expense Categories are managed through Organization Lookups"
- Constitution Principle II (Modular Architecture): "Modules MUST communicate only through public services or domain events"
- Organization module owns lookups; accounting reads them for validation
- Avoids cross-module database access

**Alternatives Considered**:
- *Expense module manages categories*: Rejected; specification explicitly delegates to Organization
- *Hardcoded categories*: Rejected; lookups are configurable per organization

**Implementation**: 
- Expense service calls organization reference service to fetch valid categories
- Validation fails if category/subcategory not found
- No cross-module database access; category validation uses service call

---

### 5. Currency and Money Handling

**Decision**: Store amount as decimal string; currency as ISO 4217 code; precision as minor-unit count

**Rationale**:
- Constitution API Contract Bindings: "Money MUST be `{amount: string, currency: string, precision: number}`"
- Decimal strings prevent floating-point arithmetic errors
- Precision field enables correct rounding in reporting layer (when GL integration occurs)
- ISO 4217 codes are standard and system-agnostic

**Alternatives Considered**:
- *Single currency (fixed)*: Rejected; specification allows for future multi-currency; storing currency code adds minimal complexity
- *Integers (minor units)*: Rejected; specification and API contract require decimal string format

**Implementation**: 
- ExpenseRequest stores `amount`, `currency`, and `precision`
- Business logic validates amount > 0 as decimal comparison
- No arithmetic performed in backend (arithmetic deferred to reporting layer per Assumption)

---

### 6. Versioning and Optimistic Concurrency

**Decision**: Implement optimistic concurrency control with version field and expectedVersion assertion

**Rationale**:
- Constitution API Contract Bindings: "Every persisted business entity MUST carry `version: number`"
- Prevents lost updates in concurrent environments (multiple Finance Managers reviewing)
- Matches existing pattern used in other modules

**Alternatives Considered**:
- *Pessimistic locking*: Rejected; loses update notifications if approval is slow
- *No concurrency control*: Rejected; violates constitution

**Implementation**:
- ExpenseRequest.version incremented on every update
- PATCH requests include expectedVersion
- Mismatch → HTTP 409 with code `VERSION_CONFLICT` and currentVersion in response

---

### 7. Attachment Idempotency

**Decision**: Attachment uploads use idempotency key (`uploadAttempt`); check before version assert

**Rationale**:
- Constitution API Contract Bindings: "Expense attachment upload" uses `uploadAttempt` key
- Network retries must not create duplicate attachments
- Idempotency check before version assert ensures genuine retries resolve as no-ops

**Alternatives Considered**:
- *Version-based idempotency*: Rejected; constitution specifies uploadAttempt for expense module
- *No idempotency*: Rejected; violates constitution binding

**Implementation**:
- Attachment upload endpoint checks if `uploadAttempt` already processed
- If yes, return existing attachment (no-op)
- If no, create new attachment and store uploadAttempt
- Version assert happens after idempotency check

---

### 8. Search and Filtering Strategy

**Decision**: Database-level filtering and pagination; normalize search queries per constitution

**Rationale**:
- Success Criterion SC-005: Sub-1-second search on 10,000+ records
- Database indexes on commonly filtered fields (branch, status, category, requestedBy)
- Search normalization (Arabic folding) happens server-side per Constitution API Contract Bindings
- Pagination via offset (page + pageSize) per documented format

**Alternatives Considered**:
- *Elasticsearch or Solr*: Rejected; specification does not require full-text search; database indexes sufficient for filtering
- *Client-side filtering*: Rejected; violates performance requirements and security (data exposure)

**Implementation**:
- Expenses.repository.findMany() with Prisma query filters
- Database indexes on branch, status, category, subcategory, requestedBy, createdAt, updatedAt
- Pagination metadata in response meta field

---

### 9. Audit Events and Event Emission

**Decision**: Emit domain events for all critical actions; events consumed by audit system (future)

**Rationale**:
- Constitution Principle X: "Every business operation... MUST emit a domain event"
- Enables audit logging without modifying business services
- Decouples accounting logic from audit concerns

**Events to Emit**:
- `ExpenseCreated` - expense request created
- `ExpenseUpdated` - draft edited
- `ExpenseSubmitted` - draft submitted
- `ExpenseApproved` - expense approved
- `ExpenseRejected` - expense rejected
- `ExpenseReturned` - expense returned
- `ExpenseArchived` - expense archived
- `AttachmentAdded` - attachment uploaded
- `AttachmentRemoved` - attachment deleted

**Alternatives Considered**:
- *Inline audit logging*: Rejected; couples business logic to audit layer
- *External audit system with polling*: Rejected; events are push-based and real-time

**Implementation**: NestJS EventEmitter2 for domain event emission; audit service subscribes to events

---

### 10. Soft Deletes and Archival

**Decision**: Implement soft delete via `Archived` status; archive flag in database schema

**Rationale**:
- Constitution Principle XV: "Business entities MUST be archived rather than permanently deleted"
- Spec requirement: "Expense requests are never permanently deleted"
- Archived records remain queryable for reporting and auditing

**Alternatives Considered**:
- *Hard delete*: Rejected; violates constitution and specification
- *Separate archive table*: Rejected; single table with flag is simpler

**Implementation**:
- ExpenseRequest.isArchived boolean field (default false)
- Archive service method sets isArchived=true and triggers event
- List queries exclude archived by default unless explicitly filtered
- Archived records remain readable for reporting queries

---

## Decisions Summary

| Decision | Status | Rationale |
|----------|--------|-----------|
| Three-action approval workflow | Firm | Specification requirement; matches domain complexity |
| Immutable approval history | Firm | Audit compliance; Constitution Principle X |
| Shared storage service for uploads | Firm | Constitution Principle IX |
| Categories via Organization Lookups | Firm | Specification requirement; modular separation |
| Money as decimal string + currency | Firm | Constitution API Contract Binding |
| Optimistic concurrency control | Firm | Constitution API Contract Binding |
| Attachment idempotency (uploadAttempt) | Firm | Constitution API Contract Binding |
| Database-level search/filter | Firm | Performance requirement SC-005 |
| Domain event emission for audit | Firm | Constitution Principle X |
| Soft delete via Archived status | Firm | Constitution Principle XV; specification |

---

## Technical Dependencies

- **Prisma ORM**: Schema definition and migrations for Expense tables
- **NestJS EventEmitter2**: Domain event emission
- **class-validator**: DTO validation
- **Shared storage service**: File upload management
- **Shared permission guard**: Authorization enforcement
- **Organization reference service**: Category lookup validation

---

## Next Phase: Phase 1 Design

Research complete. Proceeding to Phase 1 which will deliver:

1. **data-model.md** — Complete entity definitions with fields, relationships, validation rules
2. **contracts/expenses-api.md** — API endpoint contracts with request/response payloads
3. **quickstart.md** — End-to-end validation guide for manual testing
