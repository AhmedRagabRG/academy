export const aiAgentPermissions = {
  view: "ai.settings.view",
  manage: "ai.settings.manage",
} as const

/** Offered resume delays. null is "never", the safest default. */
export const resumeDelayOptions = [
  { value: "", label: "أبدًا — يبقى متوقفًا حتى يعيده موظف" },
  { value: "30", label: "بعد 30 دقيقة" },
  { value: "60", label: "بعد ساعة" },
  { value: "180", label: "بعد 3 ساعات" },
  { value: "360", label: "بعد 6 ساعات" },
  { value: "720", label: "بعد 12 ساعة" },
  { value: "1440", label: "بعد 24 ساعة" },
] as const

/**
 * The tools an admin may switch on. Names must match the backend's
 * AGENT_TOOL_NAMES — the API rejects anything else.
 */
export const toolCatalog = [
  { name: "kb_search", label: "البحث في قاعدة المعرفة", note: "مطلوب لأي إجابة تتضمن حقائق" },
  { name: "crm_read_contact", label: "قراءة بيانات العميل", note: "يتجنّب سؤال العميل عمّا نعرفه" },
  { name: "crm_update_contact", label: "تحديث بيانات العميل", note: "يملأ الحقول الفارغة فقط" },
  { name: "crm_add_note", label: "إضافة ملاحظة للعميل", note: "يسجّل ما يهم فريق المبيعات" },
  { name: "record_collected_fields", label: "حفظ البيانات المجمّعة", note: "حتى لا يعيد السؤال نفسه" },
  { name: "create_ticket", label: "إنشاء تذكرة", note: "تصعيد الشكاوى إلى الفريق المختص" },
  { name: "handoff_to_human", label: "التحويل إلى موظف", note: "إنهاء المحادثة وتسليمها" },
] as const

/**
 * Writable CRM fields. `phone` is absent by design — it is the contact identity
 * key, so letting the agent rewrite it could collide with or hijack another
 * contact. The backend rejects it regardless of what this list says.
 */
export const crmFieldCatalog = [
  { name: "name", label: "الاسم" },
  { name: "email", label: "البريد الإلكتروني" },
  { name: "secondaryPhone", label: "هاتف إضافي" },
  { name: "company", label: "الجهة / الشركة" },
  { name: "jobTitle", label: "المسمى الوظيفي" },
] as const

export const weekdays = [
  { code: "sat", label: "السبت" },
  { code: "sun", label: "الأحد" },
  { code: "mon", label: "الاثنين" },
  { code: "tue", label: "الثلاثاء" },
  { code: "wed", label: "الأربعاء" },
  { code: "thu", label: "الخميس" },
  { code: "fri", label: "الجمعة" },
] as const

export const priorityLabels = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  critical: "حرجة",
} as const
