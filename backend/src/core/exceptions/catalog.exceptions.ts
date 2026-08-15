import { DomainException } from './domain.exception';
export class CatalogCodeLockedException extends DomainException {
  constructor() {
    super('CODE_LOCKED', 'لا يمكن تعديل رمز المنتج بعد تفعيله', 409, [
      { field: 'code', message: 'Product code is immutable after activation' },
    ]);
  }
}
export class CatalogAssetException extends DomainException {
  constructor(message = 'ملف المنتج غير صالح') {
    super('INVALID_ASSET', message, 422, [{ field: 'assets', message }]);
  }
}
export class CatalogNotReadyException extends DomainException {
  constructor() {
    super('NOT_READY', 'المنتج غير جاهز للتفعيل', 409);
  }
}
export class CatalogRetryableException extends DomainException {
  constructor() {
    super('SERVICE_UNAVAILABLE', 'الخدمة المرتبطة غير متاحة مؤقتاً', 503);
  }
}
