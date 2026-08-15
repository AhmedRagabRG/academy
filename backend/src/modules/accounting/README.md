# Accounting Module

## Overview

The Accounting module manages organization expense requests and approval workflows across all branches. Employees submit expense requests for operational needs, while Finance Managers review and approve them.

## Features

- **Expense Request Management**: Create, update, submit, and archive expense requests
- **Approval Workflow**: Finance Managers can approve, reject, or return expenses
- **Immutable Audit Trail**: Complete approval history for compliance
- **Attachment Support**: Upload supporting documents (receipts, invoices)
- **Search & Filtering**: Find expenses by branch, category, status, date range
- **Optimistic Concurrency**: Version-based conflict detection
- **Soft Deletes**: Archive expenses instead of permanent deletion

## Architecture

### Entities

- **ExpenseRequest**: Core entity for expense submissions
- **ExpenseAttachment**: File metadata and storage references
- **ExpenseApprovalHistory**: Immutable approval history records

### Services

- **ExpenseService**: CRUD operations and expense lifecycle
- **ExpenseApprovalService**: Approval workflow transitions
- **ExpenseSearchService**: Search, filter, and list operations
- **ExpenseEventEmitter**: Domain event emission for audit

### Controllers

- **ExpenseController**: REST API endpoints for all operations

## API Endpoints

### Expense Management
- `POST /api/v1/expenses` - Create expense request
- `GET /api/v1/expenses` - List expenses with filtering
- `GET /api/v1/expenses/:id` - Get expense details
- `PATCH /api/v1/expenses/:id` - Update draft expense
- `POST /api/v1/expenses/:id/submit` - Submit expense
- `POST /api/v1/expenses/:id/archive` - Archive expense

### Approval Workflow
- `POST /api/v1/expenses/:id/approve` - Approve expense
- `POST /api/v1/expenses/:id/reject` - Reject expense
- `POST /api/v1/expenses/:id/return` - Return for clarification

### Attachments
- `POST /api/v1/expenses/:id/attachments` - Upload attachment
- `DELETE /api/v1/expenses/:id/attachments/:attachmentId` - Delete attachment

## Workflow States

```
Draft
  ↓ [submit] → Submitted
  ↓ [cancel] → (deleted)

Submitted
  ↓ [review] → Under Review (Finance Manager)
  
Under Review
  ↓ [approve] → Approved (read-only)
  ↓ [reject] → Rejected (terminal)
  ↓ [return] → Returned (can re-edit)

Returned
  ↓ [edit] → allowed
  ↓ [resubmit] → Submitted

Approved/Rejected
  ↓ [archive] → Archived (optional)
```

## Permissions

- `expenses.create` - Create new expenses
- `expenses.view.own` - View own expenses
- `expenses.edit.own` - Edit own draft/returned expenses
- `expenses.submit` - Submit expenses
- `expenses.approve` - Approve/reject/return expenses
- `expenses.archive` - Archive expenses

## Database Schema

The module uses Prisma ORM with PostgreSQL. Key tables:

- `ExpenseRequest` - Main expense table with status tracking
- `ExpenseAttachment` - File metadata with idempotency support
- `ExpenseApprovalHistory` - Immutable approval records

### Indexes

- `(branchId, status)` - Filter by branch and status
- `(categoryId)` - Filter by category
- `(requestedById)` - Find user's expenses
- `(status, createdAt DESC)` - Sort by date
- `(isArchived)` - Filter active/archived

## Domain Events

The module emits events for audit trail and integration:

- `expense.created` - Expense created
- `expense.updated` - Expense updated
- `expense.submitted` - Expense submitted
- `expense.approved` - Expense approved
- `expense.rejected` - Expense rejected
- `expense.returned` - Expense returned
- `expense.archived` - Expense archived

## Usage Examples

### Create Expense
```bash
curl -X POST http://localhost:3000/api/v1/expenses \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "uuid",
    "categoryId": "uuid",
    "subcategoryId": "uuid",
    "expenseDate": "2026-08-05",
    "description": "Office supplies",
    "amount": "15000.00",
    "currency": "SAR"
  }'
```

### Submit Expense
```bash
curl -X POST http://localhost:3000/api/v1/expenses/{id}/submit \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expectedVersion": 1}'
```

### Approve Expense
```bash
curl -X POST http://localhost:3000/api/v1/expenses/{id}/approve \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expectedVersion": 2, "comment": "Approved"}'
```

## Testing

Run integration tests:
```bash
npm run test:e2e -- src/modules/accounting/__tests__/integration/
```

## Future Enhancements

- Expense payment processing integration
- Financial reporting and GL integration
- Advanced approval workflows
- Bulk expense operations
- Expense analytics and dashboards
