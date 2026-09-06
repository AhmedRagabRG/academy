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
}
