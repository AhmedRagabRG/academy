/**
 * The permission catalogue — every key the application actually checks.
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
  ["ai.control", "التحكم في المساعد", "إيقاف المساعد الذكي وتشغيله"],
  ["archive", "أرشفة المحادثة", "نقل المحادثة إلى الأرشيف"],
  ["delete", "حذف المحادثة", "حذف المحادثة حذفًا تجريبيًا"],
  ["restore", "استعادة المحادثة", "استعادة محادثة مؤرشفة أو محذوفة"],
])

const contacts = group("contacts", "جهات الاتصال", [
  ["view", "عرض جهات الاتصال", "فتح سجل جهات الاتصال الموحد"],
  ["create", "إضافة جهة اتصال", "إضافة جهة اتصال يدوياً"],
  ["update", "تعديل جهة اتصال", "تحديث بيانات جهة اتصال"],
  ["delete", "حذف جهة اتصال", "حذف سجل جهة اتصال"],
  ["import", "استيراد جهات الاتصال", "رفع جهات اتصال من ملف CSV"],
  ["export", "تصدير جهات الاتصال", "تنزيل جهات الاتصال بصيغة CSV"],
  ["groups.manage", "إدارة المجموعات", "إنشاء المجموعات وإسناد جهات الاتصال"],
  ["fields.manage", "إدارة الحقول المخصصة", "إنشاء حقول إضافية لملفات الاتصال"],
  ["notes.manage", "إدارة الملاحظات", "إضافة ملاحظات داخلية لجهات الاتصال"],
])

const pipeline = group("pipeline", "مسار المبيعات", [
  ["view", "عرض مسار المبيعات", "فتح لوحة متابعة الفرص"],
  ["create", "إضافة فرصة", "إنشاء فرصة بيع مرتبطة بجهة اتصال"],
  ["update", "تعديل فرصة", "تحديث بيانات فرصة البيع"],
  ["move", "نقل فرصة", "نقل الفرص بين مراحل المسار"],
  ["assign", "إسناد فرصة", "إسناد الفرص إلى موظفي المبيعات"],
  ["manage", "إدارة المسار", "إدارة مراحل وإعدادات مسار المبيعات"],
])

const campaigns = group("campaigns", "حملات واتساب", [
  ["view", "عرض الحملات", "فتح حملات واتساب ومتابعة نتائج الإرسال"],
  ["create", "إنشاء حملة", "إنشاء حملة من قالب واتساب معتمد"],
  ["update", "تعديل حملة", "تحديث إعدادات الحملة قبل اكتمالها"],
  ["delete", "حذف حملة", "حذف حملة متوقفة أو غير مفعلة"],
  ["launch", "إطلاق الحملات", "بدء الإرسال أو إيقافه واستئنافه"],
  [
    "templates.sync",
    "مزامنة القوالب",
    "جلب أحدث القوالب وحالات اعتمادها من Meta",
  ],
])

const settings = group("settings", "المؤسسة والإعدادات", [
  ["view", "عرض الإعدادات", "فتح قسم المؤسسة والإعدادات"],
  ["create", "إنشاء سجلات إدارية", "إضافة سجلات في الإعدادات"],
  ["organization.view", "عرض ملف المؤسسة", "الاطلاع على هوية المؤسسة"],
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

const ai = group("ai", "المساعد الذكي", [
  ["settings.view", "عرض إعدادات المساعد", "الاطلاع على إعدادات الرد الآلي"],
  ["settings.manage", "تعديل إعدادات المساعد", "تشغيل المساعد وضبط قنواته ومعرفته"],
  ["knowledge.view", "عرض قواعد المعرفة", "الاطلاع على قواعد المعرفة ومصادرها"],
  ["knowledge.manage", "إدارة قواعد المعرفة", "إضافة المصادر وحذفها وإعادة فهرستها"],
  ["runs.view", "عرض نشاط المساعد", "الاطلاع على سجل تشغيل المساعد وتكلفته"],
])

/** Ordered to match the sidebar, so the matrix reads like the application. */
export const permissionCatalog: readonly PermissionGroupDefinition[] = [
  dashboard,
  inbox,
  contacts,
  campaigns,
  pipeline,
  settings,
  tickets,
  ai,
]

/** Every key in the catalogue, flattened. */
export const allPermissionKeys: readonly string[] = permissionCatalog.flatMap(
  (entry) => entry.permissions.map((permission) => permission.key)
)
