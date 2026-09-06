import type {
  LeadPriority,
  LeadSource,
  PipelineDefinition,
} from "../types/domain"

export const admissionsPipeline: PipelineDefinition = {
  id: "pipeline-admissions",
  name: "مسار القبول والمبيعات",
  stages: [
    {
      id: "unassigned",
      name: "غير مسند",
      description: "تواصل جديد بانتظار التوزيع",
      probability: 5,
      accent: "slate",
    },
    {
      id: "new",
      name: "فرصة جديدة",
      description: "تم إنشاء الفرصة ولم يبدأ التواصل",
      probability: 10,
      accent: "blue",
    },
    {
      id: "contacted",
      name: "تم التواصل",
      description: "بدأت المحادثة مع جهة الاتصال",
      probability: 30,
      accent: "sky",
    },
    {
      id: "qualified",
      name: "مؤهلة",
      description: "الاحتياج والميزانية والموعد مناسبون",
      probability: 55,
      accent: "amber",
    },
    {
      id: "proposal",
      name: "عرض مرسل",
      description: "أُرسل العرض أو تفاصيل التسجيل",
      probability: 75,
      accent: "violet",
    },
    {
      id: "won",
      name: "مكتسبة",
      description: "اكتمل التسجيل أو الاتفاق",
      probability: 100,
      accent: "green",
    },
    {
      id: "lost",
      name: "غير مكتسبة",
      description: "لم تكتمل الفرصة",
      probability: 0,
      accent: "red",
    },
  ],
}

export const priorityLabels: Record<LeadPriority, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "مرتفعة",
  urgent: "عاجلة",
}

export const sourceLabels: Record<LeadSource, string> = {
  whatsapp: "واتساب",
  instagram: "إنستغرام",
  facebook: "فيسبوك",
  website: "الموقع",
  phone: "هاتف",
  manual: "يدوي",
}
