import type { Branch, Department } from "../types/domain"
const audit = { organizationId: "org-1", version: 1, createdAt: "2026-01-01T08:00:00.000Z", updatedAt: "2026-07-31T08:00:00.000Z", createdBy: "system", updatedBy: "admin-1" }
export const branches: Branch[] = [
  { ...audit, id: "branch-cairo" as Branch["id"], name: "فرع القاهرة", code: "CAI", email: "cairo@alsalam.academy", address: "مدينة نصر، القاهرة", phone: "+201010101010", managerId: "user-1", workingHours: "الأحد–الخميس، 09:00–17:00", status: "active" },
  { ...audit, id: "branch-giza" as Branch["id"], name: "فرع الجيزة", code: "GIZ", email: "giza@alsalam.academy", address: "الدقي، الجيزة", phone: "+201020202020", workingHours: "الأحد–الخميس، 09:00–17:00", status: "active" },
  { ...audit, id: "branch-alex" as Branch["id"], name: "فرع الإسكندرية", code: "ALX", email: "alex@alsalam.academy", address: "سموحة، الإسكندرية", phone: "+201030303030", workingHours: "الأحد–الخميس، 10:00–18:00", status: "archived" },
]
export const departments: Department[] = [
  { ...audit, id: "dept-admissions" as Department["id"], name: "القبول والتسجيل", code: "ADM", description: "إدارة طلبات القبول والتسجيل", status: "active" },
  { ...audit, id: "dept-finance" as Department["id"], name: "المالية", code: "FIN", description: "الإيرادات والمصروفات والتحصيل", status: "active" },
  { ...audit, id: "dept-marketing" as Department["id"], name: "التسويق", code: "MKT", description: "الحملات والتواصل المؤسسي", status: "active" },
]
