import type { CampaignStatus, RecipientStatus } from "../types/domain"

export const campaignStatusLabel: Record<CampaignStatus, string> = {
  draft: "مسودة",
  scheduled: "مجدولة",
  running: "قيد الإرسال",
  paused: "متوقفة مؤقتًا",
  completed: "مكتملة",
  cancelled: "ملغاة",
}

export const recipientStatusLabel: Record<RecipientStatus, string> = {
  pending: "بانتظار الإرسال",
  sending: "جارٍ الإرسال",
  sent: "أُرسلت",
  delivered: "وصلت",
  read: "قُرئت",
  failed: "فشلت",
  skipped: "مستبعدة",
}

export const contactTokenLabel: Record<string, string> = {
  name: "اسم جهة الاتصال",
  phone: "رقم الهاتف",
  email: "البريد الإلكتروني",
  company: "الشركة / الجهة",
  role: "الصفة الوظيفية",
  ownerName: "الموظف المسؤول",
}
