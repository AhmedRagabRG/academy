import type { FinanceErrorCode } from "../services/finance-error"

/** Every error code maps to specific Arabic guidance. There is no generic fallback. */
export const financeErrorCopy: Record<FinanceErrorCode, string> = {
  "not-found": "لم يتم العثور على السجل المطلوب.",
  forbidden: "لا تملك صلاحية تنفيذ هذا الإجراء.",
  "out-of-scope": "هذا السجل خارج نطاق الفروع المصرّح لك بها.",
  "version-conflict":
    "تم تعديل هذا السجل بواسطة مستخدم آخر. حدّث الصفحة ثم أعد المحاولة.",
  "validation-failed": "توجد بيانات غير صالحة. راجع الحقول المميزة.",
  "invoice-immutable":
    "الفاتورة صادرة ولا يمكن تعديل قيمها. سجّل خصمًا كتسوية على الرصيد غير المسدد.",
  "invoice-not-payable":
    "لا يمكن تسجيل دفعة على فاتورة مسودة أو مدفوعة بالكامل أو ملغاة.",
  "invoice-has-payments":
    "لا يمكن إلغاء فاتورة عليها مدفوعات. سجّل استردادًا للمدفوعات أولًا.",
  "payment-exceeds-balance": "المبلغ يتجاوز المتبقي على الفاتورة.",
  "installment-exceeds-remaining": "المبلغ يتجاوز المتبقي على القسط المحدد.",
  "payment-method-inactive": "طريقة الدفع غير مفعّلة.",
  "payment-immutable":
    "لا يمكن تعديل أو حذف دفعة مسجلة. التصحيح يتم عن طريق الاسترداد.",
  "installments-not-permitted": "هذا النوع من المنتجات لا يسمح بخطط التقسيط.",
  "plan-has-payments":
    "لا يمكن إعادة إنشاء الخطة بعد تسجيل مدفوعات على أحد الأقساط.",
  "reduction-exceeds-limit": "قيمة الخصم تتجاوز الحد المسموح به.",
  "reduction-below-collected":
    "لا يمكن تخفيض الرصيد إلى ما دون المبلغ المحصّل بالفعل. استخدم الاسترداد بدلًا من ذلك.",
  "negative-amount": "لا يمكن أن تكون القيمة سالبة أو صفرًا.",
  "invalid-currency": "لا يمكن الجمع بين عملات مختلفة.",
  "invalid-date-range": "نطاق التاريخ غير صحيح: تاريخ البداية بعد تاريخ النهاية.",
  "refund-exceeds-payment":
    "قيمة الاسترداد تتجاوز المتاح من الدفعة بعد المستردات السابقة.",
  "refund-requires-payment": "يجب أن يشير الاسترداد إلى دفعة قائمة.",
  "duplicate-number": "الرقم المتسلسل مستخدم بالفعل.",
  "service-unavailable": "الخدمة غير متاحة حاليًا. حاول مرة أخرى.",
}
