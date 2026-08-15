import { DomainException, type ErrorDetail } from './domain.exception';

/**
 * The closed error union for Students. Every code, HTTP status and Arabic
 * message is fixed by docs/api-data-requirements.html §4.6 — there is no
 * generic fallback, because clients switch on `code` and never parse prose.
 */

export class StudentNotFoundException extends DomainException {
  constructor() {
    super('not-found', 'لم يتم العثور على الطالب المطلوب.', 404);
  }
}

export class StudentForbiddenException extends DomainException {
  constructor() {
    super('forbidden', 'لا تملك صلاحية تنفيذ هذا الإجراء.', 403);
  }
}

export class StudentOutOfScopeException extends DomainException {
  constructor() {
    super('out-of-scope', 'هذا الطالب خارج نطاق الفروع المصرّح لك بها.', 403);
  }
}

export class StudentVersionConflictException extends DomainException {
  constructor(public readonly currentVersion: number) {
    super(
      'version-conflict',
      'تم تعديل هذا السجل بواسطة موظف آخر. حدّث الصفحة ثم أعد المحاولة.',
      409,
      [
        {
          field: 'expectedVersion',
          message: `currentVersion=${currentVersion}`,
        },
      ],
    );
  }
}

export class StudentValidationFailedException extends DomainException {
  constructor(details: ErrorDetail[]) {
    super(
      'validation-failed',
      'توجد بيانات غير صالحة. راجع الحقول المميزة.',
      422,
      details,
    );
  }
}

export class InvalidStudentStatusTransitionException extends DomainException {
  constructor(
    public readonly fromStatus: string,
    public readonly toStatus: string,
    public readonly allowed: readonly string[],
  ) {
    super(
      'invalid-status-transition',
      'هذا التغيير في الحالة غير مسموح به.',
      409,
      [{ field: 'toStatus', message: `allowed=${allowed.join(',')}` }],
    );
  }
}

export class StudentReasonRequiredException extends DomainException {
  constructor() {
    super('reason-required', 'يجب إدخال سبب لتنفيذ هذا الإجراء.', 422, [
      { field: 'reason', message: 'مطلوب' },
    ]);
  }
}

export class StudentArchivedReadOnlyException extends DomainException {
  constructor() {
    super(
      'archived-read-only',
      'الطالب مؤرشف. فعّل السجل أولًا قبل التعديل.',
      409,
    );
  }
}

export class DuplicateStudentCodeException extends DomainException {
  constructor() {
    super('duplicate-student-code', 'كود الطالب مستخدم بالفعل.', 409);
  }
}

export class AdmissionNotReadyException extends DomainException {
  constructor(reasons: readonly string[] = []) {
    super(
      'admission-not-ready',
      'طلب القبول غير جاهز للتسجيل.',
      409,
      reasons.map((reason) => ({ field: 'admissionId', message: reason })),
    );
  }
}

export class AdmissionVersionStaleException extends DomainException {
  constructor() {
    super(
      'admission-version-stale',
      'تم تعديل طلب القبول بعد قراءته. أعد المحاولة ببيانات محدثة.',
      409,
    );
  }
}

export class EnrollmentBatchRuleViolatedException extends DomainException {
  constructor() {
    super(
      'enrollment-batch-rule-violated',
      'البرنامج الاحترافي يتطلب مجموعة، ولا تقبل الدبلومات والدورات أي مجموعة.',
      422,
      [{ field: 'academicTarget.batchId', message: 'قاعدة المجموعة' }],
    );
  }
}

export class StudentUnsupportedFileTypeException extends DomainException {
  constructor(public readonly acceptedTypes: readonly string[]) {
    super('unsupported-file-type', 'نوع الملف غير مدعوم.', 422, [
      { field: 'file', message: acceptedTypes.join(',') },
    ]);
  }
}

export class StudentFileTooLargeException extends DomainException {
  constructor(public readonly limit: number) {
    super('file-too-large', 'حجم الملف يتجاوز الحد المسموح به.', 413, [
      { field: 'file', message: String(limit) },
    ]);
  }
}

/** Retryable — a zero-byte or otherwise unreadable upload. */
export class StudentFileUnreadableException extends DomainException {
  constructor() {
    super(
      'file-unreadable',
      'تعذر قراءة الملف. تأكد من سلامته وأعد المحاولة.',
      422,
    );
  }
}

export class StudentDocumentArchivedException extends DomainException {
  constructor() {
    super('document-archived', 'هذا المستند مؤرشف ولا يقبل التعديل.', 409);
  }
}

export class StudentNoteContentEmptyException extends DomainException {
  constructor() {
    super('note-content-empty', 'لا يمكن حفظ ملاحظة فارغة.', 422, [
      { field: 'content', message: 'مطلوب' },
    ]);
  }
}

/** Retryable. Prefer the `unavailable` union variant on the summary read. */
export class StudentFinanceUnavailableException extends DomainException {
  constructor() {
    super('finance-unavailable', 'الملخص المالي غير متاح حاليًا.', 503);
  }
}

/** Retryable. */
export class StudentServiceUnavailableException extends DomainException {
  constructor() {
    super(
      'service-unavailable',
      'الخدمة غير متاحة حاليًا. حاول مرة أخرى.',
      503,
    );
  }
}

export const STUDENT_RETRYABLE_CODES: readonly string[] = [
  'service-unavailable',
  'finance-unavailable',
  'file-unreadable',
];
