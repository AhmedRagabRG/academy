import type {
  FinancialStatus,
  InstallmentStatus,
  InvoiceStatus,
  RefundStatus,
} from "../types/common"

export const financeCopy = {
  title: "الشؤون المالية للطلاب",
  description:
    "إدارة الفواتير وخطط التقسيط والمدفوعات والخصومات والمنح والمستردات لكل طالب.",
  dashboardTitle: "لوحة الشؤون المالية",
  workspaceTitle: "الملف المالي للطالب",
  search: "ابحث برقم الفاتورة أو رقم الإيصال أو اسم الطالب أو كوده",
  export: "تصدير",
  retry: "إعادة المحاولة",
  loadMore: "عرض المزيد",
  cancel: "إلغاء",
  save: "حفظ",
  confirm: "تأكيد",
  forbidden: "لا تملك صلاحية الوصول إلى هذا القسم.",
  readOnlyNotice: "هذه البيانات للعرض فقط.",
  conflict:
    "تم تعديل هذا السجل بواسطة مستخدم آخر. حدّث الصفحة ثم أعد المحاولة دون فقد ما أدخلته.",
  noDeleteNotice:
    "لا يتم حذف أي سجل مالي نهائيًا. الإلغاء والاسترداد هما وسيلتا التصحيح.",
} as const

export const invoiceCopy = {
  title: "الفواتير",
  create: "إنشاء فاتورة",
  edit: "تعديل الفاتورة",
  issue: "إصدار الفاتورة",
  cancelInvoice: "إلغاء الفاتورة",
  number: "رقم الفاتورة",
  student: "الطالب",
  studentCode: "كود الطالب",
  enrollment: "التسجيل",
  offering: "المنتج الأكاديمي",
  batch: "المجموعة",
  purpose: "نوع الفاتورة",
  issueDate: "تاريخ الإصدار",
  dueDate: "تاريخ الاستحقاق",
  totalAmount: "الإجمالي قبل الخصم",
  discountTotal: "إجمالي الخصم",
  scholarshipTotal: "إجمالي المنح",
  finalAmount: "الصافي المستحق",
  paidAmount: "المدفوع",
  remaining: "المتبقي",
  status: "الحالة",
  issueTitle: "تأكيد إصدار الفاتورة",
  issueDescription:
    "بعد الإصدار تصبح قيم الفاتورة ثابتة ولا يمكن تعديلها. أي خصم لاحق يُسجَّل كتسوية على الرصيد غير المسدد.",
  cancelTitle: "إلغاء الفاتورة",
  cancelDescription:
    "سيتم استبعاد الفاتورة من رصيد الطالب مع الاحتفاظ بها للسجل التاريخي.",
  cancelReason: "سبب الإلغاء",
  immutableNotice: "الفاتورة صادرة، ولا يمكن تعديل قيمها.",
  emptyTitle: "لا توجد فواتير مطابقة",
  emptyDescription: "جرّب تعديل البحث أو إزالة بعض عوامل التصفية.",
} as const

export const invoiceStatusCopy: Record<InvoiceStatus, string> = {
  draft: "مسودة",
  issued: "صادرة",
  "partially-paid": "مدفوعة جزئيًا",
  paid: "مدفوعة بالكامل",
  cancelled: "ملغاة",
}

export const installmentCopy = {
  title: "الأقساط",
  plan: "خطة التقسيط",
  generate: "إنشاء خطة تقسيط",
  regenerate: "إعادة إنشاء الخطة",
  count: "عدد الأقساط",
  scheduleBasis: "أساس الجدولة",
  firstDueDate: "تاريخ استحقاق أول قسط",
  sequence: "رقم القسط",
  amount: "قيمة القسط",
  paid: "المدفوع",
  preview: "معاينة الجدول",
  sumNotice: "مجموع الأقساط يساوي الصافي المستحق بالضبط.",
  emptyTitle: "لا توجد خطة تقسيط",
  emptyDescription: "يمكن إنشاء خطة تقسيط لهذه الفاتورة إذا كان المنتج يسمح بذلك.",
} as const

export const installmentStatusCopy: Record<InstallmentStatus, string> = {
  pending: "مستحق لاحقًا",
  "partially-paid": "مدفوع جزئيًا",
  paid: "مدفوع",
  overdue: "متأخر",
}

export const paymentCopy = {
  title: "المدفوعات",
  record: "تسجيل دفعة",
  receiptNumber: "رقم الإيصال",
  method: "طريقة الدفع",
  paymentDate: "تاريخ الدفع",
  amount: "المبلغ",
  notes: "ملاحظات",
  targetInstallment: "القسط",
  remainingHint: "المتبقي على الفاتورة",
  immutableNotice:
    "لا يمكن تعديل أو حذف دفعة مسجلة. التصحيح يتم عن طريق تسجيل استرداد.",
  emptyTitle: "لا توجد مدفوعات مطابقة",
} as const

