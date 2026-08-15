/**
 * The permission catalogue — every key the application actually checks.
 *
 * This exists because the Settings matrix used to be generated as
 * `8 modules × 6 actions`, which produced 48 ids of which only three matched a
 * key `usePermission()` looks for. Six of the seven business modules were not
 * representable at all, so their separation-of-duty keys — approving a refund,
 * deciding an expense, correcting a terminal student status — could not be
 * granted or revoked from the panel.
 *
 * The cross-product could never express these keys: they are
 * `module.resource.action`, not `module.action`. So the catalogue is enumerated
 * rather than generated, and it is composed per module the same way
 * `foundation-navigation.ts` composes navigation — a module that adds a
 * permission adds it here, next to the screens that check it.
 *
 * A contract test asserts this catalogue and the granted key set agree exactly,
 * so the two can never drift apart again.
 */

export interface PermissionDefinition {
  id: string
  key: string
  moduleKey: string
  actionKey: string
  label: string
  description: string
}

export interface PermissionGroupDefinition {
  key: string
  label: string
  permissions: PermissionDefinition[]
}

/** `[actionKey, label, description]` — the id is `${moduleKey}.${actionKey}`. */
type Entry = readonly [string, string, string]

function group(
  moduleKey: string,
  label: string,
  entries: readonly Entry[]
): PermissionGroupDefinition {
  return {
    key: moduleKey,
    label,
    permissions: entries.map(([actionKey, actionLabel, description]) => {
      const key = `${moduleKey}.${actionKey}`
      return {
        id: key,
        key,
        moduleKey,
        actionKey,
        label: actionLabel,
        description,
      }
    }),
  }
}

const dashboard = group("dashboard", "لوحة التحكم", [
  ["view", "عرض", "فتح الصفحة الرئيسية"],
])

const inbox = group("inbox", "صندوق الوارد", [
  ["view.all", "عرض كل المحادثات", "عرض محادثات المؤسسة كلها"],
  ["view.team", "عرض محادثات الفريق", "عرض المحادثات المسندة إلى فريق الموظف"],
  [
    "view.assigned",
    "عرض المحادثات المسندة",
    "عرض المحادثات المسندة مباشرة إلى الموظف",
  ],
  ["assign.employee", "إسناد إلى موظف", "إسناد المحادثة إلى موظف"],
  ["assign.team", "إسناد إلى فريق", "إسناد المحادثة إلى فريق"],
  ["reassign", "إعادة الإسناد", "تغيير أو إزالة إسناد قائم"],
  ["reply", "الرد", "إرسال رد إلى العميل"],
  ["change.status", "تغيير الحالة", "تحديث حالة المحادثة"],
  ["manage.tags", "إدارة الوسوم", "إضافة وسوم المحادثة أو إزالتها"],
  [
    "manage.notes",
    "إدارة الملاحظات",
    "إضافة الملاحظات الداخلية وإدارة المملوك منها",
  ],
  ["archive", "أرشفة المحادثة", "نقل المحادثة إلى الأرشيف"],
  ["delete", "حذف المحادثة", "حذف المحادثة حذفًا تجريبيًا"],
  ["restore", "استعادة المحادثة", "استعادة محادثة مؤرشفة أو محذوفة"],
])

const settings = group("settings", "المؤسسة والإعدادات", [
  ["view", "عرض الإعدادات", "فتح قسم المؤسسة والإعدادات"],
  ["create", "إنشاء سجلات إدارية", "إضافة سجلات في الإعدادات"],
  ["organization.view", "عرض ملف المؤسسة", "الاطلاع على هوية المؤسسة"],
  ["branches.view", "عرض الفروع", "الاطلاع على قائمة الفروع"],
  ["branches.create", "إنشاء فرع", "إضافة فرع جديد"],
  ["branches.update", "تعديل فرع", "تحديث بيانات فرع أو حالته"],
  ["departments.view", "عرض الأقسام", "الاطلاع على قائمة الأقسام"],
  ["departments.create", "إنشاء قسم", "إضافة قسم جديد"],
  ["departments.update", "تعديل قسم", "تحديث بيانات قسم أو حالته"],
  ["academicYears.view", "عرض الأعوام الأكاديمية", "الاطلاع على الأعوام"],
  ["academicYears.create", "إنشاء عام أكاديمي", "إضافة عام أكاديمي"],
  ["academicYears.update", "تعديل عام أكاديمي", "تحديث عام أكاديمي أو تفعيله"],
  ["academicTerms.view", "عرض الفصول الأكاديمية", "الاطلاع على الفصول"],
  ["academicTerms.create", "إنشاء فصل أكاديمي", "إضافة فصل أكاديمي"],
  ["academicTerms.update", "تعديل فصل أكاديمي", "تحديث فصل أكاديمي أو حالته"],
  ["users.view", "عرض المستخدمين", "الاطلاع على حسابات الموظفين"],
  ["users.create", "إنشاء مستخدم", "إضافة حساب موظف"],
  ["users.update", "تعديل مستخدم", "تحديث حساب موظف أو حالته"],
  ["roles.view", "عرض الأدوار", "الاطلاع على الأدوار"],
  ["roles.create", "إنشاء دور", "إضافة دور جديد"],
  ["roles.update", "تعديل دور", "تحديث دور أو حالته"],
  ["permissions.view", "عرض الصلاحيات", "فتح مصفوفة الصلاحيات"],
  ["permissions.update", "تعديل الصلاحيات", "إسناد الصلاحيات إلى الأدوار"],
  ["general.view", "عرض الإعدادات العامة", "الاطلاع على الافتراضيات"],
  [
    "general.update",
    "تعديل الإعدادات العامة",
    "تحديث اللغة والعملة والافتراضيات",
  ],
])

