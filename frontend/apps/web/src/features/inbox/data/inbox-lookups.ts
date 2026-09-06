import type { Employee, Platform, Tag, Team } from "../types/domain"
import type {
  EmployeeId,
  PlatformId,
  TagId,
  TeamId,
} from "../types/common"

export const teams: Team[] = [
  { id: "team-admissions" as TeamId, label: "فريق القبول", active: true },
  { id: "team-support" as TeamId, label: "خدمة الطلاب", active: true },
]
export const employees: Employee[] = [
  {
    id: "employee-demo" as EmployeeId,
    label: "أحمد محمد",
    active: true,
    teamIds: ["team-admissions" as TeamId],
  },
  {
    id: "employee-sara" as EmployeeId,
    label: "سارة علي",
    active: true,
    teamIds: ["team-admissions" as TeamId],
  },
  {
    id: "employee-omar" as EmployeeId,
    label: "عمر حسن",
    active: true,
    teamIds: ["team-support" as TeamId],
  },
]
export const platforms: Platform[] = [
  {
    id: "platform-web" as PlatformId,
    label: "محادثة الموقع",
    icon: "MessageCircle",
    active: true,
  },
  {
    id: "platform-email" as PlatformId,
    label: "البريد الإلكتروني",
    icon: "Mail",
    active: true,
  },
  {
    id: "platform-phone" as PlatformId,
    label: "الهاتف",
    icon: "Phone",
    active: true,
  },
]
export const tags: Tag[] = [
  { id: "tag-lead" as TagId, label: "عميل محتمل", color: "blue", active: true },
  { id: "tag-vip" as TagId, label: "VIP", color: "violet", active: true },
  { id: "tag-follow" as TagId, label: "متابعة", color: "amber", active: true },
  {
    id: "tag-payment" as TagId,
    label: "بانتظار الدفع",
    color: "red",
    active: true,
  },
  {
    id: "tag-registered" as TagId,
    label: "مسجّل",
    color: "green",
    active: true,
  },
]
