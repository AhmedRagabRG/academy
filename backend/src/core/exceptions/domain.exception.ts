export interface ErrorDetail {
  field: string;
  message: string;
}
export class DomainException extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
  }
}
export class ValidationException extends DomainException {
  constructor(
    details?: ErrorDetail[],
    code = 'VALIDATION_ERROR',
    message = 'توجد بيانات غير صالحة. راجع الحقول المميزة.',
  ) {
    super(code, message, 422, details);
  }
}
export class UnauthenticatedException extends DomainException {
  constructor() {
    super('UNAUTHORIZED', 'يجب تسجيل الدخول أولاً', 401);
  }
}
export class ForbiddenException extends DomainException {
  constructor() {
    super('FORBIDDEN', 'ليس لديك صلاحية لتنفيذ هذا الإجراء', 403);
  }
}
export class OutOfScopeException extends DomainException {
  constructor() {
    super('out-of-scope', 'هذا السجل خارج نطاق صلاحياتك', 403);
  }
}
export class NotFoundException extends DomainException {
  constructor() {
    super('NOT_FOUND', 'السجل غير موجود', 404);
  }
}
export class VersionConflictException extends DomainException {
  constructor(public readonly currentVersion: number) {
    super(
      'VERSION_CONFLICT',
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
export class DuplicateException extends DomainException {
  constructor(code = 'DUPLICATE_VALUE') {
    super(code, 'القيمة مستخدمة بالفعل', 409);
  }
}
export class InvalidTransitionException extends DomainException {
  constructor(code = 'INVALID_TRANSITION') {
    super(code, 'لا يمكن تغيير حالة السجل بهذه الطريقة', 409);
  }
}
export class NotReadyException extends DomainException {
  constructor() {
    super('NOT_READY', 'السجل غير جاهز لهذا الإجراء', 409);
  }
}
export class DependencyNotFoundException extends DomainException {
  constructor() {
    super('DEPENDENCY_NOT_FOUND', 'السجل المرتبط غير موجود', 422);
  }
}
export class DependencyInUseException extends DomainException {
  constructor() {
    super('DEPENDENCY_IN_USE', 'لا يمكن حذف سجل مستخدم', 409);
  }
}
export class FileTooLargeException extends DomainException {
  constructor(public readonly limit: number) {
    super('FILE_TOO_LARGE', 'حجم الملف يتجاوز الحد المسموح به', 413, [
      { field: 'file', message: String(limit) },
    ]);
  }
}
export class UnsupportedFileTypeException extends DomainException {
  constructor(public readonly acceptedTypes: readonly string[]) {
    super('UNSUPPORTED_FILE_TYPE', 'نوع الملف غير مدعوم', 422);
  }
}
export class FileUnreadableException extends DomainException {
  constructor() {
    super('file-unreadable', 'تعذر قراءة الملف', 422);
  }
}
