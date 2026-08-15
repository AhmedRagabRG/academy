# API Contract: Expense Management Endpoints

**Status**: Design Complete  
**Base Path**: `/api/v1`  
**Module**: Accounting (Expenses)

## Overview

All endpoints follow the Constitution API Contract Bindings:
- Response envelope: `{success: true, data, meta}` for lists
- Error envelope: `{success: false, error: {code, message, details}}`
- Pagination: `page` (1-based) and `pageSize` (default 20, max 100)
- IDs: UUID strings
- Timestamps: ISO 8601 UTC with milliseconds
- Dates: ISO 8601 date-only (YYYY-MM-DD)
- Money: `{amount: string, currency: string, precision: number}`
- Concurrency: `version` field on all entities; `expectedVersion` on writes; 409 on mismatch

---

## Endpoints

### 1. Create Expense Request

**Endpoint**: `POST /api/v1/expenses`

**Authentication**: Required (Bearer token)

**Authorization**: Required permission: `expenses.create`

**Description**: Create a new expense request in Draft status. Only the authenticated user can create requests for themselves.

#### Request Body

```json
{
  "branchId": "uuid-string",
  "categoryId": "uuid-string",
  "subcategoryId": "uuid-string",
  "expenseDate": "2026-08-05",
  "description": "Office supplies for Q3",
  "amount": "15000.00",
  "currency": "SAR"
}
```

**Field Validation**:
- `branchId`: Required; must be a valid UUID
- `categoryId`: Required; must be a valid UUID; must exist in Organization Lookups
- `subcategoryId`: Required; must be a valid UUID; must be a valid subcategory of categoryId
- `expenseDate`: Required; ISO 8601 date; must be ≤ today
- `description`: Required; string; 5-1000 characters
- `amount`: Required; decimal string; must be > 0 (e.g., "15000.00")
- `currency`: Required; ISO 4217 code (e.g., "SAR")

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "expenseNumber": "EXP-001-2026-08-05",
    "branchId": "uuid-string",
    "categoryId": "uuid-string",
    "subcategoryId": "uuid-string",
    "requestedById": "uuid-string",
    "expenseDate": "2026-08-05",
    "description": "Office supplies for Q3",
    "amount": "15000.00",
    "currency": "SAR",
    "precision": 2,
    "status": "Draft",
    "isArchived": false,
    "version": 1,
    "createdAt": "2026-08-05T10:00:00.000Z",
    "updatedAt": "2026-08-05T10:00:00.000Z",
    "permissions": {
      "canEdit": true,
      "canSubmit": false,
      "canApprove": false,
      "canReject": false,
      "canReturn": false,
      "canArchive": false
    }
  }
}
```

**Error Responses**:
- `400 VALIDATION_ERROR`: Invalid field values or missing required fields
- `401 UNAUTHORIZED`: Missing or invalid authentication token
- `403 FORBIDDEN`: User lacks `expenses.create` permission
- `422 INVALID_CATEGORY`: Category or subcategory not found in Organization Lookups

---

### 2. Get Expense Request

**Endpoint**: `GET /api/v1/expenses/:id`

**Authentication**: Required

**Authorization**: User can view their own expenses; Finance Managers can view all; others see `403 out-of-scope`

**Description**: Retrieve full details of a single expense request, including attachment list and approval history.

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "expenseNumber": "EXP-001-2026-08-05",
    "branchId": "uuid-string",
    "categoryId": "uuid-string",
    "subcategoryId": "uuid-string",
    "requestedById": "uuid-string",
    "expenseDate": "2026-08-05",
    "description": "Office supplies for Q3",
    "amount": "15000.00",
    "currency": "SAR",
    "precision": 2,
    "status": "Submitted",
    "isArchived": false,
    "version": 2,
    "createdAt": "2026-08-05T10:00:00.000Z",
    "updatedAt": "2026-08-05T10:15:00.000Z",
    "attachments": [
      {
        "id": "uuid-string",
        "fileName": "receipt.pdf",
        "mimeType": "application/pdf",
        "fileSize": 125000,
        "uploadedAt": "2026-08-05T10:10:00.000Z",
        "uploadedBy": {
          "id": "uuid-string",
          "name": "محمد أحمد"
        }
      }
    ],
    "approvalHistory": [
      {
        "id": "uuid-string",
        "action": "Create",
        "previousStatus": null,
        "newStatus": "Draft",
        "performedBy": {
          "id": "uuid-string",
          "name": "محمد أحمد"
        },
        "performedAt": "2026-08-05T10:00:00.000Z",
        "comment": null
      },
      {
        "id": "uuid-string",
        "action": "Submit",
        "previousStatus": "Draft",
        "newStatus": "Submitted",
        "performedBy": {
          "id": "uuid-string",
          "name": "محمد أحمد"
        },
        "performedAt": "2026-08-05T10:15:00.000Z",
        "comment": null
      }
    ],
    "permissions": {
      "canEdit": false,
      "canSubmit": false,
      "canApprove": true,
      "canReject": true,
      "canReturn": true,
      "canArchive": false
    }
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: Missing authentication
- `403 out-of-scope`: User not authorized to view this expense
- `404 NOT_FOUND`: Expense request not found

---

### 3. Update Expense Request (Draft or Returned)

**Endpoint**: `PATCH /api/v1/expenses/:id`

**Authentication**: Required

**Authorization**: User can edit their own draft/returned expenses; others see `403 FORBIDDEN`

**Description**: Update expense request. Only allowed in Draft or Returned status.

#### Request Body

```json
{
  "expectedVersion": 2,
  "expenseDate": "2026-08-05",
  "description": "Updated office supplies for Q3",
  "amount": "16000.00",
  "categoryId": "uuid-string",
  "subcategoryId": "uuid-string"
}
```

**Field Validation**:
- `expectedVersion`: Required; must match current version (optimistic concurrency)
- Other fields: Optional; only provided fields are updated

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "expenseNumber": "EXP-001-2026-08-05",
    "status": "Returned",
    "version": 3,
    "updatedAt": "2026-08-05T10:30:00.000Z",
    "permissions": { /* ... */ }
  }
}
```

