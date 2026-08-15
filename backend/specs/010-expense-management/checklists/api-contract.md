# API Contract Verification Checklist

**Feature**: Accounting Module  
**Date**: 2026-08-05  
**Component**: REST API Endpoints

## Endpoint Coverage

- [x] POST /api/v1/expenses (Create expense request)
- [x] GET /api/v1/expenses (List expense requests with filtering)
- [x] GET /api/v1/expenses/:id (Get expense details)
- [x] PATCH /api/v1/expenses/:id (Update expense request)
- [x] POST /api/v1/expenses/:id/submit (Submit for approval)
- [x] POST /api/v1/expenses/:id/approve (Approve expense)
- [x] POST /api/v1/expenses/:id/reject (Reject expense)
- [x] POST /api/v1/expenses/:id/return (Return for clarification)
- [x] POST /api/v1/expenses/:id/archive (Archive expense)
- [x] POST /api/v1/expenses/:id/attachments (Upload attachment)
- [x] DELETE /api/v1/expenses/:id/attachments/:attachmentId (Delete attachment)

## Request/Response Validation

### CreateExpenseDto
- [x] branchId (required, string)
- [x] categoryId (required, string)
- [x] subcategoryId (required, string)
- [x] expenseDate (required, date)
- [x] description (required, 5-1000 chars)
- [x] amount (required, decimal string > 0)
- [x] currency (required, string)

### UpdateExpenseDto
- [x] expectedVersion (required, number - concurrency control)
- [x] expenseDate (optional, date)
- [x] description (optional, 5-1000 chars)
- [x] amount (optional, decimal string > 0)
- [x] categoryId (optional, string)
- [x] subcategoryId (optional, string)

### ApprovalActionDto
- [x] expectedVersion (required, number)
- [x] comment (optional, string)

### Response Envelope Format
- [x] All responses follow `{ success: true, data, meta? }`
- [x] All errors follow `{ success: false, error }`
- [x] List responses include pagination meta
- [x] Detail responses include calculated permissions

## Status Transitions

- [x] DRAFT → SUBMITTED (submit)
- [x] SUBMITTED → UNDER_REVIEW (auto on submit)
- [x] UNDER_REVIEW → APPROVED (approve)
- [x] UNDER_REVIEW → REJECTED (reject - terminal)
- [x] UNDER_REVIEW → RETURNED (return)
- [x] RETURNED → SUBMITTED (resubmit)
- [x] APPROVED → ARCHIVED (archive)

## Permissions & Authorization

- [x] expenses.create (employee creates expense)
- [x] expenses.edit.own (edit own draft/returned)
- [x] expenses.submit (submit own expense)
- [x] expenses.view.own (view scoped to authorized branches)
- [x] expenses.approve (manager approves/rejects/returns)
- [x] expenses.archive (manager archives approved)

## Field Validation

- [x] Negative amounts rejected (BadRequestException)
- [x] Zero amounts rejected (BadRequestException)
- [x] Required fields enforced (class-validator)
- [x] Description length constraints (5-1000 chars)
- [x] Category/subcategory existence validated
- [x] Branch authorization enforced

## Concurrency & Versioning

- [x] Version field on all expenses
- [x] Version incremented on update
- [x] expectedVersion required on update/approve/reject/return
- [x] Version mismatch triggers ConflictException
- [x] Optimistic concurrency on all state transitions

## Search & Filtering

- [x] Filter by status
- [x] Filter by categoryId
- [x] Filter by subcategoryId
- [x] Filter by requestedBy
- [x] Filter by date range
- [x] Search by expense number or description
- [x] Pagination (page/pageSize, max 100)
- [x] Branch scoping applied

## Attachment Handling

- [x] Upload file with MIME type validation
- [x] Support PDF, JPG, JPEG, PNG formats
- [x] File metadata storage (fileName, fileSize, mimeType)
- [x] Idempotency via uploadAttemptId
- [x] Delete attachment endpoint
- [x] Attachment linked to expense request

## Error Responses

### Validation Errors (400)
- [x] Invalid amount (negative/zero)
- [x] Missing required fields
- [x] Invalid category/subcategory
- [x] Description length invalid

### Conflict Errors (409)
- [x] Version mismatch (optimistic concurrency)
- [x] Invalid status transition (e.g., approve draft)
- [x] Cannot edit submitted/approved/rejected

### Not Found (404)
- [x] Expense request not found
- [x] Attachment not found

### Unauthorized (401/403)
- [x] Missing authentication token
- [x] Insufficient permissions
- [x] Access denied (out-of-scope branch)

## Swagger Documentation

- [x] @ApiTags on controller
- [x] @ApiBearerAuth on controller
- [x] @ApiOperation on each endpoint
- [x] @ApiParam for path parameters
- [x] @ApiQuery for query parameters
- [x] @ApiBody for request bodies
- [x] @ApiResponse for success responses
- [x] @ApiResponse for error responses
- [x] @ApiConsumes for multipart/form-data

## Domain Events

- [x] expense.created event
- [x] expense.updated event
- [x] expense.submitted event
- [x] expense.approved event
- [x] expense.rejected event
- [x] expense.returned event
- [x] expense.archived event
- [x] Event contains actor, timestamp, operation

## Testing

- [x] Unit tests for ExpenseService (create, update, submit, archive)
- [x] Unit tests for ApprovalService (approve, reject, return)
- [x] Unit tests for SearchService (list, filter, pagination)
- [x] Unit tests for Mapper (permissions, transformations)
- [x] Integration tests for full workflows
- [x] Tests verify concurrency control
- [x] Tests verify status transitions
- [x] Tests verify permissions

## Notes

All API contract requirements from specification have been implemented and tested.
