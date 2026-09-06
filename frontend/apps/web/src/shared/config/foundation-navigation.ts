import type { NavigationItem } from "./navigation"
import type { PermissionKey } from "@/shared/types/foundation"
import { organizationSettingsNavigation } from "@/features/organization-settings/config/navigation"
import { inboxNavigation } from "@/features/inbox/config/navigation"
import { ticketsNavigation } from "@/features/tickets/config/navigation"
import { contactsNavigation } from "@/features/contacts/config/navigation"
import { pipelineNavigation } from "@/features/lead-pipeline/config/navigation"
import { campaignsNavigation } from "@/features/campaigns/config/navigation"

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
  contactsNavigation,
  campaignsNavigation,
  pipelineNavigation,
  ticketsNavigation,
  organizationSettingsNavigation,
]
