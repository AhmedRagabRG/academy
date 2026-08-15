export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
  PAID = 'PAID',
  ARCHIVED = 'ARCHIVED',
}

export enum ExpenseApprovalAction {
  CREATE = 'CREATE',
  SUBMIT = 'SUBMIT',
  REVIEW = 'REVIEW',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  RETURN = 'RETURN',
  PAY = 'PAY',
  ARCHIVE = 'ARCHIVE',
}

export interface MoneyValue {
  amount: string;
  currency: string;
  precision: number;
}

export interface ExpenseRequestDomain {
  id: string;
  expenseNumber: string;
  branchId: string;
  categoryId: string;
  subcategoryId: string;
  requestedById: string;
  expenseDate: Date;
  description: string;
  amount: string;
  currency: string;
  precision: number;
  status: ExpenseStatus;
  isArchived: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalHistoryEntry {
  id: string;
  expenseRequestId: string;
  action: ExpenseApprovalAction;
  previousStatus?: string;
  newStatus: string;
  performedById: string;
  performedAt: Date;
  comment?: string;
}

export interface ExpenseAttachmentDomain {
  id: string;
  expenseRequestId: string;
  fileName: string;
  fileReference: string;
  mimeType: string;
  fileSize: number;
  uploadAttemptId: string;
  uploadedAt: Date;
  uploadedById: string;
}

export interface ExpensePermissions {
  canEdit: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canApprove: boolean;
  canReject: boolean;
  canReturn: boolean;
  canMarkPaid: boolean;
  canArchive: boolean;
  canComment: boolean;
}

/**
 * Organization lookup groups backing the category fields. Adding a fee type is
 * a lookup row, never a code change.
 */
export const EXPENSE_CATEGORY_GROUP = 'expense-categories';
export const EXPENSE_SUBCATEGORY_GROUP = 'expense-subcategories';
