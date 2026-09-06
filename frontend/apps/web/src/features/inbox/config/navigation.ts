import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"
import { inboxPermissions } from "./inbox-permissions"

export const inboxChannelsNavigation: NavigationItem = {
  id: "inbox-channels",
  title: "قنوات الوارد",
  titleKey: "nav.inbox.channels",
  iconKey: "inbox",
  route: "/inbox/channels",
  permissionKey: inboxPermissions.viewChannels as PermissionKey,
}

export const inboxNavigation: NavigationItem = {
  id: "inbox",
  title: "صندوق الوارد",
  titleKey: "nav.inbox",
  iconKey: "inbox",
  route: "/inbox",
  permissionKey: inboxPermissions.viewAssigned as PermissionKey,
  children: [inboxChannelsNavigation],
}
