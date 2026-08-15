import { Injectable } from '@nestjs/common';
import {
  ExpenseAttachmentRequiredException,
  ExpenseFileTooLargeException,
  ExpenseFileUnreadableException,
  ExpenseInvalidStatusException,
  ExpenseUnsupportedFileTypeException,
  ExpenseValidationException,
  ExpenseVersionConflictException,
} from '../../../core/exceptions/accounting.exceptions';
import { sniffMimeType } from '../../../storage/file-signature';
import { uploadConstraint } from '../../../storage/upload.constraints';
import {
  ALLOWED_TRANSITIONS,
  ARCHIVABLE_STATUSES,
  DECIDABLE_STATUSES,
  EDITABLE_STATUSES,
  MAX_COMMENT_LENGTH,
  PAYABLE_STATUSES,
  REASON_REQUIRED_FOR,
  REVIEWABLE_STATUSES,
} from '../types/approval-workflow.types';
import { ExpenseStatus } from '../types/expense.types';

/**
 * Every rule that decides whether an expense action is legal. Keeping them
 * here rather than in the services is what stops "can this be edited?" being
 * answered three different ways by three call sites.
 */
@Injectable()
export class ExpensesPolicy {
  /** Compare-and-swap guard shared by every mutation. */
  assertVersion(current: number, expected: number): void {
    if (current !== expected) {
      throw new ExpenseVersionConflictException(current);
    }
  }

  assertTransition(from: ExpenseStatus, to: ExpenseStatus): void {
    if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
      throw new ExpenseInvalidStatusException(from, to);
    }
  }

  assertEditable(status: ExpenseStatus): void {
    if (!EDITABLE_STATUSES.includes(status)) {
      throw new ExpenseInvalidStatusException(status, 'edit');
    }
  }

  assertDecidable(status: ExpenseStatus, attempted: string): void {
    if (!DECIDABLE_STATUSES.includes(status)) {
      throw new ExpenseInvalidStatusException(status, attempted);
    }
  }

  assertArchivable(status: ExpenseStatus): void {
    if (!ARCHIVABLE_STATUSES.includes(status)) {
      throw new ExpenseInvalidStatusException(status, 'archive');
    }
  }

  /** Only an approved spend can be recorded as having left the account. */
  assertPayable(status: ExpenseStatus): void {
    if (!PAYABLE_STATUSES.includes(status)) {
      throw new ExpenseInvalidStatusException(status, 'pay');
    }
  }

  /**
   * A review is claimed once. Re-claiming an already-claimed request is
   * refused rather than silently reassigning it to whoever asked last.
   */
  assertReviewable(status: ExpenseStatus): void {
    if (!REVIEWABLE_STATUSES.includes(status)) {
      throw new ExpenseInvalidStatusException(status, 'review');
    }
  }

  /** A submitted request must carry evidence; the spec makes this mandatory. */
  assertHasAttachments(count: number): void {
    if (count < 1) throw new ExpenseAttachmentRequiredException();
  }

  assertReason(target: ExpenseStatus, comment?: string): void {
    if (
      REASON_REQUIRED_FOR.includes(target) &&
      (!comment || comment.trim().length < 3)
    ) {
      throw new ExpenseValidationException([
        { field: 'comment', message: 'required-min-3-characters' },
      ]);
    }
    this.assertCommentLength(comment);
  }

  assertCommentLength(comment?: string): void {
    if (comment && comment.length > MAX_COMMENT_LENGTH) {
      throw new ExpenseValidationException([
        { field: 'comment', message: `max-${MAX_COMMENT_LENGTH}-characters` },
      ]);
    }
  }

  assertPositiveAmount(amount: string): void {
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      throw new ExpenseValidationException([
        { field: 'amount', message: 'must-be-greater-than-zero' },
      ]);
    }
  }

  /** An expense cannot be incurred in the future. */
  assertExpenseDateNotFuture(expenseDate: Date): void {
    const today = new Date().toISOString().slice(0, 10);
    if (expenseDate.toISOString().slice(0, 10) > today) {
      throw new ExpenseValidationException([
        { field: 'expenseDate', message: 'must-not-be-in-the-future' },
      ]);
    }
  }

  /**
   * Validates the bytes, not the declared type. A client-supplied `mimetype`
   * is trivially spoofed, so the accepted set is checked against the file's
   * own magic-number signature.
   */
  assertFileAcceptable(
    file: { mimetype: string; size: number; buffer: Buffer },
    maxBytes: number,
  ): string {
    if (file.size <= 0 || !file.buffer || file.buffer.length === 0) {
      throw new ExpenseFileUnreadableException();
    }

    const { acceptedTypes } = uploadConstraint('expense-attachment', maxBytes);

    const sniffed = sniffMimeType(file.buffer);
    if (!sniffed || !acceptedTypes.includes(sniffed)) {
      throw new ExpenseUnsupportedFileTypeException(acceptedTypes);
    }

    // Size is checked after type so a huge unsupported file reports the more
    // actionable reason.
    if (file.size > maxBytes) {
      throw new ExpenseFileTooLargeException(maxBytes);
    }

    return sniffed;
  }
}