const catalog = group("catalog", "المسارات الأكاديمية", [
  ["view", "عرض المسارات", "فتح قسم المسارات الأكاديمية"],
  ["products.view", "عرض المنتجات", "الاطلاع على المنتجات الأكاديمية"],
  ["products.create", "إنشاء منتج", "إضافة منتج أكاديمي كمسودة"],
  ["products.update", "تعديل منتج", "تحديث بيانات منتج"],
  ["products.activate", "تفعيل منتج", "نشر منتج بعد اكتمال متطلباته"],
  ["products.archive", "أرشفة منتج", "إخراج منتج من الخدمة"],
  ["types.view", "عرض أنواع المنتجات", "الاطلاع على أنواع المنتجات"],
  ["types.create", "إنشاء نوع منتج", "إضافة نوع منتج"],
  ["types.update", "تعديل نوع منتج", "تحديث نوع منتج وحقوله الأكاديمية"],
  ["types.activate", "تفعيل نوع منتج", "إتاحة نوع المنتج للاختيار"],
  ["types.archive", "أرشفة نوع منتج", "منع اختيار نوع المنتج في منتجات جديدة"],
  ["categories.view", "عرض التصنيفات", "الاطلاع على تصنيفات المسارات الأكاديمية"],
  ["categories.create", "إنشاء تصنيف", "إضافة تصنيف"],
  ["categories.update", "تعديل تصنيف", "تحديث تصنيف"],
  ["categories.activate", "تفعيل تصنيف", "إتاحة التصنيف للاختيار"],
  ["categories.archive", "أرشفة تصنيف", "منع اختيار التصنيف في منتجات جديدة"],
  [
    "academic.manage",
    "إدارة البيانات الأكاديمية",
    "تحديث مدة المنتج وساعاته وحقوله",
  ],
  ["pricing.manage", "إدارة التسعير", "تحديث الأسعار والرسوم المرجعية"],
  [
    "availability.manage",
    "إدارة توفر الفروع",
    "إسناد المنتج إلى الفروع وأدوارها",
  ],
  [
    "content.manage",
    "إدارة المحتوى",
    "تحديث نص المبيعات والمتطلبات والمستندات",
  ],
  ["media.manage", "إدارة الوسائط", "رفع صور المنتج وملفاته التعريفية"],
])

const batches = group("batches", "دفعات البرامج", [
  ["view", "عرض الدفعات", "الاطلاع على دفعات البرنامج"],
  ["create", "إنشاء دفعة", "إضافة دفعة جديدة كمسودة"],
  ["update", "تعديل دفعة", "تحديث بيانات الدفعة وجدولها"],
  ["export", "تصدير الدفعات", "تنزيل قائمة الدفعات"],
  ["capacity.manage", "إدارة السعة", "تحديد الحد الأقصى للطلاب"],
  ["pricing.manage", "إدارة تسعير الدفعة", "تحديث السعر وخطط التقسيط والعروض"],
  ["branches.manage", "إدارة فروع الدفعة", "إسناد فروع التسجيل والدراسة"],
  ["registration.open", "فتح التسجيل", "بدء التسجيل على الدفعة"],
  ["registration.close", "إغلاق التسجيل", "إيقاف التسجيل على الدفعة"],
  [
    "registration.correct",
    "تصحيح حالة التسجيل",
    "إعادة فتح التسجيل بعد إغلاقه",
  ],
  ["study.start", "بدء الدراسة", "نقل الدفعة إلى مرحلة الدراسة"],
  ["graduate", "تخريج الدفعة", "إنهاء الدفعة بالتخرج"],
  ["archive", "أرشفة الدفعة", "إخراج الدفعة من الخدمة"],
])

