import {
  BrainCircuit,
  MessageSquareQuote,
  Route,
  Search,
  SmilePlus,
  Tags,
} from "lucide-react"
const capabilities = [
  ["ملخص المحادثة", BrainCircuit],
  ["رد مقترح", MessageSquareQuote],
  ["إسناد مقترح", Route],
  ["وسوم مقترحة", Tags],
  ["تحليل المشاعر", SmilePlus],
  ["بحث المعرفة", Search],
] as const
export function AiPlaceholderPanel() {
  return (
    <section aria-labelledby="ai-title">
      <h3 id="ai-title" className="font-medium">
        مساعد الذكاء الاصطناعي
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        مساحات محجوزة لإمكانات مستقبلية. لا تتم معالجة أي بيانات الآن.
      </p>
      <div className="mt-3 grid gap-2">
        {capabilities.map(([label, Icon]) => (
          <div
            key={label}
            aria-disabled="true"
            className="flex items-center gap-3 rounded-xl border border-dashed bg-muted/40 p-3 opacity-70"
          >
            <Icon className="size-4" aria-hidden />
            <span className="text-sm">{label}</span>
            <span className="ms-auto text-xs text-muted-foreground">
              قريبًا
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