**Error Responses**:
- `400 VALIDATION_ERROR`: Invalid field values
- `401 UNAUTHORIZED`: Missing authentication
- `403 FORBIDDEN`: Cannot edit this expense (status not Draft/Returned, or not owner)
- `404 NOT_FOUND`: Expense not found
- `409 VERSION_CONFLICT`: `expectedVersion` mismatch

```json
{
  "success": false,
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "الإصدار المتوقع لا يطابق الإصدار الحالي",
    "details": [
      {
        "field": "expectedVersion",
        "message": "متوقع: 2, الحالي: 3"
      }
    ],
    "currentVersion": 3
  }
}
```

---

### 4. Submit Expense Request

**Endpoint**: `POST /api/v1/expenses/:id/submit`

**Authentication**: Required

**Authorization**: User can submit their own draft/returned expenses

**Description**: Submit expense request from Draft or Returned status to Submitted status. Triggers validation and notification.

#### Request Body

```json
{
  "expectedVersion": 2
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "status": "Submitted",
    "version": 3,
    "updatedAt": "2026-08-05T10:45:00.000Z",
    "permissions": { /* ... */ }
  }
}
```

**Error Responses**:
- `400 VALIDATION_ERROR`: Missing required fields (e.g., no attachments when required)
- `401 UNAUTHORIZED`: Missing authentication
- `403 FORBIDDEN`: User not authorized to submit
- `404 NOT_FOUND`: Expense not found
- `409 INVALID_STATUS`: Expense not in Draft or Returned status
- `409 VERSION_CONFLICT`: `expectedVersion` mismatch

---

### 5. List Expenses

**Endpoint**: `GET /api/v1/expenses`

**Authentication**: Required

**Authorization**: Users see their own expenses; Finance Managers see all; filtering by branch is automatic

**Description**: List expense requests with search, filter, sort, and pagination.

#### Query Parameters

