# Phase 1 Design: Quickstart & Validation Guide

**Date**: 2026-08-05  
**Status**: Ready for Manual Testing  
**Next**: Implementation (tasks.md)

## Purpose

This guide documents end-to-end validation scenarios that verify the Expense Management module works as specified. Use these scenarios to:

1. Validate the feature against acceptance criteria
2. Perform manual testing during development
3. Create integration test cases
4. Verify deployment to staging/production

Each scenario is independently testable and maps to one or more user stories from the specification.

---

## Prerequisites

### Test Environment Setup

- **Server**: Backend running on `http://localhost:3000` (or deployed URL)
- **Database**: Fresh database with sample data seeded
- **Authentication**: Test users with appropriate roles

### Test Users

| User | Email | Role | Permissions | Branch |
|------|-------|------|-------------|--------|
| Employee | employee@example.com | Branch Employee | expenses.create, expenses.view.own, expenses.edit.own, expenses.submit | Branch A |
| Finance Manager | manager@example.com | Finance Manager | expenses.approve, expenses.archive | (all) |
| Admin | admin@example.com | Admin | (all) | (all) |

### Test Data

- **Branches**: Branch A, Branch B (IDs needed)
- **Categories**: Office Supplies, Utilities, Maintenance (IDs needed)
- **Subcategories**: Under each category (IDs needed)

---

## Scenario 1: Create and Submit Expense Request

**User Story**: Employee Submits Expense Request (P1)  
**Acceptance Criteria**: AC-1, AC-2, AC-3

### Steps

1. **Authenticate as Employee**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"employee@example.com","password":"password123"}'
   ```
   **Expected**: 200 OK; response contains `token` and `userId`

2. **Create Expense Request (Draft)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "branchId": "BRANCH_A_ID",
       "categoryId": "OFFICE_SUPPLIES_ID",
       "subcategoryId": "SUBCATEGORY_ID",
       "expenseDate": "2026-08-05",
       "description": "Office supplies for Q3",
       "amount": "15000.00",
       "currency": "SAR"
     }'
   ```
   **Expected**: 201 Created
   - `status`: "Draft"
   - `version`: 1
   - `expenseNumber`: Auto-generated (e.g., "EXP-001-2026-08-05")
   - `permissions.canSubmit`: false (no attachments yet)

3. **Upload Attachment (PDF Receipt)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses/EXPENSE_ID/attachments \
     -H "Authorization: Bearer TOKEN" \
     -F "file=@receipt.pdf" \
     -F "uploadAttempt=attempt-1"
   ```
   **Expected**: 201 Created
   - `fileName`: "receipt.pdf"
   - `mimeType`: "application/pdf"

4. **Get Expense to Verify Attachment Added**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `attachments`: Array with 1 item (the receipt)
   - `permissions.canSubmit`: true (now has attachment)

5. **Submit Expense Request**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses/EXPENSE_ID/submit \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"expectedVersion": 1}'
   ```
   **Expected**: 200 OK
   - `status`: "Submitted"
   - `version`: 2

6. **Try to Edit Submitted Expense (Should Fail)**
   ```bash
   curl -X PATCH http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "expectedVersion": 2,
       "description": "Updated description"
     }'
   ```
   **Expected**: 409 INVALID_STATUS
   - Error message: Cannot edit submitted expense

---

## Scenario 2: Finance Manager Approves Expense

**User Story**: Finance Manager Reviews and Approves Expenses (P1)  
**Acceptance Criteria**: AC-1, AC-2, AC-4

### Prerequisites
- Complete Scenario 1 (expense in Submitted status)

### Steps