const admissions = group("admissions", "القبول والتسجيل", [
  ["view", "عرض طلبات القبول", "الاطلاع على قائمة الطلبات"],
  ["create", "إنشاء طلب قبول", "تسجيل متقدم جديد"],
  ["update", "تعديل طلب قبول", "تحديث بيانات الطلب"],
  ["archive", "أرشفة متقدم", "أرشفة بيانات المتقدم"],
  ["export", "تصدير طلبات القبول", "تنزيل قائمة الطلبات"],
  ["assign", "إسناد الطلب", "تحديد الفروع والموظفين المسؤولين"],
  ["academic.manage", "إدارة الاختيار الأكاديمي", "تحديد المنتج والدفعة"],
  ["finance.view", "عرض البيانات المالية", "الاطلاع على الإعداد المالي للطلب"],
  ["finance.manage", "إدارة البيانات المالية", "تحديد الخصم والمبلغ المطلوب"],
  ["documents.view", "عرض المستندات", "الاطلاع على مستندات الطلب"],
  ["documents.manage", "إدارة المستندات", "رفع واستبدال وسحب المستندات"],
  ["documents.verify", "توثيق المستندات", "اعتماد أو رفض مستند"],
  ["submit", "تقديم الطلب", "إرسال الطلب للمراجعة"],
  ["review", "بدء المراجعة", "تولّي مراجعة الطلب"],
  ["approve", "اعتماد الطلب", "قبول المتقدم"],
  ["reject", "رفض الطلب", "رفض المتقدم مع ذكر السبب"],
  ["return", "إرجاع الطلب", "إعادة الطلب للتعديل"],
  [
    "enrollment-readiness",
    "قراءة جاهزية التسجيل",
    "الاطلاع على جاهزية تحويل الطلب إلى طالب",
  ],
])

const students = group("students", "الطلاب", [
  ["view", "عرض الطلاب", "الاطلاع على قائمة الطلاب"],
  ["update", "تعديل بيانات الطالب", "تحديث الملف الشخصي والإسناد"],
  ["archive", "أرشفة طالب", "نقل الطالب إلى الأرشيف"],
  ["activate", "تفعيل طالب", "إعادة طالب مؤرشف إلى الخدمة"],
  ["status.manage", "إدارة حالة الطالب", "الإيقاف والتخرج والانسحاب"],
  ["status.correct", "تصحيح حالة نهائية", "إعادة طالب متخرج أو منسحب إلى نشط"],
  ["export", "تصدير الطلاب", "تنزيل قائمة الطلاب"],
  ["enrollments.view", "عرض التسجيلات", "الاطلاع على تسجيلات الطالب"],
  ["documents.view", "عرض مستندات الطالب", "الاطلاع على المستندات"],
  ["documents.manage", "إدارة مستندات الطالب", "رفع واستبدال وأرشفة المستندات"],
  ["notes.view", "عرض الملاحظات", "الاطلاع على ملاحظات الطالب"],
  ["notes.manage", "إدارة الملاحظات", "إضافة وتعديل وأرشفة الملاحظات"],
  ["timeline.view", "عرض السجل الزمني", "الاطلاع على أحداث الطالب"],
  ["finance.view", "عرض الملخص المالي", "الاطلاع على الرصيد المالي للطالب"],
  ["intake", "استقبال الطلاب من القبول", "تحويل طلب قبول معتمد إلى طالب"],
])

