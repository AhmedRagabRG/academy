/**
 * Every failure mode this module can produce. There is no generic fallback code:
 * each variant maps to specific Arabic guidance in `config/students-copy.ts`.
 */
export type StudentsErrorCode =
  | "not-found"
  | "forbidden"
  | "out-of-scope"
  | "version-conflict"
  | "validation-failed"
  | "invalid-status-transition"
  | "reason-required"
  | "archived-read-only"
  | "duplicate-student-code"
  | "admission-not-ready"
  | "admission-version-stale"
  | "enrollment-batch-rule-violated"
  | "unsupported-file-type"
  | "file-too-large"
  | "file-unreadable"
  | "document-archived"
  | "note-content-empty"
  | "finance-unavailable"
  | "service-unavailable"

export interface StudentsErrorDetails {
  currentVersion?: number
  fieldErrors?: Record<string, string>
  fromStatus?: string
  toStatus?: string
  allowed?: string[]
  reasons?: string[]
}

const messages: Record<StudentsErrorCode, string> = {
  "not-found": "لم يتم العثور على الطالب المطلوب.",
  forbidden: "لا تملك صلاحية تنفيذ هذا الإجراء.",
  "out-of-scope": "هذا الطالب خارج نطاق الفروع المصرّح لك بها.",
  "version-conflict":
    "تم تعديل هذا السجل بواسطة موظف آخر. حدّث الصفحة ثم أعد المحاولة.",
  "validation-failed": "توجد بيانات غير صالحة. راجع الحقول المميزة.",
  "invalid-status-transition": "هذا التغيير في الحالة غير مسموح به.",
  "reason-required": "يجب إدخال سبب لتنفيذ هذا الإجراء.",
  "archived-read-only": "الطالب مؤرشف. فعّل السجل أولًا قبل التعديل.",
  "duplicate-student-code": "كود الطالب مستخدم بالفعل.",
  "admission-not-ready": "طلب القبول غير جاهز للتسجيل.",
  "admission-version-stale":
    "تم تعديل طلب القبول بعد قراءته. أعد المحاولة ببيانات محدثة.",
  "enrollment-batch-rule-violated":
    "البرنامج الاحترافي يتطلب مجموعة، ولا تقبل الدبلومات والدورات أي مجموعة.",
  "unsupported-file-type": "نوع الملف غير مدعوم.",
  "file-too-large": "حجم الملف يتجاوز الحد المسموح به.",
  "file-unreadable": "تعذر قراءة الملف. تأكد من سلامته وأعد المحاولة.",
  "document-archived": "هذا المستند مؤرشف ولا يقبل التعديل.",
  "note-content-empty": "لا يمكن حفظ ملاحظة فارغة.",
  "finance-unavailable": "الملخص المالي غير متاح حاليًا.",
  "service-unavailable": "الخدمة غير متاحة حاليًا. حاول مرة أخرى.",
}

const retryableCodes: ReadonlySet<StudentsErrorCode> = new Set([
  "service-unavailable",
  "finance-unavailable",
  "file-unreadable",
])

export class StudentsError extends Error {
  readonly retryable: boolean

  constructor(
    readonly code: StudentsErrorCode,
    readonly details: StudentsErrorDetails = {},
    message?: string
  ) {
    super(message ?? messages[code])
    this.name = "StudentsError"
    this.retryable = retryableCodes.has(code)
  }
}

export function isStudentsError(error: unknown): error is StudentsError {
  return error instanceof StudentsError
}

export function toStudentsError(error: unknown): StudentsError {
  if (isStudentsError(error)) return error
  return new StudentsError("service-unavailable")
}

export function studentsErrorMessage(code: StudentsErrorCode): string {
  return messages[code]
}