1. **Authenticate as Finance Manager**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"manager@example.com","password":"password123"}'
   ```
   **Expected**: 200 OK; token obtained

2. **List Submitted Expenses**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/expenses?status=Submitted&pageSize=20" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `data`: Array with at least the expense from Scenario 1
   - `meta.total`: >= 1

3. **Get Expense Details**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `permissions.canApprove`: true
   - `attachments`: Contains the uploaded receipt
   - `approvalHistory`: Array with Create and Submit entries

4. **Approve Expense**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses/EXPENSE_ID/approve \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "expectedVersion": 2,
       "comment": "Approved for payment"
     }'
   ```
   **Expected**: 200 OK
   - `status`: "Approved"
   - `version`: 3
   - `permissions.canEdit`: false (read-only)

5. **Get Expense to Verify Approval History Updated**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `approvalHistory`: Array with 3+ entries (Create, Submit, Approve)
   - Latest entry has `action: "Approve"`, `comment: "Approved for payment"`

6. **Try to Edit Approved Expense (Should Fail)**
   ```bash
   curl -X PATCH http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "expectedVersion": 3,
       "description": "New description"
     }'
   ```
   **Expected**: 403 FORBIDDEN
   - Error message: Approved expenses are read-only

---

## Scenario 3: Finance Manager Rejects and Employee Resubmits

**User Story**: Employee Resubmits a Returned Expense Request (P2)  
**Acceptance Criteria**: AC-1, AC-2, AC-3

### Prerequisites
- Complete Scenario 1 (expense in Submitted status)

### Steps

1. **Authenticate as Finance Manager**
   (Use token from Scenario 2, or re-authenticate)

2. **Get Expense Details**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK; expense in Submitted status

3. **Return Expense for Clarification**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses/EXPENSE_ID/return \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "expectedVersion": 2,
       "comment": "Please clarify business purpose and provide additional documentation"
     }'
   ```
   **Expected**: 200 OK
   - `status`: "Returned"
   - `version`: 3
   - `permissions.canEdit`: true
   - `permissions.canSubmit`: true

4. **Authenticate as Employee**
   (Use original employee token or re-authenticate)

5. **Get Expense to See Return Comment**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `status`: "Returned"
   - `approvalHistory`: Latest entry has `action: "Return"`, `comment: "Please clarify..."`

6. **Update Expense Description**
   ```bash
   curl -X PATCH http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "expectedVersion": 3,
       "description": "Office supplies purchase: 50 notepads, 100 pens, 30 folders for branch office"
     }'
   ```
   **Expected**: 200 OK
   - `version`: 4
   - `description`: Updated text

7. **Resubmit Expense**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses/EXPENSE_ID/submit \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"expectedVersion": 4}'
   ```
   **Expected**: 200 OK
   - `status`: "Submitted"
   - `version`: 5

---

## Scenario 4: Search and Filter Expenses

**User Story**: Search and Filter Expense Requests (P2)  
**Acceptance Criteria**: AC-1, AC-2, AC-3, AC-4

### Prerequisites
- Create 5+ expenses in different statuses and categories

### Steps

1. **Authenticate as Finance Manager**

2. **Filter by Status**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/expenses?status=Approved&pageSize=50" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `data`: All items have `status: "Approved"`

3. **Filter by Category**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/expenses?categoryId=OFFICE_SUPPLIES_ID&pageSize=50" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `data`: All items have matching `categoryId`

4. **Filter by Branch**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/expenses?branchId=BRANCH_A_ID&pageSize=50" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `data`: All items have `branchId: BRANCH_A_ID`

5. **Filter by Date Range**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/expenses?dateFrom=2026-08-01&dateTo=2026-08-31" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `data`: All items have `expenseDate` within range

6. **Search by Expense Number**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/expenses?search=EXP-001" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `data`: Contains only expenses matching "EXP-001"

7. **Pagination Test**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/expenses?page=1&pageSize=2" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `meta.page`: 1
   - `meta.limit`: 2
   - `meta.totalPages`: ceil(total / 2)
   - `data`: Exactly 2 items

   ```bash
   curl -X GET "http://localhost:3000/api/v1/expenses?page=2&pageSize=2" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `data`: Different 2 items (from next page)

---

## Scenario 5: Optimistic Concurrency Control

**User Story**: Version Conflict Detection  
**Acceptance Criteria**: API contract requirement

### Prerequisites
- Create an expense in Draft status

### Steps

1. **User A Gets Expense**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN_A"
   ```
   **Expected**: 200 OK
   - Response includes `version: 1`