```
?page=1&pageSize=20&status=Submitted&categoryId=uuid&branchId=uuid&sortBy=createdAt&sortOrder=desc&search=office
```

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `page` | integer | | 1 | Page number (1-based) |
| `pageSize` | integer | | 20 | Items per page; max 100 |
| `status` | string | | | Filter by status (Draft, Submitted, UnderReview, Approved, Rejected, Returned, Archived) |
| `categoryId` | string | | | Filter by expense category UUID |
| `subcategoryId` | string | | | Filter by expense subcategory UUID |
| `branchId` | string | | | Filter by branch UUID; only user's authorized branches |
| `requestedBy` | string | | | Filter by requester UUID |
| `approvedBy` | string | | | Filter by approver UUID |
| `dateFrom` | date | | | Filter expenses >= this date (YYYY-MM-DD) |
| `dateTo` | date | | | Filter expenses <= this date (YYYY-MM-DD) |
| `sortBy` | string | | createdAt | Sort field (createdAt, expenseDate, amount, status) |
| `sortOrder` | string | | desc | Sort direction (asc, desc) |
| `search` | string | | | Search in expenseNumber and description |
| `includeArchived` | boolean | | false | Include archived expenses in results |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-string",
      "expenseNumber": "EXP-001-2026-08-05",
      "branchId": "uuid-string",
      "categoryId": "uuid-string",
      "subcategoryId": "uuid-string",
      "requestedById": "uuid-string",
      "expenseDate": "2026-08-05",
      "description": "Office supplies for Q3",
      "amount": "15000.00",
      "currency": "SAR",
      "status": "Submitted",
      "isArchived": false,
      "version": 2,
      "createdAt": "2026-08-05T10:00:00.000Z",
      "updatedAt": "2026-08-05T10:15:00.000Z",
      "permissions": { /* ... */ }
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**Error Responses**:
- `400 VALIDATION_ERROR`: Invalid query parameter values
- `401 UNAUTHORIZED`: Missing authentication
- `403 out-of-scope`: User not authorized for requested branch filter

---

### 6. Approve Expense Request

**Endpoint**: `POST /api/v1/expenses/:id/approve`

**Authentication**: Required

**Authorization**: Required permission: `expenses.approve`

**Description**: Approve expense request (Finance Manager action). Transitions to Approved status (read-only).

#### Request Body

```json
{
  "expectedVersion": 2,
  "comment": "Approved for payment"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `expectedVersion` | integer | ✓ | Current version for optimistic concurrency |
| `comment` | string | | Optional comment (max 1000 chars) |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "status": "Approved",
    "version": 3,
    "updatedAt": "2026-08-05T11:00:00.000Z",
    "permissions": {
      "canEdit": false,
      "canSubmit": false,
      "canApprove": false,
      "canReject": false,
      "canReturn": false,
      "canArchive": true
    }
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: Missing authentication
- `403 FORBIDDEN`: User lacks `expenses.approve` permission
- `404 NOT_FOUND`: Expense not found
- `409 INVALID_STATUS`: Expense not in UnderReview status
- `409 VERSION_CONFLICT`: `expectedVersion` mismatch

---

### 7. Reject Expense Request

**Endpoint**: `POST /api/v1/expenses/:id/reject`

**Authentication**: Required

**Authorization**: Required permission: `expenses.approve`

**Description**: Reject expense request (Finance Manager action). Transitions to Rejected status (terminal).

#### Request Body

```json
{
  "expectedVersion": 2,
  "comment": "Missing invoice attachment"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `expectedVersion` | integer | ✓ | Current version |
| `comment` | string | | Optional comment (max 1000 chars) |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "status": "Rejected",
    "version": 3,
    "updatedAt": "2026-08-05T11:00:00.000Z"
  }
}
```

**Error Responses**: Same as Approve

---

### 8. Return Expense Request

**Endpoint**: `POST /api/v1/expenses/:id/return`

**Authentication**: Required

**Authorization**: Required permission: `expenses.approve`

**Description**: Return expense request for clarification/correction. Transitions to Returned status; allows employee to edit and resubmit.

#### Request Body

```json
{
  "expectedVersion": 2,
  "comment": "Please clarify business purpose and provide invoices"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `expectedVersion` | integer | ✓ | Current version |
| `comment` | string | | Optional comment (max 1000 chars) |

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "status": "Returned",
    "version": 3,
    "updatedAt": "2026-08-05T11:00:00.000Z",
    "permissions": {
      "canEdit": true,
      "canSubmit": true,
      "canApprove": false,
      "canReject": false,
      "canReturn": false,
      "canArchive": false
    }
  }
}
```

**Error Responses**: Same as Approve

---

### 9. Upload Attachment

**Endpoint**: `POST /api/v1/expenses/:id/attachments`

**Authentication**: Required

**Authorization**: Owner of expense can upload; Finance can upload for audit

**Content-Type**: `multipart/form-data`

**Description**: Upload supporting document (receipt, invoice, quotation, etc.)

#### Request

```
POST /api/v1/expenses/uuid-string/attachments
Content-Type: multipart/form-data