const finance = group("finance", "الشؤون المالية للطلاب", [
  ["view", "عرض الشؤون المالية", "فتح قسم الشؤون المالية"],
  ["invoices.view", "عرض الفواتير", "الاطلاع على الفواتير"],
  ["invoices.create", "إنشاء الفواتير", "إصدار فواتير من التسجيل"],
  ["invoices.update", "تعديل فاتورة مسودة", "تحديث قيم الفاتورة قبل إصدارها"],
  ["invoices.issue", "إصدار فاتورة", "تثبيت قيم الفاتورة"],
  ["invoices.cancel", "إلغاء فاتورة", "إلغاء فاتورة مع ذكر السبب"],
  ["installments.manage", "إدارة خطط التقسيط", "إنشاء جدول الأقساط"],
  ["payments.view", "عرض المدفوعات", "الاطلاع على المدفوعات"],
  ["payments.record", "تسجيل دفعة", "تسجيل مبلغ محصّل"],
  ["discounts.approve", "اعتماد الخصومات", "تطبيق خصم على فاتورة"],
  ["scholarships.approve", "اعتماد المنح", "منح الطالب منحة دراسية"],
  ["refunds.view", "عرض المستردات", "الاطلاع على طلبات الاسترداد"],
  ["refunds.record", "تسجيل طلب استرداد", "إنشاء طلب استرداد"],
  ["refunds.approve", "اعتماد الاسترداد", "الموافقة على الاسترداد وإتمامه"],
  ["timeline.view", "عرض السجل المالي", "الاطلاع على الأحداث المالية"],
  ["export", "تصدير البيانات المالية", "تنزيل الفواتير"],
])

const accounting = group("accounting", "المحاسبة", [
  ["view", "عرض المحاسبة", "فتح قسم المحاسبة"],
  ["dashboard.view", "عرض لوحة المحاسبة", "الاطلاع على ملخص المصروفات"],
  ["requests.view", "عرض طلبات الصرف", "الاطلاع على الطلبات"],
  ["requests.create", "إنشاء طلب صرف", "تسجيل طلب مصروفات"],
  ["requests.update", "تعديل طلب صرف", "تحديث طلب قابل للتعديل"],
  ["requests.submit", "تقديم طلب الصرف", "إرسال الطلب للمراجعة"],
  ["requests.review", "بدء مراجعة الطلب", "تولّي مراجعة طلب الصرف"],
  ["requests.decide", "البت في الطلب", "الاعتماد أو الرفض أو الإرجاع"],
  ["requests.markPaid", "تعليم الطلب كمدفوع", "تأكيد صرف المبلغ"],
  ["requests.cancel", "إلغاء طلب الصرف", "إلغاء الطلب مع ذكر السبب"],
  ["attachments.manage", "إدارة المرفقات", "رفع وحذف مرفقات الطلب"],
  ["comments.add", "إضافة تعليق", "التعليق على طلب الصرف"],
  ["categories.view", "عرض تصنيفات المصروفات", "الاطلاع على التصنيفات"],
  [
    "categories.manage",
    "إدارة تصنيفات المصروفات",
    "إضافة وتعديل وأرشفة التصنيفات",
  ],
  ["history.view", "عرض سجل الطلب", "الاطلاع على سجل الإجراءات"],
  ["export", "تصدير المصروفات", "تنزيل طلبات الصرف"],
])

const tickets = group("tickets", "إدارة التذاكر", [
  ["view.assigned", "عرض التذاكر المسندة", "عرض التذاكر المسندة مباشرة للموظف"],
  ["view.team", "عرض تذاكر الفريق", "عرض التذاكر المسندة إلى فرق الموظف"],
  ["view.all", "عرض كل التذاكر", "عرض جميع تذاكر المؤسسة"],
  ["create", "إنشاء تذكرة", "إنشاء تذكرة تشغيلية"],
  ["edit", "تعديل تذكرة", "تحديث معلومات التذكرة"],
  ["assign.team", "إسناد فريق", "إسناد التذكرة إلى فريق"],
  ["assign.employee", "إسناد موظف", "إسناد التذكرة إلى موظف"],
  ["reassign", "إعادة الإسناد", "تغيير الإسناد الحالي"],
  ["change.status", "تغيير الحالة", "نقل التذكرة بين مراحل العمل"],
  ["change.priority", "تغيير الأولوية", "تحديث أولوية التذكرة"],
  ["archive", "أرشفة", "أرشفة تذكرة نشطة"],
  ["comment", "التعليق", "إضافة وإدارة التعليقات الداخلية"],
  ["attach.files", "إرفاق ملفات", "رفع مرفقات التذكرة"],
  ["restore", "استعادة", "استعادة تذكرة مؤرشفة"],
  ["delete", "حذف", "حذف تذكرة إدارياً"],
])

/** Ordered to match the sidebar, so the matrix reads like the application. */
export const permissionCatalog: readonly PermissionGroupDefinition[] = [
  dashboard,
  inbox,
  settings,
  catalog,
  batches,
  admissions,
  students,
  finance,
  accounting,
  tickets,
]

/** Every key in the catalogue, flattened. */
export const allPermissionKeys: readonly string[] = permissionCatalog.flatMap(
  (entry) => entry.permissions.map((permission) => permission.key)
)
