import { DomainException } from './domain.exception';

export class DuplicateApplicantException extends DomainException {
  constructor() {
    super(
      'DUPLICATE_APPLICANT',
      'يوجد متقدم مطابق؛ اختر قرار معالجة التكرار',
      409,
    );
  }
}

export class AdmissionBatchRuleException extends DomainException {
  constructor(message = 'اختيار البرنامج والدفعة غير صالح') {
    super('BATCH_RULE_VIOLATED', message, 422);
  }
}

export class AdmissionEligibilityException extends DomainException {
  constructor(reasonCodes: readonly string[] = []) {
    super(
      'ELIGIBILITY_FAILED',
      'الاختيار الأكاديمي غير مؤهل للقبول',
      409,
      reasonCodes.map((code) => ({ field: 'selection', message: code })),
    );
  }
}

export class AdmissionAlreadyUnderReviewException extends DomainException {
  constructor() {
    super('ALREADY_UNDER_REVIEW', 'يقوم موظف آخر بمراجعة هذا القبول', 409);
  }
}

export class AdmissionHistoryImmutableException extends DomainException {
  constructor() {
    super('HISTORY_IMMUTABLE', 'لا يمكن تعديل أو حذف سجل القبول التاريخي', 409);
  }
}

export class AdmissionOutOfScopeException extends DomainException {
  constructor() {
    super('OUT_OF_SCOPE', 'هذا القبول خارج نطاق الفروع المسموح بها', 403);
  }
}

export class AdmissionUploadFailedException extends DomainException {
  constructor() {
    super('UPLOAD_FAILED', 'تعذر حفظ المستند. حاول مرة أخرى.', 500);
  }
}

export class AdmissionDependencyUnavailableException extends DomainException {
  constructor() {
    super(
      'SERVICE_UNAVAILABLE',
      'تعذر التحقق من البيانات المرتبطة حالياً',
      503,
    );
  }
}

export class AdmissionIdempotencyConflictException extends DomainException {
  constructor() {
    super('IDEMPOTENCY_CONFLICT', 'مفتاح الطلب مستخدم لطلب مختلف', 409);
  }
}

export class AdmissionCurrentPointerConflictException extends DomainException {
  constructor() {
    super(
      'CURRENT_POINTER_CONFLICT',
      'السجل الحالي لا ينتمي إلى القبول المحدد',
      409,
    );
  }
}
