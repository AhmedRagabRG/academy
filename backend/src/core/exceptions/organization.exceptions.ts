import { DomainException } from './domain.exception';

export class DateOverlapException extends DomainException {
  constructor() {
    super('DATE_OVERLAP', 'يتداخل نطاق التاريخ مع فصل أكاديمي آخر', 409);
  }
}

export class EntityInUseException extends DomainException {
  constructor(message = 'لا يمكن أرشفة سجل مستخدم') {
    super('ENTITY_IN_USE', message, 409);
  }
}

export class OrganizationInvalidStateException extends DomainException {
  constructor(message = 'لا يمكن تنفيذ الإجراء في الحالة الحالية') {
    super('INVALID_STATE', message, 409);
  }
}

export class OrganizationDuplicateException extends DomainException {
  constructor() {
    super('DUPLICATE_VALUE', 'القيمة مستخدمة بالفعل', 409);
  }
}

export class ImmutableOrganizationFieldException extends DomainException {
  constructor(field: 'name' | 'code') {
    super('VALIDATION_ERROR', 'لا يمكن تعديل الهوية القانونية للمؤسسة', 422, [
      { field, message: 'هذا الحقل للقراءة فقط بعد الإعداد الأولي' },
    ]);
  }
}
