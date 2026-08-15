# Phase 1 Design: Data Model

**Date**: 2026-08-05  
**Status**: Design Complete  
**Next**: Implementation (tasks.md)

## Entity Definitions

### ExpenseRequest

Core entity representing a single expense submission with lifecycle tracking.

#### Fields

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `id` | UUID | ✓ | ✓ | Primary key; generated on creation |
| `expenseNumber` | String | ✓ | ✓ | Auto-generated human-readable identifier (e.g., "EXP-001-2026-08-05") |
| `branchId` | UUID | ✓ | | Foreign key to Branch; scopes expense to branch |
| `categoryId` | UUID | ✓ | | Foreign key to ExpenseCategory (Organization Lookup); immutable after creation |
| `subcategoryId` | UUID | ✓ | | Foreign key to ExpenseSubcategory (Organization Lookup); immutable after creation |
| `requestedById` | UUID | ✓ | | Foreign key to User; employee who requested the expense |
| `expenseDate` | Date | ✓ | | Date when expense was incurred (YYYY-MM-DD format) |
| `description` | String | ✓ | | Business description of expense (e.g., "Office supplies for Q3"); 1-1000 chars |
| `amount` | Decimal | ✓ | | Expense amount as decimal string (e.g., "15000.00"); must be > 0 |
| `currency` | String | ✓ | | ISO 4217 currency code (e.g., "SAR"); immutable after creation |
| `precision` | Integer | ✓ | | Minor-unit digit count for currency (e.g., 2 for SAR); immutable |
| `status` | Enum | ✓ | | Current state: Draft, Submitted, UnderReview, Approved, Rejected, Returned, Archived |
| `isArchived` | Boolean | ✓ | | Soft-delete flag; true when expense is archived; false by default |
| `version` | Integer | ✓ | | Optimistic concurrency control; incremented on every update |
| `createdAt` | DateTime | ✓ | | ISO 8601 UTC timestamp; immutable after creation |
| `updatedAt` | DateTime | ✓ | | ISO 8601 UTC timestamp; updated on every modification |

#### Validation Rules

- `expenseNumber`: Auto-generated; cannot be manually set or modified
- `branchId`: Must reference an existing active branch; immutable
- `categoryId`: Must reference a valid expense category from Organization Lookups; immutable
- `subcategoryId`: Must reference a valid subcategory under the selected category; immutable
- `requestedById`: Must reference an authenticated employee with expenses.create permission
- `expenseDate`: Must be ≤ today (cannot be in the future)
- `description`: Required, min 5 chars, max 1000 chars
- `amount`: Decimal value > 0; validated as string comparison
- `currency`: Must be a valid ISO 4217 code (e.g., "SAR")
- `precision`: Must match currency standard (2 for SAR, etc.)
- `status`: Transitions governed by approval state machine (see Workflow section below)

#### State Transitions

```
Draft (initial)
  ↓ [submit] → Submitted
  ↓ [cancel] → (deleted, not persisted)

Submitted
  ↓ [review] → UnderReview (Finance Manager initiated)
  ↓ [edit] → rejected, cannot edit in this state

UnderReview
  ↓ [approve] → Approved
  ↓ [reject] → Rejected
  ↓ [return] → Returned

Approved (read-only)
  ↓ [archive] → Archived (optional)

Rejected (terminal)
  ↓ [archive] → Archived (optional)

Returned
  ↓ [edit] → allowed
  ↓ [resubmit] → Submitted
  ↓ [cancel] → (delete draft)

Archived (terminal for reporting)
  (no transitions; available for audit/reporting queries only)
```

#### Business Rules

- Once submitted, cannot be edited unless returned
- Once approved, becomes read-only and cannot be edited
- Once rejected, cannot be edited or resubmitted
- Returned requests can be edited and resubmitted
- Archival is optional; archived records remain queryable

---

### ExpenseAttachment

File metadata and storage reference for supporting documents.

#### Fields

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `id` | UUID | ✓ | ✓ | Primary key; generated on creation |
| `expenseRequestId` | UUID | ✓ | | Foreign key to ExpenseRequest; ownership |
| `fileName` | String | ✓ | | Original filename; used for download (e.g., "receipt.pdf") |
| `fileReference` | String | ✓ | | Reference returned by storage service; location handle |
| `mimeType` | String | ✓ | | MIME type (e.g., "application/pdf", "image/jpeg") |
| `fileSize` | Integer | ✓ | | Size in bytes; validates <= max upload size |
| `uploadAttemptId` | String | ✓ | ✓ | Idempotency key; prevents duplicate uploads |
| `uploadedAt` | DateTime | ✓ | | ISO 8601 UTC timestamp; immutable |
| `uploadedById` | UUID | ✓ | | Foreign key to User; employee who uploaded |

#### Validation Rules

- `expenseRequestId`: Must reference an existing expense request
- `fileName`: Must be provided; max 255 chars
- `fileReference`: Provided by storage service; cannot be null or empty
- `mimeType`: Must be one of: application/pdf, image/jpeg, image/jpg, image/png
- `fileSize`: Must be > 0 and ≤ configured max (e.g., 10 MB)
- `uploadAttemptId`: Must be unique across all attachments; provided by client to enable idempotent retries

#### Business Rules

- Multiple attachments per expense request allowed
- Cannot be deleted if expense is Approved or Rejected (read-only)
- Can be added/removed if expense is Draft or Returned
- Deletion calls storage service to remove physical file
- Idempotency: if uploadAttemptId already exists, return existing attachment (no-op)

---

### ExpenseApprovalHistory

Immutable record of each status transition and approval action.