export const discountCopy = {
  title: "الخصومات",
  apply: "تطبيق خصم",
  kind: "نوع الخصم",
  percentage: "نسبة مئوية",
  amount: "مبلغ ثابت",
  value: "القيمة",
  reason: "السبب",
  approvedBy: "اعتمده",
  limitHint: "الحد الأقصى المسموح به",
  postIssuanceNotice:
    "الفاتورة صادرة: سيُسجَّل الخصم كتسوية تخفض الرصيد غير المسدد والأقساط القادمة دون تعديل قيم الفاتورة.",
  emptyTitle: "لا توجد خصومات",
} as const

export const scholarshipCopy = {
  title: "المنح الدراسية",
  award: "منح دراسية جديدة",
  name: "اسم المنحة",
  kind: "نوع المنحة",
  percentage: "نسبة مئوية",
  amount: "مبلغ ثابت",
  value: "القيمة",
  reason: "السبب",
  coverage: "نطاق التغطية",
  fullTuition: "المصروفات كاملة",
  partialTuition: "جزء من المصروفات",
  fullTuitionNotice:
    "تغطية كاملة: تُخفَّض الأرصدة غير المسددة إلى صفر دون النزول عن المبلغ المحصّل بالفعل.",
  scopeAll: "كل التسجيلات",
  approvedBy: "اعتمدها",
  limitHint: "الحد الأقصى المسموح به",
  emptyTitle: "لا توجد منح دراسية",
} as const

export const refundCopy = {
  title: "المستردات",
  request: "طلب استرداد",
  approve: "اعتماد الاسترداد",
  reject: "رفض الاسترداد",
  complete: "إتمام الاسترداد",
  relatedPayment: "الدفعة المرتبطة",
  refundDate: "تاريخ الاسترداد",
  refundableHint: "الحد الأقصى القابل للاسترداد",
  executionNotice:
    "تسجيل الاسترداد هنا يوثّق العملية وأثرها على الرصيد فقط. تحويل المبلغ للطالب يتم خارج هذه الوحدة.",
  emptyTitle: "لا توجد مستردات",
} as const

export const refundStatusCopy: Record<RefundStatus, string> = {
  requested: "قيد الطلب",
  approved: "معتمد",
  completed: "مكتمل",
  rejected: "مرفوض",
  cancelled: "ملغى",
}

export const profileCopy = {
  totalFees: "إجمالي الرسوم",
  paidAmount: "المدفوع",
  remainingBalance: "المتبقي",
  outstandingInstallments: "الأقساط المستحقة",
  financialStatus: "الحالة المالية",
  perEnrollment: "الأرصدة حسب التسجيل",
  asOf: "حتى تاريخ",
  emptyTitle: "لا توجد سجلات مالية",
  emptyDescription:
    "لم تُصدر أي فاتورة لهذا الطالب بعد، لذلك الأرصدة صفر فعليًا وليست بيانات ناقصة.",
} as const

export const financialStatusCopy: Record<FinancialStatus, string> = {
  "no-outstanding-balance": "لا يوجد رصيد مستحق",
  "partial-balance": "رصيد جزئي",
  overdue: "متأخر",
  completed: "مكتمل",
}

export const timelineCopy = {
  title: "السجل المالي",
  category: "نوع الحدث",
  empty: "لا توجد أحداث مالية مسجلة بعد.",
  emptyTitle: "لا توجد أحداث مالية",
  emptyDescription: "ستظهر هنا الفواتير والمدفوعات والخصومات والمستردات فور تسجيلها.",
  categories: {
    "invoice-created": "تم إنشاء فاتورة",
    "invoice-issued": "تم إصدار فاتورة",
    "invoice-cancelled": "تم إلغاء فاتورة",
    "installment-plan-generated": "تم إنشاء خطة تقسيط",
    "payment-received": "تم استلام دفعة",
    "discount-applied": "تم تطبيق خصم",
    "scholarship-applied": "تم تطبيق منحة دراسية",
    "adjustment-recorded": "تم تسجيل تسوية",
    "refund-requested": "تم طلب استرداد",
    "refund-completed": "تم إتمام استرداد",
  },
} as const

export const listCopy = {
  clearFilters: "مسح عوامل التصفية",
  dateFrom: "من تاريخ",
  dateTo: "إلى تاريخ",
  invertedRange: "نطاق التاريخ غير صحيح: تاريخ البداية بعد تاريخ النهاية.",
} as const
