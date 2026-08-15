import { ExpenseStatus, ExpenseApprovalAction } from './expense.types';

/**
 * The approval state machine from `data-model.md`.
 *
 * `SUBMITTED → UNDER_REVIEW` has its own `/review` route so a reviewer can
 * claim a request before deciding it. Deciding straight from `SUBMITTED` stays
 * legal, and still records the implicit review step into approval history
 * before the decision, so an unclaimed decision is not missing a state.
 *
 * `APPROVED → PAID` is a separate step under its own permission: approving
 * authorises a spend, paying records that it left the account, and one person
 * holding both is a control decision rather than something this table assumes.
 */
export const ALLOWED_TRANSITIONS: Readonly<
  Record<ExpenseStatus, readonly ExpenseStatus[]>
> = {
  [ExpenseStatus.DRAFT]: [ExpenseStatus.SUBMITTED],
  [ExpenseStatus.SUBMITTED]: [
    ExpenseStatus.UNDER_REVIEW,
    ExpenseStatus.APPROVED,
    ExpenseStatus.REJECTED,
    ExpenseStatus.RETURNED,
  ],
  [ExpenseStatus.UNDER_REVIEW]: [
    ExpenseStatus.APPROVED,
    ExpenseStatus.REJECTED,
    ExpenseStatus.RETURNED,
  ],
  // Returned is the only way back into the editable set.
  [ExpenseStatus.RETURNED]: [ExpenseStatus.SUBMITTED],
  [ExpenseStatus.APPROVED]: [ExpenseStatus.PAID, ExpenseStatus.ARCHIVED],
  [ExpenseStatus.REJECTED]: [ExpenseStatus.ARCHIVED],
  [ExpenseStatus.PAID]: [ExpenseStatus.ARCHIVED],
  [ExpenseStatus.ARCHIVED]: [],
};

/** The statuses whose fields a requester may still change. */
export const EDITABLE_STATUSES: readonly ExpenseStatus[] = [
  ExpenseStatus.DRAFT,
  ExpenseStatus.RETURNED,
];

/** The statuses a Finance Manager may decide on. */
export const DECIDABLE_STATUSES: readonly ExpenseStatus[] = [
  ExpenseStatus.SUBMITTED,
  ExpenseStatus.UNDER_REVIEW,
];

/** Only a settled request may be archived; a draft is cancelled, not archived. */
export const ARCHIVABLE_STATUSES: readonly ExpenseStatus[] = [
  ExpenseStatus.APPROVED,
  ExpenseStatus.REJECTED,
  ExpenseStatus.PAID,
];

/** Only an approved request can be recorded as paid. */
export const PAYABLE_STATUSES: readonly ExpenseStatus[] = [
  ExpenseStatus.APPROVED,
];

/** A review is claimed on a request that has been submitted and not yet claimed. */
export const REVIEWABLE_STATUSES: readonly ExpenseStatus[] = [
  ExpenseStatus.SUBMITTED,
];

export const ACTION_FOR_STATUS: Readonly<
  Partial<Record<ExpenseStatus, ExpenseApprovalAction>>
> = {
  [ExpenseStatus.SUBMITTED]: ExpenseApprovalAction.SUBMIT,
  [ExpenseStatus.UNDER_REVIEW]: ExpenseApprovalAction.REVIEW,
  [ExpenseStatus.APPROVED]: ExpenseApprovalAction.APPROVE,
  [ExpenseStatus.REJECTED]: ExpenseApprovalAction.REJECT,
  [ExpenseStatus.RETURNED]: ExpenseApprovalAction.RETURN,
  [ExpenseStatus.PAID]: ExpenseApprovalAction.PAY,
  [ExpenseStatus.ARCHIVED]: ExpenseApprovalAction.ARCHIVE,
};

/** Rejecting or returning without a reason leaves an unexplainable record. */
export const REASON_REQUIRED_FOR: readonly ExpenseStatus[] = [
  ExpenseStatus.REJECTED,
  ExpenseStatus.RETURNED,
];

export const MAX_COMMENT_LENGTH = 1000;