file: <binary file>
uploadAttempt: "unique-idempotency-key"
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `file` | File | ✓ | PDF, JPG, JPEG, or PNG; max 10 MB |
| `uploadAttempt` | string | ✓ | Unique idempotency key; enables retry without duplicate |

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "fileName": "receipt.pdf",
    "mimeType": "application/pdf",
    "fileSize": 125000,
    "uploadedAt": "2026-08-05T10:10:00.000Z",
    "uploadedBy": {
      "id": "uuid-string",
      "name": "محمد أحمد"
    }
  }
}
```

**Error Responses**:
- `400 VALIDATION_ERROR`: Missing file or uploadAttempt
- `401 UNAUTHORIZED`: Missing authentication
- `403 FORBIDDEN`: Not authorized to upload
- `404 NOT_FOUND`: Expense not found
- `409 INVALID_STATUS`: Expense is Approved or Rejected (read-only)
- `413 FILE_TOO_LARGE`: File exceeds max size
- `422 UNSUPPORTED_FILE_TYPE`: File type not supported (must be PDF, JPG, JPEG, PNG)

---

### 10. Delete Attachment

**Endpoint**: `DELETE /api/v1/expenses/:id/attachments/:attachmentId`

**Authentication**: Required

**Authorization**: Expense owner or uploader can delete

**Description**: Remove attachment from expense request. Only allowed in Draft or Returned status.

#### Response (204 No Content)

No response body.

**Error Responses**:
- `401 UNAUTHORIZED`: Missing authentication
- `403 FORBIDDEN`: Not authorized to delete
- `404 NOT_FOUND`: Expense or attachment not found
- `409 INVALID_STATUS`: Cannot delete attachment (expense is Approved/Rejected)

---

### 11. Archive Expense Request

**Endpoint**: `POST /api/v1/expenses/:id/archive`

**Authentication**: Required

**Authorization**: Finance Managers only

**Description**: Archive approved/rejected expense request. Soft-delete (isArchived = true).

#### Request Body

```json
{
  "expectedVersion": 3
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "status": "Archived",
    "isArchived": true,
    "version": 4,
    "updatedAt": "2026-08-05T12:00:00.000Z"
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: Missing authentication
- `403 FORBIDDEN`: User lacks `expenses.approve` permission
- `404 NOT_FOUND`: Expense not found
- `409 INVALID_STATUS`: Only Approved/Rejected can be archived
- `409 VERSION_CONFLICT`: `expectedVersion` mismatch

---

## Error Codes

| Code | HTTP | Meaning | Retryable |
|------|------|---------|-----------|
| VALIDATION_ERROR | 422 | Field validation failed | No |
| UNAUTHORIZED | 401 | Missing/invalid authentication | No |
| FORBIDDEN | 403 | Permission denied | No |
| out-of-scope | 403 | Request outside user's branch scope | No |
| NOT_FOUND | 404 | Resource not found | No |
| VERSION_CONFLICT | 409 | Optimistic concurrency mismatch | Yes |
| INVALID_STATUS | 409 | Invalid status transition | No |
| INVALID_CATEGORY | 422 | Category/subcategory not found | No |
| FILE_TOO_LARGE | 413 | Attachment exceeds max size | No |
| UNSUPPORTED_FILE_TYPE | 422 | File type not supported | No |

---

## Permissions

The following permission keys control access:

| Permission Key | Scope | Use |
|----------------|-------|-----|
| `expenses.create` | Branch | Create new expense requests |
| `expenses.view.own` | Branch | View own expense requests |
| `expenses.edit.own` | Branch | Edit own Draft/Returned expenses |
| `expenses.submit` | Branch | Submit own expenses |
| `expenses.approve` | Organization | Approve, reject, or return expenses |
| `expenses.archive` | Organization | Archive expenses |

---

## Pagination Example

Request:
```
GET /api/v1/expenses?page=2&pageSize=10&status=Approved
```

Response:
```json
{
  "success": true,
  "data": [ /* 10 items */ ],
  "meta": {
    "total": 45,
    "page": 2,
    "limit": 10,
    "totalPages": 5
  }
}
```

Out-of-range request (page 99):
```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 45,
    "page": 99,
    "limit": 10,
    "totalPages": 5
  }
}
```

HTTP 200 with empty results (not 404).

---

## Next Phase: Quickstart Validation Guide

API contract complete. End-to-end validation scenarios in `quickstart.md`.
