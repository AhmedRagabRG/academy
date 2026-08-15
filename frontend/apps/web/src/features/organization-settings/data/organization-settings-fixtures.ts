import type { StatusDefinition } from "../types/common"
import type { PermissionGroup } from "../types/domain"
import type { OrganizationLookups } from "../services/organization-settings-service"
import { permissionCatalog } from "@/shared/config/permission-catalog"

export const statusDefinitions: StatusDefinition[] = [
  { id: "status-active", entityKind: "all", labelAr: "نشط", labelEn: "Active", behavior: "active", colorToken: "success", sortOrder: 1, selectable: true },
  { id: "status-inactive", entityKind: "all", labelAr: "غير نشط", labelEn: "Inactive", behavior: "inactive", colorToken: "warning", sortOrder: 2, selectable: true },
  { id: "status-archived", entityKind: "all", labelAr: "مؤرشف", labelEn: "Archived", behavior: "archived", colorToken: "neutral", sortOrder: 3, selectable: true },
]

export const lookups: OrganizationLookups = {
  languages: [{ value: "ar", label: "العربية" }],
  timeZones: [{ value: "Africa/Cairo", label: "القاهرة (GMT+2)" }],
  currencies: [{ value: "EGP", label: "جنيه مصري" }],
  countries: [{ value: "EG", label: "مصر" }],
  dateFormats: [{ value: "dd/MM/yyyy", label: "يوم/شهر/سنة" }, { value: "yyyy-MM-dd", label: "سنة-شهر-يوم" }],
  numberFormats: [{ value: "ar-EG", label: "عربي (مصر)" }],
  weekdays: [{ value: "sun", label: "الأحد" }, { value: "mon", label: "الاثنين" }, { value: "tue", label: "الثلاثاء" }, { value: "wed", label: "الأربعاء" }, { value: "thu", label: "الخميس" }, { value: "fri", label: "الجمعة" }, { value: "sat", label: "السبت" }],
}

/**
 * The matrix renders the real catalogue.
 *
 * It was previously generated as `modules × actions`, producing ids like
 * `organization.view` that nothing checks, while every Catalog, Batches,
 * Admissions, Students, Finance and Accounting key was unreachable. The
 * catalogue now comes from `shared/config/permission-catalog.ts`, which
 * enumerates the keys the application actually enforces.
 */
export const permissionGroups: PermissionGroup[] = [...permissionCatalog]
