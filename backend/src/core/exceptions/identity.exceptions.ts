import { DomainException } from './domain.exception';
export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('invalid_credentials', 'بيانات الدخول غير صحيحة', 401);
  }
}
export class AccountInactiveException extends DomainException {
  constructor() {
    super('ACCOUNT_INACTIVE', 'الحساب غير مفعّل', 403);
  }
}
export class CurrentSessionException extends DomainException {
  constructor() {
    super(
      'INVALID_TRANSITION',
      'لا يمكن إلغاء الجلسة الحالية بهذه الطريقة',
      409,
    );
  }
}
export class RoleInUseException extends DomainException {
  constructor() {
    super('ENTITY_IN_USE', 'لا يمكن أرشفة دور مُسند إلى موظفين', 409);
  }
}