2. **User B Also Gets Expense**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN_B"
   ```
   **Expected**: 200 OK
   - Response includes `version: 1`

3. **User A Updates Expense**
   ```bash
   curl -X PATCH http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN_A" \
     -H "Content-Type: application/json" \
     -d '{
       "expectedVersion": 1,
       "description": "Updated by User A"
     }'
   ```
   **Expected**: 200 OK
   - `version: 2`

4. **User B Tries to Update with Stale Version**
   ```bash
   curl -X PATCH http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN_B" \
     -H "Content-Type: application/json" \
     -d '{
       "expectedVersion": 1,
       "description": "Updated by User B"
     }'
   ```
   **Expected**: 409 VERSION_CONFLICT
   ```json
   {
     "success": false,
     "error": {
       "code": "VERSION_CONFLICT",
       "message": "الإصدار المتوقع لا يطابق الإصدار الحالي",
       "currentVersion": 2
     }
   }
   ```

5. **User B Retries with Correct Version**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN_B"
   ```
   **Expected**: 200 OK with `version: 2`

   ```bash
   curl -X PATCH http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN_B" \
     -H "Content-Type: application/json" \
     -d '{
       "expectedVersion": 2,
       "description": "Updated by User B"
     }'
   ```
   **Expected**: 200 OK
   - `version: 3`

---

## Scenario 6: Attachment Idempotency

**User Story**: Retry Safety  
**Acceptance Criteria**: API contract requirement

### Prerequisites
- Create an expense in Draft status

### Steps

1. **Upload Attachment**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses/EXPENSE_ID/attachments \
     -H "Authorization: Bearer TOKEN" \
     -F "file=@receipt.pdf" \
     -F "uploadAttempt=attempt-1"
   ```
   **Expected**: 201 Created
   - `id: "attachment-1"`

2. **Retry Upload with Same uploadAttempt Key**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses/EXPENSE_ID/attachments \
     -H "Authorization: Bearer TOKEN" \
     -F "file=@receipt.pdf" \
     -F "uploadAttempt=attempt-1"
   ```
   **Expected**: 200 OK (not 201)
   - `id: "attachment-1"` (same attachment, not duplicate)

3. **Upload with Different uploadAttempt Key (Should Create New)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses/EXPENSE_ID/attachments \
     -H "Authorization: Bearer TOKEN" \
     -F "file=@invoice.pdf" \
     -F "uploadAttempt=attempt-2"
   ```
   **Expected**: 201 Created
   - `id: "attachment-2"` (new attachment)

4. **Get Expense Attachments**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `attachments`: Array with 2 items (not 3)

---

## Scenario 7: Approval History Immutability

**User Story**: Audit Trail  
**Acceptance Criteria**: Immutable historical records

### Prerequisites
- Create an expense and approve it

### Steps

1. **Get Expense Approval History**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `approvalHistory`: Array with Create, Submit, Approve entries
   - All entries have `performedAt` timestamps in order

2. **Verify History Entry Structure**
   ```json
   {
     "id": "uuid",
     "action": "Approve",
     "previousStatus": "Submitted",
     "newStatus": "Approved",
     "performedBy": {"id": "uuid", "name": "محمد أحمد"},
     "performedAt": "2026-08-05T11:00:00.000Z",
     "comment": "Approved for payment"
   }
   ```
   **Expected**: All required fields present; immutable

3. **Try to Modify History (Backend Should Prevent)**
   - No PATCH/DELETE endpoints exist for approval history
   - Only queryable via GET; immutability enforced at DB layer
   - **Expected**: No way to modify history from API

---

## Scenario 8: Archive Expense (Soft Delete)

**User Story**: Archive Approved and Rejected Expenses (P3)  
**Acceptance Criteria**: AC-1, AC-2

### Prerequisites
- Create and approve an expense

### Steps

1. **Authenticate as Finance Manager**

2. **Get Expense Details**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `status: "Approved"`
   - `isArchived: false`

3. **Archive Expense**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses/EXPENSE_ID/archive \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"expectedVersion": 3}'
   ```
   **Expected**: 200 OK
   - `status: "Archived"`
   - `isArchived: true`
   - `version: 4`

