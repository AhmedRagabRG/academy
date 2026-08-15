import { DomainException, type ErrorDetail } from './domain.exception';

/**
 * The closed Student Finance error union from
 * `docs/api-data-requirements.html` §4.7. Clients switch on `code` and never
 * parse prose, so these strings are contract, not copy. Only
 * `service-unavailable` is retryable — the UI shows a Retry affordance for
 * that code alone.
 *
 * Several codes carry a first-class supporting figure (`remaining`,
 * `collected`, `refundable`, `limit`). Those are surfaced as a `details` entry
 * whose `field` names the figure, because the shared error envelope has no
 * other typed slot for them.
 */

function figure(field: string, value: string): ErrorDetail[] {
  return [{ field, message: value }];
}

export class InvoiceNotFoundException extends DomainException {
  constructor() {
    super('not-found', 'الفاتورة غير موجودة', 404);
  }
}

export class PaymentNotFoundException extends DomainException {
  constructor() {
    super('not-found', 'الدفعة غير موجودة', 404);
  }
}

export class RefundNotFoundException extends DomainException {
  constructor() {
    super('not-found', 'طلب الاسترداد غير موجود', 404);
  }
}

export class FinanceAccountNotFoundException extends DomainException {
  constructor() {
    super('not-found', 'الحساب المالي للطالب غير موجود', 404);
  }
}

export class FinanceOutOfScopeException extends DomainException {
  constructor() {
    super('out-of-scope', 'هذا السجل خارج نطاق الفروع المسموح بها', 403);
  }
}

export class FinanceVersionConflictException extends DomainException {
  constructor(public readonly currentVersion: number) {
    super(
      'version-conflict',
      'تم تعديل هذا السجل بواسطة موظف آخر. حدّث الصفحة ثم أعد المحاولة.',
      409,
      figure('currentVersion', String(currentVersion)),
    );
  }
}

export class FinanceValidationException extends DomainException {
  constructor(details: ErrorDetail[] = [], message = 'توجد بيانات غير صالحة') {
    super('validation-failed', message, 422, details);
  }
}

/** Editing anything on an invoice that has left `draft`. */
export class InvoiceImmutableException extends DomainException {
  constructor(
    public readonly fromStatus: string,
    public readonly allowed: readonly string[],
  ) {
    super('invoice-immutable', 'لا يمكن تعديل فاتورة بعد إصدارها', 409, [
      { field: 'fromStatus', message: fromStatus },
      { field: 'allowed', message: allowed.join(',') },
    ]);
  }
}

export class InvoiceNotPayableException extends DomainException {
  constructor(public readonly fromStatus: string) {
    super(
      'invoice-not-payable',
      'لا يمكن تسجيل دفعة على فاتورة مسودة أو ملغاة',
      409,
      figure('fromStatus', fromStatus),
    );
  }
}

export class InvoiceHasPaymentsException extends DomainException {
  constructor(public readonly collected: string) {
    super(
      'invoice-has-payments',
      'لا يمكن إلغاء فاتورة سُجّلت عليها مدفوعات',
      409,
      figure('collected', collected),
    );
  }
}

export class PaymentExceedsBalanceException extends DomainException {
  constructor(remaining: string) {
    super(
      'payment-exceeds-balance',
      'المبلغ يتجاوز المتبقي على الفاتورة',
      422,
      figure('remaining', remaining),
    );
  }
}

export class InstallmentExceedsRemainingException extends DomainException {
  constructor(remaining: string) {
    super(
      'installment-exceeds-remaining',
      'المبلغ يتجاوز المتبقي على القسط',
      422,
      figure('remaining', remaining),
    );
  }
}

export class PaymentMethodInactiveException extends DomainException {
  constructor() {
    super('payment-method-inactive', 'طريقة الدفع غير مفعّلة', 422);
  }
}

/**
 * Raised only if a mutation reaches the service layer at all. The primary
 * guarantee is that no route and no repository method exists.
 */
export class PaymentImmutableException extends DomainException {
  constructor() {
    super(
      'payment-immutable',
      'لا يمكن تعديل أو حذف دفعة. استخدم الاسترداد للتصحيح.',
      409,
    );
  }
}

export class InstallmentsNotPermittedException extends DomainException {
  constructor() {
    super(
      'installments-not-permitted',
      'هذا النوع من المنتجات لا يسمح بخطط التقسيط',
      422,
    );
  }
}

export class PlanHasPaymentsException extends DomainException {
  constructor() {
    super(
      'plan-has-payments',
      'لا يمكن إعادة إنشاء الخطة بعد تسجيل مدفوعات على أحد الأقساط',
      409,
    );
  }
}

export class ReductionExceedsLimitException extends DomainException {
  constructor(limit: string) {
    super(
      'reduction-exceeds-limit',
      'قيمة الخصم أو المنحة تتجاوز الحد المسموح',
      422,
      figure('limit', limit),
    );
  }
}

export class ReductionBelowCollectedException extends DomainException {
  constructor(collected: string) {
    super(
      'reduction-below-collected',
      'لا يمكن تخفيض الرصيد إلى ما دون المبلغ المحصّل',
      422,
      figure('collected', collected),
    );
  }
}

export class NegativeAmountException extends DomainException {
  constructor(field = 'amount') {
    super('negative-amount', 'يجب أن يكون المبلغ أكبر من صفر', 422, [
      { field, message: 'يجب أن يكون المبلغ أكبر من صفر' },
    ]);
  }
}

/** Combining values whose currency or precision disagree. */
export class InvalidCurrencyException extends DomainException {
  constructor() {
    super('invalid-currency', 'لا يمكن الجمع بين عملات مختلفة', 422);
  }
}

export class InvalidDateRangeException extends DomainException {
  constructor(message = 'نطاق التاريخ غير صالح') {
    super('invalid-date-range', message, 422);
  }
}

export class FutureDateException extends InvalidDateRangeException {
  constructor(message = 'لا يمكن تسجيل عملية بتاريخ مستقبلي') {
    super(message);
  }
}

export class RefundExceedsPaymentException extends DomainException {
  constructor(refundable: string) {
    super(
      'refund-exceeds-payment',
      'قيمة الاسترداد تتجاوز المتاح من الدفعة',
      422,
      figure('refundable', refundable),
    );
  }
}

export class RefundRequiresPaymentException extends DomainException {
  constructor() {
    super(
      'refund-requires-payment',
      'لا يمكن تسجيل استرداد بدون دفعة مرتبطة',
      422,
    );
  }
}

export class FinanceDuplicateNumberException extends DomainException {
  constructor() {
    super('duplicate-number', 'تعذر تخصيص رقم مستند فريد. أعد المحاولة.', 409);
  }
}

/** The module's only retryable failure. */
export class FinanceServiceUnavailableException extends DomainException {
  constructor() {
    super(
      'service-unavailable',
      'الخدمة غير متاحة حاليًا. أعد المحاولة بعد قليل.',
      503,
    );
  }
}

/** Attempting a transition the lifecycle table does not permit. */
export class FinanceInvalidTransitionException extends DomainException {
  constructor(
    public readonly fromStatus: string,
    public readonly allowed: readonly string[],
  ) {
    super('invoice-immutable', 'هذا الانتقال غير مسموح به', 409, [
      { field: 'fromStatus', message: fromStatus },
      { field: 'allowed', message: allowed.join(',') },
    ]);
  }
}
