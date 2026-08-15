import type { NavigationItem } from "./navigation"
import type { PermissionKey } from "@/shared/types/foundation"
import { organizationSettingsNavigation } from "@/features/organization-settings/config/navigation"
import { academicCatalogNavigation } from "@/features/academic-catalog/config/navigation"
import { admissionsNavigation } from "@/features/admissions/config/navigation"
import { studentsNavigation } from "@/features/students/config/navigation"
import { studentFinanceNavigation } from "@/features/student-finance/config/navigation"
import { accountingNavigation } from "@/features/accounting/config/navigation"
import { inboxNavigation } from "@/features/inbox/config/navigation"
import { ticketsNavigation } from "@/features/tickets/config/navigation"

export const foundationNavigation: readonly NavigationItem[] = [
  {
    id: "dashboard",
    title: "الرئيسية",
    titleKey: "nav.dashboard",
    iconKey: "dashboard",
    route: "/dashboard",
    permissionKey: "dashboard.view" as PermissionKey,
  },
  inboxNavigation,
  ticketsNavigation,
  organizationSettingsNavigation,
  academicCatalogNavigation,
  admissionsNavigation,
  studentsNavigation,
  studentFinanceNavigation,
  accountingNavigation,
]