4. **List Active Expenses (Should Exclude Archived)**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/expenses?pageSize=50" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `data`: Does NOT include the archived expense
   - `meta.total`: Decreased by 1

5. **List with Archived Filter**
   ```bash
   curl -X GET "http://localhost:3000/api/v1/expenses?includeArchived=true&pageSize=50" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - `data`: Includes the archived expense
   - `isArchived: true`

6. **Get Archived Expense (Should Still Be Readable)**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: 200 OK
   - Full expense data still available
   - Useful for reporting and audit queries

---

## Scenario 9: Permission-Based Access Control

**User Story**: Authorization  
**Acceptance Criteria**: API contract requirement

### Steps

1. **Employee Tries to Approve Expense (Should Fail)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses/EXPENSE_ID/approve \
     -H "Authorization: Bearer EMPLOYEE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"expectedVersion": 2, "comment": "Approved"}'
   ```
   **Expected**: 403 FORBIDDEN
   - Error code: FORBIDDEN
   - Message: User lacks `expenses.approve` permission

2. **Finance Manager Can Approve**
   ```bash
   curl -X POST http://localhost:3000/api/v1/expenses/EXPENSE_ID/approve \
     -H "Authorization: Bearer MANAGER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"expectedVersion": 2, "comment": "Approved"}'
   ```
   **Expected**: 200 OK

3. **Employee from Branch B Tries to Access Branch A Expense (Out of Scope)**
   ```bash
   curl -X GET http://localhost:3000/api/v1/expenses/EXPENSE_ID \
     -H "Authorization: Bearer EMPLOYEE_B_TOKEN"
   ```
   **Expected**: 403 out-of-scope
   - Error code: "out-of-scope"
   - User is only authorized for Branch B

---

## Performance Verification

### Load Test: 10,000 Expenses

1. **Seed Database**
   - Create 10,000 expense records across multiple branches
   - Vary statuses (Draft, Submitted, Approved, Rejected, Returned, Archived)

2. **Query Performance**
   ```bash
   time curl -X GET "http://localhost:3000/api/v1/expenses?status=Approved&pageSize=50" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: Response < 1 second (per SC-005)

3. **Search Performance**
   ```bash
   time curl -X GET "http://localhost:3000/api/v1/expenses?search=EXP-001" \
     -H "Authorization: Bearer TOKEN"
   ```
   **Expected**: Response < 1 second

---

## Test Summary Checklist

- [ ] Scenario 1: Create and Submit - P1 requirement
- [ ] Scenario 2: Finance Manager Approves - P1 requirement
- [ ] Scenario 3: Return and Resubmit - P2 requirement
- [ ] Scenario 4: Search and Filter - P2 requirement
- [ ] Scenario 5: Concurrency Control - API contract
- [ ] Scenario 6: Attachment Idempotency - API contract
- [ ] Scenario 7: Immutable History - Audit requirement
- [ ] Scenario 8: Archive (Soft Delete) - P3 requirement
- [ ] Scenario 9: Permission Control - Authorization
- [ ] Performance: Sub-1-second queries on 10K records

---

## Next Phase: Implementation

Quickstart validation guide complete. Ready for implementation (`/speckit-tasks`).

For questions or issues during testing, refer to:
- **Data Model**: [data-model.md](data-model.md)
- **API Contract**: [contracts/expenses-api.md](contracts/expenses-api.md)
- **Specification**: [spec.md](spec.md)
