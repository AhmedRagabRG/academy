import { DomainException } from './domain.exception';

export class ProgramNotBatchableException extends DomainException {
  constructor() {
    super('PROGRAM_NOT_BATCHABLE', 'المنتج المحدد لا يدعم الدفعات', 422);
  }
}

export class BatchCodeLockedException extends DomainException {
  constructor() {
    super('CODE_LOCKED', 'لا يمكن تعديل رمز الدفعة بعد فتح التسجيل', 409, [
      { field: 'code', message: 'Batch code is permanently locked' },
    ]);
  }
}

export class BatchCapacityExceededException extends DomainException {
  constructor() {
    super(
      'CAPACITY_EXCEEDED',
      'لا يمكن أن تقل السعة عن عدد الطلاب الحالي',
      409,
    );
  }
}

export class BatchNotReadyException extends DomainException {
  constructor() {
    super('NOT_READY', 'الدفعة غير جاهزة لفتح التسجيل', 409);
  }
}

export class BatchDependencyUnavailableException extends DomainException {
  constructor() {
    super('SERVICE_UNAVAILABLE', 'تعذر التحقق من بيانات التسجيل حالياً', 503);
  }
}

export class BatchHistoryImmutableException extends DomainException {
  constructor() {
    super(
      'HISTORY_IMMUTABLE',
      'لا يمكن تعديل أو حذف السجل المالي أو سجل دورة الحياة',
      409,
    );
  }
}
