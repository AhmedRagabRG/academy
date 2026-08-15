import { DomainException, type ErrorDetail } from './domain.exception';

/**
 * The closed Expense Management error union from
 * `specs/010-expense-management/contracts/expenses-api.md`. Clients switch on
 * `code` and never parse prose, so these strings are contract, not copy.
 *
 * Several codes carry a supporting figure (`currentVersion`, `fromStatus`,
 * `maxBytes`). Those are surfaced as a `details` entry whose `field` names the
 * figure, because the shared error envelope has no other typed slot for them.
 */

function figure(field: string, value: string): ErrorDetail[] {
  return [{ field, message: value }];
}

export class ExpenseNotFoundException extends DomainException {
  constructor() {
    super('NOT_FOUND', 'طلب المصروف غير موجود', 404);
  }
}

export class ExpenseAttachmentNotFoundException extends DomainException {
  constructor() {
    super('NOT_FOUND', 'المرفق غير موجود', 404);
  }
}

export class ExpenseOutOfScopeException extends DomainException {
  constructor() {
    super('out-of-scope', 'هذا الطلب خارج نطاق الفروع المسموح بها', 403);
  }
}

export class ExpenseVersionConflictException extends DomainException {
  constructor(public readonly currentVersion: number) {
    super(
      'VERSION_CONFLICT',
      'تم تعديل هذا الطلب بواسطة موظف آخر. حدّث الصفحة ثم أعد المحاولة.',
      409,
      figure('currentVersion', String(currentVersion)),
    );
  }
}

/**
 * Raised for every illegal workflow move — editing an approved request,
 * approving something not submitted, archiving a draft. `fromStatus` tells the
 * client what the server actually saw, which is the only useful thing to show
 * when two people act at once.
 */
export class ExpenseInvalidStatusException extends DomainException {
  constructor(
    public readonly fromStatus: string,
    public readonly attempted: string,
  ) {
    super(
      'INVALID_STATUS',
      'لا يمكن تنفيذ هذا الإجراء في الحالة الحالية',
      409,
      [
        { field: 'fromStatus', message: fromStatus },
        { field: 'attempted', message: attempted },
      ],
    );
  }
}

export class ExpenseInvalidCategoryException extends DomainException {
  constructor(field: 'categoryId' | 'subcategoryId') {
    super('INVALID_CATEGORY', 'التصنيف المحدد غير موجود أو غير مفعّل', 422, [
      { field, message: 'not-found-or-inactive' },
    ]);
  }
}

export class ExpenseValidationException extends DomainException {
  constructor(details: ErrorDetail[] = [], message = 'توجد بيانات غير صالحة') {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

export class ExpenseFileTooLargeException extends DomainException {
  constructor(public readonly maxBytes: number) {
    super(
      'FILE_TOO_LARGE',
      'حجم الملف يتجاوز الحد المسموح به',
      413,
      figure('maxBytes', String(maxBytes)),
    );
  }
}

export class ExpenseUnsupportedFileTypeException extends DomainException {
  constructor(public readonly accepted: readonly string[]) {
    super(
      'UNSUPPORTED_FILE_TYPE',
      'نوع الملف غير مدعوم. المسموح: PDF أو JPG أو PNG',
      422,
      figure('accepted', accepted.join(',')),
    );
  }
}

/** A zero-byte or truncated upload that no type sniffing can classify. */
export class ExpenseFileUnreadableException extends DomainException {
  constructor() {
    super('VALIDATION_ERROR', 'تعذّرت قراءة الملف المرفوع', 422, [
      { field: 'file', message: 'unreadable' },
    ]);
  }
}

/** Submission requires at least one supporting document. */
export class ExpenseAttachmentRequiredException extends DomainException {
  constructor() {
    super(
      'VALIDATION_ERROR',
      'يجب إرفاق مستند واحد على الأقل قبل الإرسال',
      422,
      [{ field: 'attachments', message: 'at-least-one-required' }],
    );
  }
}
