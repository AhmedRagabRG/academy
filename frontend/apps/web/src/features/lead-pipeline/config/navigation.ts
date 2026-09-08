import type { NavigationItem } from "@/shared/config/navigation"
import type { PermissionKey } from "@/shared/types/foundation"
import { pipelinePermissions } from "./pipeline-permissions"

export const pipelineNavigation: NavigationItem = {
  id: "pipeline",
  title: "مسار المبيعات",
  titleKey: "nav.pipeline",
  iconKey: "pipeline",
  route: "/lead-pipeline",
  permissionKey: pipelinePermissions.view as PermissionKey,
  children: [
    {
      id: "pipeline-settings",
      title: "إعدادات المسارات",
      titleKey: "nav.pipeline.settings",
      iconKey: "general",
      route: "/pipelines",
      permissionKey: pipelinePermissions.manage as PermissionKey,
    },
  ],
}
