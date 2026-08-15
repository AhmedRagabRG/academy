import { describe, expect, it } from '@jest/globals';
import { ExpensesPolicy } from '../../../src/modules/accounting/policies/expenses.policy';
import { ExpenseStatus } from '../../../src/modules/accounting/types/expense.types';

const policy = new ExpensesPolicy();

/** Minimal valid magic-number prefixes, so the sniffer sees a real signature. */
const PDF = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(64)]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64),
]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(64)]);
const TEXT = Buffer.from('just some text, definitely not a document');

const file = (buffer: Buffer, size = buffer.length, mimetype = 'application/pdf') => ({
  mimetype,
  size,
  buffer,
});

describe('ExpensesPolicy', () => {
  describe('assertVersion', () => {
    it('accepts a matching version', () => {
      expect(() => policy.assertVersion(3, 3)).not.toThrow();
    });

    it('reports the current version on mismatch', () => {
      expect(() => policy.assertVersion(4, 3)).toThrow(
        expect.objectContaining({ code: 'VERSION_CONFLICT' }),
      );
    });
  });

  describe('transitions', () => {
    it.each([
      [ExpenseStatus.DRAFT, ExpenseStatus.SUBMITTED],
      [ExpenseStatus.RETURNED, ExpenseStatus.SUBMITTED],
      [ExpenseStatus.SUBMITTED, ExpenseStatus.UNDER_REVIEW],
      [ExpenseStatus.SUBMITTED, ExpenseStatus.APPROVED],
      [ExpenseStatus.UNDER_REVIEW, ExpenseStatus.REJECTED],
      [ExpenseStatus.UNDER_REVIEW, ExpenseStatus.RETURNED],
      [ExpenseStatus.APPROVED, ExpenseStatus.ARCHIVED],
      [ExpenseStatus.REJECTED, ExpenseStatus.ARCHIVED],
    ])('allows %s → %s', (from, to) => {
      expect(() => policy.assertTransition(from, to)).not.toThrow();
    });

    it.each([
      [ExpenseStatus.DRAFT, ExpenseStatus.APPROVED],
      [ExpenseStatus.APPROVED, ExpenseStatus.SUBMITTED],
      [ExpenseStatus.REJECTED, ExpenseStatus.SUBMITTED],
      [ExpenseStatus.ARCHIVED, ExpenseStatus.SUBMITTED],
      [ExpenseStatus.SUBMITTED, ExpenseStatus.ARCHIVED],
    ])('refuses %s → %s', (from, to) => {
      expect(() => policy.assertTransition(from, to)).toThrow(
        expect.objectContaining({ code: 'INVALID_STATUS' }),
      );
    });

    it('never lets a rejected request re-enter the workflow', () => {
      expect(() =>
        policy.assertTransition(ExpenseStatus.REJECTED, ExpenseStatus.SUBMITTED),
      ).toThrow();
    });
  });

  describe('editability', () => {
    it.each([ExpenseStatus.DRAFT, ExpenseStatus.RETURNED])(
      'allows editing in %s',
      (status) => {
        expect(() => policy.assertEditable(status)).not.toThrow();
      },
    );

    it.each([
      ExpenseStatus.SUBMITTED,
      ExpenseStatus.UNDER_REVIEW,
      ExpenseStatus.APPROVED,
      ExpenseStatus.REJECTED,
      ExpenseStatus.ARCHIVED,
    ])('refuses editing in %s', (status) => {
      expect(() => policy.assertEditable(status)).toThrow(
        expect.objectContaining({ code: 'INVALID_STATUS' }),
      );
    });
  });

  describe('decidability', () => {
    it.each([ExpenseStatus.SUBMITTED, ExpenseStatus.UNDER_REVIEW])(
      'allows a decision in %s',
      (status) => {
        expect(() => policy.assertDecidable(status, 'approve')).not.toThrow();
      },
    );

    it('refuses a decision on a draft', () => {
      expect(() =>
        policy.assertDecidable(ExpenseStatus.DRAFT, 'approve'),
      ).toThrow();
    });
  });

  describe('archivability', () => {
    it.each([ExpenseStatus.APPROVED, ExpenseStatus.REJECTED])(
      'allows archiving a settled %s request',
      (status) => {
        expect(() => policy.assertArchivable(status)).not.toThrow();
      },
    );

    it('refuses archiving a draft — that is a cancellation, not an archive', () => {
      expect(() => policy.assertArchivable(ExpenseStatus.DRAFT)).toThrow();
    });
  });

  describe('attachments', () => {
    it('requires at least one before submission', () => {
      expect(() => policy.assertHasAttachments(0)).toThrow(
        expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      );
      expect(() => policy.assertHasAttachments(1)).not.toThrow();
    });
  });

  describe('reasons', () => {
    it('requires a reason to reject or return', () => {
      expect(() => policy.assertReason(ExpenseStatus.REJECTED)).toThrow();
      expect(() => policy.assertReason(ExpenseStatus.RETURNED, 'no')).toThrow();
      expect(() =>
        policy.assertReason(ExpenseStatus.REJECTED, 'over budget'),
      ).not.toThrow();
    });

    it('does not require a reason to approve', () => {
      expect(() => policy.assertReason(ExpenseStatus.APPROVED)).not.toThrow();
    });

    it('caps comment length', () => {
      expect(() => policy.assertCommentLength('x'.repeat(1001))).toThrow();
      expect(() => policy.assertCommentLength('x'.repeat(1000))).not.toThrow();
    });
  });

  describe('amount', () => {
    it.each(['0', '0.00', '-5.00', 'abc', '1.234'])('refuses %s', (amount) => {
      expect(() => policy.assertPositiveAmount(amount)).toThrow();
    });

    it.each(['0.01', '15000.00', '7'])('accepts %s', (amount) => {
      expect(() => policy.assertPositiveAmount(amount)).not.toThrow();
    });
  });

  describe('expense date', () => {
    it('refuses a future date', () => {
      const tomorrow = new Date(Date.now() + 86_400_000);
      expect(() => policy.assertExpenseDateNotFuture(tomorrow)).toThrow();
    });

    it('accepts today', () => {
      expect(() => policy.assertExpenseDateNotFuture(new Date())).not.toThrow();
    });
  });

  describe('assertFileAcceptable', () => {
    const maxBytes = 5 * 1024 * 1024;

    it.each([
      ['pdf', PDF, 'application/pdf'],
      ['png', PNG, 'image/png'],
      ['jpeg', JPEG, 'image/jpeg'],
    ])('accepts a real %s and returns its sniffed type', (_label, buf, expected) => {
      expect(policy.assertFileAcceptable(file(buf), maxBytes)).toBe(expected);
    });

    it('refuses a file whose bytes are not a supported document', () => {
      expect(() => policy.assertFileAcceptable(file(TEXT), maxBytes)).toThrow(
        expect.objectContaining({ code: 'UNSUPPORTED_FILE_TYPE' }),
      );
    });

    it('ignores a spoofed mimetype and trusts the bytes', () => {
      // Declared as a PDF, actually plain text — the sniffer must win.
      expect(() =>
        policy.assertFileAcceptable(
          file(TEXT, TEXT.length, 'application/pdf'),
          maxBytes,
        ),
      ).toThrow(expect.objectContaining({ code: 'UNSUPPORTED_FILE_TYPE' }));
    });

    it('refuses an oversized but otherwise valid file', () => {
      expect(() =>
        policy.assertFileAcceptable(file(PDF, maxBytes + 1), maxBytes),
      ).toThrow(expect.objectContaining({ code: 'FILE_TOO_LARGE' }));
    });

    it('refuses an empty upload', () => {
      expect(() =>
        policy.assertFileAcceptable(file(Buffer.alloc(0), 0), maxBytes),
      ).toThrow(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
    });
  });
});
