import type { StudentStatus } from "../types/common"

export const studentsCopy = {
  title: "الطلاب",
  description:
    "إدارة الطلاب المسجلين رسميًا بعد اكتمال إجراءات القبول ومتابعة ملفاتهم الأكاديمية.",
  workspaceDescription: "مساحة العمل الكاملة لبيانات الطالب وسجلاته.",
  search: "ابحث بالاسم أو كود الطالب أو رقم الهاتف أو الرقم القومي",
  export: "تصدير",
  edit: "تعديل بيانات الطالب",
  save: "حفظ التعديلات",
  cancel: "إلغاء",
  retry: "إعادة المحاولة",
  loadMore: "عرض المزيد",
  noCreateNotice:
    "لا يمكن إنشاء طالب يدويًا. تُنشأ سجلات الطلاب من طلبات القبول المعتمدة فقط.",
  forbidden: "لا تملك صلاحية الوصول إلى هذا القسم.",
  archivedReadOnly:
    "هذا الطالب مؤرشف. يجب تفعيله أولًا قبل تعديل بياناته أو مستنداته.",
  conflict:
    "تم تعديل هذا السجل بواسطة موظف آخر. حدّث الصفحة ثم أعد المحاولة دون فقد ما أدخلته.",
} as const

export const studentTabsCopy = {
  overview: "نظرة عامة",
  documents: "المستندات",
  notes: "الملاحظات",
  timeline: "السجل الزمني",
} as const

export const studentSectionsCopy = {
  personal: "البيانات الشخصية",
  academic: "البيانات الأكاديمية",
  system: "بيانات النظام",
  enrollments: "التسجيلات الأكاديمية",
  financial: "الملخص المالي",
  notes: "ملاحظات داخلية",
  timeline: "السجل الزمني",
} as const

export const studentFieldsCopy = {
  fullName: "الاسم الكامل",
  primaryPhone: "رقم الهاتف",
  guardianPhone: "رقم هاتف ولي الأمر",
  nationalId: "الرقم القومي",
  alternativeIdentityReason: "سبب عدم وجود رقم قومي",
  address: "العنوان",
  dateOfBirth: "تاريخ الميلاد",
  qualification: "المؤهل",
  graduationYear: "سنة التخرج",
  profileImage: "الصورة الشخصية",
  registrationBranch: "فرع التسجيل",
  studyBranch: "فرع الدراسة",
  department: "القسم",
  academicGrade: "الدرجة الأكاديمية",
  customerServiceEmployee: "موظف خدمة العملاء",
  studentCode: "كود الطالب",
  admissionReference: "رقم طلب القبول",
  admissionDate: "تاريخ القبول",
  enrollmentDate: "تاريخ التسجيل",
  status: "الحالة",
  enrollmentCount: "عدد التسجيلات",
  updatedAt: "آخر تحديث",
} as const

export const studentStatusCopy: Record<StudentStatus, string> = {
  active: "نشط",
  suspended: "موقوف",
  graduated: "متخرج",
  withdrawn: "منسحب",
  archived: "مؤرشف",
}

export const studentStatusActionCopy: Record<StudentStatus, string> = {
  active: "تفعيل الطالب",
  suspended: "إيقاف الطالب",
  graduated: "تخريج الطالب",
  withdrawn: "تسجيل انسحاب الطالب",
  archived: "أرشفة الطالب",
}

export const enrollmentStatusCopy = {
  active: "جارٍ",
  completed: "مكتمل",
  suspended: "موقوف",
  withdrawn: "منسحب",
} as const

export const offeringKindCopy = {
  "professional-program": "برنامج احترافي",
  "professional-diploma": "دبلومة احترافية",
  "training-course": "دورة تدريبية",
} as const

export const documentTypeCopy = {
  "personal-photo": "صورة شخصية",
  "national-id": "بطاقة الرقم القومي",
  "parent-national-id": "بطاقة ولي الأمر",
  "birth-certificate": "شهادة الميلاد",
  "qualification-certificate": "شهادة المؤهل",
  "admission-declaration": "إقرار القبول",
  "additional-attachment": "مرفقات إضافية",
} as const

export const documentStateCopy = {
  missing: "غير مرفوع",
  present: "مرفوع",
  archived: "مؤرشف",
} as const

export const documentActionsCopy = {
  upload: "رفع",
  replace: "استبدال",
  preview: "معاينة",
  download: "تنزيل",
  archive: "أرشفة",
  history: "سجل النسخ",
  archiveTitle: "أرشفة المستند",
  archiveDescription:
    "سيتم نقل المستند إلى الأرشيف مع الاحتفاظ بكل نسخه. لا يتم الحذف نهائيًا.",
} as const

export const notesCopy = {
  placeholder: "اكتب ملاحظة داخلية عن الطالب",
  add: "إضافة ملاحظة",
  empty: "لا توجد ملاحظات داخلية على هذا الطالب.",
  edited: "تم التعديل",
  editTitle: "تعديل الملاحظة",
  archiveTitle: "أرشفة الملاحظة",
  archiveDescription:
    "سيتم إخفاء الملاحظة من القائمة النشطة مع الاحتفاظ بها للسجل التاريخي.",
} as const

export const timelineCopy = {
  empty: "لا توجد أحداث مسجلة بعد.",
  categories: {
    "admission-submitted": "تم تقديم طلب القبول",
    "admission-approved": "تم اعتماد طلب القبول",
    "student-created": "تم إنشاء سجل الطالب",
    "enrollment-added": "تمت إضافة تسجيل أكاديمي",
    "document-uploaded": "تم رفع مستند",
    "document-replaced": "تم استبدال مستند",
    "document-archived": "تمت أرشفة مستند",
    "profile-updated": "تم تحديث بيانات الطالب",
    "status-changed": "تم تغيير حالة الطالب",
    "financial-event": "حدث مالي",
    "academic-event": "حدث أكاديمي",
  },
} as const

export const financialCopy = {
  totalFees: "إجمالي الرسوم",
  paidAmount: "المدفوع",
  remainingBalance: "المتبقي",
  activeInstallments: "الأقساط النشطة",
  asOf: "حتى تاريخ",
  readOnlyNotice:
    "هذا الملخص للعرض فقط. تُدار العمليات المالية في وحدة الشؤون المالية للطلاب.",
  unavailable: {
    "finance-module-absent":
      "وحدة الشؤون المالية للطلاب غير متاحة بعد. لا تتوفر بيانات مالية لعرضها.",
    "source-error": "تعذر تحميل الملخص المالي من المصدر.",
    timeout: "استغرق تحميل الملخص المالي وقتًا طويلًا.",
  },
} as const

export const listCopy = {
  emptyTitle: "لا يوجد طلاب مطابقون",
  emptyDescription: "جرّب تعديل البحث أو إزالة بعض عوامل التصفية.",
  clearFilters: "مسح عوامل التصفية",
  bulkArchive: "أرشفة المحدد",
  bulkApplied: "تم التنفيذ",
  bulkRefused: "تعذر التنفيذ",
} as const
