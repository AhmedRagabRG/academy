/**
 * Every user-visible string in the module, authored once.
 *
 * Copy that carries a decision rather than a label is written to say what the
 * system will actually do — the difference between a refusal a user can act on
 * and one they can only retry.
 */

export const accountingCopy = {
  title: "المحاسبة",
  description: "طلبات المصروفات الداخلية لفروع المؤسسة",
  forbidden: "لا تملك صلاحية الوصول إلى هذه الشاشة.",
  conflict: "تم تعديل هذا الطلب بواسطة مستخدم آخر. حدّث الصفحة ثم أعد المحاولة.",
  noDeleteNotice: "لا يتم حذف طلبات المصروفات نهائيًا؛ الطلبات الملغاة والمرفوضة تبقى متاحة للمراجعة.",
  retry: "إعادة المحاولة",
  clearFilters: "مسح كل عوامل التصفية",
} as const

export const expenseStatusCopy = {
  draft: "مسودة",
  submitted: "مُقدَّم",
  "under-review": "قيد المراجعة",
  "returned-for-revision": "مُعاد للتعديل",
  approved: "معتمد",
  rejected: "مرفوض",
  paid: "مدفوع",
  cancelled: "ملغى",
} as const

export const requestCopy = {
  title: "طلبات المصروفات",
  create: "إنشاء طلب مصروفات",
  number: "رقم الطلب",
  requestDate: "تاريخ الطلب",
  branch: "الفرع",
  requestedBy: "مقدّم الطلب",
  category: "التصنيف الرئيسي",
  subCategory: "التصنيف الفرعي",
  description: "الوصف",
  amount: "المبلغ المطلوب",
  status: "الحالة",
  attachments: "المرفقات",
  section: {
    request: "بيانات الطلب",
    expense: "تفاصيل المصروف",
    attachments: "المرفقات",
    approval: "الاعتماد",
    history: "سجل الاعتماد",
    comments: "التعليقات",
  },
  save: "حفظ كمسودة",
  submit: "تقديم الطلب",
  cancel: "إلغاء الطلب",
  cancelReason: "سبب الإلغاء",
  submitConfirm: "بعد التقديم لن يمكن تعديل الطلب إلا إذا أُعيد للتعديل.",
  editableNotice: "هذا الطلب قابل للتعديل.",
  lockedNotice: "لا يمكن تعديل الطلب في حالته الحالية.",
  emptyTitle: "لا توجد طلبات مطابقة",
  emptyAllTitle: "لا توجد طلبات مصروفات بعد",
  emptyAllDescription: "ستظهر هنا طلبات المصروفات فور إنشائها من الفروع.",
} as const

export const attachmentCopy = {
  title: "المرفقات",
  upload: "رفع مستند",
  kind: "نوع المستند",
  invoice: "فاتورة",
  receipt: "إيصال",
  supportingDocument: "مستند داعم",
  fileName: "اسم الملف",
  size: "الحجم",
  uploadedBy: "رفعه",
  remove: "إزالة",
  preview: "معاينة",
  previewUnavailable: "غير متاحة",
  acceptedTypes: "الصيغ المقبولة: PDF، JPG، JPEG، PNG",
  emptyTitle: "لا توجد مرفقات",
  lockedNotice: "لا يمكن تعديل المرفقات في حالة الطلب الحالية.",
} as const

export const approvalCopy = {
  title: "الاعتماد",
  startReview: "بدء المراجعة",
  approve: "اعتماد",
  reject: "رفض",
  return: "إعادة للتعديل",
  markPaid: "تسجيل السداد",
  resubmit: "إعادة التقديم",
  note: "ملاحظات",
  noteRequired: "الملاحظات مطلوبة لتوضيح سبب القرار.",
  decidedBy: "قرار",
  reviewer: "المراجع",
  startReviewNotice:
    "بدء المراجعة يسجّلك كمراجع لهذا الطلب ويغيّر حالته إلى قيد المراجعة.",
  markPaidNotice:
    "هذا الإجراء يوثّق أن السداد تم بالفعل خارج هذه الوحدة؛ لا يقوم النظام بتحويل أي مبلغ.",
  noActionsAvailable: "لا توجد إجراءات متاحة على هذا الطلب في حالته الحالية.",
} as const

export const historyCopy = {
  title: "سجل الاعتماد",
  immutableNotice: "سجل الاعتماد غير قابل للتعديل أو الحذف.",
  from: "من",
  to: "إلى",
  performedBy: "بواسطة",
  actions: {
    created: "تم إنشاء الطلب",
    submitted: "تم تقديم الطلب",
    "review-started": "بدأت المراجعة",
    returned: "أُعيد للتعديل",
    resubmitted: "أُعيد تقديمه",
    approved: "تم الاعتماد",
    rejected: "تم الرفض",
    paid: "تم تسجيل السداد",
    cancelled: "تم الإلغاء",
  },
  emptyTitle: "لا يوجد سجل بعد",
} as const

export const commentCopy = {
  title: "التعليقات",
  add: "إضافة تعليق",
  placeholder: "اكتب تعليقًا…",
  distinctNotice: "التعليقات للنقاش فقط ولا تُعدّ جزءًا من سجل الاعتماد.",
  emptyTitle: "لا توجد تعليقات",
} as const

export const categoryCopy = {
  title: "تصنيفات المصروفات",
  subTitle: "التصنيفات الفرعية",
  create: "تصنيف جديد",
  createSub: "تصنيف فرعي جديد",
  name: "الاسم",
  parent: "التصنيف الرئيسي",
  description: "الوصف",
  status: "الحالة",
  active: "نشط",
  archived: "مؤرشف",
  archive: "أرشفة",
  activate: "تفعيل",
  archivedNotice:
    "التصنيف المؤرشف لا يظهر ضمن خيارات الطلبات الجديدة، ويبقى ظاهرًا على الطلبات التي تستخدمه.",
  emptyTitle: "لا توجد تصنيفات مطابقة",
  emptyAllTitle: "لا توجد تصنيفات بعد",
} as const

export const dashboardCopy = {
  title: "لوحة المحاسبة",
  pending: "طلبات قيد المعالجة",
  approved: "طلبات معتمدة",
  rejected: "طلبات مرفوضة",
  paid: "طلبات مدفوعة",
  monthlyTotal: "مصروفات الشهر",
  byBranch: "المصروفات حسب الفرع",
  byCategory: "المصروفات حسب التصنيف",
  recent: "أحدث الطلبات",
  quickActions: "إجراءات سريعة",
  emptyTitle: "لا توجد سجلات محاسبية بعد",
  emptyDescription:
    "ستظهر المؤشرات هنا فور إنشاء أول طلب مصروفات. لا تعني هذه الشاشة أن الأرصدة تساوي صفرًا.",
  asOf: "حتى تاريخ",
} as const

export const filterCopy = {
  search: "ابحث برقم الطلب أو مقدّم الطلب أو الوصف",
  activeCount: "عدد عوامل التصفية المطبقة",
  dateFrom: "تاريخ الطلب — من",
  dateTo: "تاريخ الطلب — إلى",
  rangeInclusive: "المدى يشمل تاريخي البداية والنهاية.",
  invertedRange: "تاريخ البداية يجب أن يسبق تاريخ النهاية.",
} as const

export const bulkCopy = {
  submitSelected: "تقديم المحدد",
  approveSelected: "اعتماد المحدد",
  partialOutcome: "تمت معالجة بعض الطلبات فقط؛ راجع التفاصيل أدناه.",
} as const
