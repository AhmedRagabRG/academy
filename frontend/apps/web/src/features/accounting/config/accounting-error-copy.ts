import type { AccountingErrorCode } from "../services/accounting-error"

/**
 * One Arabic message per error code, with **no generic fallback**.
 *
 * The absence of a fallback is the point: it forces every refusal to say
 * something the reader can act on. A message that only says "invalid" leaves the
 * user with nothing but retrying the same thing.
 */
export const accountingErrorCopy: Record<AccountingErrorCode, string> = {
  forbidden: "لا تملك صلاحية تنفيذ هذا الإجراء.",
  "out-of-scope": "هذا الطلب يتبع فرعًا خارج نطاق صلاحياتك.",
  "not-found": "لم يتم العثور على السجل المطلوب.",
  "version-conflict":
    "تم تعديل هذا الطلب بواسطة مستخدم آخر. حدّث الصفحة ثم أعد المحاولة.",
  "invalid-transition":
    "هذا الإجراء غير متاح على الطلب في حالته الحالية.",
  "note-required": "الملاحظات مطلوبة لتوضيح سبب هذا القرار.",
  "not-editable":
    "لا يمكن تعديل الطلب بعد تقديمه. التعديل يتم بعد إعادته للتعديل من قسم المالية.",
  "category-required": "التصنيف الرئيسي مطلوب.",
  "category-inactive":
    "هذا التصنيف مؤرشف ولا يمكن اختياره في طلب جديد. اختر تصنيفًا نشطًا.",
  "subcategory-mismatch":
    "التصنيف الفرعي لا يتبع التصنيف الرئيسي المختار.",
  "amount-not-positive": "يجب أن يكون المبلغ المطلوب أكبر من صفر.",
  "amount-invalid": "صيغة المبلغ غير صحيحة.",
  "attachment-type-rejected":
    "صيغة الملف غير مقبولة. الصيغ المقبولة: PDF، JPG، JPEG، PNG.",
  "attachment-too-large": "حجم الملف يتجاوز الحد الأقصى المسموح به.",
  "duplicate-name": "الاسم مستخدم بالفعل. اختر اسمًا مختلفًا.",
  "validation-failed": "تحقق من الحقول المطلوبة قبل المتابعة.",
  "invalid-date-range": "تاريخ البداية يجب أن يسبق تاريخ النهاية.",
  unsupported: "هذا الإجراء غير متاح في النظام حاليًا.",
}

/**
 * `invalid-transition` carries its `from` and `to`, so the refusal can name the
 * status that makes the action unavailable rather than only refusing it.
 */
export function transitionRefusalMessage(
  fromLabel: string,
  actionLabel: string
): string {
  return `لا يمكن ${actionLabel} على طلب حالته «${fromLabel}».`
}
