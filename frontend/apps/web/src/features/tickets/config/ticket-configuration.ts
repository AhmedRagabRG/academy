import type { TicketConfiguration } from "../types/domain"
import type { TeamId } from "../types/common"

export const activeStatuses = ["backlog", "todo", "in-progress", "waiting", "review", "done"] as const

export const ticketConfiguration: TicketConfiguration = {
  statuses: [
    { id: "backlog", name: "قائمة الانتظار", order: 1 },
    { id: "todo", name: "للعمل", order: 2 },
    { id: "in-progress", name: "قيد التنفيذ", order: 3 },
    { id: "waiting", name: "بانتظار رد", order: 4 },
    { id: "review", name: "للمراجعة", order: 5 },
    { id: "done", name: "مكتمل", order: 6 },
    { id: "archived", name: "مؤرشف", order: 7 },
  ],
  priorities: [
    { id: "low", name: "منخفضة", tone: "bg-slate-100 text-slate-700", order: 1 },
    { id: "medium", name: "متوسطة", tone: "bg-blue-100 text-blue-800", order: 2 },
    { id: "high", name: "عالية", tone: "bg-amber-100 text-amber-800", order: 3 },
    { id: "critical", name: "حرجة", tone: "bg-red-100 text-red-800", order: 4 },
  ],
  teams: [{ id: "team-support" as TeamId, name: "فريق الدعم" }, { id: "team-admissions" as TeamId, name: "فريق القبول" }, { id: "team-finance" as TeamId, name: "فريق المالية" }],
  employees: [
    { id: "employee-demo", name: "أحمد محمد", teamIds: ["team-support" as TeamId] },
    { id: "employee-sara", name: "سارة علي", teamIds: ["team-support" as TeamId, "team-admissions" as TeamId] },
    { id: "employee-omar", name: "عمر حسن", teamIds: ["team-finance" as TeamId] },
  ],
  customers: [{ id: "customer-1", name: "منى محمود" }, { id: "customer-2", name: "خالد إبراهيم" }],
  students: [{ id: "student-1", name: "يوسف أحمد" }, { id: "student-2", name: "ليلى كريم" }],
  conversations: [{ id: "conversation-1", name: "استفسار التسجيل عبر واتساب" }, { id: "conversation-2", name: "متابعة سداد الرسوم" }],
  tags: ["عاجل", "متابعة", "تسجيل", "سداد", "فرع"],
}