#### Fields

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| `id` | UUID | ✓ | ✓ | Primary key; generated on creation |
| `expenseRequestId` | UUID | ✓ | | Foreign key to ExpenseRequest; reference to approved request |
| `action` | Enum | ✓ | | Action taken: Create, Submit, Review, Approve, Reject, Return, Archive |
| `previousStatus` | String | ✓ | | Status before this action (e.g., "Draft") |
| `newStatus` | String | ✓ | | Status after this action (e.g., "Submitted") |
| `performedById` | UUID | ✓ | | Foreign key to User; actor who performed the action |
| `performedAt` | DateTime | ✓ | | ISO 8601 UTC timestamp; immutable |
| `comment` | String | | | Optional comment/reason (e.g., "Missing invoice attachment"); max 1000 chars |

#### Validation Rules

- `expenseRequestId`: Must reference an existing expense request
- `action`: Must be one of: Create, Submit, Review, Approve, Reject, Return, Archive
- `previousStatus` / `newStatus`: Must be valid expense statuses
- `performedById`: Must reference an authenticated user
- `comment`: Optional; max 1000 chars

#### Business Rules

- **Immutable**: No UPDATE or DELETE allowed; only INSERT
- One history entry per state transition
- All approval decisions (Approve, Reject, Return) create history entries with comment
- Queryable for audit trail and reporting
- Ordered chronologically by performedAt for display

---

## Relationships

```
ExpenseRequest (1) ──→ (M) ExpenseAttachment
    │
    ├─→ Branch (reference)
    ├─→ ExpenseCategory (Organization Lookup)
    ├─→ ExpenseSubcategory (Organization Lookup)
    ├─→ User (requestedBy)
    └─→ (M) ExpenseApprovalHistory (immutable)
        └─→ User (performedBy)

ExpenseAttachment (N) ──→ (1) ExpenseRequest
    └─→ User (uploadedBy)
```

---

## Database Schema (Prisma)

```prisma
model ExpenseRequest {
  id               String   @id @default(cuid())
  expenseNumber    String   @unique
  branchId         String
  categoryId       String   // Organization Lookup reference
  subcategoryId    String   // Organization Lookup reference
  requestedById    String   // User ID
  expenseDate      DateTime @db.Date
  description      String
  amount           String   // Decimal as string (e.g., "15000.00")
  currency         String   // ISO 4217 code
  precision        Int
  status           String   // Enum: Draft, Submitted, UnderReview, Approved, Rejected, Returned, Archived
  isArchived       Boolean  @default(false)
  version          Int      @default(1)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  attachments      ExpenseAttachment[]
  approvalHistory  ExpenseApprovalHistory[]

  @@index([branchId])
  @@index([categoryId])
  @@index([subcategoryId])
  @@index([requestedById])
  @@index([status])
  @@index([isArchived])
  @@index([createdAt])
}

model ExpenseAttachment {
  id               String   @id @default(cuid())
  expenseRequestId String
  fileName         String
  fileReference    String   // Storage service reference
  mimeType         String
  fileSize         Int
  uploadAttemptId  String   @unique
  uploadedAt       DateTime @default(now())
  uploadedById     String

  expenseRequest   ExpenseRequest @relation(fields: [expenseRequestId], references: [id], onDelete: Cascade)

  @@index([expenseRequestId])
  @@index([uploadedById])
}

model ExpenseApprovalHistory {
  id               String   @id @default(cuid())
  expenseRequestId String
  action           String   // Enum: Create, Submit, Review, Approve, Reject, Return, Archive
  previousStatus   String
  newStatus        String
  performedById    String
  performedAt      DateTime @default(now())
  comment          String?

  expenseRequest   ExpenseRequest @relation(fields: [expenseRequestId], references: [id], onDelete: Cascade)

  @@index([expenseRequestId])
  @@index([performedById])
  @@index([performedAt])
}
```

---

## Indexes

Performance indexes for common query patterns:

| Entity | Index Fields | Purpose |
|--------|--------------|---------|
| ExpenseRequest | (branchId, status) | Filter by branch and status (list view) |
| ExpenseRequest | (categoryId) | Filter by category |
| ExpenseRequest | (requestedById) | Find expenses by requester |
| ExpenseRequest | (status, createdAt DESC) | List active expenses, sorted by date |
| ExpenseRequest | (isArchived, updatedAt DESC) | Filter active/archived, sorted by date |
| ExpenseAttachment | (expenseRequestId) | Find attachments for an expense |
| ExpenseApprovalHistory | (expenseRequestId, performedAt DESC) | Audit trail for an expense |

---

## Design Decisions

### Decimal Strings for Money

Amounts stored as decimal strings (e.g., `"15000.00"`) per Constitution API Contract Bindings. This prevents floating-point precision errors and enables correct rounding in reporting layer.

### Optimistic Concurrency

`version` field enables concurrent approvals by multiple Finance Managers. Mismatch → HTTP 409 conflict; caller retries.

### Immutable History

ApprovalHistory records cannot be modified or deleted. Enforced at repository layer; only INSERT operations allowed.

### Soft Delete via Archived Status

`isArchived` boolean supports compliance requirement for maintaining historical records while excluding archived from default list results.

### Expense Number Auto-Generation

Human-readable `expenseNumber` (e.g., "EXP-001-2026-08-05") improves usability over relying on UUID. Generated server-side to ensure uniqueness.

### No Hard Cascade Deletes

ExpenseRequest deletion is prevented (soft-deleted via Archived). Cascade is not used; explicit archive workflow required.

---

## Next Phase: Contracts

Data model design complete. API contract definitions in `/contracts/expenses-api.md`.
